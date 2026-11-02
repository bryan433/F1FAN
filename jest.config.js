module.exports = {
  preset: 'jest-expo',
  // Margen para la instrumentación de cobertura en ejecuciones sin caché.
  testTimeout: 15000,
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/docs/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/__fixtures__/**',
    '!src/**/fixtures/**',
  ],
};
