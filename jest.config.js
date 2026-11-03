module.exports = {
  preset: 'jest-expo',
  // Margen para la instrumentación de cobertura en ejecuciones sin caché.
  testTimeout: 15000,
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  // Las suites de integridad y usabilidad incluyen fallos intencionales (// DEFECTO:);
  // se ejecutan aparte con `npm run test:qa` (jest.qa.config.js).
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/docs/', '<rootDir>/__tests__/integridad-usabilidad/'],
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
