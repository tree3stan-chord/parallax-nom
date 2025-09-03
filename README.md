# 🎵 Parallax Visualizer

[![npm version](https://badge.fury.io/js/parallax-visualizer.svg)](https://badge.fury.io/js/parallax-visualizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Real-time ASCII audio visualization component with 25+ stunning visualization modes**

Transform audio into mesmerizing ASCII art patterns that react to music in real-time. Perfect for web applications, live coding sessions, and interactive audio experiences.

![Demo GIF](https://via.placeholder.com/800x400/000000/00ff00?text=ASCII+Audio+Visualization)

## ✨ Features

- 🎨 **25+ Visualization Modes** - From basic bars to 4D hypercubes
- 🎤 **Multiple Audio Sources** - Microphone, file upload, streams, custom analyzers
- 🌈 **Rainbow Effects** - Beautiful lolcat-style color animations
- ⚛️ **React Support** - Pre-built React components and hooks
- 📱 **Responsive Design** - Automatic resizing and mobile-friendly
- 🎛️ **Real-time Control** - Switch modes and sources on the fly
- 🔧 **Customizable** - Create your own visualizations
- ⚡ **High Performance** - Optimized ASCII rendering engine

## 🚀 Quick Start

### Installation

```bash
npm install parallax-visualizer
```

### Vanilla JavaScript

```javascript
import ParallaxVisualizer from 'parallax-visualizer';

const visualizer = new ParallaxVisualizer({
    container: '#visualizer',
    mode: 'bars',
    audioSource: 'microphone',
    lolcat: true
});
```

### React

```jsx
import { ParallaxVisualizer } from 'parallax-visualizer/react';

function App() {
    return (
        <ParallaxVisualizer
            mode="matrix"
            audioSource="microphone"
            lolcat={true}
            style={{ width: '100%', height: '400px' }}
            onError={(error) => console.error(error)}
        />
    );
}
```

## 🎨 Visualization Modes

### Basic Modes (10)
- **bars** - Classic frequency bars with sparkle effects
- **circle** - Circular audio waves with explosions
- **matrix** - Matrix rain with Japanese characters
- **wave** - Multi-layered sine waves
- **particles** - Dynamic particle system
- **explosion** - Explosive particle effects
- **spiral** - Audio-reactive spiral galaxy
- **dna** - Double helix DNA structure
- **fractal** - Recursive fractal trees
- **starfield** - Starfield warp effects

### Advanced Modes (6)
- **nebula** - Cosmic nebula clouds
- **lava** - Lava lamp fluid simulation
- **ocean** - Multi-layered ocean waves
- **circuit** - Electronic circuit boards
- **quantum** - Quantum field visualization
- **crystal** - Resonating crystal structures

### Extreme Modes (6)
- **glitch** - Digital glitch art effects
- **void** - Void tentacles from darkness
- **hypercube** - 4D hypercube projection
- **coderain** - Programming code streams
- **audioworms** - Audio-reactive worms
- **textexplosion** - Explosive text effects

## 🎛️ Audio Sources

```javascript
// Microphone input
await visualizer.setAudioSource('microphone');

// File upload
await visualizer.setAudioSource({ 
    type: 'file', 
    file: audioFile 
});

// Media stream
await visualizer.setAudioSource({ 
    type: 'stream', 
    stream: mediaStream 
});

// Custom Web Audio API node
await visualizer.setAudioSource({ 
    type: 'analyser', 
    analyser: analyserNode 
});
```

## ⚛️ React Integration

### Basic Component

```jsx
import { ParallaxVisualizer } from 'parallax-visualizer/react';

<ParallaxVisualizer
    mode="bars"
    audioSource="microphone"
    lolcat={true}
    onModeChange={(mode) => console.log(`Switched to ${mode}`)}
/>
```

### Hook-based Usage

```jsx
import { useParallaxVisualizer } from 'parallax-visualizer/react';

function MyComponent() {
    const {
        visualizerRef,
        isReady,
        play,
        pause,
        setMode,
        availableModes
    } = useParallaxVisualizer({
        mode: 'matrix',
        audioSource: 'microphone'
    });

    return (
        <div>
            <div ref={visualizerRef} style={{ height: '400px' }} />
            <select onChange={(e) => setMode(e.target.value)}>
                {availableModes.map(mode => 
                    <option key={mode} value={mode}>{mode}</option>
                )}
            </select>
        </div>
    );
}
```

### Pre-built Controls

```jsx
import { ParallaxVisualizerProvider, VisualizerControls } from 'parallax-visualizer/react';

<ParallaxVisualizerProvider mode="bars">
    <div ref={visualizerRef} style={{ height: '400px' }} />
    <VisualizerControls />
</ParallaxVisualizerProvider>
```

## 🛠️ Custom Visualizations

Create your own visualization modes:

```javascript
// Define custom visualization
function myVisualization({ frequencyData, audioIntensity, time, dimensions }) {
    const { cols, rows } = dimensions;
    let output = '';
    
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // Your custom logic here
            const intensity = frequencyData[x % frequencyData.length] / 255;
            const char = intensity > 0.5 ? '█' : ' ';
            output += char;
        }
        output += '\n';
    }
    
    return output;
}

// Register the visualization
visualizer.registerVisualization(
    'myMode', 
    myVisualization, 
    'custom', 
    'My amazing custom visualization'
);
```

## 🌈 Rainbow Effects

Enable beautiful rainbow color animations:

```javascript
// Enable lolcat colors
const visualizer = new ParallaxVisualizer({
    container: '#visualizer',
    mode: 'matrix',
    lolcat: true  // 🌈 Rainbow mode!
});

// Toggle at runtime
visualizer.options.lolcat = true;
```

## 📚 Examples

- **[Full Demo](examples/full-demo.html)** - Complete interactive demo
- **[React Example](examples/react-example/)** - React integration
- **[Vanilla JS](examples/vanilla-js/)** - Pure JavaScript implementation

## 📖 API Reference

See [API Documentation](docs/API.md) for complete reference.

### Key Methods

```javascript
// Audio control
await visualizer.setAudioSource('microphone');
visualizer.play();
visualizer.pause();
visualizer.stop();

// Visualization control
visualizer.setVisualizationMode('matrix');
const modes = visualizer.getAvailableModes();
const info = visualizer.getVisualizationInfo('bars');

// Events
visualizer.on('initialized', () => console.log('Ready!'));
visualizer.on('error', (e) => console.error(e.detail));

// Cleanup
visualizer.destroy();
```

## 🏗️ Building

```bash
# Install dependencies
npm install

# Build all formats
npm run build

# Development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Build Outputs

- `dist/parallax-visualizer.esm.js` - ES modules
- `dist/parallax-visualizer.cjs.js` - CommonJS
- `dist/parallax-visualizer.umd.js` - UMD (browser)
- `dist/parallax-visualizer.browser.js` - IIFE (direct browser use)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © [Your Name](https://github.com/yourusername)

## 🙏 Acknowledgments

- Inspired by classic ASCII art and demo scene culture
- Built with Web Audio API and modern JavaScript
- Thanks to the open source community

---

**[⭐ Star this project](https://github.com/yourusername/parallax-visualizer)** if you find it useful!

Made with ❤️ and lots of ASCII characters