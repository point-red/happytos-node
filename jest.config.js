process.env.TZ = 'Asia/Bangkok',
module.exports = {
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
  restoreMocks: true,
  coveragePathIgnorePatterns: [
    'node_modules',
    'src/config',
    'src/app.js',
    'src/models/index.js',
    'tests',
    'models/tenantModels.js',
  ],
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  moduleNameMapper: {
    '@root/(.*)': '<rootDir>/$1',
    '@src/(.*)': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>//tests/utils/setupJest.js'],
  testTimeout: 20000,
};
