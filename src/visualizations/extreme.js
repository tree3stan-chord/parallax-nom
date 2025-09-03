import { ASCIIRenderer } from '../renderer/ASCIIRenderer.js';

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
    const { cols, rows } = dimensions;
    
    // Initialize hypercube vertices (4D)
    extremeState.hypercubeVertices = [];
    for (let i = 0; i < 16; i++) {
        extremeState.hypercubeVertices.push({
            x: (i & 1) * 2 - 1,
            y: ((i >> 1) & 1) * 2 - 1,
            z: ((i >> 2) & 1) * 2 - 1,
            w: ((i >> 3) & 1) * 2 - 1
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
                angle: (i / 8) * Math.PI * 2
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

function glitch({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
    const grid = renderer.createGrid();
    
    if (!extremeState.initialized) {
        initializeExtremeState(dimensions);
    }
    
    // Base visualization (bars)
    const barWidth = Math.max(1, Math.floor(cols / 32));
    for (let i = 0; i < 32; i++) {
        const dataIndex = Math.floor(i * frequencyData.length / 32);
        const barHeight = Math.floor((frequencyData[dataIndex] / 255) * rows);
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

function voidTentacles({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
    const grid = renderer.createGrid();
    
    if (!extremeState.initialized) {
        initializeExtremeState(dimensions);
    }
    
    const centerX = cols / 2;
    const centerY = rows / 2;
    
    // Update tentacles
    extremeState.voidTentacles.forEach((tentacle, tentacleIndex) => {
        const baseAngle = (tentacleIndex / extremeState.voidTentacles.length) * Math.PI * 2 + time * 0.5;
        
        // Update each segment
        for (let i = 0; i < tentacle.length; i++) {
            const segment = tentacle[i];
            const freqIndex = Math.floor((i / tentacle.length) * frequencyData.length);
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

function hypercube({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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
            x: centerX + (projected3D.x * scale) / (z_offset - projected3D.z),
            y: centerY + (projected3D.y * scale) / (z_offset - projected3D.z),
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
    const edges = [
        [0,1], [1,3], [3,2], [2,0], // Bottom face
        [4,5], [5,7], [7,6], [6,4], // Top face
        [0,4], [1,5], [2,6], [3,7], // Vertical edges
        [8,9], [9,11], [11,10], [10,8], // Inner bottom face
        [12,13], [13,15], [15,14], [14,12], // Inner top face
        [8,12], [9,13], [10,14], [11,15], // Inner vertical edges
        [0,8], [1,9], [2,10], [3,11], // Connect to inner bottom
        [4,12], [5,13], [6,14], [7,15] // Connect to inner top
    ];
    
    edges.forEach(([start, end]) => {
        const startPoint = projectedVertices[start];
        const endPoint = projectedVertices[end];
        
        if (startPoint && endPoint) {
            const avgIntensity = (startPoint.intensity + endPoint.intensity) / 2;
            const char = avgIntensity > 0.5 ? '═' : renderer.getCharByIntensity(avgIntensity * audioIntensity, true);
            
            renderer.drawLine(grid, 
                Math.floor(startPoint.x), Math.floor(startPoint.y),
                Math.floor(endPoint.x), Math.floor(endPoint.y),
                char
            );
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

function coderain({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
    const grid = renderer.createGrid();
    
    if (!extremeState.initialized) {
        initializeExtremeState(dimensions);
    }
    
    const codeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789{}[]()<>+=*/-_|\\:;.,?!@#$%^&';
    const keywords = ['function', 'return', 'if', 'else', 'for', 'while', 'class', 'const', 'let', 'var', 'async', 'await'];
    
    // Update code rain
    extremeState.codeRain.forEach((column, colIndex) => {
        const freqIndex = Math.floor((colIndex / cols) * frequencyData.length);
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

function audioworms({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
    const grid = renderer.createGrid();
    
    if (!extremeState.initialized) {
        initializeExtremeState(dimensions);
    }
    
    // Update audio worms
    extremeState.audioWorms.forEach((worm, wormIndex) => {
        const baseFreqIndex = Math.floor((wormIndex / extremeState.audioWorms.length) * frequencyData.length);
        
        // Move head based on audio
        const head = worm[0];
        const headIntensity = frequencyData[baseFreqIndex] / 255;
        
        head.x += (Math.cos(time + wormIndex) * headIntensity * 3);
        head.y += (Math.sin(time * 0.7 + wormIndex) * headIntensity * 2);
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
                segment.x += (dx / distance) * 0.8;
                segment.y += (dy / distance) * 0.8;
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

function textexplosion({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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
export const extremeVisualizations = {
    glitch,
    void: voidTentacles,
    hypercube,
    coderain,
    audioworms,
    textexplosion
};

export { extremeState, initializeExtremeState };
