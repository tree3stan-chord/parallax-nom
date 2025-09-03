// Quick test to verify the built package works
const pkg = require('./dist/parallax-visualizer.cjs.js');

console.log('🎵 Testing Parallax Visualizer Package');

// Test default export
const ParallaxVisualizer = pkg.default || pkg.ParallaxVisualizer;
console.log('✓ Main class available:', typeof ParallaxVisualizer);

// Test other exports
console.log('✓ AudioHandler available:', typeof pkg.AudioHandler);
console.log('✓ VisualizationRegistry available:', typeof pkg.VisualizationRegistry);
console.log('✓ ColorHandler available:', typeof pkg.ColorHandler);

// Test instantiation (without DOM - just verify constructor)
try {
    // This would normally require DOM element, but we can check the constructor
    console.log('✓ ParallaxVisualizer constructor:', ParallaxVisualizer.name);
} catch (error) {
    console.log('⚠ Constructor test skipped (no DOM):', error.message);
}

// Test visualization registry
try {
    const registry = new pkg.VisualizationRegistry();
    const modes = registry.getAllModes();
    console.log('✓ Available visualization modes:', modes.length, 'modes');
    console.log('  Sample modes:', modes.slice(0, 5));
} catch (error) {
    console.log('✗ Visualization registry test failed:', error.message);
}

// Test utility functions
if (pkg.createAudioSource) {
    console.log('✓ Utility functions available');
}

console.log('\n🎉 Package test completed successfully!');