import { mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

await mkdir('reports/stage-1', { recursive: true });
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const versions = [
  '# 阶段 1 精确版本',
  '',
  `记录时间：${new Date().toISOString()}`,
  `Node：${process.version}`,
  '',
  '| 依赖 | 精确版本 |',
  '| --- | --- |',
  ...Object.entries({ ...manifest.dependencies, ...manifest.devDependencies }).map(
    ([name, version]) => `| ${name} | ${version} |`,
  ),
  '',
  '额外锁定 Next 内置 PostCSS 8.5.32（同一主版本，修复已报告安全问题）。',
];
await writeFile('reports/stage-1/versions.md', versions.join('\n') + '\n');

function run(name, command) {
  const result = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    maxBuffer: 10 * 1024 * 1024,
  });
  const output = `$ ${command}\n${result.stdout || ''}${result.stderr || ''}\nExit code: ${result.status}\n`;
  console.log(output);
  return { output, status: result.status, name };
}
for (const [name, command] of [
  ['checks', 'npm run check'],
  ['build', 'npm run build'],
  ['dependencies', 'npm ls --depth=0'],
  ['audit', 'npm audit --json'],
]) {
  const result = run(name, command);
  await writeFile(`reports/stage-1/${name}.log`, result.output);
  if (result.status !== 0 && name !== 'audit') process.exit(1);
}

const files = await readdir('out');
for (const path of [
  'out/index.html',
  'out/404.html',
  'out/robots.txt',
  'out/sitemap.xml',
  'out/work/project-alpha.html',
  'out/work/project-beta.html',
  'out/work/project-gamma.html',
]) {
  await stat(path);
}
console.log('Static export verified:', files.join(', '));
