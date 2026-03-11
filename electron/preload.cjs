const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close:    () => ipcRenderer.send("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),

  runScript: (scriptContent) =>
    ipcRenderer.invoke("run-ps-script", scriptContent),

  onScriptOutput: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on("ps-output", handler);
    return () => ipcRenderer.removeListener("ps-output", handler);
  },

  onMaximizeChange: (callback) => {
    const handler = (_, isMaximized) => callback(isMaximized);
    ipcRenderer.on("maximize-change", handler);
    return () => ipcRenderer.removeListener("maximize-change", handler);
  },

  saveFile: (content, defaultName) =>
    ipcRenderer.invoke("save-file", { content, defaultName }),

  openFile: () =>
    ipcRenderer.invoke("open-file"),
});
