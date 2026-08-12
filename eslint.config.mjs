import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    },
  },
);
