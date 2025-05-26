// FSPARX 2.0 - Content Script
// Adds F* Sparx button to Sparx Reader sidebar

(function() {    'use strict';
    
    // Check if we're on the Sparx Reader library page or any of its subpages
    function isSparxLibraryPage() {
        return window.location.href.startsWith('https://reader.sparx-learning.com/library');
    }
    
    // Wait for specific elements to appear and continuously monitor
    function waitForSidebarAndAddButton() {
        const checkInterval = 50; // Check every 50ms for faster detection
        
        function check() {
            // Only proceed if we're on the right page and button doesn't exist
            if (!isSparxLibraryPage() || document.querySelector('.fsparx-custom-button')) {
                return;
            }
            
            // Try to find and add the button immediately when sidebar is detected
            const sidebarFound = tryAddFSparxButton();
            
            if (!sidebarFound) {
                // Continue checking if sidebar not found yet
                setTimeout(check, checkInterval);
            }
        }
        
        check();
    }
      // Separate function to try adding the button without delays
    function tryAddFSparxButton() {
        // Look for the sidebar container immediately
        let sidebar = null;
        
        // Primary approach: look for any container with multiple button elements
        const allButtonDivs = document.querySelectorAll('div[role="button"]');
        if (allButtonDivs.length >= 2) { // At least 2 buttons suggests a navigation sidebar
            const buttonParents = new Map();
            
            allButtonDivs.forEach(button => {
                if (button.parentElement) {
                    const parent = button.parentElement;
                    const count = buttonParents.get(parent) || 0;
                    buttonParents.set(parent, count + 1);
                }
            });
            
            // Find the parent with the most button children (likely the sidebar)
            let maxCount = 0;
            buttonParents.forEach((count, parent) => {
                if (count > maxCount && count >= 2) { // At least 2 buttons suggests it's a sidebar
                    maxCount = count;
                    sidebar = parent;
                }
            });
        }
        
        // Alternative approach: look for any SVG icon and traverse up
        if (!sidebar) {
            const anyIcon = document.querySelector('div[role="button"] svg');
            if (anyIcon) {
                let parent = anyIcon.closest('div[role="button"]');
                if (parent && parent.parentElement) {
                    // Check if parent contains multiple buttons
                    const siblingButtons = parent.parentElement.querySelectorAll('div[role="button"]');
                    if (siblingButtons.length >= 2) {
                        sidebar = parent.parentElement;
                    }
                }
            }
        }
        
        // Fallback: look for a container with vertical layout of buttons
        if (!sidebar) {
            const containers = document.querySelectorAll('div');
            containers.forEach(container => {
                const buttons = container.querySelectorAll(':scope > div[role="button"]');
                if (buttons.length >= 2 && !sidebar) {
                    // Check if it looks like a vertical sidebar layout
                    const containerRect = container.getBoundingClientRect();                    if (containerRect.height > containerRect.width && containerRect.width < 200) {
                        sidebar = container;
                    }
                }
            });
        }
        
        if (sidebar) {
            // Check if our button already exists
            if (sidebar.querySelector('.fsparx-custom-button')) {
                return true;
            }
            
            
            // Add spacing before our button
            const spacer = document.createElement('div');
            spacer.style.flexGrow = '1';
            sidebar.appendChild(spacer);
            
            const fsparxButton = createFSparxButton();
            sidebar.appendChild(fsparxButton);
            return true;
        }
        
        return false;
    }// Create the F* Sparx button
    function createFSparxButton() {
        // Get the extension URL for the logo
        const logoUrl = chrome.runtime.getURL('icons/logo.svg');        // Find any button to copy its className structure
        // Get all buttons and find one that's inactive (has only one class vs active buttons with two classes)
        const allButtons = document.querySelectorAll('div[role="button"]');
        let inactiveButton = null;
        
        // Look for buttons with the pattern: active buttons have "sr_83ed1e6d sr_fa94d783" (two classes)
        // while inactive buttons have only "sr_83ed1e6d" (one class)
        for (let i = 0; i < allButtons.length; i++) {
            const button = allButtons[i];
            const classes = button.className.trim().split(/\s+/);
            
            // Skip our own button if it exists
            if (button.classList.contains('fsparx-custom-button')) {
                continue;
            }
            
            // Look for buttons that have exactly one class (inactive) vs multiple classes (active)
            // Also check that it has the base class that starts with "sr_"
            if (classes.length === 1 && classes[0].startsWith('sr_')) {
                inactiveButton = button;
                break;
            }
        }
        
        // Fallback: if pattern doesn't match, look for any button that's not the first one (Home is usually first and active)
        if (!inactiveButton && allButtons.length > 1) {
            // Skip the first button (likely Home/active) and use the second one
            for (let i = 1; i < allButtons.length; i++) {
                if (!allButtons[i].classList.contains('fsparx-custom-button')) {
                    inactiveButton = allButtons[i];
                    break;
                }
            }
        }
        
        // Create the button container with the same structure as other buttons
        const buttonContainer = document.createElement('div');
        if (inactiveButton) {
            buttonContainer.className = inactiveButton.className;
        } else {
            // Fallback: use generic classes that match the structure
            buttonContainer.setAttribute('role', 'button');
            buttonContainer.setAttribute('tabindex', '1');
            buttonContainer.style.cursor = 'pointer';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.flexDirection = 'column';
            buttonContainer.style.alignItems = 'center';
            buttonContainer.style.padding = '8px';
            buttonContainer.style.color = '#aaa8bf';
            buttonContainer.style.fontSize = '12px';
        }
        
        // Add a unique identifier to prevent duplicates
        buttonContainer.classList.add('fsparx-custom-button');
          // Create the image element for the logo
        const logoImg = document.createElement('img');
        logoImg.src = logoUrl;
        logoImg.style.width = '64px';
        logoImg.style.height = '64px';
        logoImg.style.filter = 'brightness(0) saturate(100%) invert(67%) sepia(8%) saturate(394%) hue-rotate(225deg) brightness(91%) contrast(87%)'; // Match the AAA8BF color
        
        // Create the span for the label
        const labelSpan = document.createElement('span');
        labelSpan.textContent = 'F* Sparx';
        
        // Assemble the button
        buttonContainer.appendChild(logoImg);
        buttonContainer.appendChild(labelSpan);
          // Add click event
        buttonContainer.addEventListener('click', function() {

            toggleFSparxMode(this);
        });
        
        // Add hover effects similar to other buttons
        buttonContainer.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        });
        
        buttonContainer.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
          return buttonContainer;
    }

    // Global state management
    let fsparxState = {
        isActive: false,
        originalContent: null,
        scrollableDiv: null,
        button: null,
        originalButtonStates: new Map(), // Store original button classes
        activeButtonClassName: null, // Store active button styling
        originalUrl: null, // Store original URL for restoration
        networkBlockers: [], // Store network request interceptors
        wasGoldReaderActive: false, // Store Gold Reader state before deactivation
        originallyActiveButton: null, // Store which button was originally active
        originallyActiveButtonText: null, // Store the text of the originally active button for identification
        sessionStartTime: Date.now(), // Track session start time for statistics
        userFirstName: null // Store the user's detected first name
    };

    // Toggle F* Sparx mode
    function toggleFSparxMode(buttonElement) {
        fsparxState.button = buttonElement;
        
        if (fsparxState.isActive) {
            deactivateFSparx();        } else {
            activateFSparx();
        }
    }

    // Activate F* Sparx mode
    function activateFSparx() {
        
        // FIRST: Store all states BEFORE making any changes
        // Store active button styling BEFORE deactivating other buttons
        const activeButton = findActiveButton();
        if (activeButton) {
            fsparxState.activeButtonClassName = activeButton.className;
            fsparxState.originallyActiveButton = activeButton;
            fsparxState.originallyActiveButtonText = activeButton.textContent?.trim() || '';
        }
        
        // Check Gold Reader state BEFORE deactivating other buttons
        const goldReaderButton = findGoldReaderButton();
        fsparxState.wasGoldReaderActive = goldReaderButton ? isButtonActive(goldReaderButton) : false;
        
        // Start monitoring for Continue Reading modals
        startContinueReadingModalMonitoring();
        
        // Find the scrollable div with wildcard class matching (div.scrollable.sr_*)
        const scrollableDiv = findScrollableDiv();
        if (!scrollableDiv) {
            console.error('Could not find scrollable div');
            return;
        }
        
        fsparxState.scrollableDiv = scrollableDiv;
        
        // Store original content for manual deactivation only
        fsparxState.originalContent = scrollableDiv.innerHTML;
        
        // Store original URL for restoration
        fsparxState.originalUrl = window.location.href;
        
        // Change URL cosmetically to show F* Sparx is active
        const newUrl = window.location.origin + window.location.pathname + '?fsparx=active';
        window.history.replaceState({ fsparxActive: true }, 'F* Sparx - Active', newUrl);        // Clear the contents
        scrollableDiv.innerHTML = '';        // Create F* Sparx main interface
        const fsparxInterface = createFSparxInterface();
        scrollableDiv.appendChild(fsparxInterface);
        
        // Store original button states for manual deactivation only
        storeAndDeactivateOtherButtons();
        
        // Block network requests to prevent interference
        blockNetworkRequests();
          // Update button appearance to active state (with enhanced icon switching)
        updateButtonAppearance(true);
        
        // Additional icon verification after a short delay
        setTimeout(() => {
            const img = fsparxState.button?.querySelector('img');
            if (img) {
            }
        }, 300);
          // Set active state
        fsparxState.isActive = true;
        
        // Apply anonymization if enabled
        if (getAnonymiseState()) {
            applyAnonymisation(true);
        }
    }

    // Deactivate F* Sparx mode (when toggling off manually)
    function deactivateFSparx() {
        
        // STEP 1: Restore network requests first (critical for Sparx functionality)
        restoreNetworkRequests();
        
        // STEP 2: Clear F* Sparx content from DOM
        if (fsparxState.scrollableDiv && fsparxState.isActive) {
            fsparxState.scrollableDiv.innerHTML = '';
        }
        
        // STEP 3: Restore original URL
        if (fsparxState.originalUrl) {
            window.history.replaceState(null, '', fsparxState.originalUrl);
        }
          // STEP 4: Reset F* Sparx state
        fsparxState.isActive = false;
        fsparxState.originalContent = null;
          // Disable anonymization when deactivating
        applyAnonymisation(false);
        
        // Stop monitoring for Continue Reading modals
        stopContinueReadingModalMonitoring();
        
        // STEP 5: Update F* Sparx button to inactive state
        updateButtonAppearance(false);
        
        // STEP 6: Restore button states and get originally active button
        const originallyActiveButton = restoreOtherButtons();        // STEP 7: Trigger navigation to originally active button (let Sparx handle content loading)
        if (originallyActiveButton) {
            
            setTimeout(() => {
                // Trigger a click event on the originally active button
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                originallyActiveButton.dispatchEvent(clickEvent);
            }, 100);
        } else {
            console.warn('No originally active button found - may result in blank page');
            
            // Fallback: try to click the first button (usually Home)
            const allButtons = document.querySelectorAll('div[role="button"]');
            const firstButton = Array.from(allButtons).find(btn => !btn.classList.contains('fsparx-custom-button'));
            
            if (firstButton) {
                setTimeout(() => {
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    firstButton.dispatchEvent(clickEvent);
                }, 100);
            }
        }
          // STEP 8: Clean up remaining state
        fsparxState.scrollableDiv = null;
        fsparxState.activeButtonClassName = null;
        fsparxState.originalUrl = null;
        fsparxState.wasGoldReaderActive = false; // Clear Gold Reader state after restoration
        fsparxState.originallyActiveButton = null;
        fsparxState.originallyActiveButtonText = null;
        
    }

    // Get the originally active button from stored states
    function getOriginallyActiveButton() {
        let originallyActiveButton = null;
        
        fsparxState.originalButtonStates.forEach((buttonState, button) => {
            if (buttonState.wasActive) {
                originallyActiveButton = button;
            }
        });
        
        return originallyActiveButton;
    }

    // Create Gold Reader indicator with proper state-based coloring
    function createGoldReaderIndicator(scrollableDiv, isGoldReaderActive) {
        
        // Create and add the Gold Reader icon with appropriate styling based on stored state
        const iconElement = document.createElement('div');
        iconElement.className = 'gold-reader-indicator';
        
        if (isGoldReaderActive) {
            // Active state: Use gold-colored star icon
            iconElement.innerHTML = `
                <svg width="40" height="40" viewBox="0 0 65 65" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <style>
                            .cls-1{fill:none;}
                            .cls-2{clip-path:url(#clippath);}
                            .cls-3{fill:#fff;}
                            .cls-4{fill:#FFD800;}
                            .cls-5{clip-path:url(#clippath-1);}
                        </style>
                        <clipPath id="clippath">
                            <rect class="cls-1" width="65" height="65"/>
                        </clipPath>
                        <clipPath id="clippath-1">
                            <rect class="cls-1" x="1" y="1" width="63" height="63"/>
                        </clipPath>
                    </defs>
                    <g class="cls-2">
                        <g id="GR_selected">
                            <g id="Group_3390">
                                <g class="cls-5">
                                    <g id="Group_3389">
                                        <path id="Path_3200" class="cls-4" d="m64,32.5c0,17.4-14.1,31.5-31.5,31.5S1,49.9,1,32.5,15.1,1,32.5,1s31.5,14.1,31.5,31.5"/>
                                        <path id="Path_3201" class="cls-3" d="m33.89,18.58l3.56,7.22c.23.47.67.79,1.19.86l7.97,1.16c.86.13,1.46.93,1.33,1.79-.05.34-.21.66-.46.9l-5.76,5.62c-.37.36-.54.88-.45,1.39l1.36,7.93c.15.86-.43,1.67-1.28,1.82-.34.06-.7,0-1-.16l-7.13-3.74c-.46-.24-1.01-.24-1.46,0l-7.13,3.74c-.77.4-1.72.11-2.12-.66-.16-.31-.22-.66-.16-1l1.36-7.93c.09-.51-.08-1.03-.45-1.39l-5.77-5.62c-.62-.61-.64-1.6-.03-2.23.24-.25.56-.41.9-.46l7.97-1.16c.51-.07.96-.4,1.18-.86l3.56-7.22c.38-.78,1.33-1.1,2.11-.72.31.15.56.4.72.72"/>
                                    </g>
                                </g>
                            </g>
                        </g>
                    </g>
                </svg>
            `;
        } else {
            // Inactive state: Use grey star icon (exact copy from Sparx)
            iconElement.innerHTML = `
                <svg width="40" height="40" viewBox="0 0 65 65" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <style>
                            .cls-1{fill:none;}
                            .cls-2{clip-path:url(#clippath);}
                            .cls-3{fill:#fff;}
                            .cls-4{fill:#aaa8bf;}
                            .cls-5{clip-path:url(#clippath-1);}
                        </style>
                        <clipPath id="clippath">
                            <rect class="cls-1" width="65" height="65"/>
                        </clipPath>
                        <clipPath id="clippath-1">
                            <rect class="cls-1" x="1" y="1" width="63" height="63"/>
                        </clipPath>
                    </defs>
                    <g class="cls-2">
                        <g id="GR_deselected">
                            <g id="Group_3390">
                                <g class="cls-5">
                                    <g id="Group_3389">
                                        <path id="Path_3200" class="cls-4" d="m64,32.5c0,17.4-14.1,31.5-31.5,31.5S1,49.9,1,32.5,15.1,1,32.5,1s31.5,14.1,31.5,31.5"/>
                                        <path id="Path_3201" class="cls-3" d="m33.89,18.58l3.56,7.22c.23.47.67.79,1.19.86l7.97,1.16c.86.13,1.46.93,1.33,1.79-.05.34-.21.66-.46.9l-5.76,5.62c-.37.36-.54.88-.45,1.39l1.36,7.93c.15.86-.43,1.67-1.28,1.82-.34.06-.7,0-1-.16l-7.13-3.74c-.46-.24-1.01-.24-1.46,0l-7.13,3.74c-.77.4-1.72.11-2.12-.66-.16-.31-.22-.66-.16-1l1.36-7.93c.09-.51-.08-1.03-.45-1.39l-5.77-5.62c-.62-.61-.64-1.6-.03-2.23.24-.25.56-.41.9-.46l7.97-1.16c.51-.07.96-.4,1.18-.86l3.56-7.22c.38-.78,1.33-1.1,2.11-.72.31.15.56.4.72.72"/>
                                    </g>
                                </g>
                            </g>
                        </g>
                    </g>
                </svg>
            `;
        }
        
        iconElement.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            z-index: 1000;
            pointer-events: none;
        `;
        
        scrollableDiv.appendChild(iconElement);
        
        return isGoldReaderActive;
    }

    // Create comprehensive F* Sparx interface
    function createFSparxInterface() {
        const container = document.createElement('div');        container.style.cssText = `
            padding: 48px;
            max-width: 1200px;
            margin: 0 auto;
            color: #2e3c71;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            min-height: 100vh;
            overflow-y: auto;
        `;

        // Header section with logo and title
        const header = document.createElement('div');
        header.innerHTML = `
            <div style="margin-bottom: 40px;">
                <h2 style="display: flex; align-items: center; color: #2e3c71; margin-bottom: 8px; font-size: 32px; font-weight: 600;">
                    F* Sparx
                    <img alt="F* Sparx Logo" style="width: 32px; height: 32px; margin-left: 16px;" src="${chrome.runtime.getURL('icons/logo-active.svg')}">
                </h2>
                <p style="color: #64748b; font-size: 14px; margin: 0; display: flex; align-items: center;">
                    Made by @zin.i 
                    <svg style="width: 16px; height: 16px; margin-left: 8px; fill: #3b82f6;" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                </p>
            </div>
        `;

        // Main content area
        const mainContent = document.createElement('div');
        mainContent.style.marginTop = '32px';

        // Settings Panel
        const settingsPanel = createSettingsPanel();
        
        // Statistics Panel  
        const statsPanel = createStatsPanel();        // Discord Panel
        const discordPanel = createDiscordPanel();

        mainContent.appendChild(settingsPanel);
        mainContent.appendChild(statsPanel);
        mainContent.appendChild(discordPanel);

        container.appendChild(header);
        container.appendChild(mainContent);

        return container;
    }

    // Create settings panel
    function createSettingsPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            margin-bottom: 32px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            padding: 24px;
            border: 1px solid #e2e8f0;
        `;
        
        panel.innerHTML = `
            <h3 style="color: #2e3c71; margin-bottom: 24px; font-size: 20px; font-weight: 600;">⚙️ Settings</h3>
            
            <!-- Reading Speed Setting -->
            <div style="margin-bottom: 24px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <label style="color: #2e3c71; font-weight: 500; display: block; margin-bottom: 12px; font-size: 16px;">
                    Reading Speed: <span id="reading-speed-value">200</span> WPM
                </label>                <input type="range" id="reading-speed-slider" min="100" max="400" value="200" 
                       style="width: 100%; margin-bottom: 8px; accent-color: #3b82f6; height: 6px; background: #e2e8f0; border-radius: 3px; appearance: none; outline: none;">
                <p id="reading-speed-age" style="color: #64748b; font-size: 12px; font-style: italic; margin: 0; line-height: 1.4;">
                    Reading Speed Age: 13-16 y/o
                </p>
            </div>            <!-- Anonymise Setting -->
            <div style="margin-bottom: 24px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <label style="color: #2e3c71; font-weight: 500; display: block; margin-bottom: 4px; font-size: 16px;">
                            🕶️ Anonymise Me
                        </label>
                        <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.4;">
                            Hide your name and replace it with "F* Sparx" throughout the page
                        </p>
                    </div>
                    <label class="toggle-switch" style="position: relative; display: inline-block; width: 50px; height: 24px;">
                        <input type="checkbox" id="anonymise-toggle" style="opacity: 0; width: 0; height: 0;">
                        <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; 
                                   background-color: ${getAnonymiseState() ? '#3b82f6' : '#cbd5e1'}; transition: .4s; border-radius: 24px;">
                            <span style="position: absolute; content: ''; height: 18px; width: 18px; left: ${getAnonymiseState() ? '29px' : '3px'}; 
                                       bottom: 3px; background-color: #ffffff; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></span>
                        </span>
                    </label>
                </div>
            </div>

            <!-- API Key Settings -->
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <label style="color: #2e3c71; font-weight: 500; display: block; margin-bottom: 12px; font-size: 16px;">
                    🔑 AI Provider Settings
                </label>
                
                <!-- Provider Toggle -->
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; background: white; border-radius: 6px; padding: 4px; border: 1px solid #e2e8f0;">
                        <button id="cohere-btn" class="provider-btn" data-provider="cohere" style="
                            flex: 1; padding: 8px 16px; border: none; border-radius: 4px; font-weight: 500; 
                            cursor: pointer; transition: all 0.2s; font-size: 14px;
                            background: ${getAPIProvider() === 'cohere' ? '#3b82f6' : 'transparent'};
                            color: ${getAPIProvider() === 'cohere' ? 'white' : '#64748b'};
                        ">
                            Cohere
                        </button>
                        <button id="mistral-btn" class="provider-btn" data-provider="mistral" style="
                            flex: 1; padding: 8px 16px; border: none; border-radius: 4px; font-weight: 500; 
                            cursor: pointer; transition: all 0.2s; font-size: 14px;
                            background: ${getAPIProvider() === 'mistral' ? '#3b82f6' : 'transparent'};
                            color: ${getAPIProvider() === 'mistral' ? 'white' : '#64748b'};
                        ">
                            Mistral
                        </button>
                    </div>
                </div>

                <!-- API Key Input -->
                <div style="margin-bottom: 16px;">
                    <input type="password" id="api-key-input" placeholder="Enter your API key..." 
                           value="${getAPIKey()}" 
                           style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; 
                                  font-size: 14px; background: white; color: #2e3c71; outline: none; 
                                  transition: border-color 0.2s;">
                </div>

                <!-- Tutorial Links -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button id="cohere-tutorial-btn" style="
                        padding: 6px 12px; border: 1px solid #3b82f6; background: transparent; 
                        color: #3b82f6; border-radius: 4px; font-size: 12px; cursor: pointer; 
                        text-decoration: none; display: inline-flex; align-items: center; gap: 4px;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#3b82f6'; this.style.color='white';" 
                       onmouseout="this.style.background='transparent'; this.style.color='#3b82f6';">
                        📹 Cohere Setup
                    </button>
                    <button id="mistral-tutorial-btn" style="
                        padding: 6px 12px; border: 1px solid #f97316; background: transparent; 
                        color: #f97316; border-radius: 4px; font-size: 12px; cursor: pointer; 
                        text-decoration: none; display: inline-flex; align-items: center; gap: 4px;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#f97316'; this.style.color='white';" 
                       onmouseout="this.style.background='transparent'; this.style.color='#f97316';">
                        📹 Mistral Setup
                    </button>
                </div>

                <p style="color: #64748b; font-size: 11px; margin: 8px 0 0 0; line-height: 1.4;">
                    API keys are stored locally and never shared. Click tutorial links for setup instructions.
                </p>
            </div>
        `;        // Add event listeners
        setTimeout(() => {
            const speedSlider = panel.querySelector('#reading-speed-slider');
            const speedValue = panel.querySelector('#reading-speed-value');
            const speedAge = panel.querySelector('#reading-speed-age');
            const anonymiseToggle = panel.querySelector('#anonymise-toggle');

            if (speedSlider && speedValue && speedAge) {
                const initialSpeed = getReadingSpeed();
                speedSlider.value = initialSpeed;
                speedValue.textContent = initialSpeed;
                speedAge.textContent = `Reading Speed Age: ${getAgeRangeFromWPM(initialSpeed)}`;
                
                speedSlider.addEventListener('input', (e) => {
                    const value = e.target.value;
                    speedValue.textContent = value;
                    speedAge.textContent = `Reading Speed Age: ${getAgeRangeFromWPM(value)}`;
                    saveReadingSpeed(value);
                });
            }

            if (anonymiseToggle) {
                anonymiseToggle.checked = getAnonymiseState();
                anonymiseToggle.addEventListener('change', (e) => {
                    saveAnonymiseState(e.target.checked);
                    updateToggleAppearance(e.target, e.target.checked);
                    applyAnonymisation(e.target.checked);
                });
            }

            // API Provider toggle buttons
            const cohereBtn = panel.querySelector('#cohere-btn');
            const mistralBtn = panel.querySelector('#mistral-btn');
            const apiKeyInput = panel.querySelector('#api-key-input');
            const cohereTutorialBtn = panel.querySelector('#cohere-tutorial-btn');
            const mistralTutorialBtn = panel.querySelector('#mistral-tutorial-btn');

            function updateProviderButtons(selectedProvider) {
                [cohereBtn, mistralBtn].forEach(btn => {
                    const isSelected = btn.dataset.provider === selectedProvider;
                    btn.style.background = isSelected ? '#3b82f6' : 'transparent';
                    btn.style.color = isSelected ? 'white' : '#64748b';
                });
            }

            if (cohereBtn && mistralBtn) {
                cohereBtn.addEventListener('click', () => {
                    saveAPIProvider('cohere');
                    updateProviderButtons('cohere');
                });

                mistralBtn.addEventListener('click', () => {
                    saveAPIProvider('mistral');
                    updateProviderButtons('mistral');
                });

                // Initialize provider buttons
                updateProviderButtons(getAPIProvider());
            }

            if (apiKeyInput) {
                apiKeyInput.addEventListener('input', (e) => {
                    saveAPIKey(e.target.value);
                });

                // Show/hide API key on focus/blur
                apiKeyInput.addEventListener('focus', () => {
                    apiKeyInput.type = 'text';
                });
                
                apiKeyInput.addEventListener('blur', () => {
                    apiKeyInput.type = 'password';
                });
            }

            // Tutorial button event listeners
            if (cohereTutorialBtn) {
                cohereTutorialBtn.addEventListener('click', () => {
                    window.open('https://docs.cohere.com/docs/rate-limits', '_blank');
                });
            }

            if (mistralTutorialBtn) {
                mistralTutorialBtn.addEventListener('click', () => {
                    window.open('https://docs.mistral.ai/getting-started/quickstart/', '_blank');
                });
            }
        }, 100);

        return panel;
    }

    // Create statistics panel
    function createStatsPanel() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            margin-bottom: 32px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            padding: 24px;
            border: 1px solid #e2e8f0;
        `;
        
        const sessionStats = getSessionStats();
        const allTimeStats = getAllTimeStats();

        panel.innerHTML = `
            <h3 style="color: #2e3c71; margin-bottom: 24px; font-size: 20px; font-weight: 600;">📊 Statistics</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                <!-- Session Stats -->
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
                    <div style="font-size: 36px; font-weight: 700; color: #3b82f6; margin-bottom: 8px;">
                        ${sessionStats.questionsAnswered}
                    </div>
                    <div style="color: #2e3c71; font-weight: 500; margin-bottom: 4px; font-size: 14px;">Questions This Session</div>
                    <div style="color: #64748b; font-size: 12px;">Since F* Sparx activation</div>
                </div>

                <!-- All Time Stats -->
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;">
                    <div style="font-size: 36px; font-weight: 700; color: #f59e0b; margin-bottom: 8px;">
                        ${allTimeStats.questionsAnswered}
                    </div>
                    <div style="color: #2e3c71; font-weight: 500; margin-bottom: 4px; font-size: 14px;">All Time Questions</div>
                    <div style="color: #64748b; font-size: 12px;">Total with F* Sparx</div>                </div>
            </div>
        `;

        return panel;
    }// Create Discord panel
    function createDiscordPanel() {
        const panel = document.createElement('div');
        panel.className = 'sr_8c0d5246 sr_98c377ee';
        panel.style.marginBottom = 'var(--spx-unit-5)';
        
        panel.innerHTML = `
            <div class="sr_20ba9f43">
                <div style="background: var(--colours-background-primary); padding: var(--spx-unit-5); border-radius: var(--border-radius-large); text-align: center; border: 1px solid var(--colours-border-primary);">
                    <h3 style="color: var(--colours-text-primary); margin-bottom: var(--spx-unit-4); font-size: var(--fonts-size-h3);">
                        💬 Join Our Community
                    </h3>
                    <p style="color: var(--colours-text-secondary); margin-bottom: var(--spx-unit-5); line-height: var(--line-height-body);">
                        Connect with other F* Sparx users, get support, and stay updated with the latest features!
                    </p>
                    <button type="button" id="discord-join-btn" style="
                        background: var(--royal-blue-100); 
                        color: var(--white); 
                        border: none; 
                        padding: var(--spx-unit-3) var(--spx-unit-6); 
                        border-radius: var(--border-radius-medium); 
                        font-weight: var(--fonts-weight-semibold); 
                        cursor: pointer; 
                        font-size: var(--fonts-size-body);
                        display: inline-flex;
                        align-items: center;
                        gap: var(--spx-unit-2);
                        transition: background 0.3s ease;
                    " onmouseover="this.style.background='var(--royal-blue-200)'" onmouseout="this.style.background='var(--royal-blue-100)'">
                        <svg style="width: 20px; height: 20px; fill: currentColor;" viewBox="0 0 24 24">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                        </svg>
                        Join Discord Server
                    </button>
                </div>
            </div>
        `;

        // Add Discord button functionality
        setTimeout(() => {
            const discordBtn = panel.querySelector('#discord-join-btn');
            if (discordBtn) {
                discordBtn.addEventListener('click', () => {
                    window.open('https://discord.gg/fsparx', '_blank');
                });
            }
        }, 100);

        return panel;
    }

    // Create Gold Reader note if detected
    function createGoldReaderNote() {
        const goldReaderButton = findGoldReaderButton();
        if (!goldReaderButton) return null;

        const wasGoldReaderActive = fsparxState.wasGoldReaderActive || false;
        
        const panel = document.createElement('div');
        panel.className = 'sr_8c0d5246 sr_98c377ee';
        panel.style.marginBottom = 'var(--spx-unit-5)';
        
        panel.innerHTML = `
            <div class="sr_20ba9f43">
                <div style="background: var(--colours-background-primary); padding: var(--spx-unit-4); border-radius: var(--border-radius-large); text-align: center; border: 1px solid var(--colours-border-primary);">
                    <h4 style="color: var(--colours-text-primary); margin-bottom: var(--spx-unit-2); display: flex; align-items: center; justify-content: center; gap: var(--spx-unit-2);">
                        <svg width="24" height="24" viewBox="0 0 65 65" xmlns="http://www.w3.org/2000/svg">
                            <path fill="${wasGoldReaderActive ? 'var(--palette-accent-orange-100)' : 'var(--slate-grey-100)'}" d="m64,32.5c0,17.4-14.1,31.5-31.5,31.5S1,49.9,1,32.5,15.1,1,32.5,1s31.5,14.1,31.5,31.5"/>
                            <path fill="var(--white)" d="m33.89,18.58l3.56,7.22c.23.47.67.79,1.19.86l7.97,1.16c.86.13,1.46.93,1.33,1.79-.05.34-.21.66-.46.9l-5.76,5.62c-.37.36-.54.88-.45,1.39l1.36,7.93c.15.86-.43,1.67-1.28,1.82-.34.06-.7,0-1-.16l-7.13-3.74c-.46-.24-1.01-.24-1.46,0l-7.13,3.74c-.77.4-1.72.11-2.12-.66-.16-.31-.22-.66-.16-1l1.36-7.93c.09-.51-.08-1.03-.45-1.39l-5.77-5.62c-.62-.61-.64-1.6-.03-2.23.24-.25.56-.41.9-.46l7.97-1.16c.51-.07.96-.4,1.18-.86l3.56-7.22c.38-.78,1.33-1.1,2.11-.72.31.15.56.4.72.72"/>
                        </svg>
                        Gold Reader Status
                    </h4>
                    <p style="color: ${wasGoldReaderActive ? 'var(--palette-accent-orange-100)' : 'var(--slate-grey-100)'}; margin: 0; font-size: var(--fonts-size-body);">
                        Gold Reader was ${wasGoldReaderActive ? 'active' : 'inactive'} when F* Sparx was activated
                    </p>
                </div>
            </div>
        `;

        return panel;
    }

    // Helper functions for settings persistence
    function getReadingSpeed() {
        return localStorage.getItem('fsparx-reading-speed') || '200';
    }

    function saveReadingSpeed(speed) {
        localStorage.setItem('fsparx-reading-speed', speed);
    }

    function getAgeRangeFromWPM(wpm) {
        const speed = parseInt(wpm);
        
        if (speed < 150) {
            return "7-12 y/o";
        } else if (speed < 200) {
            return "13-16 y/o";
        } else if (speed < 250) {
            return "16-17 y/o";
        } else if (speed < 300) {
            return "17+ y/o";
        } else {
            return "Adult (Advanced)";
        }
    }    function getAnonymiseState() {
        return localStorage.getItem('fsparx-anonymise') === 'true';
    }

    function saveAnonymiseState(state) {
        localStorage.setItem('fsparx-anonymise', state.toString());
    }

    function getAPIProvider() {
        return localStorage.getItem('fsparx-api-provider') || 'cohere';
    }

    function saveAPIProvider(provider) {
        localStorage.setItem('fsparx-api-provider', provider);
    }

    function getAPIKey() {
        return localStorage.getItem('fsparx-api-key') || '';
    }

    function saveAPIKey(key) {
        localStorage.setItem('fsparx-api-key', key);
    }

    function getSessionStats() {
        const sessionStart = fsparxState.sessionStartTime || Date.now();
        return {
            questionsAnswered: parseInt(sessionStorage.getItem('fsparx-session-questions') || '0'),
            timeActive: Date.now() - sessionStart
        };
    }

    function getAllTimeStats() {
        return {
            questionsAnswered: parseInt(localStorage.getItem('fsparx-total-questions') || '0'),
            totalSessions: parseInt(localStorage.getItem('fsparx-total-sessions') || '0')        };
    }

    function updateToggleAppearance(toggle, isChecked) {
        const slider = toggle.nextElementSibling;
        const knob = slider.querySelector('span');
        
        slider.style.backgroundColor = isChecked ? 'var(--royal-blue-100)' : 'var(--colours-background-tertiary)';
        knob.style.left = isChecked ? '29px' : '3px';
    }

    function applyAnonymisation(enabled) {
        if (enabled) {
            // Find the specific username element structure
            const nameElements = document.querySelectorAll('.sr_a1f0f913 span[data-sentry-mask="true"]');
            
            // Also look for other potential name locations
            const additionalNameElements = document.querySelectorAll('[data-testid*="name"], .username, .user-name');
            
            // Combine both sets of elements
            const allNameElements = [...nameElements, ...additionalNameElements];
            

            // If userFirstName is known, add it to the anonymization targets
            if (fsparxState.userFirstName) {
                const firstNameElements = Array.from(document.querySelectorAll('body *')).filter(element => {
                    return element.children.length === 0 && element.textContent && element.textContent.includes(fsparxState.userFirstName) && !element.closest('.fsparx-glitch-text') && !element.closest('[data-original-text]');
                });

                allNameElements.push(...firstNameElements);
            }
            
            allNameElements.forEach(el => {
                if (!el.dataset.originalText) {
                    el.dataset.originalText = el.textContent;


                    // Attempt to detect and store first name from the first element found
                    if (!fsparxState.userFirstName && el.textContent) {
                        const nameParts = el.textContent.trim().split(' ');
                        if (nameParts.length > 0) {
                            fsparxState.userFirstName = nameParts[0];

                        }
                    }
                }
                
                // Create glitching "F* SPARX" effect
                el.innerHTML = '<span class="fsparx-glitch-text">"F* SPARX"</span>';
                
                // Add glitch styling
                if (!document.querySelector('#fsparx-glitch-styles')) {
                    const glitchStyles = document.createElement('style');
                    glitchStyles.id = 'fsparx-glitch-styles';
                    glitchStyles.textContent = `
                        .fsparx-glitch-text {
                            color: white !important;
                            font-weight: bold !important;
                            text-shadow: 
                                0.05em 0 0 #00ffff,
                                -0.03em -0.04em 0 #ff00ff,
                                0.025em 0.04em 0 #ffff00;
                            animation: fsparx-glitch 0.725s infinite;
                        }
                        
                        @keyframes fsparx-glitch {
                            0%, 100% {
                                text-shadow: 
                                    0.05em 0 0 #00ffff,
                                    -0.03em -0.04em 0 #ff00ff,
                                    0.025em 0.04em 0 #ffff00;
                            }
                            15% {
                                text-shadow: 
                                    0.05em 0 0 #00ffff,
                                    -0.03em -0.04em 0 #ff00ff,
                                    0.025em 0.04em 0 #ffff00;
                            }
                            16% {
                                text-shadow: 
                                    -0.05em -0.025em 0 #00ffff,
                                    0.025em 0.035em 0 #ff00ff,
                                    -0.05em -0.05em 0 #ffff00;
                            }
                            49% {
                                text-shadow: 
                                    -0.05em -0.025em 0 #00ffff,
                                    0.025em 0.035em 0 #ff00ff,
                                    -0.05em -0.05em 0 #ffff00;
                            }
                            50% {
                                text-shadow: 
                                    0.05em 0.035em 0 #00ffff,
                                    0.03em 0 0 #ff00ff,
                                    0 -0.04em 0 #ffff00;
                            }
                            99% {
                                text-shadow: 
                                    0.05em 0.035em 0 #00ffff,
                                    0.03em 0 0 #ff00ff,
                                    0 -0.04em 0 #ffff00;
                            }
                        }
                    `;
                    document.head.appendChild(glitchStyles);

                }
            });
            
            // Set up continuous monitoring for new username elements
            if (!window.fsparxAnonymizationObserver) {
                window.fsparxAnonymizationObserver = new MutationObserver(() => {
                    if (getAnonymiseState() && !fsparxState.isActive) {
                        // Only apply anonymization outside of F* Sparx mode
                        setTimeout(() => applyAnonymisation(true), 100);
                    }
                });
                
                window.fsparxAnonymizationObserver.observe(document.body, {
                    childList: true,
                    subtree: true
                });

            }
            
        } else {
            // Restore original names
            const nameElements = document.querySelectorAll('[data-original-text]');

            
            nameElements.forEach(el => {
                if (el.dataset.originalText) {
                    el.textContent = el.dataset.originalText;
                    delete el.dataset.originalText;
                }
            });
            
            // Remove glitch styles
            const glitchStyles = document.querySelector('#fsparx-glitch-styles');
            if (glitchStyles) {
                glitchStyles.remove();

            }
            
            // Stop monitoring if disabling
            if (window.fsparxAnonymizationObserver) {
                window.fsparxAnonymizationObserver.disconnect();
                window.fsparxAnonymizationObserver = null;
        }
        }
    }

    function enhanceContinueReadingModal() {
        // Look for Continue Reading buttons using multiple approaches
        const allButtons = document.querySelectorAll('button');
        
        allButtons.forEach(button => {
            const buttonText = button.textContent?.trim();
            
            // Check if this is a Continue Reading button
            if (buttonText && buttonText.includes('Continue Reading')) {
                // Check if already enhanced
                if (button.dataset.fsparxEnhanced) return;

                button.style.cssText += `
                    border: 2px solid #3b82f6 !important;
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.5) !important;
                    position: relative !important;
                `;
                  // Create a wrapper container to ensure vertical layout
                if (!button.parentElement.classList.contains('fsparx-button-wrapper')) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'fsparx-button-wrapper';
                    wrapper.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 8px;
                        width: 100%;
                    `;
                    
                    // Store reference to button's parent and insert wrapper before button
                    const buttonParent = button.parentElement;
                    buttonParent.insertBefore(wrapper, button);
                    
                    // Move the original button into the wrapper (preserves event listeners)
                    wrapper.appendChild(button);
                    
                    // Add "Powered by F* Sparx" text underneath in the wrapper
                    const poweredByText = document.createElement('div');
                    poweredByText.className = 'fsparx-powered-by';
                    poweredByText.style.cssText = `
                        font-size: 11px;
                        color: #6b7280;
                        text-align: center;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        font-weight: 400;
                        white-space: nowrap;
                    `;
                    poweredByText.textContent = 'Powered by F* Sparx';
                    wrapper.appendChild(poweredByText);
                    
                    // Mark the original button as enhanced
                    button.dataset.fsparxEnhanced = 'true';
                } else {
                    // If wrapper wasn't created (already exists), just mark button as enhanced
                    button.dataset.fsparxEnhanced = 'true';
                }
            }
        });
    }

    // Start monitoring for Continue Reading modals
    function startContinueReadingModalMonitoring() {
        // Don't start if already monitoring
        if (window.fsparxContinueReadingObserver) {
            return;
        }
        
        
        // Create observer to watch for new modal elements
        window.fsparxContinueReadingObserver = new MutationObserver((mutations) => {
            let shouldCheckModals = false;
            
            mutations.forEach((mutation) => {
                // Check if new nodes were added
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        // Only process element nodes
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if this node or its children might contain a Continue Reading button
                            if (node.tagName === 'BUTTON' || 
                                node.querySelector && node.querySelector('button')) {
                                shouldCheckModals = true;
                            }
                            // Also check for modal containers
                            if (node.classList && (node.classList.contains('modal') || 
                                node.getAttribute('role') === 'dialog' ||
                                node.style.position === 'fixed' ||
                                node.style.zIndex > 1000)) {
                                shouldCheckModals = true;
                            }
                        }
                    });
                }
            });
            
            // If we detected potential modal changes, check for Continue Reading buttons
            if (shouldCheckModals) {
                setTimeout(() => {
                    enhanceContinueReadingModal();
                }, 100); // Small delay to ensure DOM is fully updated
            }
        });
        
        // Start observing
        window.fsparxContinueReadingObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Also check for existing Continue Reading buttons immediately
        enhanceContinueReadingModal();
    }

    // Stop monitoring for Continue Reading modals
    function stopContinueReadingModalMonitoring() {
        if (window.fsparxContinueReadingObserver) {
            window.fsparxContinueReadingObserver.disconnect();        window.fsparxContinueReadingObserver = null;
        }
    }

    // Global Continue Reading modal monitoring (works even when F* Sparx is not active)
    function startGlobalContinueReadingMonitoring() {
        // Don't start if already monitoring globally
        if (window.fsparxGlobalContinueReadingObserver) {
            return;
        }
        
        
        // Create observer to watch for Continue Reading modals at all times
        window.fsparxGlobalContinueReadingObserver = new MutationObserver((mutations) => {
            let shouldCheckModals = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check for Continue Reading button text in the node or its children
                            const textContent = node.textContent || '';
                            if (textContent.includes('Continue Reading') || 
                                (node.querySelector && node.querySelector('*'))) {
                                shouldCheckModals = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldCheckModals) {
                setTimeout(() => {
                    enhanceContinueReadingModal();
                }, 200); // Slightly longer delay for global monitoring
            }
        });
        
        // Start observing the entire document
        window.fsparxGlobalContinueReadingObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Check for existing modals immediately
        enhanceContinueReadingModal();
    }
    function findGoldReaderButton() {
        const allButtons = document.querySelectorAll('div[role="button"]');
        
        for (const button of allButtons) {
            // Look for text content that indicates Gold Reader
            const textContent = button.textContent?.toLowerCase() || '';
            if (textContent.includes('gold') && textContent.includes('reader')) {
                return button;
            }
            
            // Alternative: look for gold-colored elements or specific styling
            const buttonElements = button.querySelectorAll('*');
            for (const element of buttonElements) {
                const computedStyle = window.getComputedStyle(element);
                const bgColor = computedStyle.backgroundColor;
                const color = computedStyle.color;
                
                // Check for gold-like colors (RGB values that might indicate gold)
                if (bgColor.includes('255, 215, 0') || // Gold
                    bgColor.includes('255, 223, 0') || // Gold variant
                    bgColor.includes('218, 165, 32') || // Dark gold
                    color.includes('255, 215, 0') ||
                    color.includes('255, 223, 0') ||
                    color.includes('218, 165, 32')) {
                    return button;
                }            }
        }
        
        return null;
    }

    // Check if a button is currently active (has multiple CSS classes)
    function isButtonActive(button) {
        if (!button) return false;
        
        // Active buttons typically have more CSS classes than inactive ones
        const classList = Array.from(button.classList);
        return classList.length >= 2; // Active buttons have 2+ classes, inactive have 1
    }

    // Find the scrollable div with wildcard class matching
    function findScrollableDiv() {
        // Look for div elements with both 'scrollable' class and a class starting with 'sr_'
        const allDivs = document.querySelectorAll('div.scrollable');
        
        for (let div of allDivs) {
            const classes = Array.from(div.classList);
            // Check if it has any class starting with 'sr_'
            if (classes.some(className => className.startsWith('sr_'))) {
                return div;
            }
        }
        
        // Fallback: just look for any div with 'scrollable' class
        const fallbackDiv = document.querySelector('div.scrollable');
        if (fallbackDiv) {
            return fallbackDiv;
        }
        
        return null;
    }

    // Update button appearance between active and inactive states
    function updateButtonAppearance(isActive) {
        if (!fsparxState.button) return;
        
        const logoImg = fsparxState.button.querySelector('img');
        if (!logoImg) return;
        
        if (isActive) {
            // Switch to active logo and styling with multiple approaches
            const activeLogoUrl = chrome.runtime.getURL('icons/logo-active.svg');
            logoImg.src = activeLogoUrl;
            
            // Force reload the image to ensure it displays
            logoImg.onerror = () => console.error('Failed to load logo-active.svg');
            
            // Remove any CSS filters that might interfere with the colored icon
            logoImg.style.filter = 'none';
            
            
            // Use stored active button styling or find one
            let activeClassName = fsparxState.activeButtonClassName;
            if (!activeClassName) {
                const activeButton = findActiveButton();
                if (activeButton) {
                    activeClassName = activeButton.className;
                }
            }
            
            if (activeClassName) {
                fsparxState.button.className = activeClassName;
                // Remove our custom class and re-add it
                fsparxState.button.classList.remove('fsparx-custom-button');
                fsparxState.button.classList.add('fsparx-custom-button');
            } else {
                console.warn('Could not find active button styling');
            }
              // Multiple force refresh attempts to ensure icon changes
            setTimeout(() => {
                const img = fsparxState.button.querySelector('img');
                if (img && !img.src.includes('logo-active.svg')) {
                    img.src = activeLogoUrl;
                    img.style.filter = 'none';
                }
            }, 50);
            
            setTimeout(() => {
                const img = fsparxState.button.querySelector('img');
                if (img && !img.src.includes('logo-active.svg')) {
                    img.src = activeLogoUrl + '?t=' + Date.now(); // Cache busting
                    img.style.filter = 'none';
                }
            }, 200);
            
            // Final verification and force update
            setTimeout(() => {
                const img = fsparxState.button.querySelector('img');
                if (img) {
                    if (!img.src.includes('logo-active.svg')) {
                        console.warn('Icon still not switched after multiple attempts, forcing final update');
                        img.src = activeLogoUrl + '?force=' + Date.now();
                        img.style.filter = 'none';
                        
                        // Create a new image element if all else fails
                        setTimeout(() => {
                            if (!img.src.includes('logo-active.svg')) {
                                console.warn('Creating new image element for icon');
                                const newImg = document.createElement('img');
                                newImg.src = activeLogoUrl;
                                newImg.style.width = '64px';
                                newImg.style.height = '64px';
                                newImg.style.filter = 'none';
                                img.parentNode.replaceChild(newImg, img);
                            }
                        }, 100);
                    } else {
                    }
                }
            }, 500);
            
        } else {
            // Switch to inactive logo and styling
            logoImg.src = chrome.runtime.getURL('icons/logo.svg');
            
            // Restore the grey filter for inactive state
            logoImg.style.filter = 'brightness(0) saturate(100%) invert(67%) sepia(8%) saturate(394%) hue-rotate(225deg) brightness(91%) contrast(87%)';
            
            
            // Apply inactive button styling
            const inactiveButton = findInactiveButton();
            if (inactiveButton) {
                fsparxState.button.className = inactiveButton.className;
                // Remove our custom class and re-add it
                fsparxState.button.classList.remove('fsparx-custom-button');
                fsparxState.button.classList.add('fsparx-custom-button');
            }
        }
    }

    // Find an active button to copy styling from
    function findActiveButton() {
        const allButtons = document.querySelectorAll('div[role="button"]');
        
        for (let button of allButtons) {
            if (button.classList.contains('fsparx-custom-button')) continue;
            
            const classes = button.className.trim().split(/\s+/);
            // Active buttons typically have multiple classes
            if (classes.length > 1 && classes.some(cls => cls.startsWith('sr_'))) {
                return button;
            }
        }
        return null;
    }

    // Find an inactive button to copy styling from
    function findInactiveButton() {
        const allButtons = document.querySelectorAll('div[role="button"]');
        
        for (let button of allButtons) {
            if (button.classList.contains('fsparx-custom-button')) continue;
            
            const classes = button.className.trim().split(/\s+/);
            // Inactive buttons typically have only one class
            if (classes.length === 1 && classes[0].startsWith('sr_')) {
                return button;
            }
        }
        return null;
    }

    // Listen for clicks on other buttons to deactivate F* Sparx mode
    function setupOtherButtonListeners() {
        document.addEventListener('click', function(event) {
            // Check if clicked element is a button but not our F* Sparx button
            const clickedButton = event.target.closest('div[role="button"]');
            if (clickedButton && 
                !clickedButton.classList.contains('fsparx-custom-button') && 
                fsparxState.isActive) {
                
                // Prevent the default click to handle cleanup first
                event.preventDefault();
                event.stopPropagation();
                
                // Clean up our state first
                cleanupFSparxState();
                  // After cleanup, apply smart navigation logic
                setTimeout(() => {
                    
                    // Check if the clicked button was the originally active one
                    const isClickedButtonOriginallyActive = (clickedButton === fsparxState.originallyActiveButton);
                    
                    if (isClickedButtonOriginallyActive) {
                        
                        // Get all available buttons for intermediate navigation
                        const allButtons = document.querySelectorAll('div[role="button"]');
                        const availableButtons = Array.from(allButtons).filter(btn => 
                            !btn.classList.contains('fsparx-custom-button') && btn !== clickedButton
                        );
                        
                        if (availableButtons.length > 0) {
                            // SMART SOLUTION: First click a different button, then quickly click the target
                            const intermediateButton = availableButtons[0];
                            

                            const intermediateEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });
                            intermediateButton.dispatchEvent(intermediateEvent);
                            
                            // Step 2: After a short delay, click the target button
                            setTimeout(() => {
                                const targetEvent = new MouseEvent('click', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window
                                });
                                clickedButton.dispatchEvent(targetEvent);
                            }, 150);
                        } else {
                            // Fallback: direct click if no intermediate button available
                            const newEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });
                            clickedButton.dispatchEvent(newEvent);
                        }
                    } else {
                        // Normal case: clicked button was not originally active, direct navigation should work
                        const newEvent = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        });
                        clickedButton.dispatchEvent(newEvent);
                    }
                }, 50);
            }        }, true); // Use capture phase to intercept before Sparx handles it
    }

    // Clean up F* Sparx state without interfering with page content
    function cleanupFSparxState() {
        
        // FIRST: Clear F* Sparx content from the DOM immediately
        if (fsparxState.scrollableDiv && fsparxState.isActive) {
            fsparxState.scrollableDiv.innerHTML = '';
        }
        
        // Restore original URL if we have one
        if (fsparxState.originalUrl) {
            window.history.replaceState(null, '', fsparxState.originalUrl);
        }        // Reset F* Sparx state first
        fsparxState.isActive = false;
        fsparxState.originalContent = null;
        fsparxState.scrollableDiv = null;
        fsparxState.originalButtonStates.clear();
        fsparxState.activeButtonClassName = null;
        fsparxState.originalUrl = null;
        // DON'T clear wasGoldReaderActive here - we need it for button restoration
          // Disable anonymization during cleanup
        applyAnonymisation(false);
        
        // Stop monitoring for Continue Reading modals
        stopContinueReadingModalMonitoring();
        
        // Restore network requests
        restoreNetworkRequests();
          // Make F* Sparx button inactive - find a fresh inactive button for proper styling
        if (fsparxState.button) {
            // Wait a moment for Sparx to update the page, then apply inactive styling
            setTimeout(() => {
                const logoImg = fsparxState.button.querySelector('img');
                if (logoImg) {
                    logoImg.src = chrome.runtime.getURL('icons/logo.svg');
                    // Restore the grey filter for inactive state
                    logoImg.style.filter = 'brightness(0) saturate(100%) invert(67%) sepia(8%) saturate(394%) hue-rotate(225deg) brightness(91%) contrast(87%)';

                }
                
                // Find current inactive button styling (after Sparx navigation)
                const inactiveButton = findInactiveButton();
                if (inactiveButton) {
                    fsparxState.button.className = inactiveButton.className;
                    fsparxState.button.classList.remove('fsparx-custom-button');
                    fsparxState.button.classList.add('fsparx-custom-button');
                }
                
                // Restore Gold Reader button to its correct state
                const goldReaderButton = findGoldReaderButton();
                if (goldReaderButton) {
                    
                    if (fsparxState.wasGoldReaderActive) {
                        // Should be active (gold) - find an active button to copy styling from
                        const activeButtons = document.querySelectorAll('div[role="button"]');
                        let activeTemplate = null;
                        
                        for (const btn of activeButtons) {
                            if (!btn.classList.contains('fsparx-custom-button') && 
                                !btn.textContent?.toLowerCase().includes('gold')) {
                                const classes = btn.className.trim().split(/\s+/);
                                if (classes.length > 1) {
                                    activeTemplate = btn;
                                    break;
                                }
                            }
                        }
                        
                        if (activeTemplate) {
                            goldReaderButton.className = activeTemplate.className;
                        }
                    } else {
                        // Should be inactive (grey) - use inactive button styling
                        if (inactiveButton) {
                            goldReaderButton.className = inactiveButton.className;
                        }
                    }
                }
                
                // Clear Gold Reader state after restoration is complete
                fsparxState.wasGoldReaderActive = false;
            }, 100);
        }
        
    }

    // Store original button states and make them all inactive
    function storeAndDeactivateOtherButtons() {
        const allButtons = document.querySelectorAll('div[role="button"]');
        const inactiveButton = findInactiveButton();
        const goldReaderButton = findGoldReaderButton();
        
        if (!inactiveButton) {
            console.warn('Could not find inactive button template');
            return;
        }
        if (goldReaderButton) {
        }
        
        allButtons.forEach(button => {
            // Skip our F* Sparx button
            if (button.classList.contains('fsparx-custom-button')) {
                return;
            }
            
            // Store original className and the button element itself
            const originalClassName = button.className;
            const wasActive = button.className !== inactiveButton.className;
            
            fsparxState.originalButtonStates.set(button, {
                className: originalClassName,
                wasActive: wasActive
            });
            
            // Special logging for Gold Reader button
            if (button === goldReaderButton) {
            }
            
            // Apply inactive styling to ALL buttons (including Gold Reader)
            button.className = inactiveButton.className;
            
            // Double-check Gold Reader button was properly deactivated
            if (button === goldReaderButton) {
                
                // Force refresh Gold Reader button styling if needed
                setTimeout(() => {
                    if (button.className !== inactiveButton.className) {
                        console.warn('Gold Reader button className reverted, forcing inactive state again');
                        button.className = inactiveButton.className;
                    }
                }, 50);
            }
        });
        
        
        // Final verification for Gold Reader button
        if (goldReaderButton) {
            setTimeout(() => {
            }, 100);
        }
    }// Restore original button states
    function restoreOtherButtons() {
        let originallyActiveButton = null;
        
        
        fsparxState.originalButtonStates.forEach((buttonState, button) => {
            button.className = buttonState.className;
            
            // Remember which button was originally active for navigation
            if (buttonState.wasActive) {
                originallyActiveButton = button;
            }
        });
        
        // Clear the stored states
        fsparxState.originalButtonStates.clear();
        
        return originallyActiveButton; // Return the originally active button
    }// Block network requests that could interfere with F* Sparx mode
    function blockNetworkRequests() {
        
        // Store original fetch and XMLHttpRequest for restoration
        const originalFetch = window.fetch;
        const originalXHR = window.XMLHttpRequest;
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        
        // Block fetch requests
        window.fetch = function(...args) {
            const url = args[0];
            return Promise.reject(new Error('F* Sparx: Network request blocked'));
        };
        
        // Block XMLHttpRequest
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            
            xhr.open = function(...args) {
                // Don't actually open the request
            };
            
            xhr.send = function() {
                // Don't send the request
            };
            
            return xhr;
        };
        
        // Block setTimeout for network-related operations (but allow short UI timeouts)
        window.setTimeout = function(callback, delay, ...args) {
            if (delay > 1000) { // Block long timeouts that might be for polling
                return null;
            }
            return originalSetTimeout(callback, delay, ...args);
        };
        
        // Block setInterval completely (often used for polling)
        window.setInterval = function(callback, delay, ...args) {
            return null;
        };
        
        // Store blockers for restoration
        fsparxState.networkBlockers = [originalFetch, originalXHR, originalSetTimeout, originalSetInterval];
        
        // Block WebSocket connections
        if (window.WebSocket) {
            const originalWebSocket = window.WebSocket;
            window.WebSocket = function(...args) {
                throw new Error('F* Sparx: WebSocket connection blocked');
            };
            fsparxState.networkBlockers.push(originalWebSocket);
        }
        
        // Block EventSource (Server-Sent Events)
        if (window.EventSource) {
            const originalEventSource = window.EventSource;
            window.EventSource = function(...args) {
                throw new Error('F* Sparx: EventSource connection blocked');
            };
            fsparxState.networkBlockers.push(originalEventSource);
        }
        

    }
      // Restore network requests functionality
    function restoreNetworkRequests() {
        if (fsparxState.networkBlockers.length === 0) return;
        
        
        // Restore fetch
        if (fsparxState.networkBlockers[0]) {
            window.fetch = fsparxState.networkBlockers[0];
        }
        
        // Restore XMLHttpRequest
        if (fsparxState.networkBlockers[1]) {
            window.XMLHttpRequest = fsparxState.networkBlockers[1];
        }
        
        // Restore setTimeout
        if (fsparxState.networkBlockers[2]) {
            window.setTimeout = fsparxState.networkBlockers[2];
        }
        
        // Restore setInterval
        if (fsparxState.networkBlockers[3]) {
            window.setInterval = fsparxState.networkBlockers[3];
        }
        
        // Restore WebSocket if it was blocked
        if (fsparxState.networkBlockers[4]) {
            window.WebSocket = fsparxState.networkBlockers[4];
        }
        
        // Restore EventSource if it was blocked
        if (fsparxState.networkBlockers[5]) {
            window.EventSource = fsparxState.networkBlockers[5];
        }
        
        // Clear the blockers array
        fsparxState.networkBlockers = [];
    }

    // Find and modify the sidebar
    function init() {
        if (!isSparxLibraryPage()) {
            return;
        }
        
        
        // Apply anonymization if enabled (on page load)
        if (getAnonymiseState()) {
            setTimeout(() => applyAnonymisation(true), 1000);
        }
        
        // Start global Continue Reading modal monitoring (always active)
        startGlobalContinueReadingMonitoring();
        
        // Start checking for sidebar immediately
        waitForSidebarAndAddButton();
        
        // Set up listeners for other buttons (to deactivate F* Sparx when clicked)
        setupOtherButtonListeners();
    }

    // Start the script
    init();

    // Also listen for navigation changes (for SPAs)
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(init, 1000);
        }
    }).observe(document, { subtree: true, childList: true });

})();