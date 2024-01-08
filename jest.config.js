const package = require('./package');

module.exports = {
  globals: {
    'ts-jest': {
      babelConfig: false,
      diagnostics: {
        ignoreCodes: [151001],
      },
    },
    __APP_NAME__: JSON.stringify('sip-phone-test'),
    __APP_VERSION__: JSON.stringify(package.version),
    __APP_BUILD__: JSON.stringify(package.version + '-test'),
    __APP_BETA__: JSON.stringify(false),
    __DEV__: JSON.stringify(false),
  },
  modulePaths: ['<rootDir>/src', '<rootDir>/node_modules'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  setupFiles: ['<rootDir>/test/jest-pretest.ts'],
  testEnvironment: 'node',
  collectCoverage: false,
  collectCoverageFrom: ['src/**/*.{js,ts}', '!**/*.spec.{js,ts}', '!**/node_modules/**', '!**/test/**'],
  coverageDirectory: '<rootDir>/test/coverage-jest',
  coverageReporters: ['json', 'lcov', 'text', 'html'],
};
