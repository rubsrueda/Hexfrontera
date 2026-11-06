'use strict';
/* Preload de Hexfrontier: única superficie entre el renderer y Node.

   contextIsolation: true + sandbox: true ⇒ aquí no hay `fs` ni `path`; todo
   pasa por IPC y con una API mínima y explícita. Solo se exponen claves de
   guardado (nunca rutas), y el proceso principal valida el nombre de la clave.

   El contrato está documentado en js/platform.js.
*/
const { contextBridge, ipcRenderer } = require('electron');

const HFNative = {
  kind: 'electron',
  apiVersion: 1,
  platform: process.platform,
  versions: Object.freeze({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }),

  store: {
    // Síncrono a propósito: HF.store.get() se usa en toda la app y debe poder
    // responder en el mismo tick. La caché de js/platform.js evita repetirlo.
    get: key => {
      try { return ipcRenderer.sendSync('hf:store:get', key); }
      catch (e) { return null; }
    },
    path: () => {
      try { return ipcRenderer.sendSync('hf:store:path'); }
      catch (e) { return null; }
    },
    setMany: entries => ipcRenderer.invoke('hf:store:set-many', entries),
    // Volcado síncrono para pagehide/beforeunload/cierre de ventana.
    flushSync: entries => {
      try { return ipcRenderer.sendSync('hf:store:flush', entries); }
      catch (e) { return 0; }
    },
    keys: () => ipcRenderer.invoke('hf:store:keys')
  },

  // El principal manda `hf:before-quit` y espera a que el renderer guarde.
  // La confirmación se envía siempre, aunque el callback falle.
  onBeforeQuit(cb) {
    ipcRenderer.on('hf:before-quit', () => {
      try { cb(); }
      catch (e) { console.error('[preload] onBeforeQuit', e); }
      finally { ipcRenderer.send('hf:before-quit-done'); }
    });
  },

  ready: () => ipcRenderer.send('hf:renderer-ready'),
  openSaves: () => ipcRenderer.invoke('hf:saves:open'),
  quit: () => ipcRenderer.invoke('hf:app:quit')
};

contextBridge.exposeInMainWorld('HFNative', HFNative);
