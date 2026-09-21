const js = require('@eslint/js')
const globals = require('globals')
const eslintConfigPrettier = require('eslint-config-prettier')

module.exports = [
  js.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    },

    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-console': 'off'
    }
  },

  {
    files: ['tests/**/*.js', 'test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest
      }
    }
  },

  {
    ignores: ['node_modules/', 'uploads/', 'coverage/']
  },

  eslintConfigPrettier
]
