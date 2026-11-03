export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  title: 'AI TRAINER',
  description: 'AI 训练师个人主页与作品集：数据、提示词、模型评测与反馈。',
  skipLink: '跳到主要内容',
  intro: {
    eyebrow: 'HUMAN INTENT / MACHINE INTELLIGENCE',
    title: 'AI TRAINER',
    scroll: '向下滚动',
    skip: '跳过开场',
  },
  nav: [
    { id: 'intro', label: '开场' },
    { id: 'about', label: '关于我' },
    { id: 'skills', label: '能力' },
    { id: 'work', label: '作品集' },
    { id: 'contact', label: '联系' },
  ],
  about: {
    title: 'TRAINING MACHINES TO THINK BETTER.',
    description:
      '你好，我是 [姓名]，一名 AI 训练师。我的工作是教模型理解人类的意图：整理数据、设计提示词、评估回答，再把反馈变成更好的模型。',
    stats: ['[X]+ 个项目', '[X] 万+ 条标注数据', '[X]+ 个评测任务', '[X] 年经验'],
  },
  skills: {
    title: '能力',
    items: [
      {
        id: '01',
        title: '数据标注与质检',
        description: '制定标注规范，搭建抽检流程，让数据干净、一致、可复用',
      },
      {
        id: '02',
        title: '提示词工程',
        description: '为不同任务设计和迭代提示词，提升输出的稳定性与准确率',
      },
      {
        id: '03',
        title: '模型评测与 RLHF 反馈',
        description: '设计评测集和打分标准，提供高质量偏好反馈',
      },
      {
        id: '04',
        title: '训练流程优化',
        description: '梳理从数据到反馈的链路，减少返工，提升迭代效率',
      },
    ],
  },
  work: { title: '作品集', back: '返回首页' },
  contact: {
    title: 'LET’S BUILD SMARTER MODELS.',
    description: '有合作、交流或只是想打个招呼，欢迎联系我。',
    email: '[email]',
    social: '[链接待定]',
  },
  notFound: { title: 'SIGNAL LOST', description: '当前坐标没有信号。', back: '返回首页' },
} as const;
