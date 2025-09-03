'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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
  async setMicrophoneSource(constraints = {
    audio: true
  }) {
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
    if (!data) {
      return 0;
    }
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

const AudioSourceTypes = {
  MICROPHONE: 'microphone',
  FILE: 'file',
  STREAM: 'stream',
  ANALYSER: 'analyser'
};
function createAudioSource(type, config = {}) {
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
function validateAudioSource(source) {
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

class FileHandler {
  constructor(options = {}) {
    this.options = {
      acceptedTypes: ['audio/*'],
      maxFileSize: 100 * 1024 * 1024,
      // 100MB
      dragDropTarget: null,
      onFileSelect: null,
      onFileError: null,
      onDragOver: null,
      onDragLeave: null,
      ...options
    };
    this.fileInput = null;
    this.dragDropTarget = null;
    this.setupFileInput();
    if (this.options.dragDropTarget) {
      this.setupDragDrop(this.options.dragDropTarget);
    }
  }
  setupFileInput() {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = this.options.acceptedTypes.join(',');
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        this.handleFile(file);
      }
    });
    document.body.appendChild(this.fileInput);
  }
  setupDragDrop(target) {
    if (typeof target === 'string') {
      this.dragDropTarget = document.querySelector(target);
    } else if (target instanceof HTMLElement) {
      this.dragDropTarget = target;
    }
    if (!this.dragDropTarget) {
      console.warn('Drag drop target not found');
      return;
    }
    this.dragDropTarget.addEventListener('dragover', e => {
      e.preventDefault();
      e.stopPropagation();
      this.dragDropTarget.classList.add('drag-over');
      if (this.options.onDragOver) {
        this.options.onDragOver(e);
      }
    });
    this.dragDropTarget.addEventListener('dragleave', e => {
      e.preventDefault();
      e.stopPropagation();

      // Only remove class if leaving the target itself, not child elements
      if (!this.dragDropTarget.contains(e.relatedTarget)) {
        this.dragDropTarget.classList.remove('drag-over');
        if (this.options.onDragLeave) {
          this.options.onDragLeave(e);
        }
      }
    });
    this.dragDropTarget.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      this.dragDropTarget.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files);
      const audioFiles = files.filter(file => this.isValidFile(file));
      if (audioFiles.length > 0) {
        this.handleFile(audioFiles[0]); // Use first valid file
      } else if (files.length > 0) {
        this.handleError(new Error('No valid audio files found'));
      }
    });
  }
  isValidFile(file) {
    // Check file type
    const typeMatch = this.options.acceptedTypes.some(type => {
      if (type === 'audio/*') {
        return file.type.startsWith('audio/');
      }
      return file.type === type;
    });
    if (!typeMatch) {
      return false;
    }

    // Check file size
    if (file.size > this.options.maxFileSize) {
      return false;
    }
    return true;
  }
  handleFile(file) {
    if (!this.isValidFile(file)) {
      const error = new Error(`Invalid file: ${file.name}. Must be audio file under ${Math.round(this.options.maxFileSize / 1024 / 1024)}MB`);
      this.handleError(error);
      return;
    }
    if (this.options.onFileSelect) {
      this.options.onFileSelect(file);
    }
  }
  handleError(error) {
    console.error('File handler error:', error);
    if (this.options.onFileError) {
      this.options.onFileError(error);
    }
  }
  openFileDialog() {
    this.fileInput.click();
  }
  destroy() {
    if (this.fileInput && this.fileInput.parentNode) {
      this.fileInput.parentNode.removeChild(this.fileInput);
    }
    if (this.dragDropTarget) {
      this.dragDropTarget.classList.remove('drag-over');
    }
  }
}
function createFileInputButton(options = {}) {
  const button = document.createElement('button');
  button.textContent = options.text || 'Upload Audio File';
  button.className = options.className || 'parallax-file-button';
  const fileHandler = new FileHandler({
    ...options,
    onFileSelect: file => {
      if (options.onFileSelect) {
        options.onFileSelect(file);
      }
    }
  });
  button.addEventListener('click', () => {
    fileHandler.openFileDialog();
  });
  button.fileHandler = fileHandler;
  return button;
}

class ASCIIRenderer {
  constructor(dimensions) {
    this.dimensions = dimensions;
    this.asciiChars = ' .·:¦|=+*#%@█';
    this.asciiCharsReverse = '█@%#*+=|¦:·. ';
    this.explosionChars = '·∴∵:;*✦✧⋆☆★✺✹✸✷✶✵✴✳✲✱✰';
  }
  createGrid() {
    const {
      rows,
      cols
    } = this.dimensions;
    return Array(rows).fill(null).map(() => Array(cols).fill(' '));
  }
  gridToString(grid) {
    return grid.map(row => row.join('')).join('\n');
  }
  getCharByIntensity(intensity, reverse = false) {
    const chars = reverse ? this.asciiCharsReverse : this.asciiChars;
    const index = Math.floor(intensity * (chars.length - 1));
    return chars[index];
  }
  getExplosionChar() {
    return this.explosionChars[Math.floor(Math.random() * this.explosionChars.length)];
  }
  setPixel(grid, x, y, char, overwrite = false) {
    const {
      rows,
      cols
    } = this.dimensions;
    if (x >= 0 && x < cols && y >= 0 && y < rows) {
      if (overwrite || grid[y][x] === ' ') {
        grid[y][x] = char;
        return true;
      }
    }
    return false;
  }
  drawLine(grid, x1, y1, x2, y2, char) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    let x = x1;
    let y = y1;
    while (true) {
      // eslint-disable-line no-constant-condition
      this.setPixel(grid, x, y, char);
      if (x === x2 && y === y2) {
        break;
      }
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }
  drawCircle(grid, centerX, centerY, radius, char, filled = false) {
    if (filled) {
      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          if (x * x + y * y <= radius * radius) {
            this.setPixel(grid, centerX + x, centerY + y, char);
          }
        }
      }
    } else {
      for (let angle = 0; angle < 2 * Math.PI; angle += 0.1) {
        const x = Math.round(centerX + radius * Math.cos(angle));
        const y = Math.round(centerY + radius * Math.sin(angle));
        this.setPixel(grid, x, y, char);
      }
    }
  }
  addNoise(grid, intensity, char = null) {
    const {
      rows,
      cols
    } = this.dimensions;
    const noiseCount = Math.floor(rows * cols * intensity);
    for (let i = 0; i < noiseCount; i++) {
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      const noiseChar = char || this.getExplosionChar();
      this.setPixel(grid, x, y, noiseChar, true);
    }
  }
  addSparkles(grid, x, y, intensity, range = 5) {
    if (intensity > 0.7 && Math.random() < 0.3) {
      const sparkCount = Math.floor(intensity * 5);
      for (let i = 0; i < sparkCount; i++) {
        const sparkX = x + Math.floor(Math.random() * range - range / 2);
        const sparkY = y + Math.floor(Math.random() * range - range / 2);
        this.setPixel(grid, sparkX, sparkY, this.getExplosionChar());
      }
    }
  }
  updateDimensions(dimensions) {
    this.dimensions = dimensions;
  }
}
class ColorHandler {
  constructor() {
    this.lolcatEnabled = false;
    this.hueOffset = 0;
  }
  enable(enabled = true) {
    this.lolcatEnabled = enabled;
  }
  update(deltaTime) {
    this.hueOffset += deltaTime * 50; // Adjust speed as needed
    if (this.hueOffset > 360) {
      this.hueOffset -= 360;
    }
  }
  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  getColorForPosition(x, y) {
    if (!this.lolcatEnabled) {
      return null;
    }
    const hue = (this.hueOffset + x * 2 + y * 1) % 360;
    const [r, g, b] = this.hslToRgb(hue, 100, 50);
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }
  applyColors(element, content) {
    if (!this.lolcatEnabled) {
      element.innerHTML = content;
      return;
    }
    const lines = content.split('\n');
    let html = '';
    for (let y = 0; y < lines.length; y++) {
      const line = lines[y];
      for (let x = 0; x < line.length; x++) {
        const char = line[x];
        if (char !== ' ') {
          const color = this.getColorForPosition(x, y);
          html += `<span style="color: ${color}">${char}</span>`;
        } else {
          html += char;
        }
      }
      if (y < lines.length - 1) {
        html += '\n';
      }
    }
    element.innerHTML = html;
  }
}

// State for visualizations that need persistence
const visualizationState = {
  matrixDrops: [],
  particles: [],
  explosionParticles: [],
  stars: [],
  time: 0
};
function initializeState(dimensions) {
  const {
    cols,
    rows
  } = dimensions;

  // Initialize matrix drops
  visualizationState.matrixDrops = [];
  for (let i = 0; i < cols; i++) {
    visualizationState.matrixDrops[i] = Math.floor(Math.random() * rows);
  }

  // Initialize particles
  visualizationState.particles = [];

  // Initialize explosion particles
  visualizationState.explosionParticles = [];

  // Initialize stars
  visualizationState.stars = [];
  for (let i = 0; i < 100; i++) {
    visualizationState.stars.push({
      x: Math.random() * cols,
      y: Math.random() * rows,
      z: Math.random() * 100,
      speed: Math.random() * 2 + 0.5
    });
  }
}
function bars({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  const barWidth = Math.max(1, Math.floor(cols / 48));
  const spacing = Math.floor(cols / 48);

  // Draw bars with effects
  for (let i = 0; i < 48; i++) {
    const dataIndex = Math.floor(i * frequencyData.length / 48);
    const barHeight = Math.floor(frequencyData[dataIndex] / 255 * rows);
    const intensity = frequencyData[dataIndex] / 255;
    const x = i * spacing;
    for (let y = 0; y < barHeight; y++) {
      const yPos = rows - 1 - y;
      for (let w = 0; w < barWidth; w++) {
        if (x + w < cols) {
          const charIndex = Math.floor(y / barHeight * (renderer.asciiCharsReverse.length - 1));
          const char = renderer.asciiCharsReverse[charIndex];
          renderer.setPixel(grid, x + w, yPos, char, true);
        }
      }
    }

    // Add sparkles for high intensity
    if (intensity > 0.7) {
      renderer.addSparkles(grid, x, rows - barHeight, intensity);
    }
  }
  return renderer.gridToString(grid);
}
function circle({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const centerX = cols / 2;
  const centerY = rows / 2;
  const grid = renderer.createGrid();

  // Multiple circles for more impact
  const circles = 3;
  for (let c = 0; c < circles; c++) {
    const radiusMultiplier = 1 + c * 0.3;
    const angleOffset = time * (c + 1) * 0.5;
    for (let i = 0; i < frequencyData.length; i++) {
      const angle = i / frequencyData.length * Math.PI * 2 + angleOffset;
      const intensity = frequencyData[i] / 255;
      const radius = Math.min(cols, rows) * 0.2 + intensity * (Math.min(cols, rows) * 0.25) * radiusMultiplier;
      for (let r = 0; r < 3; r++) {
        const currentRadius = radius + r;
        const x = Math.floor(centerX + Math.cos(angle) * currentRadius);
        const y = Math.floor(centerY + Math.sin(angle) * currentRadius * 0.5);
        const char = renderer.getCharByIntensity(intensity, true);
        renderer.setPixel(grid, x, y, char);
      }

      // Add explosion effects for high intensity
      if (intensity > 0.8) {
        for (let e = 0; e < 3; e++) {
          const explodeRadius = radius + Math.random() * 10;
          const explodeAngle = angle + (Math.random() - 0.5) * 0.3;
          const ex = Math.floor(centerX + Math.cos(explodeAngle) * explodeRadius);
          const ey = Math.floor(centerY + Math.sin(explodeAngle) * explodeRadius * 0.5);
          renderer.setPixel(grid, ex, ey, renderer.getExplosionChar());
        }
      }
    }
  }
  return renderer.gridToString(grid);
}
function matrix({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();

  // Initialize drops if needed
  if (visualizationState.matrixDrops.length !== cols) {
    initializeState(dimensions);
  }

  // Get average frequency for effects
  let avgFreq = 0;
  let maxFreq = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    avgFreq += frequencyData[i];
    maxFreq = Math.max(maxFreq, frequencyData[i]);
  }
  avgFreq /= frequencyData.length;
  const intensity = avgFreq / 255;
  const matrixChars = '01アカサタナハマヤラワガザダバパ';

  // Update matrix drops
  for (let i = 0; i < cols; i++) {
    const freqIndex = Math.floor(i / cols * frequencyData.length);
    const freq = frequencyData[freqIndex] || 0;
    const speed = 1 + Math.floor(freq / 255 * 3);
    visualizationState.matrixDrops[i] += speed;

    // Create trail
    for (let j = 0; j < 10; j++) {
      const y = visualizationState.matrixDrops[i] - j;
      if (y >= 0 && y < rows) {
        const trailIntensity = (10 - j) / 10;
        const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        const asciiChar = renderer.getCharByIntensity(trailIntensity * (freq / 255), true);
        renderer.setPixel(grid, i, y, j === 0 ? char : asciiChar);
      }
    }

    // Reset drop when it reaches bottom
    if (visualizationState.matrixDrops[i] > rows + 10) {
      visualizationState.matrixDrops[i] = -Math.floor(Math.random() * 50);
    }
  }

  // Add glitch effects for high intensity
  if (intensity > 0.6) {
    renderer.addNoise(grid, intensity * 0.1, matrixChars[Math.floor(Math.random() * matrixChars.length)]);
  }
  return renderer.gridToString(grid);
}
function wave({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  const centerY = rows / 2;
  const waveLength = cols;

  // Multiple wave layers
  for (let layer = 0; layer < 3; layer++) {
    const layerOffset = time * (layer + 1) * 0.5;
    const amplitude = rows / 4 * (1 + layer * 0.2);
    for (let x = 0; x < cols; x++) {
      const freqIndex = Math.floor(x / cols * frequencyData.length);
      const freq = frequencyData[freqIndex] || 0;
      const intensity = freq / 255;

      // Base sine wave with frequency modulation
      const baseWave = Math.sin(x / waveLength * Math.PI * 4 + layerOffset);
      const freqWave = Math.sin(x / waveLength * Math.PI * 8 + time * 2);
      const wave = baseWave + freqWave * intensity;
      const y = Math.floor(centerY + wave * amplitude * intensity);
      if (y >= 0 && y < rows) {
        const char = renderer.getCharByIntensity(intensity, true);
        renderer.setPixel(grid, x, y, char);

        // Add thickness
        for (let thickness = 1; thickness < 3; thickness++) {
          const thickY = y + thickness * (wave > 0 ? 1 : -1);
          if (thickY >= 0 && thickY < rows) {
            const thickChar = renderer.getCharByIntensity(intensity * (1 - thickness * 0.3));
            renderer.setPixel(grid, x, thickY, thickChar);
          }
        }
      }
    }
  }
  return renderer.gridToString(grid);
}
function particles({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();

  // Update existing particles
  for (let i = visualizationState.particles.length - 1; i >= 0; i--) {
    const particle = visualizationState.particles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.02;
    if (particle.life <= 0 || particle.x < 0 || particle.x >= cols || particle.y < 0 || particle.y >= rows) {
      visualizationState.particles.splice(i, 1);
    } else {
      const char = renderer.getCharByIntensity(particle.life * particle.intensity, true);
      renderer.setPixel(grid, Math.floor(particle.x), Math.floor(particle.y), char);
    }
  }

  // Create new particles based on audio
  for (let i = 0; i < frequencyData.length; i += 4) {
    const intensity = frequencyData[i] / 255;
    if (intensity > 0.3 && Math.random() < intensity) {
      const x = i / frequencyData.length * cols;
      const y = rows / 2;
      visualizationState.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * intensity * 2,
        vy: (Math.random() - 0.5) * intensity * 2,
        life: 1.0,
        intensity: intensity
      });
    }
  }
  return renderer.gridToString(grid);
}
function explosion({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  const centerX = cols / 2;
  const centerY = rows / 2;

  // Update existing explosion particles
  for (let i = visualizationState.explosionParticles.length - 1; i >= 0; i--) {
    const particle = visualizationState.explosionParticles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.05;
    particle.vy += 0.1; // Gravity

    if (particle.life <= 0) {
      visualizationState.explosionParticles.splice(i, 1);
    } else {
      const char = particle.life > 0.5 ? renderer.getExplosionChar() : renderer.getCharByIntensity(particle.life);
      renderer.setPixel(grid, Math.floor(particle.x), Math.floor(particle.y), char);
    }
  }

  // Create new explosions based on audio intensity
  if (audioIntensity > 0.7 && Math.random() < audioIntensity) {
    const explosionX = centerX + (Math.random() - 0.5) * cols * 0.6;
    const explosionY = centerY + (Math.random() - 0.5) * rows * 0.6;
    for (let i = 0; i < 20; i++) {
      const angle = Math.PI * 2 * i / 20;
      const speed = Math.random() * 3 + 1;
      visualizationState.explosionParticles.push({
        x: explosionX,
        y: explosionY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0
      });
    }
  }
  return renderer.gridToString(grid);
}
function spiral({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  const centerX = cols / 2;
  const centerY = rows / 2;
  const maxRadius = Math.min(cols, rows) / 2;
  for (let i = 0; i < frequencyData.length; i++) {
    const intensity = frequencyData[i] / 255;
    const angle = i / frequencyData.length * Math.PI * 8 + time;
    const radius = i / frequencyData.length * maxRadius;
    const x = Math.floor(centerX + Math.cos(angle) * radius);
    const y = Math.floor(centerY + Math.sin(angle) * radius * 0.5);
    const char = renderer.getCharByIntensity(intensity, true);
    renderer.setPixel(grid, x, y, char);

    // Add trailing effect
    for (let trail = 1; trail < 4; trail++) {
      const trailAngle = angle - trail * 0.1;
      const trailX = Math.floor(centerX + Math.cos(trailAngle) * radius);
      const trailY = Math.floor(centerY + Math.sin(trailAngle) * radius * 0.5);
      const trailChar = renderer.getCharByIntensity(intensity * (1 - trail * 0.2));
      renderer.setPixel(grid, trailX, trailY, trailChar);
    }
  }
  return renderer.gridToString(grid);
}
function dna({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  const centerX = cols / 2;
  const helixHeight = rows;
  const helixRadius = Math.min(cols, rows) / 8;
  for (let y = 0; y < helixHeight; y++) {
    const progress = y / helixHeight;
    const freqIndex = Math.floor(progress * frequencyData.length);
    const intensity = frequencyData[freqIndex] / 255;
    const angle1 = progress * Math.PI * 6 + time;
    const angle2 = angle1 + Math.PI;
    const x1 = Math.floor(centerX + Math.cos(angle1) * helixRadius * (1 + intensity));
    const x2 = Math.floor(centerX + Math.cos(angle2) * helixRadius * (1 + intensity));
    const char = renderer.getCharByIntensity(intensity, true);
    renderer.setPixel(grid, x1, y, char);
    renderer.setPixel(grid, x2, y, char);

    // Connect strands occasionally
    if (y % 4 === 0 && intensity > 0.3) {
      renderer.drawLine(grid, x1, y, x2, y, renderer.getCharByIntensity(intensity * 0.5));
    }
  }
  return renderer.gridToString(grid);
}
function fractal({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  const centerX = cols / 2;
  const centerY = rows;
  function drawBranch(x, y, angle, length, depth, intensity) {
    if (depth <= 0 || length < 2) {
      return;
    }
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    renderer.drawLine(grid, Math.floor(x), Math.floor(y), Math.floor(endX), Math.floor(endY), renderer.getCharByIntensity(intensity * (depth / 6), true));
    const newLength = length * (0.7 + intensity * 0.2);
    const newIntensity = intensity * 0.8;
    drawBranch(endX, endY, angle - 0.5 - intensity * 0.3, newLength, depth - 1, newIntensity);
    drawBranch(endX, endY, angle + 0.5 + intensity * 0.3, newLength, depth - 1, newIntensity);
  }
  const baseLength = Math.min(cols, rows) / 4;
  drawBranch(centerX, centerY, -Math.PI / 2, baseLength, 6, audioIntensity);
  return renderer.gridToString(grid);
}
function starfield({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();

  // Initialize stars if needed
  if (visualizationState.stars.length === 0) {
    initializeState(dimensions);
  }
  const centerX = cols / 2;
  const centerY = rows / 2;
  const warpSpeed = 1 + audioIntensity * 5;

  // Update and draw stars
  for (let i = 0; i < visualizationState.stars.length; i++) {
    const star = visualizationState.stars[i];
    star.z -= star.speed * warpSpeed;
    if (star.z <= 0) {
      star.x = Math.random() * cols;
      star.y = Math.random() * rows;
      star.z = 100;
      star.speed = Math.random() * 2 + 0.5;
    }
    const screenX = Math.floor((star.x - centerX) * (100 / star.z) + centerX);
    const screenY = Math.floor((star.y - centerY) * (100 / star.z) + centerY);
    if (screenX >= 0 && screenX < cols && screenY >= 0 && screenY < rows) {
      const intensity = Math.min(1, (100 - star.z) / 100);
      const char = intensity > 0.8 ? '★' : renderer.getCharByIntensity(intensity, true);
      renderer.setPixel(grid, screenX, screenY, char, true);
    }
  }
  return renderer.gridToString(grid);
}

// Export all basic visualizations
const basicVisualizations = {
  bars,
  circle,
  matrix,
  wave,
  particles,
  explosion,
  spiral,
  dna,
  fractal,
  starfield
};

// Advanced visualization state
const advancedState = {
  nebulaClouds: [],
  lavaBlobs: [],
  waveOffsets: [],
  circuitPulses: [],
  circuitGrid: null,
  tornadoDebris: [],
  cellGrid: null,
  cellGeneration: 0,
  fireParticles: [],
  quantumParticles: [],
  quantumWaves: [],
  entangledPairs: [],
  webNodes: [],
  webConnections: [],
  spiders: [],
  dewdrops: [],
  neutrons: [],
  atoms: [],
  controlRods: 0.5,
  reactorTemp: 0,
  accretionParticles: [],
  hawkingParticles: [],
  blackHoleMass: 1,
  neurons: [],
  synapses: [],
  thoughts: [],
  brainWaves: [],
  crystals: [],
  lightBeams: [],
  crystalResonance: [],
  initialized: false
};
function initializeAdvancedState(dimensions) {
  const {
    cols,
    rows
  } = dimensions;

  // Initialize nebula clouds
  advancedState.nebulaClouds = [];
  for (let i = 0; i < 5; i++) {
    advancedState.nebulaClouds.push({
      x: Math.random() * cols,
      y: Math.random() * rows,
      size: 20 + Math.random() * 30,
      density: Math.random(),
      rotation: Math.random() * Math.PI * 2,
      color: Math.random()
    });
  }

  // Initialize lava blobs
  advancedState.lavaBlobs = [];
  for (let i = 0; i < 8; i++) {
    advancedState.lavaBlobs.push({
      x: Math.random() * cols,
      y: rows - Math.random() * rows / 2,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.5 - 0.5,
      size: 10 + Math.random() * 20,
      heat: Math.random()
    });
  }

  // Initialize wave offsets
  advancedState.waveOffsets = [];
  for (let i = 0; i < 5; i++) {
    advancedState.waveOffsets.push(Math.random() * Math.PI * 2);
  }

  // Initialize circuit grid
  advancedState.circuitGrid = Array(rows).fill(null).map(() => Array(cols).fill(null).map(() => ({
    type: Math.random() < 0.1 ? Math.random() < 0.5 ? 'node' : 'resistor' : null,
    charge: 0,
    connections: []
  })));

  // Initialize cellular automata
  advancedState.cellGrid = Array(rows).fill(null).map(() => Array(cols).fill(false).map(() => Math.random() < 0.3));

  // Initialize quantum particles
  advancedState.quantumParticles = [];
  for (let i = 0; i < 50; i++) {
    advancedState.quantumParticles.push({
      x: Math.random() * cols,
      y: Math.random() * rows,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      phase: Math.random() * Math.PI * 2,
      spin: Math.random() < 0.5 ? 0.5 : -0.5,
      entangled: -1
    });
  }

  // Initialize web nodes
  advancedState.webNodes = [];
  for (let i = 0; i < 12; i++) {
    advancedState.webNodes.push({
      x: Math.random() * cols,
      y: Math.random() * rows,
      connections: [],
      vibration: 0
    });
  }

  // Initialize crystals
  advancedState.crystals = [];
  for (let i = 0; i < 8; i++) {
    advancedState.crystals.push({
      x: Math.random() * cols,
      y: Math.random() * rows,
      size: 5 + Math.random() * 15,
      resonance: Math.random(),
      growth: 0
    });
  }
  advancedState.initialized = true;
}
function nebula({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  if (!advancedState.initialized) {
    initializeAdvancedState(dimensions);
  }

  // Update nebula clouds
  advancedState.nebulaClouds.forEach(cloud => {
    cloud.rotation += audioIntensity * 0.1;
    cloud.density = Math.sin(time + cloud.color * Math.PI * 2) * 0.5 + 0.5;

    // Draw nebula cloud
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      for (let radius = 0; radius < cloud.size; radius += 2) {
        const x = Math.floor(cloud.x + Math.cos(angle + cloud.rotation) * radius);
        const y = Math.floor(cloud.y + Math.sin(angle + cloud.rotation) * radius * 0.6);
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
          const intensity = (1 - radius / cloud.size) * cloud.density * audioIntensity;
          if (intensity > 0.1) {
            const char = renderer.getCharByIntensity(intensity);
            renderer.setPixel(grid, x, y, char);
          }
        }
      }
    }
  });

  // Add cosmic dust
  if (audioIntensity > 0.5) {
    renderer.addNoise(grid, audioIntensity * 0.05, '·');
  }
  return renderer.gridToString(grid);
}
function lava({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  if (!advancedState.initialized) {
    initializeAdvancedState(dimensions);
  }

  // Update lava blobs
  advancedState.lavaBlobs.forEach(blob => {
    blob.x += blob.vx;
    blob.y += blob.vy;
    blob.vy += 0.02; // Gravity
    blob.heat = Math.sin(time * 2 + blob.x * 0.1) * 0.5 + 0.5;

    // Bounce off walls
    if (blob.x <= 0 || blob.x >= cols) {
      blob.vx *= -0.8;
    }
    if (blob.y >= rows) {
      blob.vy *= -0.6;
      blob.y = rows - 1;
    }

    // Draw blob
    for (let dy = -blob.size; dy < blob.size; dy++) {
      for (let dx = -blob.size; dx < blob.size; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < blob.size) {
          const x = Math.floor(blob.x + dx);
          const y = Math.floor(blob.y + dy);
          const intensity = (1 - dist / blob.size) * blob.heat * audioIntensity;
          if (intensity > 0.1) {
            const char = intensity > 0.7 ? '█' : renderer.getCharByIntensity(intensity, true);
            renderer.setPixel(grid, x, y, char);
          }
        }
      }
    }
  });
  return renderer.gridToString(grid);
}
function ocean({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  if (!advancedState.initialized) {
    initializeAdvancedState(dimensions);
  }

  // Update wave offsets
  advancedState.waveOffsets.forEach((offset, i) => {
    advancedState.waveOffsets[i] += (i + 1) * 0.1 * (1 + audioIntensity);
  });

  // Draw multiple wave layers
  for (let y = 0; y < rows; y++) {
    const waveBase = rows * 0.7; // Sea level
    let waveHeight = 0;

    // Combine multiple wave frequencies
    for (let w = 0; w < advancedState.waveOffsets.length; w++) {
      const waveFreq = (w + 1) * 0.02;
      const waveAmp = (5 - w) * audioIntensity * 3;
      waveHeight += Math.sin(y * waveFreq + advancedState.waveOffsets[w]) * waveAmp;
    }
    const actualWaveHeight = waveBase + waveHeight;
    for (let x = 0; x < cols; x++) {
      const freqIndex = Math.floor(x / cols * frequencyData.length);
      const localIntensity = frequencyData[freqIndex] / 255;
      if (y > actualWaveHeight) {
        // Underwater
        const depth = (y - actualWaveHeight) / (rows - actualWaveHeight);
        const char = renderer.getCharByIntensity(Math.max(0, 1 - depth * 2) * localIntensity);
        renderer.setPixel(grid, x, y, char);
      } else if (Math.abs(y - actualWaveHeight) < 2) {
        // Wave surface
        const surfaceChar = localIntensity > 0.7 ? '~' : renderer.getCharByIntensity(localIntensity, true);
        renderer.setPixel(grid, x, y, surfaceChar);
      }
    }
  }
  return renderer.gridToString(grid);
}
function circuit({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  if (!advancedState.initialized) {
    initializeAdvancedState(dimensions);
  }

  // Update circuit charges based on audio
  for (let y = 0; y < rows; y += 3) {
    for (let x = 0; x < cols; x += 4) {
      const freqIndex = Math.floor((x + y) / (cols + rows) * frequencyData.length);
      const intensity = frequencyData[freqIndex] / 255;
      if (advancedState.circuitGrid[y] && advancedState.circuitGrid[y][x]) {
        advancedState.circuitGrid[y][x].charge = intensity;
      }
    }
  }

  // Draw circuit elements
  for (let y = 0; y < rows; y += 3) {
    for (let x = 0; x < cols; x += 4) {
      if (advancedState.circuitGrid[y] && advancedState.circuitGrid[y][x] && advancedState.circuitGrid[y][x].type) {
        const element = advancedState.circuitGrid[y][x];
        const intensity = element.charge;
        if (element.type === 'node') {
          const char = intensity > 0.5 ? '●' : '○';
          renderer.setPixel(grid, x, y, char);

          // Draw connections
          if (x + 4 < cols && advancedState.circuitGrid[y][x + 4] && advancedState.circuitGrid[y][x + 4].type) {
            const connectionChar = intensity > 0.3 ? '━' : '─';
            renderer.setPixel(grid, x + 1, y, connectionChar);
            renderer.setPixel(grid, x + 2, y, connectionChar);
            renderer.setPixel(grid, x + 3, y, connectionChar);
          }
          if (y + 3 < rows && advancedState.circuitGrid[y + 3][x] && advancedState.circuitGrid[y + 3][x].type) {
            const connectionChar = intensity > 0.3 ? '┃' : '│';
            renderer.setPixel(grid, x, y + 1, connectionChar);
            renderer.setPixel(grid, x, y + 2, connectionChar);
          }
        }
      }
    }
  }
  return renderer.gridToString(grid);
}
function quantum({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  if (!advancedState.initialized) {
    initializeAdvancedState(dimensions);
  }

  // Update quantum particles
  advancedState.quantumParticles.forEach((particle, i) => {
    // Quantum tunneling effect
    if (Math.random() < audioIntensity * 0.1) {
      particle.x = Math.random() * cols;
      particle.y = Math.random() * rows;
    }

    // Normal movement with uncertainty
    particle.x += particle.vx + (Math.random() - 0.5) * audioIntensity;
    particle.y += particle.vy + (Math.random() - 0.5) * audioIntensity;
    particle.phase += particle.spin;

    // Wrap around
    if (particle.x < 0) {
      particle.x = cols - 1;
    }
    if (particle.x >= cols) {
      particle.x = 0;
    }
    if (particle.y < 0) {
      particle.y = rows - 1;
    }
    if (particle.y >= rows) {
      particle.y = 0;
    }

    // Wave function visualization
    const waveIntensity = Math.abs(Math.sin(particle.phase)) * audioIntensity;
    const char = waveIntensity > 0.7 ? '⚛' : renderer.getCharByIntensity(waveIntensity, true);
    renderer.setPixel(grid, Math.floor(particle.x), Math.floor(particle.y), char);

    // Probability cloud
    for (let j = 0; j < 3; j++) {
      const cloudX = Math.floor(particle.x + (Math.random() - 0.5) * 4);
      const cloudY = Math.floor(particle.y + (Math.random() - 0.5) * 4);
      const cloudIntensity = waveIntensity * (1 - j * 0.3);
      if (cloudIntensity > 0.2) {
        renderer.setPixel(grid, cloudX, cloudY, renderer.getCharByIntensity(cloudIntensity * 0.5));
      }
    }
  });
  return renderer.gridToString(grid);
}
function crystal({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const grid = renderer.createGrid();
  if (!advancedState.initialized) {
    initializeAdvancedState(dimensions);
  }

  // Update crystal resonance
  advancedState.crystals.forEach(crystal => {
    crystal.resonance = Math.sin(time * 3 + crystal.x * 0.1) * 0.5 + 0.5;
    crystal.growth = audioIntensity * crystal.resonance;
    const effectiveSize = crystal.size * (1 + crystal.growth);

    // Draw crystal structure
    const faces = 6;
    for (let face = 0; face < faces; face++) {
      const angle = face / faces * Math.PI * 2;
      const x1 = Math.floor(crystal.x + Math.cos(angle) * effectiveSize);
      const y1 = Math.floor(crystal.y + Math.sin(angle) * effectiveSize * 0.6);
      const x2 = Math.floor(crystal.x + Math.cos(angle + Math.PI * 2 / faces) * effectiveSize);
      const y2 = Math.floor(crystal.y + Math.sin(angle + Math.PI * 2 / faces) * effectiveSize * 0.6);
      const intensity = crystal.resonance * audioIntensity;
      const char = intensity > 0.7 ? '◆' : renderer.getCharByIntensity(intensity, true);
      renderer.drawLine(grid, x1, y1, x2, y2, char);
    }

    // Crystal center
    const centerChar = crystal.growth > 0.8 ? '✦' : '◇';
    renderer.setPixel(grid, Math.floor(crystal.x), Math.floor(crystal.y), centerChar);

    // Light beams when resonating
    if (crystal.resonance > 0.8 && audioIntensity > 0.6) {
      for (let beam = 0; beam < 4; beam++) {
        const beamAngle = beam * Math.PI / 2 + time;
        const beamLength = effectiveSize * 2;
        for (let r = 0; r < beamLength; r++) {
          const bx = Math.floor(crystal.x + Math.cos(beamAngle) * r);
          const by = Math.floor(crystal.y + Math.sin(beamAngle) * r);
          const beamIntensity = (1 - r / beamLength) * crystal.resonance;
          if (beamIntensity > 0.3) {
            renderer.setPixel(grid, bx, by, renderer.getCharByIntensity(beamIntensity));
          }
        }
      }
    }
  });
  return renderer.gridToString(grid);
}

// Export all advanced visualizations
const advancedVisualizations = {
  nebula,
  lava,
  ocean,
  circuit,
  quantum,
  crystal
};

// Extreme visualization state
const extremeState = {
  glitchBuffer: [],
  voidTentacles: [],
  hypercubeVertices: [],
  asciiFractal: [],
  datamoshFrames: [],
  textParticles: [],
  codeRain: [],
  geometricMandala: [],
  audioWorms: [],
  pixelSorting: [],
  mandalaRotation: 0,
  initialized: false
};
function initializeExtremeState(dimensions) {
  const {
    cols,
    rows
  } = dimensions;

  // Initialize hypercube vertices (4D)
  extremeState.hypercubeVertices = [];
  for (let i = 0; i < 16; i++) {
    extremeState.hypercubeVertices.push({
      x: (i & 1) * 2 - 1,
      y: (i >> 1 & 1) * 2 - 1,
      z: (i >> 2 & 1) * 2 - 1,
      w: (i >> 3 & 1) * 2 - 1
    });
  }

  // Initialize void tentacles
  extremeState.voidTentacles = [];
  for (let i = 0; i < 8; i++) {
    const tentacle = [];
    for (let segment = 0; segment < 20; segment++) {
      tentacle.push({
        x: cols / 2,
        y: rows / 2,
        vx: 0,
        vy: 0,
        angle: i / 8 * Math.PI * 2
      });
    }
    extremeState.voidTentacles.push(tentacle);
  }

  // Initialize code rain
  extremeState.codeRain = [];
  for (let i = 0; i < cols; i++) {
    extremeState.codeRain[i] = {
      y: Math.random() * rows,
      speed: 0.5 + Math.random() * 2,
      chars: []
    };
  }

  // Initialize audio worms
  extremeState.audioWorms = [];
  for (let i = 0; i < 5; i++) {
    const worm = [];
    for (let segment = 0; segment < 30; segment++) {
      worm.push({
        x: cols / 2,
        y: rows / 2,
        intensity: 0
      });
    }
    extremeState.audioWorms.push(worm);
  }

  // Initialize text explosion particles
  extremeState.textParticles = [];
  extremeState.initialized = true;
}
function glitch({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  if (!extremeState.initialized) {
    initializeExtremeState(dimensions);
  }
  for (let i = 0; i < 32; i++) {
    const dataIndex = Math.floor(i * frequencyData.length / 32);
    const barHeight = Math.floor(frequencyData[dataIndex] / 255 * rows);
    const intensity = frequencyData[dataIndex] / 255;
    const x = i * Math.floor(cols / 32);
    for (let y = 0; y < barHeight; y++) {
      const yPos = rows - 1 - y;
      const char = renderer.getCharByIntensity(intensity, true);
      renderer.setPixel(grid, x, yPos, char);
    }
  }

  // Apply glitch effects
  if (audioIntensity > 0.6) {
    // Horizontal shifts
    for (let y = 0; y < rows; y++) {
      if (Math.random() < audioIntensity * 0.3) {
        const shift = Math.floor((Math.random() - 0.5) * cols * audioIntensity * 0.2);
        const originalRow = [...grid[y]];
        for (let x = 0; x < cols; x++) {
          const srcX = (x - shift + cols) % cols;
          grid[y][x] = originalRow[srcX];
        }
      }
    }

    // Character corruption
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (Math.random() < audioIntensity * 0.1) {
          const glitchChars = '!@#$%^&*(){}[]|\\:";\'<>?,./`~';
          grid[y][x] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }
      }
    }

    // Digital noise
    renderer.addNoise(grid, audioIntensity * 0.15, null);
  }
  return renderer.gridToString(grid);
}
function voidTentacles({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  if (!extremeState.initialized) {
    initializeExtremeState(dimensions);
  }
  const centerX = cols / 2;
  const centerY = rows / 2;

  // Update tentacles
  extremeState.voidTentacles.forEach((tentacle, tentacleIndex) => {
    const baseAngle = tentacleIndex / extremeState.voidTentacles.length * Math.PI * 2 + time * 0.5;

    // Update each segment
    for (let i = 0; i < tentacle.length; i++) {
      const segment = tentacle[i];
      const freqIndex = Math.floor(i / tentacle.length * frequencyData.length);
      const intensity = frequencyData[freqIndex] / 255;
      if (i === 0) {
        // Head follows center with audio influence
        segment.x = centerX + Math.cos(baseAngle) * 20 * intensity;
        segment.y = centerY + Math.sin(baseAngle) * 20 * intensity;
      } else {
        // Each segment follows the previous one
        const prevSegment = tentacle[i - 1];
        const angle = Math.atan2(prevSegment.y - segment.y, prevSegment.x - segment.x);
        const distance = 2 + intensity * 3;
        segment.x += (prevSegment.x - Math.cos(angle) * distance - segment.x) * 0.3;
        segment.y += (prevSegment.y - Math.sin(angle) * distance - segment.y) * 0.3;
      }

      // Draw segment
      const segmentIntensity = intensity * (1 - i / tentacle.length);
      const char = segmentIntensity > 0.7 ? '▓' : renderer.getCharByIntensity(segmentIntensity, true);
      renderer.setPixel(grid, Math.floor(segment.x), Math.floor(segment.y), char);

      // Add void aura
      if (segmentIntensity > 0.5) {
        for (let aura = 0; aura < 3; aura++) {
          const auraX = Math.floor(segment.x + (Math.random() - 0.5) * 6);
          const auraY = Math.floor(segment.y + (Math.random() - 0.5) * 6);
          const auraChar = renderer.getCharByIntensity(segmentIntensity * (1 - aura * 0.3) * 0.5);
          renderer.setPixel(grid, auraX, auraY, auraChar);
        }
      }
    }
  });
  return renderer.gridToString(grid);
}
function hypercube({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  if (!extremeState.initialized) {
    initializeExtremeState(dimensions);
  }
  const centerX = cols / 2;
  const centerY = rows / 2;
  const scale = Math.min(cols, rows) / 8;

  // 4D rotation matrices
  function rotateXW(vertex, angle) {
    const cos_a = Math.cos(angle);
    const sin_a = Math.sin(angle);
    return {
      x: vertex.x * cos_a - vertex.w * sin_a,
      y: vertex.y,
      z: vertex.z,
      w: vertex.x * sin_a + vertex.w * cos_a
    };
  }
  function rotateYZ(vertex, angle) {
    const cos_a = Math.cos(angle);
    const sin_a = Math.sin(angle);
    return {
      x: vertex.x,
      y: vertex.y * cos_a - vertex.z * sin_a,
      z: vertex.y * sin_a + vertex.z * cos_a,
      w: vertex.w
    };
  }

  // Project 4D to 3D to 2D
  function project4Dto2D(vertex) {
    // 4D to 3D projection
    const w_offset = 3; // Perspective distance for 4D
    const projected3D = {
      x: vertex.x / (w_offset - vertex.w),
      y: vertex.y / (w_offset - vertex.w),
      z: vertex.z / (w_offset - vertex.w)
    };

    // 3D to 2D projection
    const z_offset = 5; // Perspective distance for 3D
    return {
      x: centerX + projected3D.x * scale / (z_offset - projected3D.z),
      y: centerY + projected3D.y * scale / (z_offset - projected3D.z),
      intensity: Math.max(0, 1 - Math.abs(projected3D.z) / 3)
    };
  }

  // Rotate and project vertices
  const projectedVertices = extremeState.hypercubeVertices.map(vertex => {
    let rotated = rotateXW(vertex, time * audioIntensity);
    rotated = rotateYZ(rotated, time * 0.7 * audioIntensity);
    return project4Dto2D(rotated);
  });

  // Draw hypercube edges
  const edges = [[0, 1], [1, 3], [3, 2], [2, 0],
  // Bottom face
  [4, 5], [5, 7], [7, 6], [6, 4],
  // Top face
  [0, 4], [1, 5], [2, 6], [3, 7],
  // Vertical edges
  [8, 9], [9, 11], [11, 10], [10, 8],
  // Inner bottom face
  [12, 13], [13, 15], [15, 14], [14, 12],
  // Inner top face
  [8, 12], [9, 13], [10, 14], [11, 15],
  // Inner vertical edges
  [0, 8], [1, 9], [2, 10], [3, 11],
  // Connect to inner bottom
  [4, 12], [5, 13], [6, 14], [7, 15] // Connect to inner top
  ];
  edges.forEach(([start, end]) => {
    const startPoint = projectedVertices[start];
    const endPoint = projectedVertices[end];
    if (startPoint && endPoint) {
      const avgIntensity = (startPoint.intensity + endPoint.intensity) / 2;
      const char = avgIntensity > 0.5 ? '═' : renderer.getCharByIntensity(avgIntensity * audioIntensity, true);
      renderer.drawLine(grid, Math.floor(startPoint.x), Math.floor(startPoint.y), Math.floor(endPoint.x), Math.floor(endPoint.y), char);
    }
  });

  // Draw vertices
  projectedVertices.forEach((point, index) => {
    if (point) {
      const char = point.intensity > 0.7 ? '●' : '○';
      renderer.setPixel(grid, Math.floor(point.x), Math.floor(point.y), char);
    }
  });
  return renderer.gridToString(grid);
}
function coderain({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  if (!extremeState.initialized) {
    initializeExtremeState(dimensions);
  }
  const codeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789{}[]()<>+=*/-_|\\:;.,?!@#$%^&';
  const keywords = ['function', 'return', 'if', 'else', 'for', 'while', 'class', 'const', 'let', 'var', 'async', 'await'];

  // Update code rain
  extremeState.codeRain.forEach((column, colIndex) => {
    const freqIndex = Math.floor(colIndex / cols * frequencyData.length);
    const intensity = frequencyData[freqIndex] / 255;
    column.speed = 0.5 + intensity * 3;
    column.y += column.speed;

    // Add new characters
    if (Math.random() < intensity) {
      if (Math.random() < 0.1) {
        // Add keyword
        const keyword = keywords[Math.floor(Math.random() * keywords.length)];
        column.chars.push({
          char: keyword,
          y: column.y,
          intensity: intensity,
          isKeyword: true
        });
      } else {
        // Add single character
        column.chars.push({
          char: codeChars[Math.floor(Math.random() * codeChars.length)],
          y: column.y,
          intensity: intensity,
          isKeyword: false
        });
      }
    }

    // Update and draw characters
    for (let i = column.chars.length - 1; i >= 0; i--) {
      const charObj = column.chars[i];
      charObj.y += column.speed;

      // Remove off-screen characters
      if (charObj.y > rows + 5) {
        column.chars.splice(i, 1);
        continue;
      }

      // Draw character
      if (charObj.isKeyword) {
        // Draw keyword
        for (let k = 0; k < charObj.char.length; k++) {
          const x = colIndex + k;
          if (x < cols) {
            const char = charObj.intensity > 0.7 ? charObj.char[k] : charObj.char[k].toLowerCase();
            renderer.setPixel(grid, x, Math.floor(charObj.y), char);
          }
        }
      } else {
        // Draw single character
        const char = charObj.intensity > 0.7 ? charObj.char : renderer.getCharByIntensity(charObj.intensity, true);
        renderer.setPixel(grid, colIndex, Math.floor(charObj.y), char);
      }
    }

    // Reset column position
    if (column.y > rows + 20) {
      column.y = -Math.random() * 50;
    }
  });
  return renderer.gridToString(grid);
}
function audioworms({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  if (!extremeState.initialized) {
    initializeExtremeState(dimensions);
  }

  // Update audio worms
  extremeState.audioWorms.forEach((worm, wormIndex) => {
    const baseFreqIndex = Math.floor(wormIndex / extremeState.audioWorms.length * frequencyData.length);

    // Move head based on audio
    const head = worm[0];
    const headIntensity = frequencyData[baseFreqIndex] / 255;
    head.x += Math.cos(time + wormIndex) * headIntensity * 3;
    head.y += Math.sin(time * 0.7 + wormIndex) * headIntensity * 2;
    head.intensity = headIntensity;

    // Keep head on screen
    head.x = Math.max(0, Math.min(cols - 1, head.x));
    head.y = Math.max(0, Math.min(rows - 1, head.y));

    // Update body segments
    for (let i = 1; i < worm.length; i++) {
      const segment = worm[i];
      const prevSegment = worm[i - 1];

      // Follow previous segment
      const dx = prevSegment.x - segment.x;
      const dy = prevSegment.y - segment.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 2) {
        segment.x += dx / distance * 0.8;
        segment.y += dy / distance * 0.8;
      }
      segment.intensity = prevSegment.intensity * 0.9;
    }

    // Draw worm
    worm.forEach((segment, segmentIndex) => {
      const segmentChar = segment.intensity > 0.6 ? '●' : renderer.getCharByIntensity(segment.intensity, true);
      renderer.setPixel(grid, Math.floor(segment.x), Math.floor(segment.y), segmentChar);

      // Add trail effect
      if (segment.intensity > 0.3) {
        for (let trail = 0; trail < 2; trail++) {
          const trailX = Math.floor(segment.x + (Math.random() - 0.5) * 3);
          const trailY = Math.floor(segment.y + (Math.random() - 0.5) * 3);
          const trailChar = renderer.getCharByIntensity(segment.intensity * (1 - trail * 0.4) * 0.5);
          renderer.setPixel(grid, trailX, trailY, trailChar);
        }
      }
    });
  });
  return renderer.gridToString(grid);
}
function textexplosion({
  frequencyData,
  audioIntensity,
  time,
  dimensions
}) {
  const renderer = new ASCIIRenderer(dimensions);
  const {
    cols,
    rows
  } = dimensions;
  const grid = renderer.createGrid();
  if (!extremeState.initialized) {
    initializeExtremeState(dimensions);
  }
  const words = ['BOOM', 'CRASH', 'BANG', 'POW', 'KABOOM', 'SMASH', 'WHAM', 'ZAP', 'BLAST'];
  const centerX = cols / 2;
  const centerY = rows / 2;

  // Create new explosions based on audio intensity
  if (audioIntensity > 0.7 && Math.random() < audioIntensity) {
    const word = words[Math.floor(Math.random() * words.length)];
    for (let i = 0; i < word.length; i++) {
      extremeState.textParticles.push({
        char: word[i],
        x: centerX - word.length / 2 + i,
        y: centerY,
        vx: (Math.random() - 0.5) * 8 * audioIntensity,
        vy: (Math.random() - 0.5) * 8 * audioIntensity,
        life: 1.0,
        spin: (Math.random() - 0.5) * 0.4
      });
    }
  }

  // Update and draw text particles
  for (let i = extremeState.textParticles.length - 1; i >= 0; i--) {
    const particle = extremeState.textParticles[i];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.98; // Friction
    particle.vy *= 0.98;
    particle.life -= 0.02;

    // Remove dead particles
    if (particle.life <= 0 || particle.x < 0 || particle.x >= cols || particle.y < 0 || particle.y >= rows) {
      extremeState.textParticles.splice(i, 1);
      continue;
    }

    // Draw particle
    const char = particle.life > 0.5 ? particle.char : renderer.getCharByIntensity(particle.life, true);
    renderer.setPixel(grid, Math.floor(particle.x), Math.floor(particle.y), char);

    // Add explosion trails
    if (particle.life > 0.7) {
      for (let trail = 1; trail <= 3; trail++) {
        const trailX = Math.floor(particle.x - particle.vx * trail * 0.3);
        const trailY = Math.floor(particle.y - particle.vy * trail * 0.3);
        const trailIntensity = particle.life * (1 - trail * 0.2);
        const trailChar = renderer.getCharByIntensity(trailIntensity);
        renderer.setPixel(grid, trailX, trailY, trailChar);
      }
    }
  }
  return renderer.gridToString(grid);
}

// Export all extreme visualizations
const extremeVisualizations = {
  glitch,
  void: voidTentacles,
  hypercube,
  coderain,
  audioworms,
  textexplosion
};

class VisualizationRegistry {
  constructor() {
    this.modes = new Map();
    this.categories = new Map();
    this.colorHandler = new ColorHandler();

    // Register all visualizations
    this.registerCategory('basic', basicVisualizations);
    this.registerCategory('advanced', advancedVisualizations);
    this.registerCategory('extreme', extremeVisualizations);
  }
  registerCategory(categoryName, visualizations) {
    this.categories.set(categoryName, Object.keys(visualizations));
    Object.entries(visualizations).forEach(([name, func]) => {
      this.modes.set(name, {
        name,
        category: categoryName,
        function: func,
        description: this.getDescription(name, categoryName)
      });
    });
  }
  registerVisualization(name, visualizationFunction, category = 'custom', description = '') {
    this.modes.set(name, {
      name,
      category,
      function: visualizationFunction,
      description
    });
    if (!this.categories.has(category)) {
      this.categories.set(category, []);
    }
    this.categories.get(category).push(name);
  }
  getVisualization(name) {
    return this.modes.get(name);
  }
  getAllModes() {
    return Array.from(this.modes.keys());
  }
  getModesByCategory(category) {
    return this.categories.get(category) || [];
  }
  getCategories() {
    return Array.from(this.categories.keys());
  }
  hasMode(name) {
    return this.modes.has(name);
  }
  executeVisualization(name, params) {
    const visualization = this.modes.get(name);
    if (!visualization) {
      throw new Error(`Visualization mode '${name}' not found`);
    }
    try {
      const result = visualization.function(params);

      // Apply color effects if enabled
      if (params.options && params.options.lolcat) {
        return {
          content: result,
          applyColors: element => {
            this.colorHandler.enable(true);
            this.colorHandler.update(params.time || 0);
            this.colorHandler.applyColors(element, result);
          }
        };
      }
      return result;
    } catch (error) {
      console.error(`Error executing visualization '${name}':`, error);
      return this.getFallbackVisualization(params);
    }
  }
  getFallbackVisualization(params) {
    const {
      dimensions
    } = params;
    const {
      rows,
      cols
    } = dimensions;
    let output = '';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        output += Math.random() < 0.1 ? '░' : ' ';
      }
      output += '\n';
    }
    return output;
  }
  getDescription(name, category) {
    const descriptions = {
      // Basic
      bars: 'Classic frequency bars visualization with sparkle effects',
      circle: 'Circular audio wave with explosion effects for high intensity',
      matrix: 'Matrix rain effect with Japanese characters and glitch effects',
      wave: 'Multi-layered sine wave visualization with frequency modulation',
      particles: 'Dynamic particle system responding to audio frequencies',
      explosion: 'Explosive particle effects triggered by audio intensity',
      spiral: 'Audio-reactive spiral galaxy with trailing effects',
      dna: 'Double helix DNA structure with frequency-based connections',
      fractal: 'Recursive fractal tree growing with audio intensity',
      starfield: 'Starfield warp effect with audio-controlled speed',
      // Advanced
      nebula: 'Cosmic nebula clouds with rotation and density effects',
      lava: 'Lava lamp simulation with heat-based particle physics',
      ocean: 'Multi-layered ocean waves with underwater depth effects',
      circuit: 'Electronic circuit board with pulse propagation',
      quantum: 'Quantum field visualization with particle uncertainty',
      crystal: 'Resonating crystal structures with light beam effects',
      // Extreme
      glitch: 'Digital glitch art with horizontal shifts and corruption',
      void: 'Void tentacles emerging from darkness with aura effects',
      hypercube: '4D hypercube projection with rotation and perspective',
      coderain: 'Programming code rain with syntax highlighting',
      audioworms: 'Audio-reactive worms moving through space with trails',
      textexplosion: 'Explosive text effects with word particles'
    };
    return descriptions[name] || `${category} visualization: ${name}`;
  }
  getVisualizationInfo(name) {
    const viz = this.modes.get(name);
    if (!viz) {
      return null;
    }
    return {
      name: viz.name,
      category: viz.category,
      description: viz.description,
      complexity: this.getComplexity(viz.category),
      features: this.getFeatures(name)
    };
  }
  getComplexity(category) {
    const complexityMap = {
      basic: 'Low - Simple patterns and shapes',
      advanced: 'Medium - Complex physics and multi-layered effects',
      extreme: 'High - Advanced mathematics and intensive calculations',
      custom: 'Variable - Depends on implementation'
    };
    return complexityMap[category] || 'Unknown';
  }
  getFeatures(name) {
    const featureMap = {
      bars: ['Frequency analysis', 'Sparkle effects', 'Intensity scaling'],
      circle: ['Radial patterns', 'Explosion effects', 'Multi-layer rendering'],
      matrix: ['Character animation', 'Trail effects', 'Glitch corruption'],
      wave: ['Multi-frequency waves', 'Amplitude modulation', 'Layer blending'],
      particles: ['Physics simulation', 'Dynamic spawning', 'Life cycle management'],
      explosion: ['Particle systems', 'Gravity effects', 'Blast patterns'],
      spiral: ['Rotational motion', 'Trail effects', 'Radius mapping'],
      dna: ['Helical structures', 'Connection patterns', 'Bio-inspired design'],
      fractal: ['Recursive algorithms', 'Branch generation', 'Growth patterns'],
      starfield: ['3D projection', 'Warp effects', 'Depth perception'],
      nebula: ['Cloud simulation', 'Density mapping', 'Rotation effects'],
      lava: ['Fluid dynamics', 'Heat simulation', 'Particle physics'],
      ocean: ['Wave interference', 'Depth layers', 'Surface effects'],
      circuit: ['Electronic simulation', 'Pulse propagation', 'Grid systems'],
      quantum: ['Uncertainty principle', 'Wave functions', 'Entanglement'],
      crystal: ['Geometric patterns', 'Resonance effects', 'Light refraction'],
      glitch: ['Digital artifacts', 'Memory corruption', 'Data distortion'],
      void: ['Tentacle physics', 'Aura effects', 'Darkness gradients'],
      hypercube: ['4D mathematics', '3D projection', 'Rotation matrices'],
      coderain: ['Syntax highlighting', 'Keyword detection', 'Code streaming'],
      audioworms: ['Organic movement', 'Trail systems', 'Segment physics'],
      textexplosion: ['Text particles', 'Explosion physics', 'Word effects']
    };
    return featureMap[name] || ['Custom implementation'];
  }
  generateModeList() {
    const categories = this.getCategories();
    let output = '';
    categories.forEach(category => {
      output += `\n${category.toUpperCase()} VISUALIZATIONS:\n`;
      output += '='.repeat(category.length + 16) + '\n';
      const modes = this.getModesByCategory(category);
      modes.forEach(mode => {
        const info = this.getVisualizationInfo(mode);
        output += `• ${mode.padEnd(15)} - ${info.description}\n`;
      });
    });
    return output;
  }
}

// Create global registry instance
const visualizationRegistry = new VisualizationRegistry();

// Convenience exports
const getAllVisualizations = () => ({
  ...basicVisualizations,
  ...advancedVisualizations,
  ...extremeVisualizations
});
const getVisualizationByName = name => {
  return visualizationRegistry.getVisualization(name);
};
const executeVisualization = (name, params) => {
  return visualizationRegistry.executeVisualization(name, params);
};

class PerformanceManager {
  constructor() {
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.fps = 60;
    this.frameTimeThreshold = 16.67; // 60fps target
    this.slowFrameCount = 0;
    this.adaptiveQuality = true;
    this.qualityLevel = 1.0;
    this.minQuality = 0.3;
    this.maxQuality = 1.0;
    this.metrics = {
      averageFrameTime: 16.67,
      renderTime: 0,
      audioProcessingTime: 0,
      memoryUsage: 0
    };
  }
  startFrame() {
    this.frameStartTime = performance.now();
    this.frameCount++;
  }
  endFrame() {
    const frameTime = performance.now() - this.frameStartTime;
    this.updateMetrics(frameTime);
    this.adaptQuality(frameTime);
    return this.qualityLevel;
  }
  updateMetrics(frameTime) {
    // Update FPS
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    // Update average frame time (exponential moving average)
    this.metrics.averageFrameTime = this.metrics.averageFrameTime * 0.95 + frameTime * 0.05;

    // Track memory usage periodically
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    }
  }
  adaptQuality(frameTime) {
    if (!this.adaptiveQuality) {
      return;
    }

    // Track slow frames
    if (frameTime > this.frameTimeThreshold * 1.5) {
      this.slowFrameCount++;
    } else {
      this.slowFrameCount = Math.max(0, this.slowFrameCount - 1);
    }

    // Adjust quality based on performance
    if (this.slowFrameCount > 3) {
      // Multiple slow frames - reduce quality
      this.qualityLevel = Math.max(this.minQuality, this.qualityLevel - 0.1);
      this.slowFrameCount = 0;
    } else if (frameTime < this.frameTimeThreshold * 0.8 && this.qualityLevel < this.maxQuality) {
      // Performing well - gradually increase quality
      this.qualityLevel = Math.min(this.maxQuality, this.qualityLevel + 0.02);
    }
  }
  getQualityMultiplier() {
    return this.qualityLevel;
  }
  shouldSkipFrame() {
    // Skip frames if performance is really poor
    return this.qualityLevel < 0.5 && Math.random() < 1 - this.qualityLevel;
  }
  getMetrics() {
    return {
      fps: this.fps,
      qualityLevel: this.qualityLevel,
      averageFrameTime: this.metrics.averageFrameTime,
      memoryUsage: this.metrics.memoryUsage,
      performanceGrade: this.getPerformanceGrade()
    };
  }
  getPerformanceGrade() {
    if (this.fps >= 55) {
      return 'Excellent';
    }
    if (this.fps >= 45) {
      return 'Good';
    }
    if (this.fps >= 30) {
      return 'Fair';
    }
    return 'Poor';
  }
  setAdaptiveQuality(enabled) {
    this.adaptiveQuality = enabled;
    if (!enabled) {
      this.qualityLevel = this.maxQuality;
    }
  }
  reset() {
    this.frameCount = 0;
    this.slowFrameCount = 0;
    this.qualityLevel = this.maxQuality;
    this.lastFpsTime = performance.now();
  }
}
class RenderOptimizer {
  constructor() {
    this.lastRender = '';
    this.renderCache = new Map();
    this.maxCacheSize = 50;
    this.dirtyRegions = [];
    this.useRenderCaching = true;
  }

  // Check if we need to re-render
  shouldRender(newContent, dimensions) {
    if (!this.useRenderCaching) {
      return true;
    }
    const contentHash = this.hashContent(newContent);
    const cacheKey = `${dimensions.cols}x${dimensions.rows}:${contentHash}`;
    if (this.renderCache.has(cacheKey)) {
      return false; // Skip render, use cached version
    }

    // Store in cache
    if (this.renderCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.renderCache.keys().next().value;
      this.renderCache.delete(firstKey);
    }
    this.renderCache.set(cacheKey, true);
    return true;
  }

  // Simple content hashing for render caching
  hashContent(content) {
    if (typeof content !== 'string') {
      return Date.now();
    }
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Optimize character output by reducing redundant operations
  optimizeOutput(content, quality = 1.0) {
    if (quality >= 1.0) {
      return content;
    }

    // Reduce detail based on quality
    const lines = content.split('\n');
    const targetLines = Math.floor(lines.length * quality);
    const step = lines.length / targetLines;
    let optimized = '';
    for (let i = 0; i < targetLines; i++) {
      const lineIndex = Math.floor(i * step);
      if (lines[lineIndex]) {
        // Optionally reduce character density
        let line = lines[lineIndex];
        if (quality < 0.7) {
          line = this.reduceDensity(line, quality);
        }
        optimized += line + '\n';
      }
    }
    return optimized;
  }
  reduceDensity(line, quality) {
    if (quality >= 0.7) {
      return line;
    }
    const chars = line.split('');
    const targetLength = Math.floor(chars.length * quality);
    const step = chars.length / targetLength;
    let reduced = '';
    for (let i = 0; i < targetLength; i++) {
      const charIndex = Math.floor(i * step);
      reduced += chars[charIndex] || ' ';
    }
    return reduced;
  }
  clearCache() {
    this.renderCache.clear();
  }
  setRenderCaching(enabled) {
    this.useRenderCaching = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }
}
const performanceManager = new PerformanceManager();
const renderOptimizer = new RenderOptimizer();

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
    if (width === 0) {
      width = window.innerWidth;
    }
    if (height === 0) {
      height = window.innerHeight;
    }
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
        if (oldDimensions.cols !== this.dimensions.cols || oldDimensions.rows !== this.dimensions.rows) {
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
      this.emit('sourceChange', {
        type,
        info
      });
    });
    this.audioHandler.on('onPlay', () => {
      this.emit('play');
    });
    this.audioHandler.on('onPause', () => {
      this.emit('pause');
    });
    this.audioHandler.on('onError', error => {
      this.emit('error', error);
    });
  }
  setupFileHandling() {
    if (this.options.fileInput !== false) {
      this.fileHandler = new FileHandler({
        dragDropTarget: this.options.fileDropTarget || this.container,
        onFileSelect: async file => {
          try {
            await this.setAudioSource({
              type: AudioSourceTypes.FILE,
              file: file
            });
            this.emit('fileLoaded', {
              file
            });
          } catch (error) {
            this.emit('error', error);
          }
        },
        onFileError: error => {
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
          options: {
            ...this.options,
            quality
          }
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
    let content = typeof output === 'string' ? output : output?.content || '';

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

class AudioSourceManager {
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
    const sourceConfig = createAudioSource(AudioSourceTypes.FILE, {
      file,
      ...options
    });
    sourceConfig.name = options.name || file.name;
    this.addSource(id, sourceConfig);
    return this;
  }
  createStreamSource(id, stream, options = {}) {
    const sourceConfig = createAudioSource(AudioSourceTypes.STREAM, {
      stream,
      ...options
    });
    sourceConfig.name = options.name || 'Audio Stream';
    this.addSource(id, sourceConfig);
    return this;
  }
  createAnalyserSource(id, analyser, options = {}) {
    const sourceConfig = createAudioSource(AudioSourceTypes.ANALYSER, {
      analyser,
      ...options
    });
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
class AudioSourcePresets {
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

class WebAudioGraph {
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
        if (options.type) {
          node.type = options.type;
        }
        if (options.frequency) {
          node.frequency.value = options.frequency;
        }
        if (options.Q) {
          node.Q.value = options.Q;
        }
        break;
      case 'delay':
        node = this.audioContext.createDelay(options.maxDelayTime || 1);
        if (options.delayTime) {
          node.delayTime.value = options.delayTime;
        }
        break;
      case 'compressor':
        node = this.audioContext.createDynamicsCompressor();
        if (options.threshold) {
          node.threshold.value = options.threshold;
        }
        if (options.ratio) {
          node.ratio.value = options.ratio;
        }
        break;
      case 'analyser':
        node = this.audioContext.createAnalyser();
        if (options.fftSize) {
          node.fftSize = options.fftSize;
        }
        if (options.smoothingTimeConstant) {
          node.smoothingTimeConstant = options.smoothingTimeConstant;
        }
        if (options.minDecibels) {
          node.minDecibels = options.minDecibels;
        }
        if (options.maxDecibels) {
          node.maxDecibels = options.maxDecibels;
        }
        break;
      case 'convolver':
        node = this.audioContext.createConvolver();
        if (options.buffer) {
          node.buffer = options.buffer;
        }
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
    this.connections.push({
      fromId,
      toId,
      outputIndex,
      inputIndex
    });
  }
  connectToDestination(nodeId, outputIndex = 0) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error('Node not found');
    }
    node.connect(this.audioContext.destination, outputIndex);
    this.connections.push({
      fromId: nodeId,
      toId: 'destination',
      outputIndex
    });
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
    this.connections = this.connections.filter(conn => conn.fromId !== nodeId || outputIndex !== undefined && conn.outputIndex !== outputIndex);
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
      nodes.push({
        id: nodeId,
        node
      });
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
class AudioStreamProcessor {
  static async createFromMediaDevices(constraints = {
    audio: true
  }) {
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
function createRealtimeAnalyser(audioContext, options = {}) {
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

// Convenience object with all visualizations
const VisualizationModes = getAllVisualizations();

exports.ASCIIRenderer = ASCIIRenderer;
exports.AudioHandler = AudioHandler;
exports.AudioSourceManager = AudioSourceManager;
exports.AudioSourcePresets = AudioSourcePresets;
exports.AudioSourceTypes = AudioSourceTypes;
exports.AudioStreamProcessor = AudioStreamProcessor;
exports.ColorHandler = ColorHandler;
exports.FileHandler = FileHandler;
exports.ParallaxVisualizer = ParallaxVisualizer;
exports.VisualizationModes = VisualizationModes;
exports.VisualizationRegistry = VisualizationRegistry;
exports.WebAudioGraph = WebAudioGraph;
exports.advancedVisualizations = advancedVisualizations;
exports.basicVisualizations = basicVisualizations;
exports.createAudioSource = createAudioSource;
exports.createFileInputButton = createFileInputButton;
exports.createRealtimeAnalyser = createRealtimeAnalyser;
exports.default = ParallaxVisualizer;
exports.executeVisualization = executeVisualization;
exports.extremeVisualizations = extremeVisualizations;
exports.getAllVisualizations = getAllVisualizations;
exports.getVisualizationByName = getVisualizationByName;
exports.validateAudioSource = validateAudioSource;
exports.visualizationRegistry = visualizationRegistry;
//# sourceMappingURL=parallax-visualizer.cjs.cjs.map
