import ParallaxVisualizer from './ParallaxVisualizer.js';
import AudioHandler from './audio/AudioHandler.js';
import { AudioSourceTypes, createAudioSource, validateAudioSource } from './audio/sources.js';
import { FileHandler, createFileInputButton } from './utils/FileHandler.js';
import { AudioSourceManager, AudioSourcePresets } from './utils/AudioSourceManager.js';
import { WebAudioGraph, AudioStreamProcessor, createRealtimeAnalyser } from './audio/WebAudioHelpers.js';
import { 
    visualizationRegistry, 
    VisualizationRegistry,
    basicVisualizations, 
    advancedVisualizations, 
    extremeVisualizations,
    getAllVisualizations,
    getVisualizationByName,
    executeVisualization
} from './visualizations/index.js';
import { ASCIIRenderer, ColorHandler } from './renderer/ASCIIRenderer.js';

// Main export
export default ParallaxVisualizer;

// Named exports
export {
    ParallaxVisualizer,
    AudioHandler,
    AudioSourceTypes,
    createAudioSource,
    validateAudioSource,
    FileHandler,
    createFileInputButton,
    AudioSourceManager,
    AudioSourcePresets,
    WebAudioGraph,
    AudioStreamProcessor,
    createRealtimeAnalyser,
    // Visualizations
    visualizationRegistry,
    VisualizationRegistry,
    basicVisualizations,
    advancedVisualizations,
    extremeVisualizations,
    getAllVisualizations,
    getVisualizationByName,
    executeVisualization,
    // Rendering
    ASCIIRenderer,
    ColorHandler
};

// Convenience object with all visualizations
export const VisualizationModes = getAllVisualizations();
