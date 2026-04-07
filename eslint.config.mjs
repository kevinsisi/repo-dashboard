import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['node_modules/**', 'public/**'] },
  {
    ...js.configs.recommended,
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 2022,
      sourceType: 'commonjs',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
]
