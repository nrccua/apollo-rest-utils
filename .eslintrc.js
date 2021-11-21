const baseConfig = {
  extends: ['@encoura/eslint-config'],
  settings: {
    'import/resolver': {
      'babel-plugin-root-import': {},
      typescript: {
        project: ['tsconfig.json', 'test/tsconfig.json'],
      },
    },
  },
};

const tsConfig = {
  extends: ['@encoura/eslint-config'],
  files: ['**/*.ts'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['tsconfig.json', 'test/tsconfig.json'],
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    ...baseConfig.rules,
  },
};

module.exports = { ...baseConfig, overrides: [tsConfig] };
