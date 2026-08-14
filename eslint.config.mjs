// NOTE: typescript-eslint does not yet support TypeScript 7.0.
// Linting is handled by `tsc --noEmit` with strict mode, noUnusedLocals,
// and noUnusedParameters enabled in tsconfig.json.
// Re-enable typescript-eslint when TS 7 support lands.
// Tracking: https://github.com/typescript-eslint/typescript-eslint/issues/10940

export default [
  {
    ignores: ['dist/**', 'dist-electron/**', 'release/**', 'node_modules/**'],
  },
];
