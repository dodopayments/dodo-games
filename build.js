#!/usr/bin/env node

/**
 * Build Script for Dodo Games - Cloudflare Pages
 * Builds all games and prepares for deployment
 */

const fs = require('fs');
const path = require('path');

// Helper function to minify HTML
function minifyHTML(html) {
    return html
        .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/>\s+</g, '><') // Remove whitespace between tags
        .trim();
}

// Helper function to minify CSS
function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/\s*([{}:;,])\s*/g, '$1') // Remove whitespace around special chars
        .replace(/;}/g, '}') // Remove last semicolon
        .trim();
}

// Helper function to minify JavaScript (basic)
function minifyJS(js) {
    return js
        .replace(/\/\/.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1') // Remove whitespace around operators
        .trim();
}

// Helper function to copy directory recursively
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Find all game directories
function findGames() {
    const rootDir = __dirname;
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    const games = [];

    for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
            const gamePath = path.join(rootDir, entry.name);
            const indexPath = path.join(gamePath, 'index.html');
            if (fs.existsSync(indexPath)) {
                games.push({
                    name: entry.name,
                    path: gamePath
                });
            }
        }
    }

    return games;
}

// Build a single game
function buildGame(game) {
    console.log(`\n📦 Building ${game.name}...`);

    const gameDistPath = path.join(__dirname, 'dist', game.name);
    fs.mkdirSync(gameDistPath, { recursive: true });

    // Read source files
    const htmlPath = path.join(game.path, 'index.html');
    const cssPath = path.join(game.path, 'style.css');
    const jsPath = path.join(game.path, 'script.js');

    let htmlContent = '';
    let cssContent = '';
    let jsContent = '';

    if (fs.existsSync(htmlPath)) {
        htmlContent = fs.readFileSync(htmlPath, 'utf8');
    }
    if (fs.existsSync(cssPath)) {
        cssContent = fs.readFileSync(cssPath, 'utf8');
    }
    if (fs.existsSync(jsPath)) {
        jsContent = fs.readFileSync(jsPath, 'utf8');
    }

    // Minify files
    const minifiedHTML = minifyHTML(htmlContent);
    const minifiedCSS = minifyCSS(cssContent);
    const minifiedJS = minifyJS(jsContent);

    // Write minified files
    if (htmlContent) {
        fs.writeFileSync(path.join(gameDistPath, 'index.html'), minifiedHTML);
        console.log(`  ✓ HTML minified`);
    }
    if (cssContent) {
        fs.writeFileSync(path.join(gameDistPath, 'style.css'), minifiedCSS);
        console.log(`  ✓ CSS minified`);
    }
    if (jsContent) {
        fs.writeFileSync(path.join(gameDistPath, 'script.js'), minifiedJS);
        console.log(`  ✓ JS minified`);
    }

    // Copy assets directory
    const assetsSrc = path.join(game.path, 'assets');
    const assetsDest = path.join(gameDistPath, 'assets');

    if (fs.existsSync(assetsSrc)) {
        copyDir(assetsSrc, assetsDest);
        console.log(`  ✓ Assets copied`);
    }

    console.log(`  ✅ ${game.name} built successfully`);
}

// Main build function
function build() {
    const distDir = path.join(__dirname, 'dist');

    console.log('🚀 Starting build for Cloudflare Pages...\n');

    // Clean dist directory
    if (fs.existsSync(distDir)) {
        fs.rmSync(distDir, { recursive: true });
        console.log('✓ Cleaned dist directory');
    }

    // Create dist directory
    fs.mkdirSync(distDir, { recursive: true });
    console.log('✓ Created dist directory');

    // Build root index.html
    const rootIndexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(rootIndexPath)) {
        const rootIndex = fs.readFileSync(rootIndexPath, 'utf8');
        const minifiedRootIndex = minifyHTML(rootIndex);
        fs.writeFileSync(path.join(distDir, 'index.html'), minifiedRootIndex);
        console.log('✓ Root index.html built');
    }

    // Find and build all games
    const games = findGames();
    console.log(`\n📚 Found ${games.length} game(s): ${games.map(g => g.name).join(', ')}`);

    games.forEach(buildGame);

    console.log('\n✅ Build complete! Ready for Cloudflare Pages deployment.');
    console.log(`📁 Output directory: ${distDir}\n`);
}

// Run build
try {
    build();
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}

