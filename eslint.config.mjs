import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier/flat';

export default tseslint.config(
  { ignores: ['.next/**', 'out/**', 'node_modules/**', '.cache/**', 'next-env.d.ts'] },
  { ...js.configs.recommended, files: ['**/*.{ts,tsx}'] },
  ...tseslint.configs.recommended,
  {
    plugins: { '@next/next': next },
    rules: {
      ...next.configs.recommended.rules,
      ...next.configs['core-web-vitals'].rules,
    },
  },
  prettier,
);
