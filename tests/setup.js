// Test setup and global mocks
import 'jest-environment-jsdom';

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
    createAnalyser: jest.fn().mockReturnValue({
        fftSize: 512,
        frequencyBinCount: 256,
        smoothingTimeConstant: 0.3,
        minDecibels: -90,
        maxDecibels: -10,
        getByteFrequencyData: jest.fn(),
        getByteTimeDomainData: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    createMediaStreamSource: jest.fn().mockReturnValue({
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    createMediaElementSource: jest.fn().mockReturnValue({
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    createGain: jest.fn().mockReturnValue({
        gain: { value: 1 },
        connect: jest.fn(),
        disconnect: jest.fn()
    }),
    destination: {
        connect: jest.fn()
    },
    resume: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    state: 'running'
}));

global.webkitAudioContext = global.AudioContext;

// Mock MediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
        getUserMedia: jest.fn().mockResolvedValue({
            getTracks: () => [{ stop: jest.fn() }]
        })
    }
});

// Mock File API
global.File = jest.fn().mockImplementation((chunks, filename, options) => ({
    name: filename,
    size: chunks.reduce((acc, chunk) => acc + chunk.length, 0),
    type: options?.type || 'audio/mp3',
    lastModified: Date.now()
}));

global.URL = {
    createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
    revokeObjectURL: jest.fn()
};

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    unobserve: jest.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn().mockImplementation((cb) => {
    return setTimeout(cb, 16);
});

global.cancelAnimationFrame = jest.fn().mockImplementation((id) => {
    clearTimeout(id);
});

// Mock performance API
global.performance = {
    ...global.performance,
    now: jest.fn().mockReturnValue(Date.now()),
    memory: {
        usedJSHeapSize: 1024 * 1024 * 10, // 10MB
        totalJSHeapSize: 1024 * 1024 * 20, // 20MB
        jsHeapSizeLimit: 1024 * 1024 * 100 // 100MB
    }
};

// Mock CustomEvent for jsdom
global.CustomEvent = jest.fn().mockImplementation((event, params) => ({
    type: event,
    detail: params?.detail,
    bubbles: params?.bubbles || false,
    cancelable: params?.cancelable || false
}));

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = jest.fn((message) => {
    if (message.includes('Warning:') || message.includes('React')) {
        return;
    }
    originalWarn(message);
});

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
});