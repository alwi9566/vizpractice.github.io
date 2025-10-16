const workerPath = chrome.runtime.getURL('worker.min.js');

const EXTRACTION_PROFILES = {
  "Craigslist": {
    "blacklistKeywords": "craigslist,posted",
    "titleStrategy": "region",
    "titleYStart": 11,
    "titleYEnd": 15,
    "titleXStart": 10,
    "titleXEnd": 72,
    "descStrategy": "region",
    "descYStart": 74,
    "descYEnd": 80,
    "descXStart": 9,
    "descXEnd": 64,
    "imageYStart": 17,
    "imageYEnd": 68,
    "imageXStart": 19,
    "imageXEnd": 55,
    "minTitleLength": 1
  },
  "eBay": {
    "blacklistKeywords": "ebay,cart",
    "titleStrategy": "region",
    "titleYStart": 25,
    "titleYEnd": 35,
    "titleXStart": 62,
    "titleXEnd": 99,
    "descStrategy": "region",
    "descYStart": 63,
    "descYEnd": 72,
    "descXStart": 69,
    "descXEnd": 97,
    "imageYStart": 26,
    "imageYEnd": 92,
    "imageXStart": 10,
    "imageXEnd": 62,
    "minTitleLength": 1
  },
  "Facebook": {
    "blacklistKeywords": "facebook,marketplace",
    "titleStrategy": "region",
    "titleYStart": 4,
    "titleYEnd": 16,
    "titleXStart": 79,
    "titleXEnd": 100,
    "descStrategy": "region",
    "descYStart": 27,
    "descYEnd": 40,
    "descXStart": 79,
    "descXEnd": 100,
    "imageYStart": 4,
    "imageYEnd": 98,
    "imageXStart": 15,
    "imageXEnd": 69,
    "minTitleLength": 1
  }
};

function detectProfileFromURL(url) {
    if (url.includes('craigslist.org')) return 'Craigslist';
    if (url.includes('ebay.com')) return 'eBay';
    if (url.includes('facebook.com/marketplace')) return 'Facebook';
    return null;
}

function cropRegion(canvas, yStart, yEnd, xStart, xEnd) {
    const y1 = Math.floor((yStart / 100) * canvas.height);
    const y2 = Math.floor((yEnd / 100) * canvas.height);
    const x1 = Math.floor((xStart / 100) * canvas.width);
    const x2 = Math.floor((xEnd / 100) * canvas.width);
    
    const cropped = document.createElement('canvas');
    cropped.width = x2 - x1;
    cropped.height = y2 - y1;
    cropped.getContext('2d').drawImage(canvas, x1, y1, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    
    return cropped;
}

async function extractProductData(screenshotDataURL, profile) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    return new Promise((resolve, reject) => {
        img.onload = async () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                
                // CREATE WORKER ONCE at the beginning
                const worker = await Tesseract.createWorker('eng', 1, {
                    workerPath: workerPath
                });
                
                // Extract title
                let title = 'Not found';
                if (profile.titleStrategy === 'region') {
                    const titleCanvas = cropRegion(canvas, profile.titleYStart, profile.titleYEnd, profile.titleXStart, profile.titleXEnd);
                    // CHANGED: Use worker.recognize instead of Tesseract.recognize
                    const titleResult = await worker.recognize(titleCanvas);
                    title = extractTitleText(titleResult.data.text, profile);
                }
                
                // Extract price from full page
                // CHANGED: Use worker.recognize instead of Tesseract.recognize
                const fullResult = await worker.recognize(canvas);
                const price = extractPrice(fullResult.data.text);
                
                // Extract description
                let description = 'Not found';
                if (profile.descStrategy === 'region') {
                    const descCanvas = cropRegion(canvas, profile.descYStart, profile.descYEnd, profile.descXStart, profile.descXEnd);
                    // CHANGED: Use worker.recognize instead of Tesseract.recognize
                    const descResult = await worker.recognize(descCanvas);
                    description = extractDescText(descResult.data.text, profile, title);
                }
                
                // Extract image
                const photoCanvas = cropRegion(canvas, profile.imageYStart, profile.imageYEnd, profile.imageXStart, profile.imageXEnd);
                
                // TERMINATE WORKER at the end
                await worker.terminate();
                
                resolve({
                    title,
                    price,
                    description,
                    photoDataURL: photoCanvas.toDataURL('image/png')
                });
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = screenshotDataURL;
    });
}

function extractTitleText(text, profile) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const blacklist = profile.blacklistKeywords.split(',').map(k => k.trim().toLowerCase());
    const minLen = profile.minTitleLength || 1;
    
    for (let line of lines) {
        if (blacklist.some(k => line.toLowerCase().includes(k))) continue;
        const clean = line.replace(/[^a-zA-Z0-9\s\-$.,&()']/g, '').trim();
        if (clean.length >= minLen && clean.split(/\s+/).length > 1) {
            return clean;
        }
    }
    
    return 'Not found';
}

function extractPrice(text) {
    const priceRegex = /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
    const matches = text.match(priceRegex);
    return matches && matches.length > 0 ? matches[0] : 'Not found';
}

function extractDescText(text, profile, title) {
    let lines = text.split('\n').map(l => l.trim()).filter(l => l && l !== title);
    const blacklist = profile.blacklistKeywords.split(',').map(k => k.trim().toLowerCase());
    
    const filtered = lines.filter(l => {
        if (blacklist.some(k => l.toLowerCase().includes(k))) return false;
        const specialChars = (l.match(/[^a-zA-Z0-9\s\-$.,&()'!?]/g) || []).length / l.length;
        if (specialChars > 0.2 || l.length < 10) return false;
        const letters = (l.match(/[a-zA-Z]/g) || []).length;
        return letters >= l.length * 0.4;
    });
    
    return filtered.slice(0, 15).join(' ').substring(0, 1000).trim() || 'Not found';
}