export default {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/examples/**',
        '!src/types/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    transform: {
        '^.+\\.jsx?$': 'babel-jest'
    },
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
    testTimeout: 10000,
    verbose: true
};