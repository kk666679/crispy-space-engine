export default {
  root: true,
  env: {
    browser: true,
    es2024: true,
    node: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      impliedStrict: true,
    },
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:security/recommended',
    'plugin:promise/recommended',
    'plugin:sonarjs/recommended',
    'prettier',
  ],
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
    'import',
    'security',
    'promise',
    'sonarjs',
    'no-unsanitized',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    // React specific rules
    'react/jsx-no-leaked-render': ['error', { validStrategies: ['coerce', 'ternary'] }],
    'react/jsx-handler-names': ['error', {
      eventHandlerPrefix: 'handle',
      eventHandlerPropPrefix: 'on',
    }],
    'react/jsx-no-useless-fragment': 'error',
    'react/no-array-index-key': 'error',
    'react/no-danger': 'error',
    'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],

    // General JavaScript rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    'complexity': ['error', { max: 10 }],

    // Import rules
    'import/order': ['error', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      'alphabetize': { order: 'asc', caseInsensitive: true }
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-unused-modules': 'error',

    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'error',
    'no-unsanitized/method': 'error',
    'no-unsanitized/property': 'error',

    // Promise rules
    'promise/always-return': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',
    'promise/catch-or-return': 'error',

    // Hook rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      rules: {
        'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      },
    },
    {
      files: ['*.test.js', '*.test.jsx', '*.spec.js', '*.spec.jsx'],
      env: {
        jest: true,
        'jest/globals': true,
      },
      extends: ['plugin:jest/recommended', 'plugin:jest/style'],
      rules: {
        'max-lines-per-function': 'off',
        'max-lines': 'off',
      },
    },
  ],
};
