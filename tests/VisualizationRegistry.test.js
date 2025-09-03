import { VisualizationRegistry } from '../src/visualizations/index.js';

describe('VisualizationRegistry', () => {
    let registry;

    beforeEach(() => {
        registry = new VisualizationRegistry();
    });

    describe('Constructor', () => {
        test('should initialize with built-in visualizations', () => {
            const modes = registry.getAllModes();
            expect(modes.length).toBeGreaterThan(0);
            expect(modes).toContain('bars');
            expect(modes).toContain('matrix');
            expect(modes).toContain('wave');
        });

        test('should have correct categories', () => {
            const categories = registry.getCategories();
            expect(categories).toContain('basic');
            expect(categories).toContain('advanced');
            expect(categories).toContain('extreme');
        });
    });

    describe('Mode Management', () => {
        test('should register custom visualization', () => {
            const customViz = jest.fn().mockReturnValue('test output');
            
            registry.registerVisualization('custom', customViz, 'test', 'Test description');
            
            expect(registry.hasMode('custom')).toBe(true);
            const visualization = registry.getVisualization('custom');
            expect(visualization).toBeDefined();
            expect(visualization.name).toBe('custom');
            expect(visualization.category).toBe('test');
            expect(visualization.description).toBe('Test description');
        });

        test('should get modes by category', () => {
            const basicModes = registry.getModesByCategory('basic');
            const advancedModes = registry.getModesByCategory('advanced');
            
            expect(Array.isArray(basicModes)).toBe(true);
            expect(Array.isArray(advancedModes)).toBe(true);
            expect(basicModes.length).toBeGreaterThan(0);
            expect(advancedModes.length).toBeGreaterThan(0);
            expect(basicModes).toContain('bars');
            expect(advancedModes).toContain('nebula');
        });

        test('should return empty array for non-existent category', () => {
            const modes = registry.getModesByCategory('non-existent');
            expect(modes).toEqual([]);
        });

        test('should check if mode exists', () => {
            expect(registry.hasMode('bars')).toBe(true);
            expect(registry.hasMode('matrix')).toBe(true);
            expect(registry.hasMode('non-existent')).toBe(false);
        });
    });

    describe('Visualization Execution', () => {
        test('should execute visualization successfully', () => {
            const mockParams = {
                frequencyData: new Uint8Array([100, 150, 200]),
                audioIntensity: 0.5,
                time: 1.0,
                dimensions: { cols: 80, rows: 24 },
                options: {}
            };

            const result = registry.executeVisualization('bars', mockParams);
            expect(typeof result).toBe('string');
        });

        test('should handle visualization execution error', () => {
            const errorViz = jest.fn().mockImplementation(() => {
                throw new Error('Visualization error');
            });
            
            registry.registerVisualization('error-test', errorViz, 'test');
            
            const mockParams = {
                frequencyData: new Uint8Array([100]),
                audioIntensity: 0.5,
                time: 1.0,
                dimensions: { cols: 80, rows: 24 },
                options: {}
            };

            const result = registry.executeVisualization('error-test', mockParams);
            expect(typeof result).toBe('string'); // Should return fallback
        });

        test('should throw error for non-existent visualization', () => {
            const mockParams = {
                frequencyData: new Uint8Array([100]),
                audioIntensity: 0.5,
                time: 1.0,
                dimensions: { cols: 80, rows: 24 },
                options: {}
            };

            expect(() => {
                registry.executeVisualization('non-existent', mockParams);
            }).toThrow("Visualization mode 'non-existent' not found");
        });
    });

    describe('Visualization Info', () => {
        test('should get visualization info', () => {
            const info = registry.getVisualizationInfo('bars');
            
            expect(info).toBeDefined();
            expect(info).toHaveProperty('name');
            expect(info).toHaveProperty('category');
            expect(info).toHaveProperty('description');
            expect(info).toHaveProperty('complexity');
            expect(info).toHaveProperty('features');
            
            expect(info.name).toBe('bars');
            expect(info.category).toBe('basic');
            expect(Array.isArray(info.features)).toBe(true);
        });

        test('should return null for non-existent mode info', () => {
            const info = registry.getVisualizationInfo('non-existent');
            expect(info).toBe(null);
        });

        test('should generate mode list', () => {
            const modeList = registry.generateModeList();
            
            expect(typeof modeList).toBe('string');
            expect(modeList).toContain('BASIC VISUALIZATIONS');
            expect(modeList).toContain('ADVANCED VISUALIZATIONS');
            expect(modeList).toContain('EXTREME VISUALIZATIONS');
            expect(modeList).toContain('bars');
            expect(modeList).toContain('matrix');
        });
    });

    describe('Category Management', () => {
        test('should register new category', () => {
            const customVisualizations = {
                test1: jest.fn(),
                test2: jest.fn()
            };

            registry.registerCategory('custom', customVisualizations);
            
            const categories = registry.getCategories();
            expect(categories).toContain('custom');
            
            const customModes = registry.getModesByCategory('custom');
            expect(customModes).toContain('test1');
            expect(customModes).toContain('test2');
        });

        test('should add mode to existing category when registering', () => {
            registry.registerVisualization('newBasic', jest.fn(), 'basic');
            
            const basicModes = registry.getModesByCategory('basic');
            expect(basicModes).toContain('newBasic');
        });
    });

    describe('Color Handling', () => {
        test('should handle lolcat colors', () => {
            const mockParams = {
                frequencyData: new Uint8Array([100]),
                audioIntensity: 0.5,
                time: 1.0,
                dimensions: { cols: 80, rows: 24 },
                options: { lolcat: true }
            };

            const result = registry.executeVisualization('bars', mockParams);
            
            if (typeof result === 'object' && result.applyColors) {
                expect(typeof result.applyColors).toBe('function');
            }
        });
    });
});