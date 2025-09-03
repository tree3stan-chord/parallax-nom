import { basicVisualizations } from './basic.js';
import { advancedVisualizations } from './advanced.js';
import { extremeVisualizations } from './extreme.js';
import { ColorHandler } from '../renderer/ASCIIRenderer.js';

export class VisualizationRegistry {
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
                    applyColors: (element) => {
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
        const { dimensions } = params;
        const { rows, cols } = dimensions;
        
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
        if (!viz) {return null;}
        
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
export const visualizationRegistry = new VisualizationRegistry();

// Export all visualization collections
export { basicVisualizations, advancedVisualizations, extremeVisualizations };

// Convenience exports
export const getAllVisualizations = () => ({
    ...basicVisualizations,
    ...advancedVisualizations,
    ...extremeVisualizations
});

export const getVisualizationByName = (name) => {
    return visualizationRegistry.getVisualization(name);
};

export const executeVisualization = (name, params) => {
    return visualizationRegistry.executeVisualization(name, params);
};
