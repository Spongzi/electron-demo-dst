import { app as s, BrowserWindow as l, Menu as R } from "electron";
import { fileURLToPath as _ } from "node:url";
import e from "node:path";
import { spawn as v } from "node:child_process";
import * as w from "os";
const a = e.dirname(_(import.meta.url));
process.env.APP_ROOT = e.join(a, "..");
const t = process.env.VITE_DEV_SERVER_URL, T = e.join(process.env.APP_ROOT, "dist-electron"), p = e.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = t ? e.join(process.env.APP_ROOT, "public") : p;
let o, n = null;
function d() {
  R.setApplicationMenu(null), o = new l({
    icon: e.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: e.join(a, "preload.mjs")
    }
  }), o.webContents.on("did-finish-load", () => {
    o == null || o.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), t ? o.loadURL(t) : o.loadFile(e.join(p, "index.html"));
}
function f() {
  var i, c;
  const m = w.arch(), u = e.join(
    process.resourcesPath,
    m === "x64" ? "x64" : "ia32",
    "go-server.exe"
  );
  n = v(u, [], {
    cwd: process.resourcesPath,
    // 工作目录可以和 go-server.exe 放一起
    detached: !0
    // 可选：为了在主进程退出后也能继续独立运行
  }), (i = n.stdout) == null || i.on("data", (r) => {
    console.log(`go-server output: ${r}`);
  }), (c = n.stderr) == null || c.on("data", (r) => {
    console.error(`go-server error: ${r}`);
  }), n.on("close", (r) => {
    console.log(`go-server process exited with code ${r}`);
  });
}
s.on("window-all-closed", () => {
  process.platform !== "darwin" && (n == null || n.kill(), n = null, s.quit(), o = null);
});
s.on("activate", () => {
  l.getAllWindows().length === 0 && d();
});
s.whenReady().then(() => {
  f(), d();
});
export {
  T as MAIN_DIST,
  p as RENDERER_DIST,
  t as VITE_DEV_SERVER_URL
};
