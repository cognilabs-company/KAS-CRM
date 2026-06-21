module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  ignorePatterns: ['dist', 'node_modules'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'react-hooks/exhaustive-deps': 'off',
    'react-refresh/only-export-components': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
  },
}
