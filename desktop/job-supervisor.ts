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
import type { JobOptions, JobRecord, JobStatus } from './types.ts';

const JSONL_SEED_TAIL_BYTES = 512_000;

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

    this.child.on('exit', () => {
      void this.onExit();
    });

    this.startPoll();
  }

  async stop(): Promise<void> {
    if (!this.child?.pid) return;
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
    for (const line of text.split(/\r?\n/)) {
      const parsed = parseCliStatusLine(line);
      if (!parsed) continue;
      if (parsed.kind === 'scan') this.currentDomains.add(parsed.domain);
      if (parsed.kind === 'done') this.currentDomains.delete(parsed.domain);
    }
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
      csvPath: existsSync(join(this.outDir, 'results.csv'))
        ? join(this.outDir, 'results.csv')
        : undefined,
      eta,
    });
  }

  private async onExit(): Promise<void> {
    this.stopPoll();
    this.child = null;
    const csvPath = this.outDir ? join(this.outDir, 'results.csv') : '';
    let csvOk = csvPath ? existsSync(csvPath) : false;
    let message = 'Đã dừng / hoàn tất';
    if (this.outDir && !csvOk) {
      try {
        await writeSimpleCsvFromJsonl(this.outDir);
        csvOk = true;
      } catch (e) {
        message = `Dừng xong nhưng không ghi được CSV: ${e instanceof Error ? e.message : e}`;
      }
    }
    if (this.outDir) {
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
      state: 'idle',
      progress,
      counts,
      currentDomains: [],
      outDir: this.outDir || undefined,
      csvPath: csvOk && csvPath ? csvPath : undefined,
      message,
      eta,
    });
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
