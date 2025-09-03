import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const createConfig = (format, filename, minify = false) => ({
    input: 'src/index.js',
    output: {
        file: `dist/${filename}`,
        format: format,
        name: format === 'umd' ? 'ParallaxVisualizer' : undefined,
        globals: {
            react: 'React',
            'react-dom': 'ReactDOM'
        },
        sourcemap: true
    },
    external: ['react', 'react-dom'],
    plugins: [
        nodeResolve({
            browser: true,
            preferBuiltins: false
        }),
        babel({
            babelHelpers: 'bundled',
            exclude: 'node_modules/**',
            presets: [
                ['@babel/preset-env', {
                    targets: '> 1%, last 2 versions, not dead'
                }]
            ]
        }),
        ...(minify ? [terser()] : [])
    ]
});

export default [
    // ES modules
    createConfig('esm', 'parallax-visualizer.esm.js'),
    createConfig('esm', 'parallax-visualizer.esm.min.js', true),
    
    // CommonJS
    createConfig('cjs', 'parallax-visualizer.cjs.js'),
    createConfig('cjs', 'parallax-visualizer.cjs.min.js', true),
    
    // UMD for browsers
    createConfig('umd', 'parallax-visualizer.umd.js'),
    createConfig('umd', 'parallax-visualizer.umd.min.js', true),
    
    // IIFE for direct browser use
    createConfig('iife', 'parallax-visualizer.browser.js'),
    createConfig('iife', 'parallax-visualizer.browser.min.js', true)
];