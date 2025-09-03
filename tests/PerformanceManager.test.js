import { PerformanceManager, MemoryManager, RenderOptimizer } from '../src/utils/PerformanceManager.js';

describe('PerformanceManager', () => {
    let performanceManager;

    beforeEach(() => {
        performanceManager = new PerformanceManager();
        jest.clearAllMocks();
    });

    describe('Frame Management', () => {
        test('should track frame timing', () => {
            performanceManager.startFrame();
            
            // Simulate some processing time
            jest.spyOn(global.performance, 'now')
                .mockReturnValueOnce(0)  // startFrame
                .mockReturnValueOnce(20); // endFrame

            const quality = performanceManager.endFrame();
            
            expect(quality).toBeLessThanOrEqual(1.0);
            expect(quality).toBeGreaterThanOrEqual(0.3);
        });

        test('should adapt quality based on performance', () => {
            performanceManager.startFrame();
            
            // Simulate slow frame (>25ms for 60fps target)
            jest.spyOn(global.performance, 'now')
                .mockReturnValueOnce(0)
                .mockReturnValueOnce(30);

            performanceManager.endFrame();
            
            // Multiple slow frames should reduce quality
            for (let i = 0; i < 5; i++) {
                performanceManager.startFrame();
                jest.spyOn(global.performance, 'now')
                    .mockReturnValueOnce(i * 30)
                    .mockReturnValueOnce((i + 1) * 30);
                performanceManager.endFrame();
            }
            
            expect(performanceManager.getQualityMultiplier()).toBeLessThan(1.0);
        });

        test('should skip frames when performance is poor', () => {
            // Force very low quality
            performanceManager.qualityLevel = 0.4;
            
            let shouldSkip = false;
            for (let i = 0; i < 10; i++) {
                if (performanceManager.shouldSkipFrame()) {
                    shouldSkip = true;
                    break;
                }
            }
            
            expect(shouldSkip).toBe(true);
        });

        test('should provide performance metrics', () => {
            performanceManager.startFrame();
            performanceManager.endFrame();
            
            const metrics = performanceManager.getMetrics();
            
            expect(metrics).toHaveProperty('fps');
            expect(metrics).toHaveProperty('qualityLevel');
            expect(metrics).toHaveProperty('averageFrameTime');
            expect(metrics).toHaveProperty('performanceGrade');
            expect(typeof metrics.fps).toBe('number');
            expect(typeof metrics.qualityLevel).toBe('number');
        });

        test('should calculate performance grade correctly', () => {
            performanceManager.fps = 58;
            expect(performanceManager.getPerformanceGrade()).toBe('Excellent');
            
            performanceManager.fps = 50;
            expect(performanceManager.getPerformanceGrade()).toBe('Good');
            
            performanceManager.fps = 35;
            expect(performanceManager.getPerformanceGrade()).toBe('Fair');
            
            performanceManager.fps = 25;
            expect(performanceManager.getPerformanceGrade()).toBe('Poor');
        });
    });

    describe('Adaptive Quality', () => {
        test('should enable/disable adaptive quality', () => {
            performanceManager.setAdaptiveQuality(false);
            expect(performanceManager.adaptiveQuality).toBe(false);
            expect(performanceManager.qualityLevel).toBe(1.0);
            
            performanceManager.setAdaptiveQuality(true);
            expect(performanceManager.adaptiveQuality).toBe(true);
        });

        test('should reset performance metrics', () => {
            performanceManager.frameCount = 100;
            performanceManager.slowFrameCount = 5;
            performanceManager.qualityLevel = 0.5;
            
            performanceManager.reset();
            
            expect(performanceManager.frameCount).toBe(0);
            expect(performanceManager.slowFrameCount).toBe(0);
            expect(performanceManager.qualityLevel).toBe(1.0);
        });
    });
});

describe('MemoryManager', () => {
    let memoryManager;

    beforeEach(() => {
        memoryManager = new MemoryManager();
    });

    describe('Object Pooling', () => {
        test('should create objects from pool', () => {
            const creator = jest.fn().mockReturnValue({ id: 'test', reset: jest.fn() });
            
            const obj1 = memoryManager.getFromPool('testType', creator);
            expect(creator).toHaveBeenCalled();
            expect(obj1).toHaveProperty('id', 'test');
        });

        test('should reuse objects from pool', () => {
            const creator = jest.fn().mockReturnValue({ id: 'test', reset: jest.fn() });
            
            const obj1 = memoryManager.getFromPool('testType', creator);
            memoryManager.returnToPool('testType', obj1);
            
            const obj2 = memoryManager.getFromPool('testType', creator);
            expect(obj1).toBe(obj2);
            expect(obj1.reset).toHaveBeenCalled();
        });

        test('should limit pool size', () => {
            const creator = () => ({ reset: jest.fn() });
            
            // Fill pool beyond max size
            for (let i = 0; i < memoryManager.maxPoolSize + 10; i++) {
                const obj = creator();
                memoryManager.returnToPool('testType', obj);
            }
            
            const pool = memoryManager.pools.get('testType');
            expect(pool.length).toBeLessThanOrEqual(memoryManager.maxPoolSize);
        });

        test('should clear all pools', () => {
            memoryManager.getFromPool('type1', () => ({}));
            memoryManager.getFromPool('type2', () => ({}));
            
            memoryManager.clearPools();
            
            expect(memoryManager.pools.size).toBe(0);
        });
    });

    describe('Memory Monitoring', () => {
        test('should check memory pressure', () => {
            const isHighPressure = memoryManager.isMemoryPressureHigh();
            expect(typeof isHighPressure).toBe('boolean');
        });

        test('should get memory stats', () => {
            const stats = memoryManager.getMemoryStats();
            
            expect(stats).toHaveProperty('available');
            if (stats.available) {
                expect(stats).toHaveProperty('used');
                expect(stats).toHaveProperty('total');
                expect(stats).toHaveProperty('limit');
                expect(stats).toHaveProperty('usagePercentage');
            }
        });
    });

    describe('Utility Functions', () => {
        test('should debounce function calls', (done) => {
            const mockFn = jest.fn();
            const debounced = MemoryManager.debounce(mockFn, 50);
            
            debounced();
            debounced();
            debounced();
            
            expect(mockFn).not.toHaveBeenCalled();
            
            setTimeout(() => {
                expect(mockFn).toHaveBeenCalledTimes(1);
                done();
            }, 60);
        });

        test('should throttle function calls', (done) => {
            const mockFn = jest.fn();
            const throttled = MemoryManager.throttle(mockFn, 50);
            
            throttled();
            throttled();
            throttled();
            
            expect(mockFn).toHaveBeenCalledTimes(1);
            
            setTimeout(() => {
                throttled();
                expect(mockFn).toHaveBeenCalledTimes(2);
                done();
            }, 60);
        });
    });
});

describe('RenderOptimizer', () => {
    let renderOptimizer;

    beforeEach(() => {
        renderOptimizer = new RenderOptimizer();
    });

    describe('Render Caching', () => {
        test('should cache render decisions', () => {
            const content = 'test content';
            const dimensions = { cols: 80, rows: 24 };
            
            // First call should render
            const shouldRender1 = renderOptimizer.shouldRender(content, dimensions);
            expect(shouldRender1).toBe(true);
            
            // Second call with same content should not render
            const shouldRender2 = renderOptimizer.shouldRender(content, dimensions);
            expect(shouldRender2).toBe(false);
        });

        test('should render when content changes', () => {
            const dimensions = { cols: 80, rows: 24 };
            
            renderOptimizer.shouldRender('content1', dimensions);
            const shouldRender = renderOptimizer.shouldRender('content2', dimensions);
            
            expect(shouldRender).toBe(true);
        });

        test('should limit cache size', () => {
            const dimensions = { cols: 80, rows: 24 };
            
            // Fill cache beyond max size
            for (let i = 0; i < renderOptimizer.maxCacheSize + 10; i++) {
                renderOptimizer.shouldRender(`content${i}`, dimensions);
            }
            
            expect(renderOptimizer.renderCache.size).toBeLessThanOrEqual(renderOptimizer.maxCacheSize);
        });

        test('should disable caching when requested', () => {
            renderOptimizer.setRenderCaching(false);
            
            const content = 'test content';
            const dimensions = { cols: 80, rows: 24 };
            
            const shouldRender1 = renderOptimizer.shouldRender(content, dimensions);
            const shouldRender2 = renderOptimizer.shouldRender(content, dimensions);
            
            expect(shouldRender1).toBe(true);
            expect(shouldRender2).toBe(true);
        });
    });

    describe('Output Optimization', () => {
        test('should optimize output based on quality', () => {
            const content = 'line1\nline2\nline3\nline4\nline5';
            
            const optimized50 = renderOptimizer.optimizeOutput(content, 0.5);
            const optimized100 = renderOptimizer.optimizeOutput(content, 1.0);
            
            expect(optimized100).toBe(content);
            expect(optimized50.length).toBeLessThan(content.length);
        });

        test('should reduce line density for low quality', () => {
            const content = 'AAAABBBBCCCCDDDD';
            const reduced = renderOptimizer.reduceDensity(content, 0.5);
            
            expect(reduced.length).toBeLessThan(content.length);
        });

        test('should maintain content for high quality', () => {
            const content = 'test content';
            const optimized = renderOptimizer.optimizeOutput(content, 0.8);
            
            expect(optimized).toBe(content);
        });
    });

    describe('Cache Management', () => {
        test('should clear cache', () => {
            renderOptimizer.shouldRender('test', { cols: 80, rows: 24 });
            expect(renderOptimizer.renderCache.size).toBeGreaterThan(0);
            
            renderOptimizer.clearCache();
            expect(renderOptimizer.renderCache.size).toBe(0);
        });
    });
});