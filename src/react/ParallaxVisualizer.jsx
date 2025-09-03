import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import ParallaxVisualizerCore from '../ParallaxVisualizer.js';
import { AudioSourceTypes } from '../audio/sources.js';

/**
 * React wrapper component for Parallax Visualizer
 * 
 * @component
 * @example
 * ```jsx
 * import { ParallaxVisualizer } from 'parallax-visualizer/react';
 * 
 * function App() {
 *   return (
 *     <ParallaxVisualizer
 *       mode="bars"
 *       audioSource="microphone"
 *       lolcat={true}
 *       onError={(error) => console.error(error)}
 *       style={{ width: '100%', height: '400px' }}
 *     />
 *   );
 * }
 * ```
 */
const ParallaxVisualizer = forwardRef(({
    // Core options
    mode = 'bars',
    audioSource = 'microphone',
    width,
    height,
    responsive = true,
    lolcat = false,
    autoStart = true,
    
    // File handling
    fileInput = true,
    acceptDrop = true,
    
    // Audio options
    audioOptions = {},
    
    // Styling
    className = '',
    style = {},
    containerStyle = {},
    
    // Event handlers
    onInitialized,
    onError,
    onSourceChange,
    onModeChange,
    onFileLoaded,
    onPlay,
    onPause,
    onDestroyed,
    
    // Custom visualizations
    customVisualizations = {},
    
    // Children (for custom controls)
    children,
    
    ...props
}, ref) => {
    const containerRef = useRef(null);
    const visualizerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [currentMode, setCurrentMode] = useState(mode);
    const [currentSource, setCurrentSource] = useState(null);
    const [error, setError] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [availableModes, setAvailableModes] = useState([]);

    // Expose visualizer methods through ref
    useImperativeHandle(ref, () => ({
        play: () => visualizerRef.current?.play(),
        pause: () => visualizerRef.current?.pause(),
        stop: () => visualizerRef.current?.stop(),
        setMode: (newMode) => visualizerRef.current?.setVisualizationMode(newMode),
        setAudioSource: (source) => visualizerRef.current?.setAudioSource(source),
        switchAudioSource: (source) => visualizerRef.current?.switchAudioSource(source),
        getAvailableModes: () => visualizerRef.current?.getAvailableModes() || [],
        getModesByCategory: (category) => visualizerRef.current?.getModesByCategory(category) || [],
        getVisualizationInfo: (mode) => visualizerRef.current?.getVisualizationInfo(mode),
        openFileDialog: () => visualizerRef.current?.openFileDialog(),
        registerVisualization: (name, func, category, description) => 
            visualizerRef.current?.registerVisualization(name, func, category, description),
        destroy: () => visualizerRef.current?.destroy(),
        getInstance: () => visualizerRef.current
    }), []);

    // Initialize visualizer
    useEffect(() => {
        if (!containerRef.current) return;

        const options = {
            container: containerRef.current,
            mode: currentMode,
            audioSource,
            width,
            height,
            responsive,
            lolcat,
            autoStart,
            fileInput,
            fileDropTarget: acceptDrop ? containerRef.current : null,
            audio: audioOptions
        };

        try {
            const visualizer = new ParallaxVisualizerCore(options);
            visualizerRef.current = visualizer;
            
            // Register custom visualizations
            Object.entries(customVisualizations).forEach(([name, config]) => {
                visualizer.registerVisualization(
                    name, 
                    config.function, 
                    config.category || 'custom',
                    config.description || ''
                );
            });

            // Set up event listeners
            const handleEvent = (eventName, callback) => {
                if (callback) {
                    visualizer.on(eventName, (e) => callback(e.detail));
                }
            };

            handleEvent('initialized', (data) => {
                setIsReady(true);
                setAvailableModes(visualizer.getAvailableModes());
                onInitialized?.(data);
            });

            handleEvent('error', (error) => {
                setError(error);
                onError?.(error);
            });

            handleEvent('sourceChange', (data) => {
                setCurrentSource(data);
                onSourceChange?.(data);
            });

            handleEvent('modeChange', (mode) => {
                setCurrentMode(mode);
                onModeChange?.(mode);
            });

            handleEvent('fileLoaded', onFileLoaded);
            handleEvent('play', () => {
                setIsPlaying(true);
                onPlay?.();
            });
            handleEvent('pause', () => {
                setIsPlaying(false);
                onPause?.();
            });
            handleEvent('destroyed', onDestroyed);

        } catch (error) {
            setError(error);
            onError?.(error);
        }

        // Cleanup
        return () => {
            if (visualizerRef.current) {
                visualizerRef.current.destroy();
                visualizerRef.current = null;
            }
        };
    }, []); // Only run once on mount

    // Update mode when prop changes
    useEffect(() => {
        if (visualizerRef.current && mode !== currentMode) {
            try {
                visualizerRef.current.setVisualizationMode(mode);
            } catch (error) {
                setError(error);
                onError?.(error);
            }
        }
    }, [mode]);

    // Update audio source when prop changes
    useEffect(() => {
        if (visualizerRef.current && audioSource) {
            visualizerRef.current.setAudioSource(audioSource).catch((error) => {
                setError(error);
                onError?.(error);
            });
        }
    }, [audioSource]);

    // Update lolcat when prop changes
    useEffect(() => {
        if (visualizerRef.current) {
            visualizerRef.current.options.lolcat = lolcat;
        }
    }, [lolcat]);

    const containerStyles = {
        fontFamily: 'monospace',
        lineHeight: 1,
        whiteSpace: 'pre',
        overflow: 'hidden',
        backgroundColor: '#000',
        color: '#0f0',
        width: width || '100%',
        height: height || '400px',
        ...containerStyle,
        ...style
    };

    return (
        <div className={`parallax-visualizer ${className}`} style={containerStyles} {...props}>
            <div 
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    fontSize: '8px',
                    padding: 0,
                    margin: 0
                }}
            />
            {children && React.cloneElement(children, {
                visualizer: visualizerRef.current,
                isReady,
                currentMode,
                currentSource,
                error,
                isPlaying,
                availableModes
            })}
        </div>
    );
});

ParallaxVisualizer.displayName = 'ParallaxVisualizer';

/**
 * Hook for using Parallax Visualizer in functional components
 * 
 * @example
 * ```jsx
 * import { useParallaxVisualizer } from 'parallax-visualizer/react';
 * 
 * function MyComponent() {
 *   const {
 *     visualizerRef,
 *     isReady,
 *     play,
 *     pause,
 *     setMode,
 *     availableModes
 *   } = useParallaxVisualizer({
 *     mode: 'bars',
 *     audioSource: 'microphone'
 *   });
 * 
 *   return (
 *     <div>
 *       <div ref={visualizerRef} style={{ width: '100%', height: '400px' }} />
 *       <button onClick={() => setMode('circle')}>Circle Mode</button>
 *       <button onClick={play}>Play</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useParallaxVisualizer(options = {}) {
    const visualizerRef = useRef(null);
    const instanceRef = useRef(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const [currentMode, setCurrentMode] = useState(options.mode || 'bars');
    const [isPlaying, setIsPlaying] = useState(false);
    const [availableModes, setAvailableModes] = useState([]);

    useEffect(() => {
        if (!visualizerRef.current) return;

        const visualizer = new ParallaxVisualizerCore({
            container: visualizerRef.current,
            ...options
        });
        
        instanceRef.current = visualizer;

        // Set up event listeners
        visualizer.on('initialized', () => {
            setIsReady(true);
            setAvailableModes(visualizer.getAvailableModes());
        });

        visualizer.on('error', (e) => setError(e.detail));
        visualizer.on('modeChange', (e) => setCurrentMode(e.detail));
        visualizer.on('play', () => setIsPlaying(true));
        visualizer.on('pause', () => setIsPlaying(false));

        return () => {
            visualizer.destroy();
            instanceRef.current = null;
        };
    }, []);

    const play = useCallback(() => instanceRef.current?.play(), []);
    const pause = useCallback(() => instanceRef.current?.pause(), []);
    const stop = useCallback(() => instanceRef.current?.stop(), []);
    const setMode = useCallback((mode) => instanceRef.current?.setVisualizationMode(mode), []);
    const setAudioSource = useCallback((source) => instanceRef.current?.setAudioSource(source), []);

    return {
        visualizerRef,
        instance: instanceRef.current,
        isReady,
        error,
        currentMode,
        isPlaying,
        availableModes,
        play,
        pause,
        stop,
        setMode,
        setAudioSource
    };
}

/**
 * Context for sharing visualizer state across components
 */
export const ParallaxVisualizerContext = React.createContext(null);

/**
 * Provider component for Parallax Visualizer context
 */
export function ParallaxVisualizerProvider({ children, ...options }) {
    const visualizerState = useParallaxVisualizer(options);
    
    return (
        <ParallaxVisualizerContext.Provider value={visualizerState}>
            {children}
        </ParallaxVisualizerContext.Provider>
    );
}

/**
 * Hook to access visualizer context
 */
export function useParallaxVisualizerContext() {
    const context = React.useContext(ParallaxVisualizerContext);
    if (!context) {
        throw new Error('useParallaxVisualizerContext must be used within a ParallaxVisualizerProvider');
    }
    return context;
}

export default ParallaxVisualizer;