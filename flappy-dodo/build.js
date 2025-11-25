#!/usr/bin/env node

/**
 * Production Build Script for Flappy Dodo
 * Minifies HTML, CSS, and JS and copies assets to dist folder
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

// Main build function
function build() {
    const srcDir = __dirname;
    const distDir = path.join(__dirname, 'dist');

    console.log('🚀 Starting production build...\n');

    // Clean dist directory
    if (fs.existsSync(distDir)) {
        fs.rmSync(distDir, { recursive: true });
        console.log('✓ Cleaned dist directory');
    }

    // Create dist directory
    fs.mkdirSync(distDir, { recursive: true });
    console.log('✓ Created dist directory');

    // Read source files
    const htmlContent = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
    const cssContent = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
    const jsContent = fs.readFileSync(path.join(srcDir, 'script.js'), 'utf8');

    // Minify files
    console.log('\n📦 Minifying files...');

    const minifiedHTML = minifyHTML(htmlContent);
    const minifiedCSS = minifyCSS(cssContent);
    const minifiedJS = minifyJS(jsContent);

    console.log(`✓ HTML: ${htmlContent.length} → ${minifiedHTML.length} bytes (${Math.round((1 - minifiedHTML.length / htmlContent.length) * 100)}% reduction)`);
    console.log(`✓ CSS:  ${cssContent.length} → ${minifiedCSS.length} bytes (${Math.round((1 - minifiedCSS.length / cssContent.length) * 100)}% reduction)`);
    console.log(`✓ JS:   ${jsContent.length} → ${minifiedJS.length} bytes (${Math.round((1 - minifiedJS.length / jsContent.length) * 100)}% reduction)`);

    // Write minified files
    fs.writeFileSync(path.join(distDir, 'index.html'), minifiedHTML);
    fs.writeFileSync(path.join(distDir, 'style.css'), minifiedCSS);
    fs.writeFileSync(path.join(distDir, 'script.js'), minifiedJS);

    // Copy assets directory
    const assetsSrc = path.join(srcDir, 'assets');
    const assetsDest = path.join(distDir, 'assets');

    if (fs.existsSync(assetsSrc)) {
        copyDir(assetsSrc, assetsDest);
        console.log('\n✓ Copied assets directory');
    }

    console.log('\n✅ Production build complete! Output in ./dist\n');
}

// Run build
try {
    build();
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}
