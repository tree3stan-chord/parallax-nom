class AudioHandler {
    constructor(options = {}) {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.stream = null;
        this.audioElement = null;
        this.currentSource = null;
        this.isPlaying = false;
        
        this.options = {
            fftSize: 512,
            smoothingTimeConstant: 0.3,
            minDecibels: -90,
            maxDecibels: -10,
            ...options
        };
        
        this.callbacks = {
            onSourceChange: null,
            onPlay: null,
            onPause: null,
            onError: null
        };
    }

    async initialize() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    setupAnalyser() {
        if (this.analyser) {
            this.analyser.disconnect();
        }
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.options.fftSize;
        this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant;
        this.analyser.minDecibels = this.options.minDecibels;
        this.analyser.maxDecibels = this.options.maxDecibels;
        
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        
        return this.analyser;
    }

    async setMicrophoneSource(constraints = { audio: true }) {
        try {
            await this.initialize();
            
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.setupAnalyser();
            
            if (this.source) {
                this.source.disconnect();
            }
            
            this.source = this.audioContext.createMediaStreamSource(this.stream);
            this.source.connect(this.analyser);
            
            this.currentSource = 'microphone';
            this.isPlaying = true;
            
            if (this.callbacks.onSourceChange) {
                this.callbacks.onSourceChange('microphone');
            }
            
            return true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            return false;
        }
    }

    async setFileSource(file) {
        try {
            await this.initialize();
            
            this.stopCurrentSource();
            
            this.audioElement = new Audio();
            this.audioElement.src = URL.createObjectURL(file);
            
            this.setupAnalyser();
            
            this.source = this.audioContext.createMediaElementSource(this.audioElement);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            this.currentSource = 'file';
            this.isPlaying = false;
            
            // Set up audio end handler
            this.audioElement.addEventListener('ended', () => {
                this.isPlaying = false;
                if (this.callbacks.onPause) {
                    this.callbacks.onPause();
                }
            });
            
            if (this.callbacks.onSourceChange) {
                this.callbacks.onSourceChange('file', file.name);
            }
            
            return true;
        } catch (error) {
            console.error('Error loading audio file:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            return false;
        }
    }

    async setStreamSource(stream, options = {}) {
        try {
            await this.initialize();
            
            this.stopCurrentSource();
            this.setupAnalyser();
            
            this.source = this.audioContext.createMediaStreamSource(stream);
            this.source.connect(this.analyser);
            
            // Optional gain control
            if (options.gainValue !== undefined && options.gainValue !== 1.0) {
                const gainNode = this.audioContext.createGain();
                gainNode.gain.value = options.gainValue;
                this.source.connect(gainNode);
                gainNode.connect(this.analyser);
            }
            
            // Optional connection to destination for playback
            if (options.connectToDestination !== false) {
                this.analyser.connect(this.audioContext.destination);
            }
            
            this.currentSource = 'stream';
            this.isPlaying = true;
            this.stream = stream; // Store for cleanup
            
            if (this.callbacks.onSourceChange) {
                this.callbacks.onSourceChange('stream');
            }
            
            return true;
        } catch (error) {
            console.error('Error setting up stream source:', error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            return false;
        }
    }

    setAnalyserSource(analyser) {
        this.analyser = analyser;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        this.currentSource = 'analyser';
        this.isPlaying = true;
        
        if (this.callbacks.onSourceChange) {
            this.callbacks.onSourceChange('analyser');
        }
    }

    play() {
        if (this.audioElement && this.currentSource === 'file') {
            this.audioElement.play();
            this.isPlaying = true;
            if (this.callbacks.onPlay) {
                this.callbacks.onPlay();
            }
        }
    }

    pause() {
        if (this.audioElement && this.currentSource === 'file') {
            this.audioElement.pause();
            this.isPlaying = false;
            if (this.callbacks.onPause) {
                this.callbacks.onPause();
            }
        }
    }

    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        this.isPlaying = false;
        if (this.callbacks.onPause) {
            this.callbacks.onPause();
        }
    }

    stopCurrentSource() {
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.audioElement) {
            this.audioElement.pause();
            URL.revokeObjectURL(this.audioElement.src);
            this.audioElement = null;
        }
        
        this.isPlaying = false;
        this.currentSource = null;
    }

    async switchSource(sourceConfig) {
        const wasPlaying = this.isPlaying;
        this.stopCurrentSource();
        
        let success = false;
        
        switch (sourceConfig.type) {
            case 'microphone':
                success = await this.setMicrophoneSource(sourceConfig.constraints);
                break;
            case 'file':
                success = await this.setFileSource(sourceConfig.file);
                break;
            case 'stream':
                success = await this.setStreamSource(sourceConfig.stream, sourceConfig.options);
                break;
            case 'analyser':
                this.setAnalyserSource(sourceConfig.analyser);
                success = true;
                break;
        }
        
        if (success && wasPlaying && sourceConfig.type === 'file') {
            this.play();
        }
        
        return success;
    }

    getFrequencyData() {
        if (this.analyser && this.dataArray) {
            this.analyser.getByteFrequencyData(this.dataArray);
            return this.dataArray;
        }
        return null;
    }

    getTimeData() {
        if (this.analyser && this.dataArray) {
            this.analyser.getByteTimeDomainData(this.dataArray);
            return this.dataArray;
        }
        return null;
    }

    getAudioIntensity() {
        const data = this.getFrequencyData();
        if (!data) {return 0;}
        
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
        }
        return sum / data.length / 255;
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    destroy() {
        this.stopCurrentSource();
        
        if (this.analyser) {
            this.analyser.disconnect();
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
    }
}

export default AudioHandler;
