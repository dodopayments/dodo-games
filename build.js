// build.js
const fs = require('fs-extra');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const glob = require('glob');

const SOURCE_DIR = '.';
const DIST_DIR = './dist';
const EXCLUDE_PATTERNS = ['node_modules/**', 'dist/**', 'build.js', 'package*.json'];

// Initialize Clean CSS
const cleanCSS = new CleanCSS({
  level: 2,
  returnPromise: true
});

async function minifyJavaScript(code, filePath) {
  try {
    const result = await minify(code, {
      compress: {
        dead_code: true,
        drop_console: false,
        drop_debugger: true,
        keep_classnames: false,
        keep_fargs: true,
        keep_fnames: false,
        keep_infinity: false,
      },
      mangle: true,
      format: {
        comments: false
      }
    });
    return result.code;
  } catch (error) {
    console.error(`Error minifying JS file ${filePath}:`, error.message);
    return code; // Return original code if minification fails
  }
}

async function minifyCSS(code, filePath) {
  try {
    const result = await cleanCSS.minify(code);
    if (result.errors.length > 0) {
      console.error(`CSS minification errors in ${filePath}:`, result.errors);
      return code;
    }
    return result.styles;
  } catch (error) {
    console.error(`Error minifying CSS file ${filePath}:`, error.message);
    return code;
  }
}

async function processFile(sourceFile, destFile) {
  const ext = path.extname(sourceFile).toLowerCase();
  
  // Ensure destination directory exists
  await fs.ensureDir(path.dirname(destFile));
  
  if (ext === '.js') {
    const code = await fs.readFile(sourceFile, 'utf8');
    const minified = await minifyJavaScript(code, sourceFile);
    await fs.writeFile(destFile, minified, 'utf8');
    console.log(`Minified JS: ${sourceFile} -> ${destFile}`);
  } else if (ext === '.css') {
    const code = await fs.readFile(sourceFile, 'utf8');
    const minified = await minifyCSS(code, sourceFile);
    await fs.writeFile(destFile, minified, 'utf8');
    console.log(`Minified CSS: ${sourceFile} -> ${destFile}`);
  } else {
    await fs.copy(sourceFile, destFile);
    console.log(`Copied: ${sourceFile} -> ${destFile}`);
  }
}

async function build() {
  console.log('Starting build process...\n');
  
  // Clean dist directory
  await fs.remove(DIST_DIR);
  await fs.ensureDir(DIST_DIR);
  console.log('Cleaned dist directory\n');
  
  // Find all files
  const files = glob.sync('**/*', {
    nodir: true,
    ignore: EXCLUDE_PATTERNS,
    dot: false
  });
  
  console.log(`Found ${files.length} files to process\n`);
  
  // Process each file
  for (const file of files) {
    const sourceFile = path.join(SOURCE_DIR, file);
    const destFile = path.join(DIST_DIR, file);
    
    try {
      await processFile(sourceFile, destFile);
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }
  
  console.log('\n✓ Build completed successfully!');
  console.log(`Output directory: ${DIST_DIR}`);
}

// Run build
build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
