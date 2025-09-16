# Deployment Guide

## Cloudflare Workers Deployment

### Prerequisites
1. Install Wrangler CLI: `npm install -g wrangler`
2. Authenticate with Cloudflare: `wrangler auth login`

### Deploy Steps
1. Build the project: `npm run build`
2. Deploy to Cloudflare Workers: `npm run deploy`

### Custom Domain (Optional)
1. Add a custom domain in Cloudflare Workers dashboard
2. Update the `wrangler.toml` file with your domain

### Environment Variables
No environment variables are required for basic deployment.

## Local Development
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Open browser to `http://localhost:8787`

## Performance Features
- ✅ Minified CSS and JavaScript
- ✅ Critical CSS inlined
- ✅ Resource preloading
- ✅ Compressed assets
- ✅ Optimized caching headers
- ✅ Security headers
- ✅ Mobile-first responsive design
- ✅ Accessibility features