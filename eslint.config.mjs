import js from '@eslint/js'
import prettierPlugin from 'eslint-plugin-prettier'

export default [
  js.configs.recommended, // base JS rules

  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    plugins: {
      prettier: prettierPlugin
    },
    rules: {
      ...prettierPlugin.configs.recommended.rules,
      curly: ['error', 'all'],
      'no-constant-condition': 'warn',
      'arrow-parens': ['error', 'as-needed'],
      'no-console': 'off',
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      'no-debugger': 'warn',
      'no-const-assign': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'no-class-assign': 'error',
      'no-dupe-class-members': 'off',
      'space-before-function-paren': 'off',
      'variable-name': 'off',
      'ter-indent': 'off',
      deprecation: 'off'
    }
  }
]
