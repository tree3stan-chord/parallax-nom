import AudioHandler from './audio/AudioHandler.js';
import { createAudioSource, validateAudioSource, AudioSourceTypes } from './audio/sources.js';
import { FileHandler } from './utils/FileHandler.js';
import { visualizationRegistry } from './visualizations/index.js';
import { ColorHandler } from './renderer/ASCIIRenderer.js';
import { performanceManager, renderOptimizer } from './utils/PerformanceManager.js';

class ParallaxVisualizer {
    constructor(options = {}) {
        this.options = {
            container: '#parallax-visualizer',
            mode: 'bars',
            audioSource: 'microphone',
            width: null,
            height: null,
            responsive: true,
            lolcat: false,
            autoStart: true,
            ...options
        };
        
        this.container = this.resolveContainer(this.options.container);
        if (!this.container) {
            throw new Error('Container element not found');
        }
        
        this.audioHandler = new AudioHandler(options.audio || {});
        this.setupAudioCallbacks();
        
        this.registry = visualizationRegistry;
        this.currentVisualizationName = this.options.mode;
        this.animationId = null;
        this.time = 0;
        this.fileHandler = null;
        this.colorHandler = new ColorHandler();
        
        this.dimensions = this.calculateDimensions();
        this.setupContainer();
        this.setupFileHandling();
        
        if (this.options.autoStart) {
            this.initialize();
        }
    }

    resolveContainer(container) {
        if (typeof container === 'string') {
            return document.querySelector(container);
        } else if (container instanceof HTMLElement) {
            return container;
        }
        return null;
    }

    calculateDimensions() {
        const charWidth = 6;
        const charHeight = 12;
        
        let width = this.options.width || this.container.clientWidth;
        let height = this.options.height || this.container.clientHeight;
        
        if (width === 0) {width = window.innerWidth;}
        if (height === 0) {height = window.innerHeight;}
        
        return {
            width,
            height,
            cols: Math.floor(width / charWidth),
            rows: Math.floor(height / charHeight),
            charWidth,
            charHeight
        };
    }

    setupContainer() {
        this.container.style.fontFamily = 'monospace';
        this.container.style.lineHeight = '1';
        this.container.style.whiteSpace = 'pre';
        this.container.style.overflow = 'hidden';
        this.container.style.width = this.dimensions.width + 'px';
        this.container.style.height = this.dimensions.height + 'px';
        
        if (this.options.responsive) {
            this.setupResponsiveHandling();
        }
    }

    setupResponsiveHandling() {
        // Throttled resize handler for better performance
        let resizeTimeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const oldDimensions = this.dimensions;
                this.dimensions = this.calculateDimensions();
                
                // Only update if dimensions actually changed
                if (oldDimensions.cols !== this.dimensions.cols || 
                    oldDimensions.rows !== this.dimensions.rows) {
                    this.setupContainer();
                    this.emit('resize', { 
                        oldDimensions, 
                        newDimensions: this.dimensions 
                    });
                }
            }, 100); // 100ms debounce
        };

        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(handleResize);
            this.resizeObserver.observe(this.container);
        } else {
            // Fallback for older browsers
            window.addEventListener('resize', handleResize);
            this.windowResizeHandler = handleResize;
        }
    }

    setupAudioCallbacks() {
        this.audioHandler.on('onSourceChange', (type, info) => {
            this.emit('sourceChange', { type, info });
        });
        
        this.audioHandler.on('onPlay', () => {
            this.emit('play');
        });
        
        this.audioHandler.on('onPause', () => {
            this.emit('pause');
        });
        
        this.audioHandler.on('onError', (error) => {
            this.emit('error', error);
        });
    }

    setupFileHandling() {
        if (this.options.fileInput !== false) {
            this.fileHandler = new FileHandler({
                dragDropTarget: this.options.fileDropTarget || this.container,
                onFileSelect: async(file) => {
                    try {
                        await this.setAudioSource({
                            type: AudioSourceTypes.FILE,
                            file: file
                        });
                        this.emit('fileLoaded', { file });
                    } catch (error) {
                        this.emit('error', error);
                    }
                },
                onFileError: (error) => {
                    this.emit('error', error);
                },
                onDragOver: () => {
                    this.emit('dragOver');
                },
                onDragLeave: () => {
                    this.emit('dragLeave');
                }
            });
        }
    }

    async initialize() {
        try {
            await this.setAudioSource(this.options.audioSource);
            
            if (this.audioHandler.isPlaying) {
                this.startAnimation();
            }
            
            this.emit('initialized');
        } catch (error) {
            console.error('Failed to initialize ParallaxVisualizer:', error);
            this.emit('error', error);
        }
    }

    async setAudioSource(source) {
        let audioSource;
        
        if (typeof source === 'string') {
            switch (source) {
                case 'microphone':
                    audioSource = createAudioSource(AudioSourceTypes.MICROPHONE);
                    break;
                case 'file':
                    throw new Error('File source requires a File object');
                default:
                    throw new Error(`Unknown audio source: ${source}`);
            }
        } else if (typeof source === 'object') {
            audioSource = source;
        } else {
            throw new Error('Invalid audio source');
        }
        
        if (!validateAudioSource(audioSource)) {
            throw new Error('Invalid audio source configuration');
        }
        
        let success = false;
        
        switch (audioSource.type) {
            case AudioSourceTypes.MICROPHONE:
                success = await this.audioHandler.setMicrophoneSource();
                break;
                
            case AudioSourceTypes.FILE:
                success = await this.audioHandler.setFileSource(audioSource.file);
                break;
                
            case AudioSourceTypes.STREAM:
                success = await this.audioHandler.setStreamSource(audioSource.stream);
                break;
                
            case AudioSourceTypes.ANALYSER:
                this.audioHandler.setAnalyserSource(audioSource.analyser);
                success = true;
                break;
        }
        
        if (!success) {
            throw new Error('Failed to set audio source');
        }
        
        if (this.audioHandler.isPlaying) {
            this.startAnimation();
        }
    }

    setVisualizationMode(mode) {
        if (!this.registry.hasMode(mode)) {
            throw new Error(`Unknown visualization mode: ${mode}`);
        }
        
        this.currentVisualizationName = mode;
        this.options.mode = mode;
        this.emit('modeChange', mode);
    }

    registerVisualization(name, visualizationFunction, category = 'custom', description = '') {
        this.registry.registerVisualization(name, visualizationFunction, category, description);
    }

    getAvailableModes() {
        return this.registry.getAllModes();
    }

    getModesByCategory(category) {
        return this.registry.getModesByCategory(category);
    }

    getVisualizationInfo(mode) {
        return this.registry.getVisualizationInfo(mode);
    }

    startAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.animate();
    }

    animate() {
        if (!this.currentVisualizationName || !this.audioHandler.isPlaying) {
            return;
        }
        
        performanceManager.startFrame();
        
        // Skip frame if performance is poor
        if (performanceManager.shouldSkipFrame()) {
            this.animationId = requestAnimationFrame(() => this.animate());
            return;
        }
        
        this.time += 0.016;
        
        const frequencyData = this.audioHandler.getFrequencyData();
        const audioIntensity = this.audioHandler.getAudioIntensity();
        
        if (frequencyData) {
            try {
                const quality = performanceManager.getQualityMultiplier();
                const output = this.registry.executeVisualization(this.currentVisualizationName, {
                    frequencyData,
                    audioIntensity,
                    time: this.time,
                    dimensions: this.dimensions,
                    options: { ...this.options, quality }
                });
                
                this.render(output, quality);
            } catch (error) {
                console.error('Visualization error:', error);
                this.emit('error', error);
            }
        }
        
        performanceManager.endFrame();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    render(output, quality = 1.0) {
        let content = typeof output === 'string' ? output : (output?.content || '');
        
        // Apply performance optimizations
        if (quality < 1.0) {
            content = renderOptimizer.optimizeOutput(content, quality);
        }
        
        // Check if we need to render (caching optimization)
        if (!renderOptimizer.shouldRender(content, this.dimensions)) {
            return;
        }
        
        if (typeof output === 'string' || !output.applyColors) {
            if (this.options.lolcat) {
                this.colorHandler.enable(true);
                this.colorHandler.update(this.time);
                this.colorHandler.applyColors(this.container, content);
            } else {
                this.container.textContent = content;
            }
        } else if (output.applyColors) {
            output.applyColors(this.container);
        }
        
        if (output && output.style) {
            Object.assign(this.container.style, output.style);
        }
    }

    play() {
        this.audioHandler.play();
        this.startAnimation();
    }

    pause() {
        this.audioHandler.pause();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    stop() {
        this.audioHandler.stop();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.container.textContent = '';
    }

    async switchAudioSource(sourceConfig) {
        return await this.audioHandler.switchSource(sourceConfig);
    }

    openFileDialog() {
        if (this.fileHandler) {
            this.fileHandler.openFileDialog();
        }
    }

    destroy() {
        this.stop();
        
        // Clean up audio handler
        if (this.audioHandler) {
            this.audioHandler.destroy();
            this.audioHandler = null;
        }
        
        // Clean up file handler
        if (this.fileHandler) {
            this.fileHandler.destroy();
            this.fileHandler = null;
        }
        
        // Clean up resize observers
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // Clean up window resize handler fallback
        if (this.windowResizeHandler) {
            window.removeEventListener('resize', this.windowResizeHandler);
            this.windowResizeHandler = null;
        }
        
        // Clear container
        if (this.container) {
            this.container.textContent = '';
            this.container.innerHTML = '';
        }
        
        // Clean up references
        this.registry = null;
        this.colorHandler = null;
        this.dimensions = null;
        
        this.emit('destroyed');
    }

    emit(event, data) {
        const customEvent = new CustomEvent(`parallax:${event}`, { 
            detail: data 
        });
        this.container.dispatchEvent(customEvent);
    }

    on(event, callback) {
        this.container.addEventListener(`parallax:${event}`, callback);
    }

    off(event, callback) {
        this.container.removeEventListener(`parallax:${event}`, callback);
    }
}

export default ParallaxVisualizer;
