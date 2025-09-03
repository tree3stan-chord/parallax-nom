import AudioHandler from '../src/audio/AudioHandler.js';

describe('AudioHandler', () => {
    let audioHandler;

    beforeEach(() => {
        audioHandler = new AudioHandler();
    });

    afterEach(() => {
        if (audioHandler) {
            audioHandler.destroy();
        }
    });

    describe('Constructor', () => {
        test('should create AudioHandler with default options', () => {
            expect(audioHandler).toBeDefined();
            expect(audioHandler.options.fftSize).toBe(512);
            expect(audioHandler.options.smoothingTimeConstant).toBe(0.3);
            expect(audioHandler.options.minDecibels).toBe(-90);
            expect(audioHandler.options.maxDecibels).toBe(-10);
        });

        test('should create AudioHandler with custom options', () => {
            const customHandler = new AudioHandler({
                fftSize: 1024,
                smoothingTimeConstant: 0.5,
                minDecibels: -100,
                maxDecibels: -20
            });

            expect(customHandler.options.fftSize).toBe(1024);
            expect(customHandler.options.smoothingTimeConstant).toBe(0.5);
            expect(customHandler.options.minDecibels).toBe(-100);
            expect(customHandler.options.maxDecibels).toBe(-20);

            customHandler.destroy();
        });
    });

    describe('Initialization', () => {
        test('should initialize audio context', async () => {
            await audioHandler.initialize();
            expect(audioHandler.audioContext).toBeDefined();
            expect(global.AudioContext).toHaveBeenCalled();
        });

        test('should resume suspended audio context', async () => {
            audioHandler.audioContext = {
                state: 'suspended',
                resume: jest.fn().mockResolvedValue()
            };

            await audioHandler.initialize();
            expect(audioHandler.audioContext.resume).toHaveBeenCalled();
        });
    });

    describe('Analyser Setup', () => {
        test('should setup analyser with correct properties', async () => {
            await audioHandler.initialize();
            const analyser = audioHandler.setupAnalyser();

            expect(analyser).toBeDefined();
            expect(analyser.fftSize).toBe(512);
            expect(analyser.smoothingTimeConstant).toBe(0.3);
            expect(analyser.minDecibels).toBe(-90);
            expect(analyser.maxDecibels).toBe(-10);
        });

        test('should create data array', async () => {
            await audioHandler.initialize();
            audioHandler.setupAnalyser();

            expect(audioHandler.dataArray).toBeDefined();
            expect(audioHandler.dataArray).toBeInstanceOf(Uint8Array);
            expect(audioHandler.dataArray.length).toBe(256); // fftSize / 2
        });
    });

    describe('Microphone Source', () => {
        test('should set microphone source successfully', async () => {
            const result = await audioHandler.setMicrophoneSource();
            
            expect(result).toBe(true);
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
            expect(audioHandler.currentSource).toBe('microphone');
            expect(audioHandler.isPlaying).toBe(true);
        });

        test('should handle microphone access error', async () => {
            navigator.mediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'));

            const result = await audioHandler.setMicrophoneSource();
            
            expect(result).toBe(false);
            expect(audioHandler.currentSource).toBe(null);
        });

        test('should use custom constraints', async () => {
            const customConstraints = {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false
                }
            };

            await audioHandler.setMicrophoneSource(customConstraints);
            
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(customConstraints);
        });
    });

    describe('File Source', () => {
        test('should set file source successfully', async () => {
            const mockFile = new File([''], 'test.mp3', { type: 'audio/mp3' });
            
            const result = await audioHandler.setFileSource(mockFile);
            
            expect(result).toBe(true);
            expect(audioHandler.currentSource).toBe('file');
            expect(audioHandler.isPlaying).toBe(false);
            expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile);
        });
    });

    describe('Stream Source', () => {
        test('should set stream source successfully', async () => {
            const mockStream = { getTracks: () => [{ stop: jest.fn() }] };
            
            const result = await audioHandler.setStreamSource(mockStream);
            
            expect(result).toBe(true);
            expect(audioHandler.currentSource).toBe('stream');
            expect(audioHandler.isPlaying).toBe(true);
        });

        test('should handle stream source with options', async () => {
            const mockStream = { getTracks: () => [{ stop: jest.fn() }] };
            const options = {
                gainValue: 0.5,
                connectToDestination: false
            };

            const result = await audioHandler.setStreamSource(mockStream, options);
            
            expect(result).toBe(true);
        });
    });

    describe('Data Retrieval', () => {
        beforeEach(async () => {
            await audioHandler.initialize();
            audioHandler.setupAnalyser();
        });

        test('should get frequency data', () => {
            const data = audioHandler.getFrequencyData();
            
            expect(data).toBeInstanceOf(Uint8Array);
            expect(audioHandler.analyser.getByteFrequencyData).toHaveBeenCalledWith(audioHandler.dataArray);
        });

        test('should get time domain data', () => {
            const data = audioHandler.getTimeData();
            
            expect(data).toBeInstanceOf(Uint8Array);
            expect(audioHandler.analyser.getByteTimeDomainData).toHaveBeenCalledWith(audioHandler.dataArray);
        });

        test('should calculate audio intensity', () => {
            // Mock data array with some values
            audioHandler.dataArray = new Uint8Array([100, 150, 200, 50]);
            audioHandler.analyser.getByteFrequencyData.mockImplementation((array) => {
                array.set(audioHandler.dataArray);
            });

            const intensity = audioHandler.getAudioIntensity();
            
            expect(intensity).toBeGreaterThan(0);
            expect(intensity).toBeLessThanOrEqual(1);
        });

        test('should return null when no analyser', () => {
            audioHandler.analyser = null;
            
            expect(audioHandler.getFrequencyData()).toBe(null);
            expect(audioHandler.getTimeData()).toBe(null);
        });
    });

    describe('Playback Control', () => {
        test('should play audio element', () => {
            const mockAudio = {
                play: jest.fn().mockResolvedValue(),
                pause: jest.fn(),
                currentTime: 0
            };
            audioHandler.audioElement = mockAudio;
            audioHandler.currentSource = 'file';

            audioHandler.play();
            
            expect(mockAudio.play).toHaveBeenCalled();
            expect(audioHandler.isPlaying).toBe(true);
        });

        test('should pause audio element', () => {
            const mockAudio = {
                play: jest.fn(),
                pause: jest.fn(),
                currentTime: 0
            };
            audioHandler.audioElement = mockAudio;
            audioHandler.currentSource = 'file';
            audioHandler.isPlaying = true;

            audioHandler.pause();
            
            expect(mockAudio.pause).toHaveBeenCalled();
            expect(audioHandler.isPlaying).toBe(false);
        });

        test('should stop audio element', () => {
            const mockAudio = {
                play: jest.fn(),
                pause: jest.fn(),
                currentTime: 5
            };
            audioHandler.audioElement = mockAudio;
            audioHandler.isPlaying = true;

            audioHandler.stop();
            
            expect(mockAudio.pause).toHaveBeenCalled();
            expect(mockAudio.currentTime).toBe(0);
            expect(audioHandler.isPlaying).toBe(false);
        });
    });

    describe('Source Switching', () => {
        test('should switch between sources', async () => {
            // Set initial source
            await audioHandler.setMicrophoneSource();
            expect(audioHandler.currentSource).toBe('microphone');

            // Switch to file source
            const mockFile = new File([''], 'test.mp3', { type: 'audio/mp3' });
            const result = await audioHandler.switchSource({
                type: 'file',
                file: mockFile
            });

            expect(result).toBe(true);
            expect(audioHandler.currentSource).toBe('file');
        });
    });

    describe('Event Callbacks', () => {
        test('should set and call event callbacks', () => {
            const mockCallback = jest.fn();
            audioHandler.on('onSourceChange', mockCallback);
            
            // Trigger callback
            if (audioHandler.callbacks.onSourceChange) {
                audioHandler.callbacks.onSourceChange('test', 'data');
            }
            
            expect(mockCallback).toHaveBeenCalledWith('test', 'data');
        });
    });

    describe('Cleanup', () => {
        test('should clean up resources on destroy', async () => {
            await audioHandler.initialize();
            audioHandler.setupAnalyser();
            
            const mockStream = { getTracks: () => [{ stop: jest.fn() }] };
            await audioHandler.setStreamSource(mockStream);

            audioHandler.destroy();
            
            expect(audioHandler.audioContext.close).toHaveBeenCalled();
            expect(audioHandler.audioContext).toBe(null);
            expect(audioHandler.analyser).toBe(null);
            expect(audioHandler.dataArray).toBe(null);
        });

        test('should stop stream tracks on cleanup', async () => {
            const mockTrack = { stop: jest.fn() };
            const mockStream = { getTracks: () => [mockTrack] };
            
            await audioHandler.setStreamSource(mockStream);
            audioHandler.destroy();
            
            expect(mockTrack.stop).toHaveBeenCalled();
        });
    });
});