import { app, BrowserWindow, Menu } from "electron";
// import { createRequire } from 'node:module'
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
import * as os from "os";   // zjx

// const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;
let goServerProcess: ReturnType<typeof spawn> | null = null;

function createWindow(): void {
  // 隐藏菜单栏
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

function startGoServer() {
//   // Go 后端可执行文件的路径
//   // 在打包后会位于 process.resourcesPath 下，
//   // 如果你在 extraResources 中的 to 设置为 ".", 则表示文件在 resources/ 下
//   const goServerPath = path.join(process.resourcesPath, "go-server.exe");

    const arch = os.arch(); // 'x64' or 'ia32'
    // 选择对应架构的可执行文件名
    const goServerPath = path.join(
        process.resourcesPath,
        arch === "x64" ? "x64" : "ia32",
        "go-server.exe"
    );   

  // 使用 spawn 或 execFile 来启动
  goServerProcess = spawn(goServerPath, [], {
    cwd: process.resourcesPath, // 工作目录可以和 go-server.exe 放一起
    detached: true, // 可选：为了在主进程退出后也能继续独立运行
  });

  // 可以添加监听输出或错误的事件，方便调试
  goServerProcess.stdout?.on("data", (data) => {
    console.log(`go-server output: ${data}`);
  });

  goServerProcess.stderr?.on("data", (data) => {
    console.error(`go-server error: ${data}`);
  });

  goServerProcess.on("close", (code) => {
    console.log(`go-server process exited with code ${code}`);
  });
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    goServerProcess?.kill();
    goServerProcess = null;
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  startGoServer();
  createWindow();
});
