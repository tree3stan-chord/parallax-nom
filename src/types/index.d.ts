// Type definitions for Parallax Visualizer

export interface Dimensions {
    width: number;
    height: number;
    cols: number;
    rows: number;
    charWidth: number;
    charHeight: number;
}

export interface VisualizationParams {
    frequencyData: Uint8Array;
    audioIntensity: number;
    time: number;
    dimensions: Dimensions;
    options: ParallaxVisualizerOptions;
}

export type VisualizationFunction = (params: VisualizationParams) => string | VisualizationOutput;

export interface VisualizationOutput {
    content: string;
    style?: Partial<CSSStyleDeclaration>;
    applyColors?: (element: HTMLElement) => void;
}

export interface VisualizationInfo {
    name: string;
    category: string;
    description: string;
    complexity: string;
    features: string[];
}

// Audio Source Types
export enum AudioSourceTypes {
    MICROPHONE = 'microphone',
    FILE = 'file',
    STREAM = 'stream',
    ANALYSER = 'analyser'
}

export interface MicrophoneConstraints {
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    sampleRate?: number;
    channelCount?: number;
}

export interface AudioSourceConfig {
    type: AudioSourceTypes;
    file?: File;
    stream?: MediaStream;
    analyser?: AnalyserNode;
    constraints?: MediaStreamConstraints | MicrophoneConstraints;
    options?: {
        connectToDestination?: boolean;
        gainValue?: number;
    };
    name?: string;
}

export interface AudioHandlerOptions {
    fftSize?: number;
    smoothingTimeConstant?: number;
    minDecibels?: number;
    maxDecibels?: number;
}

export interface ParallaxVisualizerOptions {
    container?: string | HTMLElement;
    mode?: string;
    audioSource?: string | AudioSourceConfig;
    width?: number;
    height?: number;
    responsive?: boolean;
    lolcat?: boolean;
    autoStart?: boolean;
    fileInput?: boolean;
    fileDropTarget?: string | HTMLElement;
    audio?: AudioHandlerOptions;
}

// Events
export interface ParallaxEvent extends CustomEvent {
    detail: any;
}

export type EventCallback = (event: ParallaxEvent) => void;

// Main Classes
export declare class AudioHandler {
    constructor(options?: AudioHandlerOptions);
    
    initialize(): Promise<void>;
    setMicrophoneSource(constraints?: MediaStreamConstraints): Promise<boolean>;
    setFileSource(file: File): Promise<boolean>;
    setStreamSource(stream: MediaStream, options?: any): Promise<boolean>;
    setAnalyserSource(analyser: AnalyserNode): void;
    switchSource(sourceConfig: AudioSourceConfig): Promise<boolean>;
    
    play(): void;
    pause(): void;
    stop(): void;
    
    getFrequencyData(): Uint8Array | null;
    getTimeData(): Uint8Array | null;
    getAudioIntensity(): number;
    
    on(event: string, callback: Function): void;
    destroy(): void;
    
    readonly currentSource: string | null;
    readonly isPlaying: boolean;
}

export declare class ASCIIRenderer {
    constructor(dimensions: Dimensions);
    
    createGrid(): string[][];
    gridToString(grid: string[][]): string;
    getCharByIntensity(intensity: number, reverse?: boolean): string;
    getExplosionChar(): string;
    setPixel(grid: string[][], x: number, y: number, char: string, overwrite?: boolean): boolean;
    drawLine(grid: string[][], x1: number, y1: number, x2: number, y2: number, char: string): void;
    drawCircle(grid: string[][], centerX: number, centerY: number, radius: number, char: string, filled?: boolean): void;
    addNoise(grid: string[][], intensity: number, char?: string): void;
    addSparkles(grid: string[][], x: number, y: number, intensity: number, range?: number): void;
    updateDimensions(dimensions: Dimensions): void;
}

export declare class ColorHandler {
    constructor();
    
    enable(enabled?: boolean): void;
    update(deltaTime: number): void;
    getColorForPosition(x: number, y: number): string | null;
    applyColors(element: HTMLElement, content: string): void;
}

export declare class VisualizationRegistry {
    constructor();
    
    registerCategory(categoryName: string, visualizations: Record<string, VisualizationFunction>): void;
    registerVisualization(name: string, func: VisualizationFunction, category?: string, description?: string): void;
    getVisualization(name: string): { name: string; category: string; function: VisualizationFunction; description: string } | undefined;
    getAllModes(): string[];
    getModesByCategory(category: string): string[];
    getCategories(): string[];
    hasMode(name: string): boolean;
    executeVisualization(name: string, params: VisualizationParams): string | VisualizationOutput;
    getVisualizationInfo(name: string): VisualizationInfo | null;
    generateModeList(): string;
}

export declare class FileHandler {
    constructor(options?: {
        acceptedTypes?: string[];
        maxFileSize?: number;
        dragDropTarget?: string | HTMLElement;
        onFileSelect?: (file: File) => void;
        onFileError?: (error: Error) => void;
        onDragOver?: (event: DragEvent) => void;
        onDragLeave?: (event: DragEvent) => void;
    });
    
    openFileDialog(): void;
    destroy(): void;
}

export declare class AudioSourceManager {
    constructor();
    
    addSource(id: string, sourceConfig: AudioSourceConfig): this;
    removeSource(id: string): boolean;
    getSource(id: string): any;
    getAllSources(): any[];
    getSourcesByType(type: AudioSourceTypes): any[];
    setActiveSource(id: string): AudioSourceConfig;
    getActiveSource(): any;
    hasSource(id: string): boolean;
    
    createMicrophoneSource(id: string, options?: any): this;
    createFileSource(id: string, file: File, options?: any): this;
    createStreamSource(id: string, stream: MediaStream, options?: any): this;
    createAnalyserSource(id: string, analyser: AnalyserNode, options?: any): this;
    
    on(event: string, callback: Function): void;
    clear(): void;
    getStats(): any;
}

export declare class ParallaxVisualizer {
    constructor(options?: ParallaxVisualizerOptions);
    
    initialize(): Promise<void>;
    setAudioSource(source: string | AudioSourceConfig): Promise<void>;
    switchAudioSource(sourceConfig: AudioSourceConfig): Promise<boolean>;
    setVisualizationMode(mode: string): void;
    
    registerVisualization(name: string, func: VisualizationFunction, category?: string, description?: string): void;
    getAvailableModes(): string[];
    getModesByCategory(category: string): string[];
    getVisualizationInfo(mode: string): VisualizationInfo | null;
    
    play(): void;
    pause(): void;
    stop(): void;
    
    openFileDialog(): void;
    
    on(event: string, callback: EventCallback): void;
    off(event: string, callback: EventCallback): void;
    emit(event: string, data?: any): void;
    
    destroy(): void;
    
    readonly audioHandler: AudioHandler;
    readonly options: ParallaxVisualizerOptions;
    readonly dimensions: Dimensions;
}

// Web Audio Helpers
export declare class WebAudioGraph {
    constructor(audioContext?: AudioContext);
    
    createNode(type: string, id: string, options?: any): AudioNode;
    getNode(id: string): AudioNode | undefined;
    connect(fromId: string, toId: string, outputIndex?: number, inputIndex?: number): void;
    connectToDestination(nodeId: string, outputIndex?: number): void;
    disconnect(nodeId: string, outputIndex?: number): void;
    setMasterAnalyser(analyserId: string): AnalyserNode | null;
    getMasterAnalyser(): AnalyserNode | null;
    createEffectChain(chainConfig: any[]): any[];
    destroy(): void;
}

export declare class AudioStreamProcessor {
    static createFromMediaDevices(constraints?: MediaStreamConstraints): Promise<AudioStreamProcessor>;
    static createFromElement(audioElement: HTMLAudioElement): AudioStreamProcessor;
    
    constructor(stream?: MediaStream, audioElement?: HTMLAudioElement);
    
    initialize(audioContext?: AudioContext): Promise<AudioNode>;
    applyEffects(effectChain: any[]): AudioNode;
    getAnalyser(options?: any): AnalyserNode;
    destroy(): void;
}

// Utility Functions
export declare function createAudioSource(type: AudioSourceTypes, config?: any): AudioSourceConfig;
export declare function validateAudioSource(source: AudioSourceConfig): boolean;
export declare function createFileInputButton(options?: any): HTMLButtonElement;
export declare function createRealtimeAnalyser(audioContext: AudioContext, options?: any): any;

// Preset Functions
export declare class AudioSourcePresets {
    static getDefaultMicrophone(): AudioSourceConfig;
    static getHighQualityMicrophone(): AudioSourceConfig;
    static getMusicOptimizedMicrophone(): AudioSourceConfig;
    static getStreamWithGain(stream: MediaStream, gainValue?: number): AudioSourceConfig;
    static getSilentStream(stream: MediaStream): AudioSourceConfig;
}

// Visualization Collections
export declare const basicVisualizations: Record<string, VisualizationFunction>;
export declare const advancedVisualizations: Record<string, VisualizationFunction>;
export declare const extremeVisualizations: Record<string, VisualizationFunction>;
export declare const VisualizationModes: Record<string, VisualizationFunction>;

export declare const visualizationRegistry: VisualizationRegistry;

export declare function getAllVisualizations(): Record<string, VisualizationFunction>;
export declare function getVisualizationByName(name: string): any;
export declare function executeVisualization(name: string, params: VisualizationParams): string | VisualizationOutput;

// Default Export
declare class ParallaxVisualizerDefault extends ParallaxVisualizer {}
export default ParallaxVisualizerDefault;