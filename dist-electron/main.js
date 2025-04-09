import { app as s, BrowserWindow as c, Menu as u } from "electron";
import { fileURLToPath as R } from "node:url";
import e from "node:path";
import { spawn as _ } from "node:child_process";
const a = e.dirname(R(import.meta.url));
process.env.APP_ROOT = e.join(a, "..");
const t = process.env.VITE_DEV_SERVER_URL, h = e.join(process.env.APP_ROOT, "dist-electron"), d = e.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = t ? e.join(process.env.APP_ROOT, "public") : d;
let o, n = null;
function p() {
  u.setApplicationMenu(null), o = new c({
    icon: e.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: e.join(a, "preload.mjs")
    }
  }), o.webContents.on("did-finish-load", () => {
    o == null || o.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), t ? o.loadURL(t) : o.loadFile(e.join(d, "index.html"));
}
function v() {
  var i, l;
  const m = e.join(process.resourcesPath, "go-server.exe");
  n = _(m, [], {
    cwd: process.resourcesPath,
    // 工作目录可以和 go-server.exe 放一起
    detached: !0
    // 可选：为了在主进程退出后也能继续独立运行
  }), (i = n.stdout) == null || i.on("data", (r) => {
    console.log(`go-server output: ${r}`);
  }), (l = n.stderr) == null || l.on("data", (r) => {
    console.error(`go-server error: ${r}`);
  }), n.on("close", (r) => {
    console.log(`go-server process exited with code ${r}`);
  });
}
s.on("window-all-closed", () => {
  process.platform !== "darwin" && (n == null || n.kill(), n = null, s.quit(), o = null);
});
s.on("activate", () => {
  c.getAllWindows().length === 0 && p();
});
s.whenReady().then(() => {
  v(), p();
});
export {
  h as MAIN_DIST,
  d as RENDERER_DIST,
  t as VITE_DEV_SERVER_URL
};
