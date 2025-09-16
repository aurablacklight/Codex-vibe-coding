/**
 * Cloudflare Workers Service Worker for Glass UI Showcase
 * Serves static files with optimized caching and compression
 */

// MIME type mapping for different file types
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.xml': 'application/xml',
    '.txt': 'text/plain'
};

// Cache configuration
const CACHE_CONFIG = {
    // Long cache for static assets
    static: {
        maxAge: 31536000, // 1 year
        browserTTL: 31536000,
        edgeTTL: 31536000
    },
    // Short cache for HTML
    html: {
        maxAge: 3600, // 1 hour
        browserTTL: 3600,
        edgeTTL: 3600
    },
    // Medium cache for CSS/JS
    assets: {
        maxAge: 86400, // 1 day
        browserTTL: 86400,
        edgeTTL: 86400
    }
};

// Security headers
const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self';"
};

// Performance headers
const PERFORMANCE_HEADERS = {
    'Cache-Control': 'public, max-age=31536000',
    'Vary': 'Accept-Encoding',
    'X-Powered-By': 'Cloudflare Workers',
    'Server': 'Codex-Vibe-Showcase/1.0'
};

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

/**
 * Main request handler
 */
async function handleRequest(request) {
    try {
        const url = new URL(request.url);
        let pathname = url.pathname;

        // Handle root path
        if (pathname === '/') {
            pathname = '/index.html';
        }

        // Get file extension
        const ext = getFileExtension(pathname);
        
        // Determine MIME type
        const mimeType = MIME_TYPES[ext] || 'text/plain';
        
        // Get cache configuration based on file type
        const cacheConfig = getCacheConfig(ext);
        
        // Try to get from cache first
        const cacheKey = new Request(url.toString(), request);
        const cache = caches.default;
        let response = await cache.match(cacheKey);
        
        if (!response) {
            // File not in cache, serve from static files
            response = await serveStaticFile(pathname, mimeType, cacheConfig);
            
            // Cache the response
            if (response.status === 200) {
                const responseToCache = response.clone();
                event.waitUntil(cache.put(cacheKey, responseToCache));
            }
        }
        
        return response;
    } catch (error) {
        return handleError(error);
    }
}

/**
 * Serve static files with proper headers
 */
async function serveStaticFile(pathname, mimeType, cacheConfig) {
    // Static file content mapping
    const staticFiles = await getStaticFiles();
    
    // Check if file exists
    const fileContent = staticFiles[pathname];
    if (!fileContent) {
        return createNotFoundResponse();
    }
    
    // Create response with proper headers
    const headers = new Headers();
    headers.set('Content-Type', mimeType);
    
    // Add cache headers
    headers.set('Cache-Control', `public, max-age=${cacheConfig.maxAge}`);
    headers.set('Edge-Cache-TTL', cacheConfig.edgeTTL.toString());
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        headers.set(key, value);
    });
    
    // Add performance headers
    Object.entries(PERFORMANCE_HEADERS).forEach(([key, value]) => {
        if (key !== 'Cache-Control') { // Don't override cache control
            headers.set(key, value);
        }
    });
    
    // Compress content if it's text-based
    let content = fileContent;
    if (shouldCompress(mimeType)) {
        // Note: In a real implementation, you might want to use compression
        // For now, we'll serve uncompressed content
        headers.set('Content-Encoding', 'identity');
    }
    
    return new Response(content, {
        status: 200,
        headers: headers
    });
}

/**
 * Get static files content
 * In a real implementation, this would be populated by your build process
 */


async function getStaticFiles() {
    return {
        '/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
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
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✨</text></svg>">
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
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✨</text></svg>">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codex Vibe - Glass UI Showcase</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}:root{--primary-color:#6366f1;--secondary-color:#8b5cf6;--accent-color:#06b6d4;--success-color:#10b981;--warning-color:#f59e0b;--danger-color:#ef4444;--glass-bg:rgba(255,255,255,0.1);--glass-border:rgba(255,255,255,0.2);--glass-shadow:0 8px 32px rgba(0,0,0,0.1);--glass-blur:blur(10px);--font-primary:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;--font-weight-light:300;--font-weight-normal:400;--font-weight-medium:500;--font-weight-semibold:600;--font-weight-bold:700;--space-xs:0.5rem;--space-sm:1rem;--space-md:1.5rem;--space-lg:2rem;--space-xl:3rem;--space-2xl:4rem;--radius-sm:0.5rem;--radius-md:1rem;--radius-lg:1.5rem;--radius-xl:2rem;--transition-fast:0.2s ease;--transition-normal:0.3s ease;--transition-slow:0.5s ease}html{scroll-behavior:smooth}body{font-family:var(--font-primary);line-height:1.6;color:white;overflow-x:hidden;background:#0f0f23}.background{position:fixed;top:0;left:0;width:100%;height:100vh;z-index:-1;overflow:hidden}.bg-gradient{position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient( 135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#f5576c 75%,#4facfe 100% );opacity:0.8;animation:gradientShift 20s ease infinite}.floating-shapes{position:absolute;width:100%;height:100%}.shape{position:absolute;background:rgba(255,255,255,0.1);border-radius:50%;backdrop-filter:var(--glass-blur);animation:float 6s ease-in-out infinite}.shape-1{width:200px;height:200px;top:10%;left:10%;animation-delay:0s}.shape-2{width:150px;height:150px;top:60%;right:10%;animation-delay:2s}.shape-3{width:100px;height:100px;bottom:20%;left:20%;animation-delay:4s}.shape-4{width:120px;height:120px;top:30%;right:30%;animation-delay:1s}.glass-element{background:var(--glass-bg);backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);box-shadow:var(--glass-shadow)}.glass-nav{position:fixed;top:0;width:100%;z-index:1000;padding:var(--space-sm) 0;background:rgba(255,255,255,0.05);backdrop-filter:var(--glass-blur);border-bottom:1px solid var(--glass-border)}.nav-container{max-width:1200px;margin:0 auto;padding:0 var(--space-lg);display:flex;justify-content:space-between;align-items:center}.logo-text{font-size:1.5rem;font-weight:var(--font-weight-bold);background:linear-gradient(135deg,var(--primary-color),var(--secondary-color));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.hero-section{min-height:100vh;display:flex;align-items:center;padding:var(--space-2xl) 0}.hero-container{max-width:1200px;margin:0 auto;padding:0 var(--space-lg);display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2xl);align-items:center}.hero-title{font-size:clamp(2.5rem,5vw,4rem);font-weight:var(--font-weight-bold);line-height:1.1;margin-bottom:var(--space-md)}.title-line{display:block;background:linear-gradient(135deg,#fff,rgba(255,255,255,0.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.hero-visual{position:relative;display:flex;flex-direction:column;gap:var(--space-lg)}.showcase-section,.about-section{padding:var(--space-2xl) 0}.showcase-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:var(--space-xl)}.demo-cards .demo-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-md);padding:var(--space-lg);margin-top:var(--space-md)}.glass-form{margin-top:var(--space-md)}.demo-progress{margin-top:var(--space-md)}.stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-md);margin-top:var(--space-md)}.demo-controls{margin-top:var(--space-md)}.about-content{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2xl);align-items:center}.about-visual{display:flex;justify-content:center;align-items:center}.glass-footer{background:var(--glass-bg);backdrop-filter:var(--glass-blur);border-top:1px solid var(--glass-border);padding:var(--space-2xl) 0 var(--space-lg);margin-top:var(--space-2xl)}@media (max-width:768px){.nav-links{display:none}.hero-container{grid-template-columns:1fr;text-align:center;gap:var(--space-lg)}.hero-section{padding:var(--space-xl) 0}.hero-title{font-size:2.5rem}@media (prefers-reduced-motion:no-preference){.showcase-item{animation:fadeInUp 0.6s ease forwards}@media (prefers-reduced-motion:reduce){*{animation-duration:0.01ms !important;animation-iteration-count:1 !important;transition-duration:0.01ms !important}button:focus,input:focus,textarea:focus,a:focus{outline:2px solid var(--primary-color);outline-offset:2px}.text-center{text-align:center}</style>
    <link rel="preload" href="./assets/css/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><style>*{margin:0;padding:0;box-sizing:border-box}:root{--primary-color:#6366f1;--secondary-color:#8b5cf6;--accent-color:#06b6d4;--success-color:#10b981;--warning-color:#f59e0b;--danger-color:#ef4444;--glass-bg:rgba(255,255,255,0.1);--glass-border:rgba(255,255,255,0.2);--glass-shadow:0 8px 32px rgba(0,0,0,0.1);--glass-blur:blur(10px);--font-primary:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;--font-weight-light:300;--font-weight-normal:400;--font-weight-medium:500;--font-weight-semibold:600;--font-weight-bold:700;--space-xs:0.5rem;--space-sm:1rem;--space-md:1.5rem;--space-lg:2rem;--space-xl:3rem;--space-2xl:4rem;--radius-sm:0.5rem;--radius-md:1rem;--radius-lg:1.5rem;--radius-xl:2rem;--transition-fast:0.2s ease;--transition-normal:0.3s ease;--transition-slow:0.5s ease}html{scroll-behavior:smooth}body{font-family:var(--font-primary);line-height:1.6;color:white;overflow-x:hidden;background:#0f0f23}.background{position:fixed;top:0;left:0;width:100%;height:100vh;z-index:-1;overflow:hidden}.bg-gradient{position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient( 135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#f5576c 75%,#4facfe 100% );opacity:0.8;animation:gradientShift 20s ease infinite}.floating-shapes{position:absolute;width:100%;height:100%}.shape{position:absolute;background:rgba(255,255,255,0.1);border-radius:50%;backdrop-filter:var(--glass-blur);animation:float 6s ease-in-out infinite}.shape-1{width:200px;height:200px;top:10%;left:10%;animation-delay:0s}.shape-2{width:150px;height:150px;top:60%;right:10%;animation-delay:2s}.shape-3{width:100px;height:100px;bottom:20%;left:20%;animation-delay:4s}.shape-4{width:120px;height:120px;top:30%;right:30%;animation-delay:1s}.glass-nav{position:fixed;top:0;width:100%;z-index:1000;padding:var(--space-sm) 0;background:rgba(255,255,255,0.05);backdrop-filter:var(--glass-blur);border-bottom:1px solid var(--glass-border)}.nav-container{max-width:1200px;margin:0 auto;padding:0 var(--space-lg);display:flex;justify-content:space-between;align-items:center}.logo-text{font-size:1.5rem;font-weight:var(--font-weight-bold);background:linear-gradient(135deg,var(--primary-color),var(--secondary-color));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.hero-section{min-height:100vh;display:flex;align-items:center;padding:var(--space-2xl) 0}.hero-container{max-width:1200px;margin:0 auto;padding:0 var(--space-lg);display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2xl);align-items:center}.hero-title{font-size:clamp(2.5rem,5vw,4rem);font-weight:var(--font-weight-bold);line-height:1.1;margin-bottom:var(--space-md)}.title-line{display:block;background:linear-gradient(135deg,#fff,rgba(255,255,255,0.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.hero-container{grid-template-columns:1fr;text-align:center;gap:var(--space-lg)}.hero-section{padding:var(--space-xl) 0}.hero-title{font-size:2.5rem}</style>
    <link rel="preload" href="./assets/css/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="./assets/css/styles.css"></noscript></noscript>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Background Elements -->
    <div class="background">
        <div class="bg-gradient"></div>
        <div class="floating-shapes">
            <div class="shape shape-1"></div>
            <div class="shape shape-2"></div>
            <div class="shape shape-3"></div>
            <div class="shape shape-4"></div>
        </div>
    </div>

    <!-- Navigation -->
    <nav class="glass-nav">
        <div class="nav-container">
            <div class="logo">
                <span class="logo-text">Codex Vibe</span>
            </div>
            <ul class="nav-links">
                <li><a href="#home" class="nav-link active">Home</a></li>
                <li><a href="#showcase" class="nav-link">Showcase</a></li>
                <li><a href="#components" class="nav-link">Components</a></li>
                <li><a href="#about" class="nav-link">About</a></li>
            </ul>
            <button class="menu-toggle">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </nav>

    <!-- Hero Section -->
    <section id="home" class="hero-section">
        <div class="hero-container">
            <div class="hero-content">
                <h1 class="hero-title">
                    <span class="title-line">Modern Glass</span>
                    <span class="title-line">UI Showcase</span>
                </h1>
                <p class="hero-description">
                    Experience the future of web design with sophisticated glassmorphism effects, 
                    seamless animations, and cutting-edge UI components built for Cloudflare Workers.
                </p>
                <div class="hero-buttons">
                    <button class="glass-button primary">Explore Components</button>
                    <button class="glass-button secondary">View Code</button>
                </div>
            </div>
            <div class="hero-visual">
                <div class="glass-card floating">
                    <div class="card-content">
                        <div class="card-icon">✨</div>
                        <h3>Glassmorphism</h3>
                        <p>Transparent beauty</p>
                    </div>
                </div>
                <div class="glass-card floating delay-1">
                    <div class="card-content">
                        <div class="card-icon">🚀</div>
                        <h3>Performance</h3>
                        <p>Lightning fast</p>
                    </div>
                </div>
                <div class="glass-card floating delay-2">
                    <div class="card-content">
                        <div class="card-icon">🎨</div>
                        <h3>Design</h3>
                        <p>Pixel perfect</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Showcase Section -->
    <section id="showcase" class="showcase-section">
        <div class="section-container">
            <div class="section-header">
                <h2 class="section-title">UI Components Showcase</h2>
                <p class="section-description">Discover our collection of modern glass UI elements</p>
            </div>
            
            <div class="showcase-grid">
                <!-- Glass Cards -->
                <div class="showcase-item">
                    <div class="glass-panel">
                        <h3>Glass Cards</h3>
                        <div class="demo-cards">
                            <div class="demo-card">
                                <div class="card-header">
                                    <div class="card-avatar"></div>
                                    <div class="card-info">
                                        <h4>John Doe</h4>
                                        <p>UI Designer</p>
                                    </div>
                                </div>
                                <p>Beautiful glass card with blur effects and transparency.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Glass Buttons -->
                <div class="showcase-item">
                    <div class="glass-panel">
                        <h3>Interactive Buttons</h3>
                        <div class="demo-buttons">
                            <button class="glass-btn primary">Primary</button>
                            <button class="glass-btn secondary">Secondary</button>
                            <button class="glass-btn outline">Outline</button>
                            <button class="glass-btn danger">Danger</button>
                        </div>
                    </div>
                </div>

                <!-- Glass Forms -->
                <div class="showcase-item">
                    <div class="glass-panel">
                        <h3>Glass Forms</h3>
                        <form class="glass-form">
                            <div class="form-group">
                                <input type="text" placeholder="Enter your name" class="glass-input">
                            </div>
                            <div class="form-group">
                                <input type="email" placeholder="Enter your email" class="glass-input">
                            </div>
                            <div class="form-group">
                                <textarea placeholder="Your message" class="glass-textarea"></textarea>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Glass Progress -->
                <div class="showcase-item">
                    <div class="glass-panel">
                        <h3>Progress Indicators</h3>
                        <div class="demo-progress">
                            <div class="progress-item">
                                <label>HTML/CSS</label>
                                <div class="glass-progress">
                                    <div class="progress-fill" style="width: 90%"></div>
                                </div>
                            </div>
                            <div class="progress-item">
                                <label>JavaScript</label>
                                <div class="glass-progress">
                                    <div class="progress-fill" style="width: 85%"></div>
                                </div>
                            </div>
                            <div class="progress-item">
                                <label>Design</label>
                                <div class="glass-progress">
                                    <div class="progress-fill" style="width: 95%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Glass Stats -->
                <div class="showcase-item">
                    <div class="glass-panel">
                        <h3>Statistics</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-number">150+</div>
                                <div class="stat-label">Components</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">50k+</div>
                                <div class="stat-label">Downloads</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">99%</div>
                                <div class="stat-label">Satisfaction</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">24/7</div>
                                <div class="stat-label">Support</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Glass Toggle -->
                <div class="showcase-item">
                    <div class="glass-panel">
                        <h3>Interactive Controls</h3>
                        <div class="demo-controls">
                            <div class="control-item">
                                <label>Dark Mode</label>
                                <div class="glass-toggle">
                                    <input type="checkbox" id="darkMode">
                                    <label for="darkMode" class="toggle-slider"></label>
                                </div>
                            </div>
                            <div class="control-item">
                                <label>Notifications</label>
                                <div class="glass-toggle">
                                    <input type="checkbox" id="notifications" checked>
                                    <label for="notifications" class="toggle-slider"></label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- About Section -->
    <section id="about" class="about-section">
        <div class="section-container">
            <div class="about-content">
                <div class="about-text">
                    <h2>Built for Cloudflare Workers</h2>
                    <p>
                        This showcase demonstrates modern web design principles with glassmorphism effects,
                        optimized for deployment on Cloudflare Workers. Every component is crafted with
                        performance and aesthetics in mind.
                    </p>
                    <div class="features-list">
                        <div class="feature">
                            <span class="feature-icon">⚡</span>
                            <span>Lightning fast performance</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">📱</span>
                            <span>Fully responsive design</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">🎨</span>
                            <span>Modern glassmorphism effects</span>
                        </div>
                        <div class="feature">
                            <span class="feature-icon">🔧</span>
                            <span>Cloudflare Workers ready</span>
                        </div>
                    </div>
                </div>
                <div class="about-visual">
                    <div class="glass-sphere">
                        <div class="sphere-content">
                            <div class="sphere-text">Codex Vibe</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="glass-footer">
        <div class="footer-container">
            <div class="footer-content">
                <div class="footer-section">
                    <h4>Codex Vibe</h4>
                    <p>Modern glass UI components for the web</p>
                </div>
                <div class="footer-section">
                    <h4>Links</h4>
                    <ul>
                        <li><a href="#home">Home</a></li>
                        <li><a href="#showcase">Showcase</a></li>
                        <li><a href="#components">Components</a></li>
                        <li><a href="#about">About</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Contact</h4>
                    <p>hello@codexvibe.com</p>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2024 Codex Vibe. All rights reserved.</p>
            </div>
        </div>
    </footer>

    <link rel="preload" href="./assets/js/script.js" as="script"><script src="./assets/js/script.js" defer></script>
</body>
</html>`,
        '/assets/css/styles.css': `*{margin:0;padding:0;box-sizing:border-box}:root{--primary-color:#6366f1;--secondary-color:#8b5cf6;--accent-color:#06b6d4;--success-color:#10b981;--warning-color:#f59e0b;--danger-color:#ef4444;--glass-bg:rgba(255,255,255,0.1);--glass-border:rgba(255,255,255,0.2);--glass-shadow:0 8px 32px rgba(0,0,0,0.1);--glass-blur:blur(10px);--font-primary:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;--font-weight-light:300;--font-weight-normal:400;--font-weight-medium:500;--font-weight-semibold:600;--font-weight-bold:700;--space-xs:0.5rem;--space-sm:1rem;--space-md:1.5rem;--space-lg:2rem;--space-xl:3rem;--space-2xl:4rem;--radius-sm:0.5rem;--radius-md:1rem;--radius-lg:1.5rem;--radius-xl:2rem;--transition-fast:0.2s ease;--transition-normal:0.3s ease;--transition-slow:0.5s ease}html{scroll-behavior:smooth}body{font-family:var(--font-primary);line-height:1.6;color:white;overflow-x:hidden;background:#0f0f23}.background{position:fixed;top:0;left:0;width:100%;height:100vh;z-index:-1;overflow:hidden}.bg-gradient{position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient( 135deg,#667eea 0%,#764ba2 25%,#f093fb 50%,#f5576c 75%,#4facfe 100% );opacity:0.8;animation:gradientShift 20s ease infinite}@keyframes gradientShift{0%,100%{opacity:0.8}50%{opacity:0.6}}.floating-shapes{position:absolute;width:100%;height:100%}.shape{position:absolute;background:rgba(255,255,255,0.1);border-radius:50%;backdrop-filter:var(--glass-blur);animation:float 6s ease-in-out infinite}.shape-1{width:200px;height:200px;top:10%;left:10%;animation-delay:0s}.shape-2{width:150px;height:150px;top:60%;right:10%;animation-delay:2s}.shape-3{width:100px;height:100px;bottom:20%;left:20%;animation-delay:4s}.shape-4{width:120px;height:120px;top:30%;right:30%;animation-delay:1s}@keyframes float{0%,100%{transform:translateY(0px) rotate(0deg)}33%{transform:translateY(-20px) rotate(120deg)}66%{transform:translateY(10px) rotate(240deg)}}.glass-element{background:var(--glass-bg);backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);box-shadow:var(--glass-shadow)}.glass-nav{position:fixed;top:0;width:100%;z-index:1000;padding:var(--space-sm) 0;background:rgba(255,255,255,0.05);backdrop-filter:var(--glass-blur);border-bottom:1px solid var(--glass-border)}.nav-container{max-width:1200px;margin:0 auto;padding:0 var(--space-lg);display:flex;justify-content:space-between;align-items:center}.logo-text{font-size:1.5rem;font-weight:var(--font-weight-bold);background:linear-gradient(135deg,var(--primary-color),var(--secondary-color));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.nav-links{display:flex;list-style:none;gap:var(--space-lg)}.nav-link{color:rgba(255,255,255,0.8);text-decoration:none;font-weight:var(--font-weight-medium);padding:var(--space-xs) var(--space-sm);border-radius:var(--radius-sm);transition:var(--transition-normal);position:relative}.nav-link:hover,.nav-link.active{color:white;background:rgba(255,255,255,0.1)}.menu-toggle{display:none;flex-direction:column;background:none;border:none;cursor:pointer;padding:var(--space-xs)}.menu-toggle span{width:25px;height:3px;background:white;margin:2px 0;transition:var(--transition-fast);border-radius:2px}.hero-section{min-height:100vh;display:flex;align-items:center;padding:var(--space-2xl) 0}.hero-container{max-width:1200px;margin:0 auto;padding:0 var(--space-lg);display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2xl);align-items:center}.hero-title{font-size:clamp(2.5rem,5vw,4rem);font-weight:var(--font-weight-bold);line-height:1.1;margin-bottom:var(--space-md)}.title-line{display:block;background:linear-gradient(135deg,#fff,rgba(255,255,255,0.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.hero-description{font-size:1.25rem;color:rgba(255,255,255,0.8);margin-bottom:var(--space-xl);line-height:1.6}.hero-buttons{display:flex;gap:var(--space-md);margin-bottom:var(--space-xl)}.glass-button{padding:var(--space-md) var(--space-xl);border:none;border-radius:var(--radius-md);font-weight:var(--font-weight-semibold);font-size:1rem;cursor:pointer;transition:var(--transition-normal);backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border)}.glass-button.primary{background:linear-gradient(135deg,var(--primary-color),var(--secondary-color));color:white;box-shadow:0 4px 20px rgba(99,102,241,0.3)}.glass-button.secondary{background:var(--glass-bg);color:white;box-shadow:var(--glass-shadow)}.glass-button:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,0,0,0.2)}.hero-visual{position:relative;display:flex;flex-direction:column;gap:var(--space-lg)}.glass-card{background:var(--glass-bg);backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:var(--space-lg);box-shadow:var(--glass-shadow);transition:var(--transition-normal)}.glass-card.floating{animation:cardFloat 6s ease-in-out infinite}.glass-card.delay-1{animation-delay:2s}.glass-card.delay-2{animation-delay:4s}@keyframes cardFloat{0%,100%{transform:translateY(0px)}50%{transform:translateY(-10px)}}.card-content{text-align:center}.card-icon{font-size:2rem;margin-bottom:var(--space-sm)}.card-content h3{font-size:1.25rem;font-weight:var(--font-weight-semibold);margin-bottom:var(--space-xs)}.card-content p{color:rgba(255,255,255,0.7)}.showcase-section,.about-section{padding:var(--space-2xl) 0}.section-container{max-width:1200px;margin:0 auto;padding:0 var(--space-lg)}.section-header{text-align:center;margin-bottom:var(--space-2xl)}.section-title{font-size:clamp(2rem,4vw,3rem);font-weight:var(--font-weight-bold);margin-bottom:var(--space-md);background:linear-gradient(135deg,#fff,rgba(255,255,255,0.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.section-description{font-size:1.25rem;color:rgba(255,255,255,0.8)}.showcase-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:var(--space-xl)}.showcase-item{animation:fadeInUp 0.6s ease forwards;opacity:0;transform:translateY(30px)}.showcase-item:nth-child(1){animation-delay:0.1s}.showcase-item:nth-child(2){animation-delay:0.2s}.showcase-item:nth-child(3){animation-delay:0.3s}.showcase-item:nth-child(4){animation-delay:0.4s}.showcase-item:nth-child(5){animation-delay:0.5s}.showcase-item:nth-child(6){animation-delay:0.6s}@keyframes fadeInUp{to{opacity:1;transform:translateY(0)}}.glass-panel{background:var(--glass-bg);backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:var(--space-xl);box-shadow:var(--glass-shadow);height:100%;transition:var(--transition-normal)}.glass-panel:hover{transform:translateY(-5px);box-shadow:0 12px 40px rgba(0,0,0,0.15)}.glass-panel h3{font-size:1.5rem;font-weight:var(--font-weight-semibold);margin-bottom:var(--space-lg);text-align:center}.demo-cards .demo-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-md);padding:var(--space-lg);margin-top:var(--space-md)}.card-header{display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-md)}.card-avatar{width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,var(--primary-color),var(--secondary-color))}.card-info h4{font-weight:var(--font-weight-semibold);margin-bottom:var(--space-xs)}.card-info p{color:rgba(255,255,255,0.6);font-size:0.9rem}.demo-buttons{display:flex;flex-wrap:wrap;gap:var(--space-md);margin-top:var(--space-md)}.glass-btn{padding:var(--space-sm) var(--space-lg);border:none;border-radius:var(--radius-sm);font-weight:var(--font-weight-medium);cursor:pointer;transition:var(--transition-normal);backdrop-filter:var(--glass-blur)}.glass-btn.primary{background:linear-gradient(135deg,var(--primary-color),var(--secondary-color));color:white}.glass-btn.secondary{background:rgba(139,92,246,0.2);color:var(--secondary-color);border:1px solid rgba(139,92,246,0.3)}.glass-btn.outline{background:transparent;color:white;border:1px solid rgba(255,255,255,0.3)}.glass-btn.danger{background:rgba(239,68,68,0.2);color:var(--danger-color);border:1px solid rgba(239,68,68,0.3)}.glass-btn:hover{transform:translateY(-1px);box-shadow:0 4px 15px rgba(0,0,0,0.2)}.glass-form{margin-top:var(--space-md)}.form-group{margin-bottom:var(--space-md)}.glass-input,.glass-textarea{width:100%;padding:var(--space-md);background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);border-radius:var(--radius-sm);color:white;font-family:inherit;backdrop-filter:var(--glass-blur);transition:var(--transition-normal)}.glass-input:focus,.glass-textarea:focus{outline:none;border-color:var(--primary-color);box-shadow:0 0 0 3px rgba(99,102,241,0.1)}.glass-input::placeholder,.glass-textarea::placeholder{color:rgba(255,255,255,0.5)}.glass-textarea{resize:vertical;min-height:100px}.demo-progress{margin-top:var(--space-md)}.progress-item{margin-bottom:var(--space-md)}.progress-item label{display:block;margin-bottom:var(--space-xs);font-weight:var(--font-weight-medium)}.glass-progress{height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;backdrop-filter:var(--glass-blur)}.progress-fill{height:100%;background:linear-gradient(90deg,var(--primary-color),var(--secondary-color));border-radius:4px;transition:width 1s ease}.stats-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-md);margin-top:var(--space-md)}.stat-item{text-align:center;padding:var(--space-md);background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);backdrop-filter:var(--glass-blur)}.stat-number{font-size:1.5rem;font-weight:var(--font-weight-bold);color:var(--primary-color);margin-bottom:var(--space-xs)}.stat-label{font-size:0.9rem;color:rgba(255,255,255,0.7)}.demo-controls{margin-top:var(--space-md)}.control-item{display:flex;justify-content:space-between;align-items:center;padding:var(--space-md);background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-sm);margin-bottom:var(--space-md);backdrop-filter:var(--glass-blur)}.glass-toggle{position:relative}.glass-toggle input{display:none}.toggle-slider{width:50px;height:26px;background:rgba(255,255,255,0.2);border-radius:13px;position:relative;cursor:pointer;transition:var(--transition-normal);backdrop-filter:var(--glass-blur)}.toggle-slider::before{content:'';position:absolute;top:2px;left:2px;width:22px;height:22px;background:white;border-radius:50%;transition:var(--transition-normal);box-shadow:0 2px 5px rgba(0,0,0,0.2)}.glass-toggle input:checked + .toggle-slider{background:linear-gradient(135deg,var(--primary-color),var(--secondary-color))}.glass-toggle input:checked + .toggle-slider::before{transform:translateX(24px)}.about-content{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2xl);align-items:center}.about-text h2{font-size:2.5rem;font-weight:var(--font-weight-bold);margin-bottom:var(--space-lg);background:linear-gradient(135deg,#fff,rgba(255,255,255,0.7));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.about-text p{font-size:1.1rem;color:rgba(255,255,255,0.8);margin-bottom:var(--space-xl);line-height:1.6}.features-list{display:flex;flex-direction:column;gap:var(--space-md)}.feature{display:flex;align-items:center;gap:var(--space-md);padding:var(--space-md);background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--radius-sm);backdrop-filter:var(--glass-blur)}.feature-icon{font-size:1.5rem}.about-visual{display:flex;justify-content:center;align-items:center}.glass-sphere{width:300px;height:300px;border-radius:50%;background:linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05) );border:1px solid rgba(255,255,255,0.2);backdrop-filter:var(--glass-blur);display:flex;align-items:center;justify-content:center;position:relative;animation:sphereRotate 20s linear infinite}.glass-sphere::before{content:'';position:absolute;top:20%;left:20%;width:60px;height:60px;background:radial-gradient(circle,rgba(255,255,255,0.3),transparent);border-radius:50%;filter:blur(10px)}.sphere-content{text-align:center}.sphere-text{font-size:1.5rem;font-weight:var(--font-weight-bold);background:linear-gradient(135deg,var(--primary-color),var(--secondary-color));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}@keyframes sphereRotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.glass-footer{background:var(--glass-bg);backdrop-filter:var(--glass-blur);border-top:1px solid var(--glass-border);padding:var(--space-2xl) 0 var(--space-lg);margin-top:var(--space-2xl)}.footer-container{max-width:1200px;margin:0 auto;padding:0 var(--space-lg)}.footer-content{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:var(--space-xl);margin-bottom:var(--space-xl)}.footer-section h4{font-size:1.25rem;font-weight:var(--font-weight-semibold);margin-bottom:var(--space-md);color:white}.footer-section p{color:rgba(255,255,255,0.7);line-height:1.6}.footer-section ul{list-style:none}.footer-section li{margin-bottom:var(--space-xs)}.footer-section a{color:rgba(255,255,255,0.7);text-decoration:none;transition:var(--transition-fast)}.footer-section a:hover{color:white}.footer-bottom{text-align:center;padding-top:var(--space-lg);border-top:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6)}@media (max-width:768px){.nav-links{display:none}.menu-toggle{display:flex}.hero-container{grid-template-columns:1fr;text-align:center;gap:var(--space-lg)}.hero-buttons{flex-direction:column;align-items:center}.glass-button{width:100%;max-width:250px}.about-content{grid-template-columns:1fr;text-align:center}.showcase-grid{grid-template-columns:1fr}.demo-buttons{justify-content:center}.stats-grid{grid-template-columns:1fr}.glass-sphere{width:200px;height:200px}.sphere-text{font-size:1.2rem}}@media (max-width:480px){.section-container{padding:0 var(--space-md)}.hero-section{padding:var(--space-xl) 0}.glass-panel{padding:var(--space-lg)}.hero-title{font-size:2.5rem}.section-title{font-size:2rem}}@media (prefers-reduced-motion:no-preference){.showcase-item{animation:fadeInUp 0.6s ease forwards}}@media (prefers-reduced-motion:reduce){*{animation-duration:0.01ms !important;animation-iteration-count:1 !important;transition-duration:0.01ms !important}}button:focus,input:focus,textarea:focus,a:focus{outline:2px solid var(--primary-color);outline-offset:2px}.text-center{text-align:center}.text-left{text-align:left}.text-right{text-align:right}.d-flex{display:flex}.d-grid{display:grid}.d-none{display:none}.justify-center{justify-content:center}.align-center{align-items:center}.mt-1{margin-top:var(--space-xs)}.mt-2{margin-top:var(--space-sm)}.mt-3{margin-top:var(--space-md)}.mt-4{margin-top:var(--space-lg)}.mb-1{margin-bottom:var(--space-xs)}.mb-2{margin-bottom:var(--space-sm)}.mb-3{margin-bottom:var(--space-md)}.mb-4{margin-bottom:var(--space-lg)}`,
        '/assets/js/script.js': `document.addEventListener('DOMContentLoaded', function() { initializeApp()}); function initializeApp() { initNavigation(); initScrollEffects(); initInteractiveElements(); initAnimations(); initResponsiveFeatures()} function initNavigation() { const navLinks = document.querySelectorAll('.nav-link'); const menuToggle = document.querySelector('.menu-toggle'); const navLinksContainer = document.querySelector('.nav-links'); navLinks.forEach(link => { link.addEventListener('click', function(e) { e.preventDefault(); const targetId = this.getAttribute('href').substring(1); const targetSection = document.getElementById(targetId); if (targetSection) { const navHeight = document.querySelector('.glass-nav').offsetHeight; const targetPosition = targetSection.offsetTop - navHeight; window.scrollTo({ top: targetPosition, behavior: 'smooth' }); updateActiveNavLink(this); if (window.innerWidth <= 768) { toggleMobileMenu(false)} } })}); if (menuToggle) { menuToggle.addEventListener('click', function() { toggleMobileMenu()})} window.addEventListener('scroll', debounce(updateActiveNavOnScroll, 100))} function updateActiveNavLink(activeLink) { document.querySelectorAll('.nav-link').forEach(link => { link.classList.remove('active')}); activeLink.classList.add('active')} function updateActiveNavOnScroll() { const sections = document.querySelectorAll('section[id]'); const navHeight = document.querySelector('.glass-nav').offsetHeight; const scrollPos = window.scrollY + navHeight + 100; sections.forEach(section => { const top = section.offsetTop; const bottom = top + section.offsetHeight; const id = section.getAttribute('id'); if (scrollPos >= top && scrollPos <= bottom) { const correspondingLink = document.querySelector(\`.nav-link[href="#\${id}"]\`); if (correspondingLink) { updateActiveNavLink(correspondingLink)} } })} function toggleMobileMenu(forceState = null) { const navLinks = document.querySelector('.nav-links'); const menuToggle = document.querySelector('.menu-toggle'); if (forceState !== null) { if (forceState) { navLinks.classList.add('mobile-open'); menuToggle.classList.add('active')} else { navLinks.classList.remove('mobile-open'); menuToggle.classList.remove('active')} } else { navLinks.classList.toggle('mobile-open'); menuToggle.classList.toggle('active')} } function initScrollEffects() { window.addEventListener('scroll', debounce(handleParallax, 10)); const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }; const observer = new IntersectionObserver(handleIntersection, observerOptions); document.querySelectorAll('.showcase-item').forEach(item => { observer.observe(item)}); document.querySelectorAll('.glass-card, .feature, .stat-item').forEach(item => { observer.observe(item)})} function handleParallax() { const scrolled = window.pageYOffset; const shapes = document.querySelectorAll('.shape'); shapes.forEach((shape, index) => { const speed = 0.5 + (index * 0.1); const transform = \`translateY(\${scrolled * speed}px)\`; shape.style.transform = transform})} function handleIntersection(entries) { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); if (entry.target.querySelector('.progress-fill')) { animateProgressBars(entry.target)} if (entry.target.querySelector('.stat-number')) { animateStats(entry.target)} } })} function initInteractiveElements() { initButtonEffects(); initFormEffects(); initToggleSwitches(); initCardEffects()} function initButtonEffects() { const buttons = document.querySelectorAll('.glass-button, .glass-btn'); buttons.forEach(button => { button.addEventListener('mouseenter', function() { this.style.transform = 'translateY(-2px) scale(1.02)'}); button.addEventListener('mouseleave', function() { this.style.transform = 'translateY(0) scale(1)'}); button.addEventListener('mousedown', function() { this.style.transform = 'translateY(1px) scale(0.98)'}); button.addEventListener('mouseup', function() { this.style.transform = 'translateY(-2px) scale(1.02)'})})} function initFormEffects() { const inputs = document.querySelectorAll('.glass-input, .glass-textarea'); inputs.forEach(input => { input.addEventListener('focus', function() { this.parentElement.classList.add('focused'); addRippleEffect(this)}); input.addEventListener('blur', function() { this.parentElement.classList.remove('focused')}); input.addEventListener('input', function() { if (this.value.length > 0) { this.parentElement.classList.add('has-content')} else { this.parentElement.classList.remove('has-content')} })})} function initToggleSwitches() { const toggles = document.querySelectorAll('.glass-toggle input'); toggles.forEach(toggle => { toggle.addEventListener('change', function() { const label = this.nextElementSibling; if (this.checked) { label.style.background = 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))'; playToggleSound()} else { label.style.background = 'rgba(255, 255, 255, 0.2)'} addRippleEffect(label)})})} function initCardEffects() { const cards = document.querySelectorAll('.glass-card, .glass-panel, .demo-card'); cards.forEach(card => { card.addEventListener('mouseenter', function() { this.style.transform = 'translateY(-5px) rotateX(5deg)'; this.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.2)'}); card.addEventListener('mouseleave', function() { this.style.transform = 'translateY(0) rotateX(0)'; this.style.boxShadow = ''}); card.addEventListener('mousemove', function(e) { const rect = this.getBoundingClientRect(); const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height / 2; const deltaX = (e.clientX - centerX) / rect.width; const deltaY = (e.clientY - centerY) / rect.height; const tiltX = deltaY * 10; const tiltY = deltaX * -10; this.style.transform = \`translateY(-5px) rotateX(\${tiltX}deg) rotateY(\${tiltY}deg)\`})})} function initAnimations() { animateProgressBarsOnLoad(); initFloatingAnimation(); initTypewriterEffect()} function animateProgressBars(container) { const progressBars = container.querySelectorAll('.progress-fill'); progressBars.forEach((bar, index) => { setTimeout(() => { const width = bar.style.width; bar.style.width = '0%'; setTimeout(() => { bar.style.width = width}, 100)}, index * 200)})} function animateProgressBarsOnLoad() { setTimeout(() => { const progressBars = document.querySelectorAll('.progress-fill'); progressBars.forEach(bar => { const width = bar.style.width; bar.style.width = '0%'; setTimeout(() => { bar.style.width = width}, 500)})}, 1000)} function animateStats(container) { const statNumbers = container.querySelectorAll('.stat-number'); statNumbers.forEach(stat => { const finalValue = stat.textContent; const isNumber = /^\d+/.test(finalValue); if (isNumber) { const numValue = parseInt(finalValue.match(/\d+/)[0]); animateNumber(stat, 0, numValue, 1000, finalValue)} })} function animateNumber(element, start, end, duration, suffix) { const startTime = performance.now(); function updateNumber(currentTime) { const elapsed = currentTime - startTime; const progress = Math.min(elapsed / duration, 1); const current = Math.floor(start + (end - start) * easeOutQuart(progress)); element.textContent = suffix.replace(/\d+/, current); if (progress < 1) { requestAnimationFrame(updateNumber)} } requestAnimationFrame(updateNumber)} function initFloatingAnimation() { const floatingElements = document.querySelectorAll('.floating'); floatingElements.forEach((element, index) => { element.style.animationDelay = \`\${index * 0.5}s\`})} function initTypewriterEffect() { const titleLines = document.querySelectorAll('.title-line'); titleLines.forEach((line, index) => { const text = line.textContent; line.textContent = ''; setTimeout(() => { typeWriter(line, text, 100)}, index * 1000)})} function typeWriter(element, text, speed) { let i = 0; function type() { if (i < text.length) { element.textContent += text.charAt(i); i++; setTimeout(type, speed)} } type()} function initResponsiveFeatures() { window.addEventListener('resize', debounce(handleResize, 250)); initTouchGestures(); adjustAnimationsForDevice()} function handleResize() { if (window.innerWidth > 768) { toggleMobileMenu(false)} adjustGlassSphere(); updateActiveNavOnScroll()} function initTouchGestures() { let startX, startY, endX, endY; document.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; startY = e.touches[0].clientY}); document.addEventListener('touchend', function(e) { endX = e.changedTouches[0].clientX; endY = e.changedTouches[0].clientY; handleSwipe()}); function handleSwipe() { const diffX = startX - endX; const diffY = startY - endY; if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) { if (diffX > 0) { console.log('Swipe left detected')} else { console.log('Swipe right detected')} } } } function adjustAnimationsForDevice() { const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)'); const isMobile = window.innerWidth <= 768; if (prefersReducedMotion.matches || isMobile) { document.body.classList.add('reduced-motion')} } function adjustGlassSphere() { const sphere = document.querySelector('.glass-sphere'); if (sphere && window.innerWidth <= 480) { sphere.style.width = '150px'; sphere.style.height = '150px'} else if (sphere && window.innerWidth <= 768) { sphere.style.width = '200px'; sphere.style.height = '200px'} } function debounce(func, wait) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func(...args)}; clearTimeout(timeout); timeout = setTimeout(later, wait)}} function easeOutQuart(t) { return 1 - (--t) * t * t * t} function addRippleEffect(element) { const ripple = document.createElement('span'); const rect = element.getBoundingClientRect(); const size = Math.max(rect.width, rect.height); ripple.style.width = ripple.style.height = size + 'px'; ripple.style.left = '50%'; ripple.style.top = '50%'; ripple.style.transform = 'translate(-50%, -50%)'; ripple.classList.add('ripple'); element.style.position = 'relative'; element.style.overflow = 'hidden'; element.appendChild(ripple); setTimeout(() => { ripple.remove()}, 600)} function playToggleSound() { if (typeof AudioContext !== 'undefined') { const audioContext = new AudioContext(); const oscillator = audioContext.createOscillator(); const gainNode = audioContext.createGain(); oscillator.connect(gainNode); gainNode.connect(audioContext.destination); oscillator.frequency.setValueAtTime(800, audioContext.currentTime); gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1); oscillator.start(audioContext.currentTime); oscillator.stop(audioContext.currentTime + 0.1)} } function initPerformanceOptimizations() { if ('IntersectionObserver' in window) { const imageObserver = new IntersectionObserver((entries, observer) => { entries.forEach(entry => { if (entry.isIntersecting) { const img = entry.target; img.src = img.dataset.src; img.classList.remove('lazy'); observer.unobserve(img)} })}); document.querySelectorAll('img[data-src]').forEach(img => { imageObserver.observe(img)})} prefetchResources()} function prefetchResources() { const resourcesToPrefetch = [ ]; resourcesToPrefetch.forEach(resource => { const link = document.createElement('link'); link.rel = 'prefetch'; link.href = resource; document.head.appendChild(link)})} function addDynamicStyles() { const style = document.createElement('style'); style.textContent = \` @media (max-width: 768px) { .nav-links { position: fixed; top: 70px; left: 0; width: 100%; background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(20px); flex-direction: column; padding: 2rem; transform: translateX(-100%); transition: transform 0.3s ease; z-index: 999} .nav-links.mobile-open { transform: translateX(0)} .menu-toggle.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px)} .menu-toggle.active span:nth-child(2) { opacity: 0} .menu-toggle.active span:nth-child(3) { transform: rotate(-45deg) translate(7px, -6px)} } .ripple { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%); animation: ripple-animation 0.6s ease-out; pointer-events: none} @keyframes ripple-animation { to { transform: translate(-50%, -50%) scale(2); opacity: 0} } .showcase-item { opacity: 0; transform: translateY(30px); transition: all 0.6s ease} .showcase-item.in-view { opacity: 1; transform: translateY(0)} .form-group.focused .glass-input, .form-group.focused .glass-textarea { border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1)} .reduced-motion * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important} .glass-card, .glass-panel { transform-style: preserve-3d; perspective: 1000px} \`; document.head.appendChild(style)} addDynamicStyles(); initPerformanceOptimizations(); if (typeof window !== 'undefined') { console.log('🚀 Glass UI Showcase initialized successfully!')} else { console.log('🔧 Running in Cloudflare Workers environment')}`
    };
}

/**
 * Get file extension from pathname
 */
function getFileExtension(pathname) {
    const lastDot = pathname.lastIndexOf('.');
    return lastDot !== -1 ? pathname.substr(lastDot) : '';
}

/**
 * Get cache configuration based on file extension
 */
function getCacheConfig(ext) {
    if (ext === '.html') {
        return CACHE_CONFIG.html;
    } else if (ext === '.css' || ext === '.js') {
        return CACHE_CONFIG.assets;
    } else {
        return CACHE_CONFIG.static;
    }
}

/**
 * Check if content should be compressed
 */
function shouldCompress(mimeType) {
    return mimeType.startsWith('text/') || 
           mimeType.includes('javascript') || 
           mimeType.includes('json') || 
           mimeType.includes('xml');
}

/**
 * Create 404 response
 */
function createNotFoundResponse() {
    const notFoundHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>404 - Page Not Found | Codex Vibe</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Inter', sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; 
                min-height: 100vh; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                text-align: center;
            }
            .container { 
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                padding: 3rem;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            h1 { font-size: 4rem; margin-bottom: 1rem; }
            p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.8; }
            a { 
                color: white; 
                text-decoration: none; 
                background: rgba(255, 255, 255, 0.2);
                padding: 1rem 2rem;
                border-radius: 10px;
                transition: all 0.3s ease;
            }
            a:hover { 
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>404</h1>
            <p>Oops! The page you're looking for doesn't exist.</p>
            <a href="/">Return to Home</a>
        </div>
    </body>
    </html>`;
    
    const headers = new Headers();
    headers.set('Content-Type', 'text/html; charset=utf-8');
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        headers.set(key, value);
    });
    
    return new Response(notFoundHtml, {
        status: 404,
        headers: headers
    });
}

/**
 * Handle errors gracefully
 */
function handleError(error) {
    console.error('Worker error:', error);
    
    const errorHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error | Codex Vibe</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Inter', sans-serif; 
                background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
                color: white; 
                min-height: 100vh; 
                display: flex; 
                align-items: center; 
                justify-content: center;
                text-align: center;
            }
            .container { 
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                padding: 3rem;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            h1 { font-size: 3rem; margin-bottom: 1rem; }
            p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.8; }
            a { 
                color: white; 
                text-decoration: none; 
                background: rgba(255, 255, 255, 0.2);
                padding: 1rem 2rem;
                border-radius: 10px;
                transition: all 0.3s ease;
            }
            a:hover { 
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>⚠️ Error</h1>
            <p>Something went wrong. Please try again later.</p>
            <a href="/">Return to Home</a>
        </div>
    </body>
    </html>`;
    
    const headers = new Headers();
    headers.set('Content-Type', 'text/html; charset=utf-8');
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        headers.set(key, value);
    });
    
    return new Response(errorHtml, {
        status: 500,
        headers: headers
    });
}

/**
 * Handle OPTIONS requests for CORS
 */
function handleOptions(request) {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '86400');
    
    return new Response(null, {
        status: 204,
        headers: headers
    });
}