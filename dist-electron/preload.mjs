let electron = require("electron");
//#region electron/preload.ts
electron.contextBridge.exposeInMainWorld("tracyAPI", {
	invoke: (channel, args) => electron.ipcRenderer.invoke(channel, args),
	on: (channel, listener) => {
		electron.ipcRenderer.on(channel, listener);
		return () => electron.ipcRenderer.removeListener(channel, listener);
	}
});
//#endregion
