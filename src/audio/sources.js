export const AudioSourceTypes = {
    MICROPHONE: 'microphone',
    FILE: 'file', 
    STREAM: 'stream',
    ANALYSER: 'analyser'
};

export function createAudioSource(type, config = {}) {
    switch (type) {
        case AudioSourceTypes.MICROPHONE:
            return {
                type: AudioSourceTypes.MICROPHONE,
                constraints: config.constraints || { 
                    audio: {
                        echoCancellation: config.echoCancellation !== false,
                        noiseSuppression: config.noiseSuppression !== false,
                        autoGainControl: config.autoGainControl !== false,
                        sampleRate: config.sampleRate,
                        channelCount: config.channelCount
                    }
                }
            };
            
        case AudioSourceTypes.FILE:
            return {
                type: AudioSourceTypes.FILE,
                file: config.file
            };
            
        case AudioSourceTypes.STREAM:
            return {
                type: AudioSourceTypes.STREAM,
                stream: config.stream,
                options: {
                    connectToDestination: config.connectToDestination !== false,
                    gainValue: config.gainValue || 1.0
                }
            };
            
        case AudioSourceTypes.ANALYSER:
            return {
                type: AudioSourceTypes.ANALYSER,
                analyser: config.analyser
            };
            
        default:
            throw new Error(`Unknown audio source type: ${type}`);
    }
}

export function validateAudioSource(source) {
    if (!source || typeof source !== 'object') {
        return false;
    }
    
    switch (source.type) {
        case AudioSourceTypes.MICROPHONE:
            return true;
            
        case AudioSourceTypes.FILE:
            return source.file instanceof File;
            
        case AudioSourceTypes.STREAM:
            return source.stream instanceof MediaStream;
            
        case AudioSourceTypes.ANALYSER:
            return source.analyser && typeof source.analyser.getByteFrequencyData === 'function';
            
        default:
            return false;
    }
}
