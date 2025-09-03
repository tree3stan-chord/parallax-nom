export class ASCIIRenderer {
    constructor(dimensions) {
        this.dimensions = dimensions;
        this.asciiChars = ' .·:¦|=+*#%@█';
        this.asciiCharsReverse = '█@%#*+=|¦:·. ';
        this.explosionChars = '·∴∵:;*✦✧⋆☆★✺✹✸✷✶✵✴✳✲✱✰';
    }

    createGrid() {
        const { rows, cols } = this.dimensions;
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
        const { rows, cols } = this.dimensions;
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

        while (true) { // eslint-disable-line no-constant-condition
            this.setPixel(grid, x, y, char);
            
            if (x === x2 && y === y2) {break;}
            
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
        const { rows, cols } = this.dimensions;
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

export class ColorHandler {
    constructor() {
        this.lolcatEnabled = false;
        this.hueOffset = 0;
    }

    enable(enabled = true) {
        this.lolcatEnabled = enabled;
    }

    update(deltaTime) {
        this.hueOffset += deltaTime * 50; // Adjust speed as needed
        if (this.hueOffset > 360) {this.hueOffset -= 360;}
    }

    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const a = s * Math.min(l, 1 - l);
        const f = (n) => {
            const k = (n + h * 12) % 12;
            return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        };
        
        return [f(0) * 255, f(8) * 255, f(4) * 255];
    }

    getColorForPosition(x, y) {
        if (!this.lolcatEnabled) {return null;}
        
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
            if (y < lines.length - 1) {html += '\n';}
        }
        
        element.innerHTML = html;
    }
}
