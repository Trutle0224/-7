const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('viweiDesktop', {
  hasKey: () => ipcRenderer.invoke('settings:has-key'),
  saveKey: (value) => ipcRenderer.invoke('settings:save-key', value),
  deleteKey: () => ipcRenderer.invoke('settings:delete-key'),
  hasYoutubeKey: () => ipcRenderer.invoke('youtube:has-key'),
  saveYoutubeKey: (value) => ipcRenderer.invoke('youtube:save-key', value),
  deleteYoutubeKey: () => ipcRenderer.invoke('youtube:delete-key'),
  searchYoutube: (query) => ipcRenderer.invoke('youtube:search', query),
  reply: (messages, memory) => ipcRenderer.invoke('chat:reply', { messages, memory }),
  generateImage: (prompt, reference) => ipcRenderer.invoke('image:generate', { prompt, reference })
});
