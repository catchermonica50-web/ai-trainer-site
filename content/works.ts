export interface Work {
  slug: string;
  title: string;
  description: string;
  tags: string[];
}

export const WORKS: Work[] = [
  {
    slug: 'project-alpha',
    title: '[项目一名称]',
    description: '[一句话说明，待讨论]',
    tags: [],
  },
  {
    slug: 'project-beta',
    title: '[项目二名称]',
    description: '[一句话说明，待讨论]',
    tags: [],
  },
  {
    slug: 'project-gamma',
    title: '[项目三名称]',
    description: '[一句话说明，待讨论]',
    tags: [],
  },
];
