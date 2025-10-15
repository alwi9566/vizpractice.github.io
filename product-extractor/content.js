console.log('Extension content script loaded');

const TARGET_URLS = [
    'facebook.com/marketplace',
    'ebay.com',
    'craigslist.org'
];

function makeWidgetDraggable(widget) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    
    widget.addEventListener('mousedown', function(e) {
        if (e.target.tagName !== 'BUTTON') {
            isDragging = true;
            initialX = e.clientX - widget.offsetLeft;
            initialY = e.clientY - widget.offsetTop;
            widget.style.cursor = 'grabbing';
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            widget.style.left = currentX + 'px';
            widget.style.top = currentY + 'px';
        }
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
        widget.style.cursor = 'move';
    });
}

function showExtensionWidget() {
    if (document.getElementById('extension-widget')) {
        return;
    }
    
    const widget = document.createElement('div');
    widget.id = 'extension-widget';
    widget.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 250px;
        height: 120px;
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        padding: 15px;
        border-radius: 10px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        cursor: move;
        animation: slideIn 0.3s ease-out;
    `;
    
    if (!document.getElementById('widget-styles')) {
        const style = document.createElement('style');
        style.id = 'widget-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    widget.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 14px;">🚀 Extractor Ready!</h3>
        <p style="margin: 0 0 5px 0; font-size: 12px;">On: <strong>${window.location.hostname}</strong></p>
        <p style="margin: 0; font-size: 11px; opacity: 0.8;">Click extension icon to extract data</p>
        <button onclick="this.parentNode.remove()" style="
            position: absolute;
            top: 5px;
            right: 8px;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 16px;
        ">×</button>
    `;
    
    makeWidgetDraggable(widget);
    document.body.appendChild(widget);
}

function shouldShowWidget() {
    const currentUrl = window.location.href.toLowerCase();
    return TARGET_URLS.some(url => currentUrl.includes(url.toLowerCase()));
}

if (shouldShowWidget()) {
    setTimeout(() => {
        showExtensionWidget();
    }, 1500);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    switch(message.action) {
        case 'test':
            handleTestAction(message.message);
            break;
            
        case 'toggle':
            toggleExtensionContent();
            break;
            
        default:
            console.log('Unknown action:', message.action);
    }
    
    sendResponse({ success: true });
});

function handleTestAction(msg) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    notification.textContent = msg || 'Test message from extension!';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function toggleExtensionContent() {
    const existingWidget = document.getElementById('extension-widget');
    
    if (existingWidget) {
        existingWidget.remove();
    } else {
        showExtensionWidget();
    }
}

chrome.storage.sync.set({
    extensionData: {
        lastVisited: window.location.href,
        timestamp: new Date().toISOString()
    }
});