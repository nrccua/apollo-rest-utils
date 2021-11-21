const defaultConfig = require('@encoura/eslint-config/jest.config');
const os = require('os');

module.exports = {
  ...defaultConfig,
  collectCoverageFrom: ['<rootDir>/lib/**/*.ts', '!<rootDir>/lib/index.ts'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  globals: {
    'ts-jest': {
      diagnostics: false,
      tsconfig: './tsconfig.json',
    },
  },
  maxWorkers: os.cpus().length / 2,
  preset: 'ts-jest',
  roots: ['<rootDir>/lib'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
