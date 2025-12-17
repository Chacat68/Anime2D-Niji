import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  chooseDirectory: () => ipcRenderer.invoke('chooseDirectory'),
  listImages: (dirPath) => ipcRenderer.invoke('listImages', dirPath),
  generateImage: (payload) => ipcRenderer.invoke('generateImage', payload)
});
