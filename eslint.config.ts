import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default defineConfig(
  [
    {
      ignores: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/coverage/**',
      ],
    },

    {

      languageOptions: {
        globals: {
          ...globals.node,
          ...globals.es2021,
        },
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
    },

    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    stylistic.configs.recommended,

    {
      plugins: {
        '@stylistic': stylistic,
      },
      rules: {
        // TypeScript rules customization
        '@typescript-eslint/no-unused-vars': ['error', {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/consistent-type-imports': ['error', {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        }],

        // Formatting rules - indentation and spacing
        '@stylistic/indent': ['error', 2, {
          SwitchCase: 1,
          VariableDeclarator: 'first',
          outerIIFEBody: 1,
        }],
        '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
        '@stylistic/semi': ['error', 'always'],
        '@stylistic/comma-dangle': ['error', 'always-multiline'],
        '@stylistic/comma-spacing': ['error', { before: false, after: true }],
        '@stylistic/object-curly-spacing': ['error', 'always'],
        '@stylistic/array-bracket-spacing': ['error', 'never'],
        '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
        '@stylistic/block-spacing': ['error', 'always'],
        '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
        '@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],
        '@stylistic/keyword-spacing': ['error', { before: true, after: true }],
        '@stylistic/space-before-blocks': ['error', 'always'],
        '@stylistic/space-before-function-paren': ['error', {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always',
        }],
        '@stylistic/space-in-parens': ['error', 'never'],
        '@stylistic/space-infix-ops': 'error',

        // Line and whitespace rules
        '@stylistic/eol-last': ['error', 'always'],
        '@stylistic/no-trailing-spaces': 'error',
        '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
        '@stylistic/padded-blocks': ['error', 'never'],
        '@stylistic/padding-line-between-statements': [
          'error',
          { blankLine: 'always', prev: '*', next: 'return' },
          { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
          { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
          { blankLine: 'always', prev: 'directive', next: '*' },
          { blankLine: 'any', prev: 'directive', next: 'directive' },
          { blankLine: 'always', prev: 'import', next: '*' },
          { blankLine: 'any', prev: 'import', next: 'import' },
        ],

        // TypeScript specific styling
        '@stylistic/member-delimiter-style': ['error', {
          multiline: { delimiter: 'semi', requireLast: true },
          singleline: { delimiter: 'semi', requireLast: false },
        }],

        // General code quality rules
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'prefer-const': 'error',
        'no-var': 'error',
        'eqeqeq': ['error', 'always', { null: 'ignore' }],
        'curly': ['error', 'all'],
      },
    },
  ],
);
