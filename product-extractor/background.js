console.log('Extension background script loaded');

chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details);
    
    chrome.storage.sync.set({
        extensionSettings: {
            isEnabled: true,
            installDate: new Date().toISOString(),
            version: chrome.runtime.getManifest().version
        }
    });
    
    if (details.reason === 'install') {
        console.log('First time installation!');
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    switch(message.action) {
        case 'captureScreenshot':
            handleCaptureScreenshot(sender.tab, sendResponse);
            break;
            
        case 'getData':
            handleGetData(sendResponse);
            break;
            
        case 'saveData':
            handleSaveData(message.data, sendResponse);
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
    
    return true;
});

function handleCaptureScreenshot(tab, sendResponse) {
    chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (dataUrl) => {
        if (dataUrl) {
            sendResponse({ success: true, screenshot: dataUrl });
        } else {
            sendResponse({ success: false, error: 'Failed to capture screenshot' });
        }
    });
}

function handleGetData(sendResponse) {
    chrome.storage.sync.get(null, (data) => {
        sendResponse({ success: true, data: data });
    });
}

function handleSaveData(data, sendResponse) {
    chrome.storage.sync.set(data, () => {
        sendResponse({ success: true });
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tab.url);
    }
});