document.addEventListener('DOMContentLoaded', async function() {
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const errorDiv = document.getElementById('error');
    
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Detect profile
        const profileName = detectProfileFromURL(tab.url);
        
        if (!profileName) {
            throw new Error('This site is not supported. Please visit Craigslist, eBay, or Facebook Marketplace.');
        }
        
        const profile = EXTRACTION_PROFILES[profileName];
        
        // Capture screenshot using chrome.tabs directly
        const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
        
        if (!screenshotDataUrl) {
            throw new Error('Failed to capture screenshot');
        }
        
        // Extract data
        const extractedData = await extractProductData(screenshotDataUrl, profile);
        
        // Display results
        loadingDiv.style.display = 'none';
        resultsDiv.style.display = 'block';
        
        resultsDiv.innerHTML = `
            <div class="result-section">
                <div class="result-label">Title</div>
                <div class="result-content">${extractedData.title}</div>
            </div>
            
            <div class="result-section">
                <div class="result-label">Price</div>
                <div class="result-content">${extractedData.price}</div>
            </div>
            
            <div class="result-section">
                <div class="result-label">Description</div>
                <div class="result-content">${extractedData.description}</div>
            </div>
            
            <div class="result-section">
                <div class="result-label">Product Photo</div>
                <img class="photo-preview" src="${extractedData.photoDataURL}" alt="Product">
            </div>
        `;
        
    } catch (error) {
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = error.message;
        console.error('Extraction error:', error);
    }
});