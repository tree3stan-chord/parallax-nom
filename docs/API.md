# Parallax Visualizer API Reference

## Table of Contents

- [ParallaxVisualizer](#parallaxvisualizer)
- [AudioHandler](#audiohandler)
- [VisualizationRegistry](#visualizationregistry)
- [Audio Sources](#audio-sources)
- [React Components](#react-components)
- [Utility Classes](#utility-classes)

## ParallaxVisualizer

The main class for creating audio visualizations.

### Constructor

```javascript
new ParallaxVisualizer(options)
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `string \| HTMLElement` | Required | Target container selector or element |
| `mode` | `string` | `'bars'` | Initial visualization mode |
| `audioSource` | `string \| AudioSourceConfig` | `'microphone'` | Audio source configuration |
| `width` | `number` | `null` | Fixed width in pixels |
| `height` | `number` | `null` | Fixed height in pixels |
| `responsive` | `boolean` | `true` | Enable responsive resizing |
| `lolcat` | `boolean` | `false` | Enable rainbow coloring |
| `autoStart` | `boolean` | `true` | Auto-initialize on creation |
| `fileInput` | `boolean` | `true` | Enable file input handling |
| `fileDropTarget` | `string \| HTMLElement` | `null` | Drag & drop target |
| `audio` | `AudioHandlerOptions` | `{}` | Audio processing options |

### Methods

#### `initialize(): Promise<void>`
Initialize the visualizer and audio system.

#### `setAudioSource(source): Promise<void>`
Set the audio source.

**Parameters:**
- `source` - Audio source string or configuration object

**Example:**
```javascript
// Microphone
await visualizer.setAudioSource('microphone');

// File
await visualizer.setAudioSource({ type: 'file', file: audioFile });

// Stream
await visualizer.setAudioSource({ type: 'stream', stream: mediaStream });
```

#### `setVisualizationMode(mode: string): void`
Change the visualization mode.

#### `play(): void`
Start/resume playback (for file sources).

#### `pause(): void`
Pause playback.

#### `stop(): void`
Stop playback and reset.

#### `getAvailableModes(): string[]`
Get list of available visualization modes.

#### `getModesByCategory(category: string): string[]`
Get modes filtered by category.

#### `getVisualizationInfo(mode: string): VisualizationInfo`
Get detailed information about a visualization mode.

#### `registerVisualization(name, func, category?, description?): void`
Register a custom visualization.

**Example:**
```javascript
visualizer.registerVisualization('myMode', ({ frequencyData, dimensions }) => {
    // Custom visualization logic
    return asciiOutput;
}, 'custom', 'My custom visualization');
```

#### `on(event: string, callback: Function): void`
Add event listener.

#### `destroy(): void`
Clean up and destroy the visualizer.

### Events

- `initialized` - Visualizer initialized
- `sourceChange` - Audio source changed
- `modeChange` - Visualization mode changed
- `fileLoaded` - File loaded via drag & drop
- `play` - Playback started
- `pause` - Playback paused
- `error` - Error occurred
- `dragOver` - File drag over container
- `dragLeave` - File drag left container

## AudioHandler

Handles audio processing and source management.

### Constructor

```javascript
new AudioHandler(options)
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fftSize` | `number` | `512` | FFT size for frequency analysis |
| `smoothingTimeConstant` | `number` | `0.3` | Smoothing factor |
| `minDecibels` | `number` | `-90` | Minimum decibel value |
| `maxDecibels` | `number` | `-10` | Maximum decibel value |

### Methods

#### `setMicrophoneSource(constraints?): Promise<boolean>`
Set microphone as audio source.

#### `setFileSource(file: File): Promise<boolean>`
Set audio file as source.

#### `setStreamSource(stream: MediaStream, options?): Promise<boolean>`
Set media stream as source.

#### `getFrequencyData(): Uint8Array`
Get current frequency data.

#### `getAudioIntensity(): number`
Get overall audio intensity (0-1).

#### `switchSource(sourceConfig): Promise<boolean>`
Switch to a different audio source.

## VisualizationRegistry

Manages visualization modes and categories.

### Methods

#### `getAllModes(): string[]`
Get all available visualization modes.

#### `getModesByCategory(category: string): string[]`
Get modes in a specific category.

#### `getCategories(): string[]`
Get all available categories.

#### `hasMode(name: string): boolean`
Check if a mode exists.

#### `getVisualizationInfo(name: string): VisualizationInfo`
Get detailed mode information.

#### `executeVisualization(name, params): string | VisualizationOutput`
Execute a visualization function.

## Audio Sources

### Types

- `microphone` - Live microphone input
- `file` - Audio file upload
- `stream` - MediaStream object
- `analyser` - Custom AnalyserNode

### Configuration

#### Microphone
```javascript
{
    type: 'microphone',
    constraints: {
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
            channelCount: 1
        }
    }
}
```

#### File
```javascript
{
    type: 'file',
    file: audioFileObject
}
```

#### Stream
```javascript
{
    type: 'stream',
    stream: mediaStreamObject,
    options: {
        gainValue: 1.0,
        connectToDestination: true
    }
}
```

### Presets

```javascript
import { AudioSourcePresets } from 'parallax-visualizer';

// Default microphone
const defaultMic = AudioSourcePresets.getDefaultMicrophone();

// High quality microphone
const hqMic = AudioSourcePresets.getHighQualityMicrophone();

// Music optimized
const musicMic = AudioSourcePresets.getMusicOptimizedMicrophone();

// Stream with custom gain
const customStream = AudioSourcePresets.getStreamWithGain(stream, 0.5);
```

## React Components

### ParallaxVisualizer

React wrapper component.

```jsx
import { ParallaxVisualizer } from 'parallax-visualizer/react';

<ParallaxVisualizer
    mode="bars"
    audioSource="microphone"
    lolcat={true}
    onError={(error) => console.error(error)}
    style={{ width: '100%', height: '400px' }}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `string` | `'bars'` | Visualization mode |
| `audioSource` | `string \| AudioSourceConfig` | `'microphone'` | Audio source |
| `lolcat` | `boolean` | `false` | Rainbow colors |
| `responsive` | `boolean` | `true` | Responsive sizing |
| `customVisualizations` | `object` | `{}` | Custom visualizations |
| `onInitialized` | `function` | - | Initialization callback |
| `onError` | `function` | - | Error callback |
| `onSourceChange` | `function` | - | Source change callback |
| `onModeChange` | `function` | - | Mode change callback |

### Hook: useParallaxVisualizer

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
        mode: 'bars',
        audioSource: 'microphone'
    });

    return (
        <div>
            <div ref={visualizerRef} style={{ width: '100%', height: '400px' }} />
            <button onClick={() => setMode('circle')}>Circle Mode</button>
            <button onClick={play}>Play</button>
        </div>
    );
}
```

### VisualizerControls

Pre-built control panel component.

```jsx
import { ParallaxVisualizerProvider, VisualizerControls } from 'parallax-visualizer/react';

<ParallaxVisualizerProvider mode="bars">
    <div ref={visualizerRef} style={{ height: '400px' }} />
    <VisualizerControls 
        showModeSelector={true}
        showAudioControls={true}
        showFileUpload={true}
        showEffectToggle={true}
    />
</ParallaxVisualizerProvider>
```

## Utility Classes

### ASCIIRenderer

Low-level ASCII rendering utilities.

```javascript
import { ASCIIRenderer } from 'parallax-visualizer';

const renderer = new ASCIIRenderer(dimensions);
const grid = renderer.createGrid();
renderer.setPixel(grid, x, y, char);
const output = renderer.gridToString(grid);
```

### ColorHandler

Rainbow color effects.

```javascript
import { ColorHandler } from 'parallax-visualizer';

const colorHandler = new ColorHandler();
colorHandler.enable(true);
colorHandler.applyColors(element, content);
```

### FileHandler

File input and drag & drop handling.

```javascript
import { FileHandler } from 'parallax-visualizer';

const fileHandler = new FileHandler({
    acceptedTypes: ['audio/*'],
    maxFileSize: 100 * 1024 * 1024,
    onFileSelect: (file) => console.log('File selected:', file),
    onFileError: (error) => console.error('File error:', error)
});
```

## Custom Visualizations

Create custom visualization functions:

```javascript
function myVisualization({ frequencyData, audioIntensity, time, dimensions }) {
    const { cols, rows } = dimensions;
    let output = '';
    
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // Your visualization logic here
            const char = calculateChar(x, y, frequencyData, audioIntensity, time);
            output += char;
        }
        output += '\n';
    }
    
    return output;
}

// Register the visualization
visualizer.registerVisualization('myMode', myVisualization, 'custom', 'My custom mode');
```

## Error Handling

All async methods return promises and can throw errors:

```javascript
try {
    await visualizer.setAudioSource('microphone');
} catch (error) {
    console.error('Failed to access microphone:', error);
}

// Or use event listeners
visualizer.on('error', (event) => {
    console.error('Visualizer error:', event.detail);
});
```

## Performance Tips

- Use `responsive: false` for fixed-size containers
- Lower `fftSize` for better performance
- Limit custom visualization complexity
- Use `requestAnimationFrame` in custom visualizations
- Clean up resources with `destroy()` when done