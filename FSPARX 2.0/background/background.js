// Background service worker for FSPARX 2.0
console.log('FSPARX 2.0 Background Service Worker loaded');

// Extension installation/update handler
chrome.runtime.onInstalled.addListener(function(details) {
    console.log('FSPARX 2.0 installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        // Set default settings on first install
        chrome.storage.sync.set({
            fsparxEnabled: true,
            version: '2.0.0'
        });
        
        // Open welcome page or show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '../icons/icon48.png',
            title: 'FSPARX 2.0 Installed',
            message: 'Welcome to FSPARX 2.0! Click the extension icon to get started.'
        });
    }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received:', request);
    
    switch (request.action) {
        case 'getSettings':
            chrome.storage.sync.get(null, function(settings) {
                sendResponse(settings);
            });
            return true; // Keep message channel open for async response
            
        case 'updateSettings':
            chrome.storage.sync.set(request.settings, function() {
                sendResponse({ success: true });
            });
            return true;
            
        case 'logEvent':
            console.log('Event from content script:', request.event);
            break;
            
        default:
            console.log('Unknown action:', request.action);
    }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tab.url);
        
        // You can inject content scripts or perform actions here
        // based on the URL or other conditions
    }
});

// Handle browser action click (if popup is not available)
chrome.action.onClicked.addListener(function(tab) {
    console.log('Extension icon clicked on tab:', tab.url);
});

// Alarm handling (for periodic tasks)
chrome.alarms.onAlarm.addListener(function(alarm) {
    console.log('Alarm triggered:', alarm.name);
    
    // Handle different types of alarms
    switch (alarm.name) {
        case 'periodic_check':
            // Perform periodic tasks
            break;
        default:
            console.log('Unknown alarm:', alarm.name);
    }
});

// Context menu creation (optional)
chrome.runtime.onStartup.addListener(function() {
    createContextMenus();
});

chrome.runtime.onInstalled.addListener(function() {
    createContextMenus();
});

function createContextMenus() {
    chrome.contextMenus.removeAll(function() {
        chrome.contextMenus.create({
            id: 'fsparx-main',
            title: 'FSPARX 2.0',
            contexts: ['all']
        });
        
        chrome.contextMenus.create({
            id: 'fsparx-toggle',
            parentId: 'fsparx-main',
            title: 'Toggle Extension',
            contexts: ['all']
        });
    });
}

// Context menu click handler
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    switch (info.menuItemId) {
        case 'fsparx-toggle':
            // Toggle extension state
            chrome.storage.sync.get(['fsparxEnabled'], function(result) {
                const newState = !result.fsparxEnabled;
                chrome.storage.sync.set({ fsparxEnabled: newState });
                
                // Send message to content script
                chrome.tabs.sendMessage(tab.id, {
                    action: 'toggleExtension',
                    enabled: newState
                });
            });
            break;
    }
});
