import React, { useState } from 'react';
import { useParallaxVisualizerContext } from '../ParallaxVisualizer.jsx';

/**
 * Pre-built control panel for Parallax Visualizer
 * 
 * @component
 * @example
 * ```jsx
 * import { ParallaxVisualizerProvider, VisualizerControls } from 'parallax-visualizer/react';
 * 
 * function App() {
 *   return (
 *     <ParallaxVisualizerProvider mode="bars">
 *       <div ref={visualizerRef} style={{ height: '400px' }} />
 *       <VisualizerControls />
 *     </ParallaxVisualizerProvider>
 *   );
 * }
 * ```
 */
export function VisualizerControls({
    showModeSelector = true,
    showAudioControls = true,
    showFileUpload = true,
    showEffectToggle = true,
    className = '',
    style = {}
}) {
    const {
        instance,
        isReady,
        currentMode,
        isPlaying,
        availableModes,
        play,
        pause,
        stop,
        setMode,
        setAudioSource
    } = useParallaxVisualizerContext();
    
    const [lolcatEnabled, setLolcatEnabled] = useState(false);

    const handleModeChange = (event) => {
        const newMode = event.target.value;
        setMode(newMode);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setAudioSource({
                type: 'file',
                file: file
            });
        }
    };

    const handleMicrophoneStart = () => {
        setAudioSource('microphone');
    };

    const handleLolcatToggle = () => {
        const newValue = !lolcatEnabled;
        setLolcatEnabled(newValue);
        if (instance) {
            instance.options.lolcat = newValue;
        }
    };

    const controlStyles = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center',
        padding: '10px',
        backgroundColor: 'rgba(0, 20, 0, 0.9)',
        border: '1px solid #0f0',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#0f0',
        ...style
    };

    const buttonStyles = {
        backgroundColor: '#000',
        border: '1px solid #0f0',
        color: '#0f0',
        padding: '5px 10px',
        cursor: 'pointer',
        borderRadius: '2px',
        fontFamily: 'inherit',
        fontSize: 'inherit'
    };

    const selectStyles = {
        backgroundColor: '#000',
        border: '1px solid #0f0',
        color: '#0f0',
        padding: '5px',
        fontFamily: 'inherit',
        fontSize: 'inherit'
    };

    const fileInputStyles = {
        backgroundColor: '#000',
        border: '1px solid #0f0',
        color: '#0f0',
        padding: '3px',
        fontFamily: 'inherit',
        fontSize: 'inherit'
    };

    if (!isReady) {
        return (
            <div className={className} style={controlStyles}>
                <span>Loading visualizer...</span>
            </div>
        );
    }

    return (
        <div className={className} style={controlStyles}>
            {showAudioControls && (
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button
                        style={buttonStyles}
                        onClick={handleMicrophoneStart}
                        title="Start microphone input"
                    >
                        🎤 Mic
                    </button>
                    <button
                        style={buttonStyles}
                        onClick={play}
                        disabled={isPlaying}
                        title="Play audio"
                    >
                        ▶️ Play
                    </button>
                    <button
                        style={buttonStyles}
                        onClick={pause}
                        disabled={!isPlaying}
                        title="Pause audio"
                    >
                        ⏸️ Pause
                    </button>
                    <button
                        style={buttonStyles}
                        onClick={stop}
                        title="Stop audio"
                    >
                        ⏹️ Stop
                    </button>
                </div>
            )}

            {showFileUpload && (
                <div>
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        style={fileInputStyles}
                        title="Upload audio file"
                    />
                </div>
            )}

            {showModeSelector && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label>Mode:</label>
                    <select
                        value={currentMode}
                        onChange={handleModeChange}
                        style={selectStyles}
                        title="Select visualization mode"
                    >
                        {availableModes.map(mode => (
                            <option key={mode} value={mode}>
                                {mode}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {showEffectToggle && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <label>
                        <input
                            type="checkbox"
                            checked={lolcatEnabled}
                            onChange={handleLolcatToggle}
                            style={{ marginRight: '5px' }}
                        />
                        Rainbow Colors
                    </label>
                </div>
            )}
        </div>
    );
}

/**
 * Mode selector dropdown component
 */
export function ModeSelector({ onModeChange, currentMode, availableModes, className, style }) {
    return (
        <select
            value={currentMode}
            onChange={(e) => onModeChange?.(e.target.value)}
            className={className}
            style={{
                backgroundColor: '#000',
                border: '1px solid #0f0',
                color: '#0f0',
                padding: '5px',
                fontFamily: 'monospace',
                ...style
            }}
        >
            {availableModes.map(mode => (
                <option key={mode} value={mode}>
                    {mode}
                </option>
            ))}
        </select>
    );
}

/**
 * Audio control buttons component
 */
export function AudioControls({ 
    onPlay, 
    onPause, 
    onStop, 
    onMicStart, 
    isPlaying,
    className,
    style 
}) {
    const buttonStyle = {
        backgroundColor: '#000',
        border: '1px solid #0f0',
        color: '#0f0',
        padding: '5px 10px',
        margin: '2px',
        cursor: 'pointer',
        borderRadius: '2px',
        fontFamily: 'monospace'
    };

    return (
        <div 
            className={className}
            style={{
                display: 'flex',
                gap: '5px',
                ...style
            }}
        >
            <button style={buttonStyle} onClick={onMicStart}>
                🎤 Mic
            </button>
            <button 
                style={buttonStyle} 
                onClick={onPlay}
                disabled={isPlaying}
            >
                ▶️ Play
            </button>
            <button 
                style={buttonStyle} 
                onClick={onPause}
                disabled={!isPlaying}
            >
                ⏸️ Pause
            </button>
            <button style={buttonStyle} onClick={onStop}>
                ⏹️ Stop
            </button>
        </div>
    );
}

export default VisualizerControls;