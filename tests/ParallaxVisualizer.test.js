import ParallaxVisualizer from '../src/ParallaxVisualizer.js';
import { visualizationRegistry } from '../src/visualizations/index.js';

describe('ParallaxVisualizer', () => {
    let container;
    let visualizer;

    beforeEach(() => {
        container = document.createElement('div');
        container.id = 'test-visualizer';
        container.style.width = '800px';
        container.style.height = '600px';
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (visualizer) {
            visualizer.destroy();
            visualizer = null;
        }
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    describe('Constructor', () => {
        test('should create visualizer with default options', () => {
            visualizer = new ParallaxVisualizer({
                container: '#test-visualizer',
                autoStart: false
            });

            expect(visualizer).toBeDefined();
            expect(visualizer.options.mode).toBe('bars');
            expect(visualizer.options.responsive).toBe(true);
            expect(visualizer.options.lolcat).toBe(false);
        });

        test('should create visualizer with custom options', () => {
            visualizer = new ParallaxVisualizer({
                container: container,
                mode: 'matrix',
                lolcat: true,
                width: 1000,
                height: 500,
                autoStart: false
            });

            expect(visualizer.options.mode).toBe('matrix');
            expect(visualizer.options.lolcat).toBe(true);
            expect(visualizer.options.width).toBe(1000);
            expect(visualizer.options.height).toBe(500);
        });

        test('should throw error with invalid container', () => {
            expect(() => {
                new ParallaxVisualizer({
                    container: '#non-existent',
                    autoStart: false
                });
            }).toThrow('Container element not found');
        });
    });

    describe('Dimensions', () => {
        beforeEach(() => {
            visualizer = new ParallaxVisualizer({
                container: container,
                autoStart: false
            });
        });

        test('should calculate dimensions correctly', () => {
            const dimensions = visualizer.dimensions;
            
            expect(dimensions).toHaveProperty('width');
            expect(dimensions).toHaveProperty('height');
            expect(dimensions).toHaveProperty('cols');
            expect(dimensions).toHaveProperty('rows');
            expect(dimensions.cols).toBeGreaterThan(0);
            expect(dimensions.rows).toBeGreaterThan(0);
        });

        test('should use custom dimensions when provided', () => {
            visualizer.destroy();
            visualizer = new ParallaxVisualizer({
                container: container,
                width: 600,
                height: 400,
                autoStart: false
            });

            expect(visualizer.dimensions.width).toBe(600);
            expect(visualizer.dimensions.height).toBe(400);
        });
    });

    describe('Visualization Modes', () => {
        beforeEach(() => {
            visualizer = new ParallaxVisualizer({
                container: container,
                autoStart: false
            });
        });

        test('should get available modes', () => {
            const modes = visualizer.getAvailableModes();
            expect(Array.isArray(modes)).toBe(true);
            expect(modes.length).toBeGreaterThan(0);
            expect(modes).toContain('bars');
            expect(modes).toContain('matrix');
            expect(modes).toContain('wave');
        });

        test('should get modes by category', () => {
            const basicModes = visualizer.getModesByCategory('basic');
            const advancedModes = visualizer.getModesByCategory('advanced');
            
            expect(Array.isArray(basicModes)).toBe(true);
            expect(Array.isArray(advancedModes)).toBe(true);
            expect(basicModes.length).toBeGreaterThan(0);
            expect(advancedModes.length).toBeGreaterThan(0);
        });

        test('should set visualization mode', () => {
            visualizer.setVisualizationMode('matrix');
            expect(visualizer.currentVisualizationName).toBe('matrix');
        });

        test('should throw error for invalid mode', () => {
            expect(() => {
                visualizer.setVisualizationMode('invalid-mode');
            }).toThrow('Unknown visualization mode: invalid-mode');
        });

        test('should get visualization info', () => {
            const info = visualizer.getVisualizationInfo('bars');
            expect(info).toHaveProperty('name');
            expect(info).toHaveProperty('category');
            expect(info).toHaveProperty('description');
            expect(info.name).toBe('bars');
        });
    });

    describe('Custom Visualizations', () => {
        beforeEach(() => {
            visualizer = new ParallaxVisualizer({
                container: container,
                autoStart: false
            });
        });

        test('should register custom visualization', () => {
            const customViz = jest.fn().mockReturnValue('test output');
            
            visualizer.registerVisualization('custom', customViz, 'test', 'Test visualization');
            
            const modes = visualizer.getAvailableModes();
            expect(modes).toContain('custom');
            
            const info = visualizer.getVisualizationInfo('custom');
            expect(info.name).toBe('custom');
            expect(info.category).toBe('test');
        });
    });

    describe('Audio Sources', () => {
        beforeEach(() => {
            visualizer = new ParallaxVisualizer({
                container: container,
                autoStart: false
            });
        });

        test('should set microphone source', async () => {
            await expect(visualizer.setAudioSource('microphone')).resolves.not.toThrow();
        });

        test('should set file source', async () => {
            const mockFile = new File([''], 'test.mp3', { type: 'audio/mp3' });
            
            await expect(visualizer.setAudioSource({
                type: 'file',
                file: mockFile
            })).resolves.not.toThrow();
        });

        test('should throw error for invalid source', async () => {
            await expect(visualizer.setAudioSource('invalid-source')).rejects.toThrow();
        });
    });

    describe('Events', () => {
        beforeEach(() => {
            visualizer = new ParallaxVisualizer({
                container: container,
                autoStart: false
            });
        });

        test('should emit and listen to events', (done) => {
            visualizer.on('modeChange', (event) => {
                expect(event.detail).toBe('matrix');
                done();
            });

            visualizer.setVisualizationMode('matrix');
        });

        test('should remove event listeners', () => {
            const handler = jest.fn();
            visualizer.on('test', handler);
            visualizer.off('test', handler);
            
            visualizer.emit('test', 'data');
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('Performance', () => {
        beforeEach(() => {
            visualizer = new ParallaxVisualizer({
                container: container,
                autoStart: false
            });
        });

        test('should handle resize events', (done) => {
            visualizer.on('resize', (event) => {
                expect(event.detail).toHaveProperty('oldDimensions');
                expect(event.detail).toHaveProperty('newDimensions');
                done();
            });

            // Simulate resize
            container.style.width = '1000px';
            container.style.height = '800px';
            
            // Trigger resize observer
            const resizeCallback = global.ResizeObserver.mock.calls[0][0];
            resizeCallback();
        });
    });

    describe('Cleanup', () => {
        test('should clean up resources on destroy', () => {
            visualizer = new ParallaxVisualizer({
                container: container,
                autoStart: false
            });

            const audioHandlerDestroy = jest.spyOn(visualizer.audioHandler, 'destroy');
            
            visualizer.destroy();
            
            expect(audioHandlerDestroy).toHaveBeenCalled();
            expect(visualizer.audioHandler).toBeNull();
            expect(container.textContent).toBe('');
        });

        test('should emit destroyed event', (done) => {
            visualizer = new ParallaxVisualizer({
                container: container,
                autoStart: false
            });

            visualizer.on('destroyed', () => {
                done();
            });

            visualizer.destroy();
        });
    });
});