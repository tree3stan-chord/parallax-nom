import React, { useState, useRef } from 'react';
import { ParallaxVisualizer, useParallaxVisualizer } from 'parallax-visualizer/react';
import { visualizationRegistry } from 'parallax-visualizer';

function App() {
  const visualizerRef = useRef();
  const [currentMode, setCurrentMode] = useState('bars');
  const [status, setStatus] = useState('Ready - Select an audio source to begin');
  const [isError, setIsError] = useState(false);
  const [lolcat, setLolcat] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('basic');

  // Custom visualization example
  const customVisualizations = {
    reactDemo: {
      function: ({ frequencyData, dimensions }) => {
        const { cols, rows } = dimensions;
        let output = '';
        
        // Simple React-themed visualization
        const centerY = Math.floor(rows / 2);
        const logoText = 'REACT + PARALLAX';
        const startX = Math.floor((cols - logoText.length) / 2);
        
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (y === centerY && x >= startX && x < startX + logoText.length) {
              output += logoText[x - startX];
            } else if (frequencyData && Math.random() < (frequencyData[x % frequencyData.length] / 255) * 0.1) {
              output += '⚛';
            } else {
              output += ' ';
            }
          }
          output += '\n';
        }
        return output;
      },
      category: 'custom',
      description: 'React-themed visualization with atoms'
    }
  };

  const handleError = (error) => {
    setStatus(`Error: ${error.message || error}`);
    setIsError(true);
    setTimeout(() => setIsError(false), 5000);
  };

  const handleStatusUpdate = (message) => {
    setStatus(message);
    setIsError(false);
  };

  const categories = visualizationRegistry.getCategories();
  const allModes = visualizationRegistry.getAllModes();
  const categoryModes = visualizationRegistry.getModesByCategory(selectedCategory);

  return (
    <div className="app">
      <header className="header">
        <h1>🎵 Parallax Visualizer - React Example 🎵</h1>
        <p>Real-time ASCII audio visualization in React</p>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <div className="control-section">
            <h3>Audio Sources</h3>
            <button 
              className="button"
              onClick={() => {
                visualizerRef.current?.setAudioSource('microphone');
                handleStatusUpdate('Starting microphone...');
              }}
            >
              🎤 Microphone
            </button>
            
            <input
              type="file"
              accept="audio/*"
              className="file-input"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  visualizerRef.current?.setAudioSource({ type: 'file', file });
                  handleStatusUpdate(`Loading ${file.name}...`);
                }
              }}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button 
                className="button"
                onClick={() => visualizerRef.current?.play()}
              >
                ▶️ Play
              </button>
              <button 
                className="button"
                onClick={() => visualizerRef.current?.pause()}
              >
                ⏸️ Pause
              </button>
              <button 
                className="button"
                onClick={() => visualizerRef.current?.stop()}
              >
                ⏹️ Stop
              </button>
            </div>
          </div>

          <div className="control-section">
            <h3>Effects</h3>
            <label className="toggle">
              <input
                type="checkbox"
                checked={lolcat}
                onChange={(e) => setLolcat(e.target.checked)}
              />
              Rainbow Colors (lolcat)
            </label>
          </div>

          <div className="control-section">
            <h3>Categories</h3>
            <select
              className="select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.toUpperCase()} ({visualizationRegistry.getModesByCategory(category).length})
                </option>
              ))}
              <option value="custom">CUSTOM (1)</option>
            </select>
          </div>

          <div className="control-section">
            <h3>Visualization Modes</h3>
            <div className="mode-grid">
              {(selectedCategory === 'custom' ? ['reactDemo'] : categoryModes).map(mode => (
                <button
                  key={mode}
                  className={`mode-button ${currentMode === mode ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentMode(mode);
                    visualizerRef.current?.setMode(mode);
                    handleStatusUpdate(`Switched to ${mode} mode`);
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="control-section">
            <h3>Mode Info</h3>
            <div className="info-panel">
              {(() => {
                const info = visualizationRegistry.getVisualizationInfo(currentMode);
                if (info) {
                  return (
                    <>
                      <strong>{info.name}</strong><br />
                      <em>Category: {info.category}</em><br /><br />
                      {info.description}<br /><br />
                      <strong>Complexity:</strong> {info.complexity}<br /><br />
                      <strong>Features:</strong><br />
                      {info.features.map(f => `• ${f}`).join('\n')}
                    </>
                  );
                } else if (currentMode === 'reactDemo') {
                  return (
                    <>
                      <strong>React Demo</strong><br />
                      <em>Category: custom</em><br /><br />
                      Custom React-themed visualization with React atoms scattered based on audio frequency.
                      This demonstrates how to add custom visualizations to the Parallax Visualizer.
                    </>
                  );
                }
                return 'Select a mode to see details';
              })()}
            </div>
          </div>
        </aside>

        <main className="visualizer-container">
          <ParallaxVisualizer
            ref={visualizerRef}
            mode={currentMode}
            lolcat={lolcat}
            autoStart={false}
            customVisualizations={customVisualizations}
            onError={handleError}
            onSourceChange={(data) => handleStatusUpdate(`Audio source: ${data.type}`)}
            onModeChange={(mode) => handleStatusUpdate(`Mode: ${mode}`)}
            onFileLoaded={(data) => handleStatusUpdate(`Loaded: ${data.file.name}`)}
            style={{
              width: '100%',
              height: '100%',
              fontSize: '8px'
            }}
          />
        </main>
      </div>

      <div className={`status ${isError ? 'error' : ''}`}>
        {status}
      </div>
    </div>
  );
}

export default App;