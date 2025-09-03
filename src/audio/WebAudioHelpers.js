export class WebAudioGraph {
    constructor(audioContext) {
        this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        this.nodes = new Map();
        this.connections = [];
        this.masterAnalyser = null;
    }

    createNode(type, id, options = {}) {
        let node;
        
        switch (type) {
            case 'gain':
                node = this.audioContext.createGain();
                if (options.gain !== undefined) {
                    node.gain.value = options.gain;
                }
                break;
                
            case 'biquadFilter':
                node = this.audioContext.createBiquadFilter();
                if (options.type) {node.type = options.type;}
                if (options.frequency) {node.frequency.value = options.frequency;}
                if (options.Q) {node.Q.value = options.Q;}
                break;
                
            case 'delay':
                node = this.audioContext.createDelay(options.maxDelayTime || 1);
                if (options.delayTime) {node.delayTime.value = options.delayTime;}
                break;
                
            case 'compressor':
                node = this.audioContext.createDynamicsCompressor();
                if (options.threshold) {node.threshold.value = options.threshold;}
                if (options.ratio) {node.ratio.value = options.ratio;}
                break;
                
            case 'analyser':
                node = this.audioContext.createAnalyser();
                if (options.fftSize) {node.fftSize = options.fftSize;}
                if (options.smoothingTimeConstant) {node.smoothingTimeConstant = options.smoothingTimeConstant;}
                if (options.minDecibels) {node.minDecibels = options.minDecibels;}
                if (options.maxDecibels) {node.maxDecibels = options.maxDecibels;}
                break;
                
            case 'convolver':
                node = this.audioContext.createConvolver();
                if (options.buffer) {node.buffer = options.buffer;}
                break;
                
            default:
                throw new Error(`Unknown node type: ${type}`);
        }
        
        this.nodes.set(id, node);
        return node;
    }

    getNode(id) {
        return this.nodes.get(id);
    }

    connect(fromId, toId, outputIndex = 0, inputIndex = 0) {
        const fromNode = this.nodes.get(fromId);
        const toNode = this.nodes.get(toId);
        
        if (!fromNode || !toNode) {
            throw new Error('Node not found');
        }
        
        fromNode.connect(toNode, outputIndex, inputIndex);
        this.connections.push({ fromId, toId, outputIndex, inputIndex });
    }

    connectToDestination(nodeId, outputIndex = 0) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error('Node not found');
        }
        
        node.connect(this.audioContext.destination, outputIndex);
        this.connections.push({ fromId: nodeId, toId: 'destination', outputIndex });
    }

    disconnect(nodeId, outputIndex) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error('Node not found');
        }
        
        if (outputIndex !== undefined) {
            node.disconnect(outputIndex);
        } else {
            node.disconnect();
        }
        
        this.connections = this.connections.filter(conn => 
            conn.fromId !== nodeId || (outputIndex !== undefined && conn.outputIndex !== outputIndex)
        );
    }

    setMasterAnalyser(analyserId) {
        this.masterAnalyser = this.nodes.get(analyserId);
        return this.masterAnalyser;
    }

    getMasterAnalyser() {
        return this.masterAnalyser;
    }

    createEffectChain(chainConfig) {
        const nodes = [];
        
        for (let i = 0; i < chainConfig.length; i++) {
            const config = chainConfig[i];
            const nodeId = config.id || `effect_${i}`;
            const node = this.createNode(config.type, nodeId, config.options);
            nodes.push({ id: nodeId, node });
            
            if (i > 0) {
                this.connect(nodes[i - 1].id, nodeId);
            }
        }
        
        return nodes;
    }

    destroy() {
        for (const [id, node] of this.nodes) {
            try {
                node.disconnect();
            } catch (e) {
                // Node might already be disconnected
            }
        }
        
        this.nodes.clear();
        this.connections = [];
        this.masterAnalyser = null;
    }
}

export class AudioStreamProcessor {
    static async createFromMediaDevices(constraints = { audio: true }) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return new AudioStreamProcessor(stream);
    }

    static createFromElement(audioElement) {
        return new AudioStreamProcessor(null, audioElement);
    }

    constructor(stream = null, audioElement = null) {
        this.stream = stream;
        this.audioElement = audioElement;
        this.audioContext = null;
        this.sourceNode = null;
        this.graph = null;
    }

    async initialize(audioContext) {
        this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        this.graph = new WebAudioGraph(this.audioContext);
        
        if (this.stream) {
            this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        } else if (this.audioElement) {
            this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
        }
        
        return this.sourceNode;
    }

    applyEffects(effectChain) {
        if (!this.sourceNode || !this.graph) {
            throw new Error('AudioStreamProcessor not initialized');
        }
        
        const nodes = this.graph.createEffectChain(effectChain);
        
        if (nodes.length > 0) {
            this.sourceNode.connect(nodes[0].node);
            return nodes[nodes.length - 1].node; // Return the last node in chain
        }
        
        return this.sourceNode;
    }

    getAnalyser(options = {}) {
        if (!this.graph) {
            throw new Error('AudioStreamProcessor not initialized');
        }
        
        const analyserId = 'master_analyser';
        const analyser = this.graph.createNode('analyser', analyserId, {
            fftSize: 512,
            smoothingTimeConstant: 0.3,
            minDecibels: -90,
            maxDecibels: -10,
            ...options
        });
        
        this.graph.setMasterAnalyser(analyserId);
        return analyser;
    }

    destroy() {
        if (this.graph) {
            this.graph.destroy();
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}

export function createRealtimeAnalyser(audioContext, options = {}) {
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = options.fftSize || 512;
    analyser.smoothingTimeConstant = options.smoothingTimeConstant || 0.3;
    analyser.minDecibels = options.minDecibels || -90;
    analyser.maxDecibels = options.maxDecibels || -10;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    return {
        analyser,
        dataArray,
        getFrequencyData: () => {
            analyser.getByteFrequencyData(dataArray);
            return dataArray;
        },
        getTimeData: () => {
            analyser.getByteTimeDomainData(dataArray);
            return dataArray;
        },
        getAverageFrequency: () => {
            analyser.getByteFrequencyData(dataArray);
            return dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        }
    };
}

export function createAudioWorkletProcessor(processorCode, processorName = 'custom-processor') {
    const blob = new Blob([processorCode], { type: 'application/javascript' });
    const processorURL = URL.createObjectURL(blob);
    
    return {
        processorURL,
        processorName,
        async register(audioContext) {
            await audioContext.audioWorklet.addModule(processorURL);
            return new AudioWorkletNode(audioContext, processorName);
        },
        cleanup() {
            URL.revokeObjectURL(processorURL);
        }
    };
}
