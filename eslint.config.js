import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import unusedImports from 'eslint-plugin-unused-imports'

export default [
  // ds-bundle is generated output for design-sync: a bundled payload plus a
  // minified UMD copy of React. Linting it produced 358 no-undef errors
  // (React, checkDCE, __REACT_DEVTOOLS_GLOBAL_HOOK__) — all but two of the
  // errors the project reported, none of them real, which made `npm run lint`
  // useless as a gate. It is build output; it is not source.
  { ignores: ['dist', 'dist-ssr', 'public', 'ds-bundle'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    rules: {
      // Catches undefined identifiers incl. unimported JSX components —
      // a missing-import crash (QuickAddBar/LetterWave) shipped without this.
      'no-undef': 'error',
      'react/jsx-no-undef': 'error',
      'react/jsx-uses-vars': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
]
