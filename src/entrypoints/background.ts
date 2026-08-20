export default defineBackground(() => {
  console.log('FlowSpeed background service worker initialized');

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        console.log('FlowSpeed Extension installed!');
      }
    });
  }
});
