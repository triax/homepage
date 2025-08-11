import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['scripts/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      ...typescript.configs.recommended.rules,
      
      // TypeScript specific
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      
      // スタイルルール
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'only-multiline'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 0 }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', {
        'anonymous': 'always',
        'named': 'never',
        'asyncArrow': 'always'
      }],
      'keyword-spacing': ['error', { 'before': true, 'after': true }],
      'comma-spacing': ['error', { 'before': false, 'after': true }],
      'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
      'arrow-spacing': ['error', { 'before': true, 'after': true }],
      'max-len': ['error', { 'code': 100, 'ignoreComments': true, 'ignoreStrings': true }],
      
      // その他
      'no-console': 'off',
      'no-undef': 'off'
    }
  },
  {
    ignores: ['node_modules/', 'dist/', '*.js', 'docs/', '!eslint.config.mjs']
  }
];