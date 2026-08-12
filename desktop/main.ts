/**
 * Electron main — spawn CLI via JobSupervisor.
 * Dev entry: `npx tsx desktop/main.ts` or `npm run desktop:dev`.
 */
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultDesktopProfileDir, defaultDesktopRunsDir } from './build-scan-argv.ts';
import { JobSupervisor, readJobFile } from './job-supervisor.ts';
import { releaseOutJobLock } from './job-lock.ts';
import { assertSafeJobPaths, isPathInside, resolveExistingPath } from './progress.ts';

const __dirname =
  typeof __filename !== 'undefined'
    ? dirname(__filename)
    : dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const runsRoot = defaultDesktopRunsDir();
const profileRoot = defaultDesktopProfileDir();
const jobFilePath = join(app.getPath('userData'), 'job.json');

mkdirSync(runsRoot, { recursive: true });
mkdirSync(profileRoot, { recursive: true });

let win: BrowserWindow | null = null;

const supervisor = new JobSupervisor({
  jobFilePath,
  resolveCli: () => {
    const tsxCli = join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    const entry = join(repoRoot, 'cli', 'index.ts');
    if (existsSync(tsxCli)) {
      return { command: process.execPath, prefixArgs: [tsxCli, entry], cwd: repoRoot };
    }
    // Packaged: ELECTRON_RUN_AS_NODE + bundled cli under extraResources
    const cliRoot = join(process.resourcesPath || repoRoot, 'cli');
    const bundled = join(cliRoot, 'index.js');
    if (existsSync(bundled)) {
      return { command: process.execPath, prefixArgs: [bundled], cwd: cliRoot };
    }
    return { command: process.execPath, prefixArgs: [entry], cwd: repoRoot };
  },
  onStatus: (status) => {
    win?.webContents.send('desktop:status', status);
  },
});

function createWindow(): void {
  win = new BrowserWindow({
    width: 880,
    height: 720,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  void win.loadFile(join(__dirname, 'renderer', 'index.html'));
}

function chromeInstalled(): boolean {
  const candidates =
    process.platform === 'win32'
      ? [
          join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
          join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
          join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome'];
  return candidates.some((p) => p && existsSync(p));
}

app.whenReady().then(() => {
  const orphan = readJobFile(jobFilePath);
  if (orphan?.pid) {
    let alive = false;
    try {
      process.kill(orphan.pid, 0);
      alive = true;
    } catch {
      /* pid dead */
    }
    if (alive) {
      dialog.showMessageBoxSync({
        type: 'error',
        message: 'Việc quét trước vẫn đang chạy — không mở job mới trên cùng profile.',
        detail: `PID ${orphan.pid}\nOut: ${orphan.out}\nHãy Resume đúng thư mục đó hoặc dừng process rồi mở lại app.`,
      });
      app.quit();
      return;
    }
    if (orphan.out) releaseOutJobLock(orphan.out);
  }

  if (!chromeInstalled()) {
    dialog.showMessageBoxSync({
      type: 'warning',
      message: 'Chưa thấy Google Chrome',
      detail: 'Cài Chrome rồi mở lại ứng dụng. Ứng dụng dùng Chrome hệ thống (không bypass Cloudflare).',
    });
  }

  createWindow();
});

ipcMain.handle('desktop:defaults', () => {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return {
    out: join(runsRoot, `run-${stamp}`),
    profile: profileRoot,
    runsRoot,
  };
});

ipcMain.handle('desktop:status', () => supervisor.getStatus());

ipcMain.handle('desktop:start', async (_e, opts: { query?: string; limit?: number; out: string; resume?: boolean; earlyExit?: boolean }) => {
  const out = resolve(opts.out);
  const profile = profileRoot;
  assertSafeJobPaths({
    out,
    profile,
    allowedOutRoot: runsRoot,
    allowedProfileRoot: profileRoot,
  });
  await supervisor.start({
    query: opts.query,
    limit: opts.limit,
    out,
    profile,
    resume: Boolean(opts.resume),
    scanProfile: true,
    acceptFailures: true,
    earlyExit: Boolean(opts.earlyExit),
    allowedOutRoot: runsRoot,
    allowedProfileRoot: profileRoot,
  });
  return supervisor.getStatus();
});

ipcMain.handle('desktop:stop', async () => {
  await supervisor.stop();
  return supervisor.getStatus();
});

ipcMain.handle('desktop:open-out', async () => {
  const out = supervisor.getStatus().outDir;
  if (!out) return { ok: false };
  const real = resolveExistingPath(out);
  if (!isPathInside(runsRoot, real) && real !== resolve(runsRoot)) {
    throw new Error('out path escape blocked');
  }
  await shell.openPath(real);
  return { ok: true };
});

ipcMain.handle('desktop:open-csv', async () => {
  const st = supervisor.getStatus();
  const csv = st.csvPath || (st.outDir ? join(st.outDir, 'results.csv') : '');
  if (!csv || !existsSync(csv)) {
    throw new Error('Chưa có results.csv — đợi chạy xong hoặc Dừng để xuất từ jsonl');
  }
  const real = resolveExistingPath(csv);
  if (!isPathInside(runsRoot, real)) throw new Error('csv path escape blocked');
  await shell.openPath(real);
  return { ok: true };
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
