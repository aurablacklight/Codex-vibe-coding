const fs = require('fs');
const path = require('path');

/**
 * Build script for Codex Vibe Glass UI Showcase
 * Prepares files for Cloudflare Workers deployment
 */

console.log('🚀 Building Codex Vibe Glass UI Showcase...');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Copy and minify CSS
function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
        .replace(/\s*{\s*/g, '{') // Clean up braces
        .replace(/\s*}\s*/g, '}')
        .replace(/\s*;\s*/g, ';')
        .replace(/\s*:\s*/g, ':')
        .replace(/\s*,\s*/g, ',')
        .trim();
}

// Copy and minify JavaScript
function minifyJS(js) {
    return js
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*$/gm, '') // Remove line comments
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/;\s*}/g, '}') // Clean up
        .trim();
}

// Read and process HTML
const htmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Inline critical CSS for better performance
const cssPath = path.join(distDir, 'assets', 'css', 'styles.css');
const css = fs.readFileSync(cssPath, 'utf8');

// Extract critical CSS (above-the-fold styles)
const criticalCSS = extractCriticalCSS(css);

// Minify CSS and JS
const minifiedCSS = minifyCSS(css);
const jsPath = path.join(distDir, 'assets', 'js', 'script.js');
const js = fs.readFileSync(jsPath, 'utf8');
const minifiedJS = minifyJS(js);

// Update HTML with optimizations
html = html.replace(
    '<link rel="stylesheet" href="./assets/css/styles.css">',
    `<style>${criticalCSS}</style>
    <link rel="preload" href="./assets/css/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="./assets/css/styles.css"></noscript>`
);

// Add preload for JavaScript
html = html.replace(
    '<script src="./assets/js/script.js"></script>',
    '<link rel="preload" href="./assets/js/script.js" as="script"><script src="./assets/js/script.js" defer></script>'
);

// Add performance optimizations
html = html.replace(
    '<head>',
    `<head>
    <!-- Performance optimizations -->
    <link rel="dns-prefetch" href="//fonts.googleapis.com">
    <link rel="dns-prefetch" href="//fonts.gstatic.com">
    <meta name="theme-color" content="#6366f1">
    <meta name="description" content="A sophisticated modern glass-like frontend UI showcase website built for Cloudflare Workers. Experience cutting-edge glassmorphism effects and responsive design.">
    <meta name="keywords" content="glassmorphism, UI showcase, modern web design, Cloudflare Workers, glass effects, responsive design">
    <meta property="og:title" content="Codex Vibe - Glass UI Showcase">
    <meta property="og:description" content="Experience the future of web design with sophisticated glassmorphism effects and cutting-edge UI components.">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✨</text></svg>">`
);

// Write optimized files
fs.writeFileSync(htmlPath, html);
fs.writeFileSync(cssPath, minifiedCSS);
fs.writeFileSync(jsPath, minifiedJS);

// Generate service worker with embedded files for Cloudflare Workers
generateServiceWorker();

// Create deployment files
createDeploymentFiles();

console.log('✅ Build completed successfully!');
console.log('\n📁 Generated files:');
console.log('   - dist/index.html (optimized)');
console.log('   - dist/assets/css/styles.css (minified)');
console.log('   - dist/assets/js/script.js (minified)');
console.log('   - src/index.js (service worker)');
console.log('\n🚀 Ready for Cloudflare Workers deployment!');

function extractCriticalCSS(css) {
    // Extract styles for above-the-fold content
    const criticalSelectors = [
        ':root',
        '*',
        'html',
        'body',
        '.background',
        '.bg-gradient',
        '.floating-shapes',
        '.shape',
        '.glass-nav',
        '.nav-container',
        '.logo-text',
        '.hero-section',
        '.hero-container',
        '.hero-title',
        '.title-line'
    ];
    
    const criticalRules = [];
    const cssRules = css.split('}');
    
    cssRules.forEach(rule => {
        if (rule.trim()) {
            const selector = rule.split('{')[0]?.trim();
            if (selector && criticalSelectors.some(critical => selector.includes(critical))) {
                criticalRules.push(rule + '}');
            }
        }
    });
    
    return minifyCSS(criticalRules.join('\n'));
}

function generateServiceWorker() {
    const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    const css = fs.readFileSync(path.join(distDir, 'assets', 'css', 'styles.css'), 'utf8');
    const js = fs.readFileSync(path.join(distDir, 'assets', 'js', 'script.js'), 'utf8');
    
    // Read the base service worker
    const serviceWorkerPath = path.join(__dirname, 'src', 'index.js');
    let serviceWorker = fs.readFileSync(serviceWorkerPath, 'utf8');
    
    // Replace the getStaticFiles function with actual file content
    const staticFilesContent = `
async function getStaticFiles() {
    return {
        '/index.html': \`${html.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`,
        '/assets/css/styles.css': \`${css.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`,
        '/assets/js/script.js': \`${js.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`
    };
}`;
    
    // Replace the placeholder function
    serviceWorker = serviceWorker.replace(
        /async function getStaticFiles\(\) \{[\s\S]*?\n\}/,
        staticFilesContent
    );
    
    fs.writeFileSync(serviceWorkerPath, serviceWorker);
}

function createDeploymentFiles() {
    // Create .gitignore
    const gitignore = `
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
.output/
.vercel/
.netlify/

# Environment files
.env
.env.local
.env.production

# Cache
.cache/
.parcel-cache/

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Logs
logs/
*.log
`.trim();
    
    fs.writeFileSync(path.join(__dirname, '.gitignore'), gitignore);
    
    // Create deployment guide
    const deploymentGuide = `
# Deployment Guide

## Cloudflare Workers Deployment

### Prerequisites
1. Install Wrangler CLI: \`npm install -g wrangler\`
2. Authenticate with Cloudflare: \`wrangler auth login\`

### Deploy Steps
1. Build the project: \`npm run build\`
2. Deploy to Cloudflare Workers: \`npm run deploy\`

### Custom Domain (Optional)
1. Add a custom domain in Cloudflare Workers dashboard
2. Update the \`wrangler.toml\` file with your domain

### Environment Variables
No environment variables are required for basic deployment.

## Local Development
1. Install dependencies: \`npm install\`
2. Start development server: \`npm run dev\`
3. Open browser to \`http://localhost:8787\`

## Performance Features
- ✅ Minified CSS and JavaScript
- ✅ Critical CSS inlined
- ✅ Resource preloading
- ✅ Compressed assets
- ✅ Optimized caching headers
- ✅ Security headers
- ✅ Mobile-first responsive design
- ✅ Accessibility features
`.trim();
    
    fs.writeFileSync(path.join(__dirname, 'DEPLOYMENT.md'), deploymentGuide);
    
    // Update README
    const readme = `
# Codex Vibe - Glass UI Showcase

A sophisticated modern glass-like frontend UI showcase website built for Cloudflare Workers deployment.

## ✨ Features

- **Glassmorphism Design**: Modern glass effects with backdrop filters
- **Responsive Layout**: Mobile-first responsive design
- **Performance Optimized**: Built for Cloudflare Workers with optimized caching
- **Interactive Components**: Smooth animations and micro-interactions
- **Accessibility**: WCAG compliant with proper focus management
- **Modern Stack**: Vanilla HTML5, CSS3, and JavaScript for maximum compatibility

## 🚀 Quick Start

### Development
\`\`\`bash
npm install
npm run dev
\`\`\`

### Production Build
\`\`\`bash
npm run build
npm run deploy
\`\`\`

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Custom Properties, Flexbox, Grid
- **Effects**: CSS Backdrop Filters, Transforms, Animations
- **Deployment**: Cloudflare Workers
- **Build**: Node.js build script with minification

## 📱 Browser Support

- Chrome 88+
- Firefox 87+
- Safari 14+
- Edge 88+

## 🎨 Design Principles

- **Glassmorphism**: Transparent elements with blur effects
- **Minimalism**: Clean, uncluttered interface
- **Accessibility**: Keyboard navigation and screen reader support
- **Performance**: Optimized for fast loading and smooth interactions

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines first.
`.trim();
    
    fs.writeFileSync(path.join(__dirname, 'README.md'), readme);
}