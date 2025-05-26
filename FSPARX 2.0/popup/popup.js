// Popup script for FSPARX 2.0
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggle-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');

    // Load saved state
    loadExtensionState();

    // Toggle button event listener
    toggleBtn.addEventListener('click', function() {
        toggleExtension();
    });

    // Settings button event listener
    settingsBtn.addEventListener('click', function() {
        openSettings();
    });

    // Load extension state from storage
    function loadExtensionState() {
        chrome.storage.sync.get(['fsparxEnabled'], function(result) {
            const isEnabled = result.fsparxEnabled !== false; // Default to true
            updateUI(isEnabled);
        });
    }

    // Toggle extension on/off
    function toggleExtension() {
        chrome.storage.sync.get(['fsparxEnabled'], function(result) {
            const currentState = result.fsparxEnabled !== false;
            const newState = !currentState;
            
            chrome.storage.sync.set({ fsparxEnabled: newState }, function() {
                updateUI(newState);
                
                // Send message to content script
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'toggleExtension',
                        enabled: newState
                    });
                });
            });
        });
    }

    // Update UI based on extension state
    function updateUI(isEnabled) {
        if (isEnabled) {
            statusText.textContent = 'Extension Active';
            statusIndicator.classList.add('active');
            toggleBtn.textContent = 'Disable';
        } else {
            statusText.textContent = 'Extension Disabled';
            statusIndicator.classList.remove('active');
            toggleBtn.textContent = 'Enable';
        }
    }

    // Open settings (placeholder)
    function openSettings() {
        // You can implement a settings page here
        alert('Settings functionality coming soon!');
    }

    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const currentTab = tabs[0];
        console.log('Current tab:', currentTab.url);
    });
});
