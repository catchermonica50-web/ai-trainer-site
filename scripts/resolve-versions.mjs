import { writeFile } from 'node:fs/promises';

const dependencies = {
  next: 15,
  react: 19,
  'react-dom': 19,
  three: 0,
  '@react-three/fiber': 9,
  '@react-three/drei': 10,
  gsap: 3,
  motion: 12,
};
const devDependencies = {
  typescript: 5,
  tailwindcss: 4,
  '@tailwindcss/postcss': 4,
  eslint: 10,
  '@eslint/js': 10,
  'typescript-eslint': 8,
  '@next/eslint-plugin-next': 15,
  'eslint-config-prettier': 10,
  prettier: 3,
  '@types/node': 24,
  '@types/react': 19,
  '@types/react-dom': 19,
  '@types/three': 0,
};
async function resolve(group) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(group).map(async ([name, major]) => {
        const response = await fetch(`https://registry.npmjs.org/${name}`);
        if (!response.ok) throw new Error(`${name}: ${response.status}`);
        const data = await response.json();
        const versions = Object.keys(data.versions)
          .filter(
            (v) =>
              /^\d+\.\d+\.\d+$/.test(v) &&
              Number(v.split('.')[0]) === major &&
              !data.versions[v].deprecated,
          )
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const version = versions.at(-1);
        if (!version) throw new Error(`No stable version: ${name}`);
        console.log(`${name}: ${version}`);
        return [name, version];
      }),
    ),
  );
}
const manifest = {
  name: 'ai-trainer-site',
  version: '0.1.0',
  private: true,
  engines: { node: '>=22.0.0 <25' },
  overrides: { next: { postcss: '8.5.32' } },
  scripts: {
    dev: 'next dev',
    build: 'next build',
    lint: 'eslint .',
    typecheck: 'tsc --noEmit',
    format: 'prettier --write .',
    'format:check': 'prettier --check .',
    check: 'npm run lint && npm run format:check && npm run typecheck',
  },
  dependencies: await resolve(dependencies),
  devDependencies: await resolve(devDependencies),
};
await writeFile('package.json', JSON.stringify(manifest, null, 2) + '\n');
