import { AudioSourceTypes, createAudioSource, validateAudioSource } from '../audio/sources.js';

export class AudioSourceManager {
    constructor() {
        this.sources = new Map();
        this.activeSourceId = null;
        this.callbacks = {
            onSourceAdd: null,
            onSourceRemove: null,
            onSourceSwitch: null,
            onSourceError: null
        };
    }

    addSource(id, sourceConfig) {
        if (this.sources.has(id)) {
            throw new Error(`Source with id '${id}' already exists`);
        }

        if (!validateAudioSource(sourceConfig)) {
            throw new Error('Invalid source configuration');
        }

        this.sources.set(id, {
            id,
            config: sourceConfig,
            metadata: {
                name: sourceConfig.name || id,
                type: sourceConfig.type,
                added: new Date(),
                lastUsed: null
            }
        });

        if (this.callbacks.onSourceAdd) {
            this.callbacks.onSourceAdd(id, sourceConfig);
        }

        return this;
    }

    removeSource(id) {
        if (!this.sources.has(id)) {
            return false;
        }

        if (this.activeSourceId === id) {
            this.activeSourceId = null;
        }

        const source = this.sources.get(id);
        this.sources.delete(id);

        if (this.callbacks.onSourceRemove) {
            this.callbacks.onSourceRemove(id, source.config);
        }

        return true;
    }

    getSource(id) {
        return this.sources.get(id);
    }

    getAllSources() {
        return Array.from(this.sources.values());
    }

    getSourcesByType(type) {
        return this.getAllSources().filter(source => source.config.type === type);
    }

    setActiveSource(id) {
        if (!this.sources.has(id)) {
            throw new Error(`Source '${id}' not found`);
        }

        const previousId = this.activeSourceId;
        this.activeSourceId = id;
        
        const source = this.sources.get(id);
        source.metadata.lastUsed = new Date();

        if (this.callbacks.onSourceSwitch) {
            this.callbacks.onSourceSwitch(id, source.config, previousId);
        }

        return source.config;
    }

    getActiveSource() {
        if (!this.activeSourceId) {
            return null;
        }
        return this.sources.get(this.activeSourceId);
    }

    hasSource(id) {
        return this.sources.has(id);
    }

    createMicrophoneSource(id, options = {}) {
        const sourceConfig = createAudioSource(AudioSourceTypes.MICROPHONE, options);
        sourceConfig.name = options.name || 'Microphone';
        this.addSource(id, sourceConfig);
        return this;
    }

    createFileSource(id, file, options = {}) {
        const sourceConfig = createAudioSource(AudioSourceTypes.FILE, { file, ...options });
        sourceConfig.name = options.name || file.name;
        this.addSource(id, sourceConfig);
        return this;
    }

    createStreamSource(id, stream, options = {}) {
        const sourceConfig = createAudioSource(AudioSourceTypes.STREAM, { stream, ...options });
        sourceConfig.name = options.name || 'Audio Stream';
        this.addSource(id, sourceConfig);
        return this;
    }

    createAnalyserSource(id, analyser, options = {}) {
        const sourceConfig = createAudioSource(AudioSourceTypes.ANALYSER, { analyser, ...options });
        sourceConfig.name = options.name || 'Custom Analyser';
        this.addSource(id, sourceConfig);
        return this;
    }

    on(event, callback) {
        if (this.callbacks[event] !== undefined) {
            this.callbacks[event] = callback;
        }
    }

    clear() {
        this.sources.clear();
        this.activeSourceId = null;
    }

    getStats() {
        const sources = this.getAllSources();
        const typeCount = {};
        
        sources.forEach(source => {
            typeCount[source.config.type] = (typeCount[source.config.type] || 0) + 1;
        });

        return {
            total: sources.length,
            byType: typeCount,
            active: this.activeSourceId,
            lastAdded: sources.length > 0 ? Math.max(...sources.map(s => s.metadata.added.getTime())) : null
        };
    }
}

export class AudioSourcePresets {
    static getDefaultMicrophone() {
        return createAudioSource(AudioSourceTypes.MICROPHONE, {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        });
    }

    static getHighQualityMicrophone() {
        return createAudioSource(AudioSourceTypes.MICROPHONE, {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: 2
        });
    }

    static getMusicOptimizedMicrophone() {
        return createAudioSource(AudioSourceTypes.MICROPHONE, {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 44100
        });
    }

    static getStreamWithGain(stream, gainValue = 1.0) {
        return createAudioSource(AudioSourceTypes.STREAM, {
            stream,
            gainValue,
            connectToDestination: true
        });
    }

    static getSilentStream(stream) {
        return createAudioSource(AudioSourceTypes.STREAM, {
            stream,
            gainValue: 0,
            connectToDestination: false
        });
    }
}

export function createSourceFromURL(url, options = {}) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        
        audio.onload = audio.oncanplaythrough = () => {
            const sourceConfig = createAudioSource(AudioSourceTypes.FILE, { 
                file: audio,
                ...options 
            });
            sourceConfig.name = options.name || url.split('/').pop();
            resolve(sourceConfig);
        };
        
        audio.onerror = () => {
            reject(new Error(`Failed to load audio from URL: ${url}`));
        };
        
        audio.crossOrigin = options.crossOrigin || 'anonymous';
        audio.src = url;
    });
}
