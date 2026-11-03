const baseConfig = require('./jest.config');

// Solo las suites de integridad y usabilidad. Sus pruebas fallidas son intencionales:
// cada una tiene un comentario // DEFECTO: con el defecto real que la hace fallar.
module.exports = {
  ...baseConfig,
  testMatch: ['<rootDir>/__tests__/integridad-usabilidad/**/*.test.js'],
  testPathIgnorePatterns: baseConfig.testPathIgnorePatterns.filter(pattern => !pattern.includes('integridad-usabilidad')),
};
