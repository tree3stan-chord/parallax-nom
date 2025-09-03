#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(colors[color] + message + colors.reset);
}

function exec(command, description) {
    log(`\n${description}...`, 'blue');
    try {
        const result = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
        log(`✓ ${description} completed`, 'green');
        return result;
    } catch (error) {
        log(`✗ ${description} failed: ${error.message}`, 'red');
        throw error;
    }
}

function checkFile(filePath, description) {
    if (!fs.existsSync(filePath)) {
        log(`✗ Missing ${description}: ${filePath}`, 'red');
        return false;
    }
    log(`✓ Found ${description}`, 'green');
    return true;
}

function main() {
    log('🚀 Preparing Parallax Visualizer for Release', 'bright');
    
    // Check required files
    log('\n📋 Checking required files...', 'yellow');
    const requiredFiles = [
        ['package.json', 'Package manifest'],
        ['README.md', 'README file'],
        ['src/index.js', 'Main entry point'],
        ['src/types/index.d.ts', 'TypeScript definitions'],
        ['docs/index.html', 'Documentation'],
        ['.github/workflows/ci.yml', 'CI/CD pipeline']
    ];

    let allFilesPresent = true;
    for (const [file, description] of requiredFiles) {
        if (!checkFile(file, description)) {
            allFilesPresent = false;
        }
    }

    if (!allFilesPresent) {
        log('\n💥 Some required files are missing. Please check and try again.', 'red');
        process.exit(1);
    }

    // Read and validate package.json
    log('\n📦 Validating package.json...', 'yellow');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    
    const requiredFields = ['name', 'version', 'description', 'main', 'types', 'author', 'license'];
    for (const field of requiredFields) {
        if (!packageJson[field]) {
            log(`✗ Missing required field: ${field}`, 'red');
            allFilesPresent = false;
        }
    }

    if (!allFilesPresent) {
        log('\n💥 Package.json validation failed.', 'red');
        process.exit(1);
    }

    log(`✓ Package: ${packageJson.name}@${packageJson.version}`, 'green');

    // Clean previous builds
    exec('npm run clean', 'Cleaning previous builds');

    // Install dependencies
    exec('npm ci', 'Installing dependencies');

    // Run linting
    exec('npm run lint', 'Running linter');

    // Run tests with coverage
    exec('npm run test:coverage', 'Running tests with coverage');

    // Build package
    exec('npm run build', 'Building package');

    // Verify build output
    log('\n🔍 Verifying build output...', 'yellow');
    const distFiles = [
        'dist/index.js',
        'dist/index.esm.js', 
        'dist/index.umd.js',
        'dist/index.iife.js'
    ];

    for (const file of distFiles) {
        checkFile(file, `Build output: ${file}`);
    }

    // Test import
    try {
        require('./dist/index.js');
        log('✓ Package import test passed', 'green');
    } catch (error) {
        log(`✗ Package import test failed: ${error.message}`, 'red');
        process.exit(1);
    }

    // Check bundle sizes
    log('\n📊 Checking bundle sizes...', 'yellow');
    try {
        const stats = fs.statSync('dist/index.js');
        const sizeKB = Math.round(stats.size / 1024);
        log(`Main bundle: ${sizeKB}KB`, sizeKB > 200 ? 'yellow' : 'green');

        if (fs.existsSync('dist/index.esm.js')) {
            const esmStats = fs.statSync('dist/index.esm.js');
            const esmSizeKB = Math.round(esmStats.size / 1024);
            log(`ESM bundle: ${esmSizeKB}KB`, esmSizeKB > 200 ? 'yellow' : 'green');
        }
    } catch (error) {
        log(`⚠ Could not check bundle sizes: ${error.message}`, 'yellow');
    }

    // Test packaging
    log('\n📦 Testing package creation...', 'yellow');
    try {
        const packOutput = exec('npm pack --dry-run', 'Dry run packaging');
        const lines = packOutput.split('\n').filter(line => line.includes('tarball:') || line.includes('size:'));
        for (const line of lines) {
            log(line.trim(), 'blue');
        }
    } catch (error) {
        log(`⚠ Pack test failed: ${error.message}`, 'yellow');
    }

    // Generate documentation
    if (packageJson.scripts['build:docs']) {
        exec('npm run build:docs', 'Building documentation');
    }

    // Success message
    log('\n🎉 Release preparation completed successfully!', 'bright');
    log('\nNext steps:', 'yellow');
    log('1. Review the changes and commit them', 'blue');
    log('2. Create a GitHub release with a version tag', 'blue');
    log('3. The CI/CD pipeline will automatically publish to NPM', 'blue');
    log('\nExample release commands:', 'yellow');
    log('git tag v' + packageJson.version, 'blue');
    log('git push origin v' + packageJson.version, 'blue');
    log('Or create a release on GitHub web interface', 'blue');

    log(`\n📋 Package Summary:`, 'bright');
    log(`Name: ${packageJson.name}`, 'blue');
    log(`Version: ${packageJson.version}`, 'blue');
    log(`Description: ${packageJson.description}`, 'blue');
    log(`License: ${packageJson.license}`, 'blue');
}

if (require.main === module) {
    main();
}

module.exports = { main };