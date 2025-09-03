import { ASCIIRenderer } from '../renderer/ASCIIRenderer.js';

// State for visualizations that need persistence
const visualizationState = {
    matrixDrops: [],
    particles: [],
    explosionParticles: [],
    stars: [],
    time: 0
};

function initializeState(dimensions) {
    const { cols, rows } = dimensions;
    
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

function bars({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
    const grid = renderer.createGrid();
    
    const barWidth = Math.max(1, Math.floor(cols / 48));
    const spacing = Math.floor(cols / 48);
    
    // Draw bars with effects
    for (let i = 0; i < 48; i++) {
        const dataIndex = Math.floor(i * frequencyData.length / 48);
        const barHeight = Math.floor((frequencyData[dataIndex] / 255) * rows);
        const intensity = frequencyData[dataIndex] / 255;
        
        const x = i * spacing;
        
        for (let y = 0; y < barHeight; y++) {
            const yPos = rows - 1 - y;
            for (let w = 0; w < barWidth; w++) {
                if (x + w < cols) {
                    const charIndex = Math.floor((y / barHeight) * (renderer.asciiCharsReverse.length - 1));
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

function circle({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
    const centerX = cols / 2;
    const centerY = rows / 2;
    const grid = renderer.createGrid();
    
    // Multiple circles for more impact
    const circles = 3;
    
    for (let c = 0; c < circles; c++) {
        const radiusMultiplier = 1 + c * 0.3;
        const angleOffset = time * (c + 1) * 0.5;
        
        for (let i = 0; i < frequencyData.length; i++) {
            const angle = (i / frequencyData.length) * Math.PI * 2 + angleOffset;
            const intensity = frequencyData[i] / 255;
            const radius = (Math.min(cols, rows) * 0.2) + intensity * (Math.min(cols, rows) * 0.25) * radiusMultiplier;
            
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

function matrix({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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
        const freqIndex = Math.floor((i / cols) * frequencyData.length);
        const freq = frequencyData[freqIndex] || 0;
        const speed = 1 + Math.floor((freq / 255) * 3);
        
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

function wave({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
    const grid = renderer.createGrid();
    
    const centerY = rows / 2;
    const waveLength = cols;
    
    // Multiple wave layers
    for (let layer = 0; layer < 3; layer++) {
        const layerOffset = time * (layer + 1) * 0.5;
        const amplitude = (rows / 4) * (1 + layer * 0.2);
        
        for (let x = 0; x < cols; x++) {
            const freqIndex = Math.floor((x / cols) * frequencyData.length);
            const freq = frequencyData[freqIndex] || 0;
            const intensity = freq / 255;
            
            // Base sine wave with frequency modulation
            const baseWave = Math.sin((x / waveLength) * Math.PI * 4 + layerOffset);
            const freqWave = Math.sin((x / waveLength) * Math.PI * 8 + time * 2);
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

function particles({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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
            const x = (i / frequencyData.length) * cols;
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

function explosion({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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
            const angle = (Math.PI * 2 * i) / 20;
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

function spiral({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
    const grid = renderer.createGrid();
    
    const centerX = cols / 2;
    const centerY = rows / 2;
    const maxRadius = Math.min(cols, rows) / 2;
    
    for (let i = 0; i < frequencyData.length; i++) {
        const intensity = frequencyData[i] / 255;
        const angle = (i / frequencyData.length) * Math.PI * 8 + time;
        const radius = (i / frequencyData.length) * maxRadius;
        
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

function dna({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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

function fractal({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
    const grid = renderer.createGrid();
    
    const centerX = cols / 2;
    const centerY = rows;
    
    function drawBranch(x, y, angle, length, depth, intensity) {
        if (depth <= 0 || length < 2) {return;}
        
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;
        
        renderer.drawLine(grid, Math.floor(x), Math.floor(y), Math.floor(endX), Math.floor(endY), 
            renderer.getCharByIntensity(intensity * (depth / 6), true));
        
        const newLength = length * (0.7 + intensity * 0.2);
        const newIntensity = intensity * 0.8;
        
        drawBranch(endX, endY, angle - 0.5 - intensity * 0.3, newLength, depth - 1, newIntensity);
        drawBranch(endX, endY, angle + 0.5 + intensity * 0.3, newLength, depth - 1, newIntensity);
    }
    
    const baseLength = Math.min(cols, rows) / 4;
    drawBranch(centerX, centerY, -Math.PI / 2, baseLength, 6, audioIntensity);
    
    return renderer.gridToString(grid);
}

function starfield({ frequencyData, audioIntensity, time, dimensions }) {
    const renderer = new ASCIIRenderer(dimensions);
    const { cols, rows } = dimensions;
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
export const basicVisualizations = {
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

export { visualizationState, initializeState };
