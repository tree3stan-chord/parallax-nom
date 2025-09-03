import { ASCIIRenderer } from '../renderer/ASCIIRenderer.js';

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
    const { cols, rows } = dimensions;
    
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
    advancedState.circuitGrid = Array(rows).fill(null).map(() => 
        Array(cols).fill(null).map(() => ({
            type: Math.random() < 0.1 ? (Math.random() < 0.5 ? 'node' : 'resistor') : null,
            charge: 0,
            connections: []
        }))
    );
    
    // Initialize cellular automata
    advancedState.cellGrid = Array(rows).fill(null).map(() => 
        Array(cols).fill(false).map(() => Math.random() < 0.3)
    );
    
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

function nebula({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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

function lava({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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
        if (blob.x <= 0 || blob.x >= cols) {blob.vx *= -0.8;}
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

function ocean({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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
            const freqIndex = Math.floor((x / cols) * frequencyData.length);
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

function circuit({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
    const grid = renderer.createGrid();
    
    if (!advancedState.initialized) {
        initializeAdvancedState(dimensions);
    }
    
    // Update circuit charges based on audio
    for (let y = 0; y < rows; y += 3) {
        for (let x = 0; x < cols; x += 4) {
            const freqIndex = Math.floor(((x + y) / (cols + rows)) * frequencyData.length);
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

function quantum({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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
        if (particle.x < 0) {particle.x = cols - 1;}
        if (particle.x >= cols) {particle.x = 0;}
        if (particle.y < 0) {particle.y = rows - 1;}
        if (particle.y >= rows) {particle.y = 0;}
        
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

function crystal({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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
            const angle = (face / faces) * Math.PI * 2;
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
export const advancedVisualizations = {
    nebula,
    lava,
    ocean,
    circuit,
    quantum,
    crystal
};

export { advancedState, initializeAdvancedState };
