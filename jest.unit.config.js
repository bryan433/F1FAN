const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  testMatch: [
    '<rootDir>/__tests__/components/**/*.test.js',
    '<rootDir>/__tests__/models/**/*.test.js',
    '<rootDir>/__tests__/utils/**/*.test.js',
    '<rootDir>/__tests__/services/**/*.test.js',
    '<rootDir>/__tests__/storage/**/*.test.js',
  ],
  collectCoverageFrom: [
    'src/{components,models,utils,services,storage}/**/*.{js,jsx,ts,tsx}',
    ...baseConfig.collectCoverageFrom.filter(pattern => pattern.startsWith('!')),
  ],
  coverageDirectory: '<rootDir>/coverage-unit',
};
