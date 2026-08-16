import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  {
    ignores: ['dist/**', 'dist-electron/**', 'dist-web/**', 'release/**', 'node_modules/**', 'api/**', 'scripts/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{jsx,tsx,ts,js,mjs}'],
    plugins: {
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);







