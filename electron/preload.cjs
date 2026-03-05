const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close:    () => ipcRenderer.send("window-close"),

  runScript: (scriptContent) =>
    ipcRenderer.invoke("run-ps-script", scriptContent),

  onScriptOutput: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on("ps-output", handler);
    return () => ipcRenderer.removeListener("ps-output", handler);
  },
});
