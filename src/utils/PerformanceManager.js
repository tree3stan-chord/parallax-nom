export class PerformanceManager {
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
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
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
        if (!this.adaptiveQuality) {return;}

        // Track slow frames
        if (frameTime > this.frameTimeThreshold * 1.5) {
            this.slowFrameCount++;
        } else {
            this.slowFrameCount = Math.max(0, this.slowFrameCount - 1);
        }

        // Adjust quality based on performance
        if (this.slowFrameCount > 3) {
            // Multiple slow frames - reduce quality
            this.qualityLevel = Math.max(
                this.minQuality,
                this.qualityLevel - 0.1
            );
            this.slowFrameCount = 0;
        } else if (frameTime < this.frameTimeThreshold * 0.8 && this.qualityLevel < this.maxQuality) {
            // Performing well - gradually increase quality
            this.qualityLevel = Math.min(
                this.maxQuality,
                this.qualityLevel + 0.02
            );
        }
    }

    getQualityMultiplier() {
        return this.qualityLevel;
    }

    shouldSkipFrame() {
        // Skip frames if performance is really poor
        return this.qualityLevel < 0.5 && Math.random() < (1 - this.qualityLevel);
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
        if (this.fps >= 55) {return 'Excellent';}
        if (this.fps >= 45) {return 'Good';}
        if (this.fps >= 30) {return 'Fair';}
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

export class MemoryManager {
    constructor() {
        this.pools = new Map();
        this.allocatedObjects = new WeakSet();
        this.maxPoolSize = 100;
    }

    // Object pooling for frequently created objects
    getFromPool(type, creator) {
        if (!this.pools.has(type)) {
            this.pools.set(type, []);
        }
        
        const pool = this.pools.get(type);
        if (pool.length > 0) {
            return pool.pop();
        }
        
        const obj = creator();
        this.allocatedObjects.add(obj);
        return obj;
    }

    returnToPool(type, obj) {
        if (!this.pools.has(type)) {
            this.pools.set(type, []);
        }
        
        const pool = this.pools.get(type);
        if (pool.length < this.maxPoolSize) {
            // Reset object state if it has a reset method
            if (obj.reset && typeof obj.reset === 'function') {
                obj.reset();
            }
            pool.push(obj);
        }
    }

    clearPools() {
        this.pools.clear();
    }

    // Debounce function for expensive operations
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for high-frequency events
    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Check memory pressure
    isMemoryPressureHigh() {
        if (!performance.memory) {return false;}
        
        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
        const memoryUsageRatio = usedJSHeapSize / jsHeapSizeLimit;
        const heapUsageRatio = usedJSHeapSize / totalJSHeapSize;
        
        return memoryUsageRatio > 0.8 || heapUsageRatio > 0.9;
    }

    // Force garbage collection if possible (Chrome DevTools)
    forceGC() {
        if (window.gc && typeof window.gc === 'function') {
            window.gc();
        }
    }

    getMemoryStats() {
        if (!performance.memory) {
            return { available: false };
        }

        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
        
        return {
            available: true,
            used: Math.round(usedJSHeapSize / 1024 / 1024), // MB
            total: Math.round(totalJSHeapSize / 1024 / 1024), // MB
            limit: Math.round(jsHeapSizeLimit / 1024 / 1024), // MB
            usagePercentage: Math.round((usedJSHeapSize / jsHeapSizeLimit) * 100)
        };
    }
}

export class RenderOptimizer {
    constructor() {
        this.lastRender = '';
        this.renderCache = new Map();
        this.maxCacheSize = 50;
        this.dirtyRegions = [];
        this.useRenderCaching = true;
    }

    // Check if we need to re-render
    shouldRender(newContent, dimensions) {
        if (!this.useRenderCaching) {return true;}
        
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
        if (typeof content !== 'string') {return Date.now();}
        
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    // Optimize character output by reducing redundant operations
    optimizeOutput(content, quality = 1.0) {
        if (quality >= 1.0) {return content;}
        
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
        if (quality >= 0.7) {return line;}
        
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

export const performanceManager = new PerformanceManager();
export const memoryManager = new MemoryManager();
export const renderOptimizer = new RenderOptimizer();
