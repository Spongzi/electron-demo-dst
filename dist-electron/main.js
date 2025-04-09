import { app, BrowserWindow, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let goServerProcess = null;
function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
function startGoServer() {
  var _a, _b;
  const goServerPath = path.join(process.resourcesPath, "go-server.exe");
  goServerProcess = spawn(goServerPath, [], {
    cwd: process.resourcesPath,
    // 工作目录可以和 go-server.exe 放一起
    detached: true
    // 可选：为了在主进程退出后也能继续独立运行
  });
  (_a = goServerProcess.stdout) == null ? void 0 : _a.on("data", (data) => {
    console.log(`go-server output: ${data}`);
  });
  (_b = goServerProcess.stderr) == null ? void 0 : _b.on("data", (data) => {
    console.error(`go-server error: ${data}`);
  });
  goServerProcess.on("close", (code) => {
    console.log(`go-server process exited with code ${code}`);
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    goServerProcess == null ? void 0 : goServerProcess.kill();
    goServerProcess = null;
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  startGoServer();
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
