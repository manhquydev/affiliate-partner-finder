import { spawn, type ChildProcess } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  openSync,
  readSync,
  closeSync,
  fstatSync,
  statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { buildScanArgv } from './build-scan-argv.ts';
import {
  EtaTracker,
  extractScannedAtMsFromJsonlText,
  samplesFromScanTimestamps,
  type EtaSnapshot,
} from './eta.ts';
import { countKetQuaFromJsonl, parseCliStatusLine, writeSimpleCsvFromJsonl, emptyCounts } from './ket-qua-counts.ts';
import { assertOutJobLockFree, releaseOutJobLock, writeOutJobLock } from './job-lock.ts';
import { assertSafeJobPaths, canStartFresh, readProgress } from './progress.ts';
import { ensureCompaniesCsv, listJobArtefacts, resolveJobCsv } from './job-csv.ts';
import type { JobOptions, JobRecord, JobStatus } from './types.ts';

const JSONL_SEED_TAIL_BYTES = 512_000;
/** Keep this much recent CLI output (stdout+stderr) to explain early exits. */
const OUTPUT_TAIL_CHARS = 16_000;

function readFileTailUtf8(path: string, maxBytes: number): string {
  if (!existsSync(path)) return '';
  const fd = openSync(path, 'r');
  try {
    const st = fstatSync(fd);
    const size = st.size;
    if (size <= 0) return '';
    const start = Math.max(0, size - maxBytes);
    const len = size - start;
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, start);
    return buf.toString('utf8');
  } finally {
    closeSync(fd);
  }
}

export type SupervisorHooks = {
  onStatus?: (status: JobStatus) => void;
  /** Resolve CLI launcher: [execPath, ...prefixArgs] e.g. [tsx, 'cli/index.ts'] */
  resolveCli?: () => { command: string; prefixArgs: string[]; cwd: string };
  jobFilePath?: string;
  pollMs?: number;
};
const CLI_NOISE_RE = /^(at\s|\.\.\.\s|Node\.js v\d|npm (notice|warn))/;
const CLI_SYMPTOM_RE = /no companies to scan|collected 0 companies/i;
const CLI_CAUSE_RE =
  /(failed|error|✗|returned no companies|challenge|chưa lấy được|đang bị dùng|profile đang)/i;

export const EMPTY_COLLECT_MESSAGE =
  'Chưa lấy được website từ Trustpilot. Nếu đang ẩn Chrome: tắt “Ẩn cửa sổ Chrome”, chạy Lấy danh sách lại, vượt kiểm tra một lần trong cửa sổ Chrome.';

export function pickCliFailureCause(outputTail: string): string {
  const lines = outputTail
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !CLI_NOISE_RE.test(l));
  const hidden = lines.filter((l) => /đang chạy ẩn/i.test(l)).pop();
  if (hidden) return hidden;
  const crash = lines.filter((l) => /^Error\b|^\S*Error\b.*:/.test(l) && !/^\[cli\]/.test(l)).pop();
  if (crash) return crash;
  const cause = lines
    .filter((l) => l.startsWith('[cli]') && !CLI_SYMPTOM_RE.test(l) && CLI_CAUSE_RE.test(l))
    .pop();
  if (cause) return cause;
  const cli = lines.filter((l) => l.startsWith('[cli]') && !CLI_SYMPTOM_RE.test(l)).pop();
  if (cli) return cli;
  if (lines.some((l) => CLI_SYMPTOM_RE.test(l) || /chưa lấy được (công ty|website)/i.test(l))) {
    return EMPTY_COLLECT_MESSAGE;
  }
  return lines[lines.length - 1] ?? '';
}

export function formatJobFailureMessage(
  code: number | null,
  signal: NodeJS.Signals | null,
  cause: string,
): string {
  const exitPart = code != null ? `exit ${code}` : `signal ${signal ?? '?'}`;
  if (!cause) return `Job lỗi (${exitPart}) — xem cửa sổ log để biết chi tiết.`;
  const text = CLI_SYMPTOM_RE.test(cause) ? EMPTY_COLLECT_MESSAGE : cause.slice(0, 400);
  return `Job lỗi (${exitPart}): ${text}`;
}

export class JobSupervisor {
  private child: ChildProcess | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private currentDomains = new Set<string>();
  private etaTracker = new EtaTracker();
  private lastStatus: JobStatus = {
    state: 'idle',
    progress: null,
    counts: emptyCounts(),
    currentDomains: [],
    eta: null,
  };
  private outDir = '';
  private profile = '';
  private outputTail = '';
  private stopRequested = false;
  private collectOnly = false;
  private readonly hooks: SupervisorHooks;

  constructor(hooks: SupervisorHooks = {}) {
    this.hooks = hooks;
  }

  getStatus(): JobStatus {
    return this.lastStatus;
  }

  async start(opts: JobOptions & { allowedOutRoot: string; allowedProfileRoot: string }): Promise<void> {
    if (this.child) throw new Error('Một việc đang chạy — hãy dừng trước');

    const { out, profile } = assertSafeJobPaths({
      out: opts.out,
      profile: opts.profile,
      allowedOutRoot: opts.allowedOutRoot,
      allowedProfileRoot: opts.allowedProfileRoot,
    });

    mkdirSync(out, { recursive: true });

    assertOutJobLockFree(out);

    if (!opts.resume && !canStartFresh(out)) {
      throw new Error('Thư mục đã có dữ liệu — dùng Tiếp tục hoặc chọn thư mục mới');
    }
    if (opts.resume && canStartFresh(out)) {
      throw new Error('Không có việc để tiếp tục trong thư mục này');
    }

    const argv = buildScanArgv({ ...opts, out, profile });
    const launcher = this.hooks.resolveCli?.() ?? {
      command: process.execPath,
      prefixArgs: [],
      cwd: process.cwd(),
    };

    this.outDir = out;
    this.profile = profile;
    this.currentDomains.clear();
    this.outputTail = '';
    this.stopRequested = false;
    this.collectOnly = Boolean(opts.collectOnly) && !opts.resume;
    this.etaTracker.begin(out);

    const progress = readProgress(out);
    this.seedEtaFromJsonl(out, progress?.completed ?? 0);
    const eta = this.computeEta(progress);
    this.emit({
      state: 'running',
      progress,
      counts: emptyCounts(),
      currentDomains: [],
      outDir: out,
      eta,
      message: 'Đang khởi động…',
    });

    this.child = spawn(launcher.command, [...launcher.prefixArgs, ...argv], {
      cwd: launcher.cwd,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    const pid = this.child.pid;
    if (pid) {
      writeOutJobLock(out, {
        pid,
        out,
        profile,
        startedAt: new Date().toISOString(),
      });
    }
    if (pid && this.hooks.jobFilePath) {
      const rec: JobRecord = {
        pid,
        out,
        profile,
        startedAt: new Date().toISOString(),
        query: opts.query,
      };
      mkdirSync(dirname(this.hooks.jobFilePath), { recursive: true });
      writeFileSync(this.hooks.jobFilePath, JSON.stringify(rec, null, 2));
    }

    this.child.stdout?.on('data', (buf: Buffer) => this.onChunk(buf.toString('utf8')));
    this.child.stderr?.on('data', (buf: Buffer) => this.onChunk(buf.toString('utf8')));

    this.child.on('exit', (code, signal) => {
      void this.onExit(code, signal);
    });

    this.startPoll();
  }

  async stop(): Promise<void> {
    if (!this.child?.pid) return;
    this.stopRequested = true;
    this.emit({ ...this.lastStatus, state: 'stopping', message: 'Đang dừng an toàn…' });
    const child = this.child;
    const stopFlag = this.outDir ? join(this.outDir, '.stop') : '';
    if (stopFlag) {
      try {
        writeFileSync(stopFlag, new Date().toISOString());
      } catch {
        /* ignore */
      }
    }
    try {
      // Cooperative on all platforms; SIGINT works on Unix. Windows relies on .stop file.
      if (process.platform !== 'win32') child.kill('SIGINT');
    } catch {
      /* ignore */
    }
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        if (child.exitCode == null && child.signalCode == null) {
          try {
            child.kill('SIGKILL');
          } catch {
            /* ignore */
          }
        }
        resolve();
      }, 15_000);
      child.once('exit', () => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  private onChunk(text: string): void {
    this.outputTail = (this.outputTail + text).slice(-OUTPUT_TAIL_CHARS);
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseCliStatusLine(line);
      if (!parsed) continue;
      if (parsed.kind === 'scan') this.currentDomains.add(parsed.domain);
      if (parsed.kind === 'done') this.currentDomains.delete(parsed.domain);
    }
  }


  /** Human cause for an unexpected CLI exit, from the output tail we kept. */
  private describeFailure(code: number | null, signal: NodeJS.Signals | null): string {
    return formatJobFailureMessage(code, signal, pickCliFailureCause(this.outputTail));
  }

  private startPoll(): void {
    this.stopPoll();
    const ms = this.hooks.pollMs ?? 1000;
    this.pollTimer = setInterval(() => {
      void this.refresh();
    }, ms);
  }

  private stopPoll(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private seedEtaFromJsonl(outDir: string, absoluteCompleted: number): void {
    try {
      const text = readFileTailUtf8(join(outDir, 'results.jsonl'), JSONL_SEED_TAIL_BYTES);
      const times = extractScannedAtMsFromJsonlText(text);
      this.etaTracker.seed(samplesFromScanTimestamps(times, absoluteCompleted));
    } catch {
      /* ignore seed failures */
    }
  }

  private computeEta(progress: JobStatus['progress']): EtaSnapshot | null {
    if (!progress || progress.total <= 0) return null;
    return this.etaTracker.observe({
      completed: progress.completed,
      total: progress.total,
    });
  }

  private async refresh(): Promise<void> {
    if (!this.outDir) return;
    const progress = readProgress(this.outDir);
    const counts = await countKetQuaFromJsonl(join(this.outDir, 'results.jsonl'));
    const eta = this.computeEta(progress);
    this.emit({
      state: this.lastStatus.state === 'stopping' ? 'stopping' : 'running',
      progress,
      counts,
      currentDomains: [...this.currentDomains],
      outDir: this.outDir,
      csvPath: resolveJobCsv(this.outDir),
      artefacts: listJobArtefacts(this.outDir),
      eta,
    });
  }

  private async onExit(code: number | null = 0, signal: NodeJS.Signals | null = null): Promise<void> {
    this.stopPoll();
    this.child = null;
    // Operator-requested stops (Dừng button → .stop flag / SIGINT) are expected;
    // anything else with a non-zero exit is a failure the UI must surface.
    const failed = !this.stopRequested && (code === null || code !== 0);
    const resultsPath = this.outDir ? join(this.outDir, 'results.jsonl') : '';
    let hasResults = false;
    if (resultsPath) {
      try {
        hasResults = statSync(resultsPath).size > 0;
      } catch {
        /* no results file */
      }
    }
    let message = 'Đã dừng / hoàn tất';
    // Never write a header-only CSV for a job that died before scanning anything —
    // it fakes a "completed, nothing found" scan. Skip when jsonl is missing or empty.
    if (this.outDir && !existsSync(join(this.outDir, 'results.csv')) && hasResults) {
      try {
        await writeSimpleCsvFromJsonl(this.outDir);
      } catch (e) {
        message = `Dừng xong nhưng không ghi được CSV: ${e instanceof Error ? e.message : e}`;
      }
    }
    if (this.outDir) {
      ensureCompaniesCsv(this.outDir);
      try {
        unlinkSync(join(this.outDir, '.stop'));
      } catch {
        /* ignore */
      }
      releaseOutJobLock(this.outDir);
    }
    if (this.hooks.jobFilePath && existsSync(this.hooks.jobFilePath)) {
      try {
        unlinkSync(this.hooks.jobFilePath);
      } catch {
        /* ignore */
      }
    }
    const progress = this.outDir ? readProgress(this.outDir) : null;
    const counts = this.outDir
      ? await countKetQuaFromJsonl(join(this.outDir, 'results.jsonl'))
      : emptyCounts();
    const eta =
      progress && progress.total > 0
        ? this.etaTracker.observe({ completed: progress.completed, total: progress.total })
        : null;
    this.emit({
      state: failed ? 'error' : 'idle',
      progress,
      counts,
      currentDomains: [],
      outDir: this.outDir || undefined,
      csvPath: this.outDir ? resolveJobCsv(this.outDir) : undefined,
      artefacts: this.outDir ? listJobArtefacts(this.outDir) : [],
      message: failed
        ? this.describeFailure(code, signal)
        : this.collectOnly && !this.stopRequested
          ? 'Đã lấy danh sách.'
          : message,
      eta,
    });
    this.stopRequested = false;
  }

  private emit(status: JobStatus): void {
    this.lastStatus = status;
    this.hooks.onStatus?.(status);
  }
}

export function readJobFile(path: string): JobRecord | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as JobRecord;
  } catch {
    return null;
  }
}
