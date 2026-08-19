const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log('not found', filePath);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    const regex = /<Link\s+([^>]*?)href=(['"{\`])(\/stocks\/.*?)(['"}\`])([^>]*?)>/g;
    const newContent = content.replace(regex, (match, before, quote1, url, quote2, after) => {
        if (match.includes('target=')) return match;
        changed = true;
        return `<Link ${before}href=${quote1}${url}${quote2}${after} target="_blank" rel="noopener noreferrer">`;
    });
    
    if (changed) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Updated', filePath);
    }
}

const files = [
    'src/app/watchlists/[id]/page.tsx',
    'src/app/watchlists/page.tsx',
    'src/app/screener/fundamental/page.tsx',
    'src/app/screener/sma44/page.tsx',
    'src/app/screener/penny44/page.tsx',
    'src/app/dashboard/page.tsx',
    'src/app/dashboard/portfolio/page.tsx',
    'src/app/journal/page.tsx',
    'src/app/page.tsx',
    'src/app/explore/ExploreClient.tsx'
];

files.forEach(f => replaceInFile(path.join('c:/Users/ARYAN CHAVDA/Downloads/stockscreener', f)));
