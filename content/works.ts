/** Portfolio data. To add a work, append one entry; cards, detail pages, sitemap and prev/next follow. */
export interface WorkMetric {
  label: string;
  value: string;
}

export interface WorkSection {
  heading: '背景' | '我的工作' | '方法' | '结果';
  body: string;
}

export interface Work {
  slug: string;
  title: string;
  /** One sentence. */
  summary: string;
  role: string;
  period: string;
  tags: string[];
  /** 16:10 mech-style placeholder, WebP ≤150KB. */
  cover: string;
  /** 2–3 items; values stay [X] placeholders until real data exists. */
  metrics: WorkMetric[];
  /** Exactly four: 背景 / 我的工作 / 方法 / 结果. */
  sections: [WorkSection, WorkSection, WorkSection, WorkSection];
  isSample: boolean;
}

export const WORKS: Work[] = [
  {
    slug: 'rlhf-preference-data',
    title: '对话模型偏好数据集',
    summary: '设计多维度偏好标注规范，产出用于 RLHF 的排序数据',
    role: '标注规范设计 / 质检负责人',
    period: '[YYYY.MM–YYYY.MM]',
    tags: ['RLHF', '数据标注', '质检'],
    cover: '/media/work/rlhf-preference-data.v1.webp',
    metrics: [
      { label: '偏好排序', value: '[X]万 条标注' },
      { label: '标注员一致性', value: '[X]%' },
      { label: '质检轮次', value: '[X] 轮' },
    ],
    sections: [
      {
        heading: '背景',
        body: '对话模型的回答常常“看起来对”，却不一定有用、诚实或安全。团队需要一批能反映真实偏好的排序数据，用来训练奖励模型。原有的单一打分方式区分度不够，标注员之间的分歧也很大。',
      },
      {
        heading: '我的工作',
        body: '我负责设计偏好标注规范，并搭建质检流程。从维度拆分、示例编写到标注员培训，我全程跟进，并在每一轮交付前做抽检和复盘。',
      },
      {
        heading: '方法',
        body: '把“好回答”拆成有用性、真实性、无害性和表达四个维度，每个维度配正反例。采用两两比较代替绝对打分，降低主观尺度差异。分歧样本进入仲裁池，由资深标注员复核，并把典型争议补进规范。',
      },
      {
        heading: '结果',
        body: '产出 [X] 万条偏好排序数据，标注员一致性提升到 [X]%。规范沉淀为可复用的模板，后续同类项目的启动时间缩短了 [X]%。',
      },
    ],
    isSample: true,
  },
  {
    slug: 'prompt-eval-benchmark',
    title: '提示词评测基准',
    summary: '搭建任务集与评分细则，对比不同提示词与模型版本',
    role: '评测设计 / 提示词工程',
    period: '[YYYY.MM–YYYY.MM]',
    tags: ['评测', 'Prompt', '自动评分'],
    cover: '/media/work/prompt-eval-benchmark.v1.webp',
    metrics: [
      { label: '评测任务', value: '[X] 个' },
      { label: '人机评分一致率', value: '[X]%' },
    ],
    sections: [
      {
        heading: '背景',
        body: '提示词改一个词，输出就可能变好或变差，但团队过去只能靠几个例子凭感觉判断。模型版本更新后，也缺少一套稳定的方法来确认效果有没有退步。',
      },
      {
        heading: '我的工作',
        body: '我搭建了一套覆盖常见任务的评测集，制定评分细则，并设计提示词与模型版本的对比实验。我也负责把结果整理成团队能直接用的结论。',
      },
      {
        heading: '方法',
        body: '按任务类型分层抽样，保证评测集覆盖简单、困难和边界情况。每道题配参考答案和分级评分标准，先用模型自动评分，再抽样人工复核校准。每次对比只改变一个变量，结果用同一份报表呈现。',
      },
      {
        heading: '结果',
        body: '形成包含 [X] 个任务的评测基准，自动评分与人工评分的一致率达到 [X]%。新提示词上线前都会跑一遍基准，回归问题能更早被发现。',
      },
    ],
    isSample: true,
  },
  {
    slug: 'multimodal-annotation-guide',
    title: '多模态图文标注规范',
    summary: '制定图文对齐、描述质量的标注指南与一致性校验',
    role: '标注规范负责人',
    period: '[YYYY.MM–YYYY.MM]',
    tags: ['多模态', '标注规范', '一致性'],
    cover: '/media/work/multimodal-annotation-guide.v1.webp',
    metrics: [
      { label: '图文对', value: '[X]万 组' },
      { label: '一致性', value: '[X]%' },
    ],
    sections: [
      {
        heading: '背景',
        body: '图文模型需要大量“图片 + 描述”数据，但描述写得详略不一，有的还和图片对不上。没有统一标准时，不同标注员产出的数据很难放在一起用。',
      },
      {
        heading: '我的工作',
        body: '我负责制定图文对齐和描述质量的标注指南，并设计一致性校验流程。我也带领标注团队完成试标和正式标注，持续收集问题反馈。',
      },
      {
        heading: '方法',
        body: '规定描述的必写要素：主体、属性、关系和场景，并给出详略分级的示例。图文不符、信息缺失和主观臆测分别定义为不同错误类型。每批数据抽取一部分做多人交叉标注，计算一致性，低于阈值就回到规范修订。',
      },
      {
        heading: '结果',
        body: '完成 [X] 万组图文对标注，交叉标注一致性稳定在 [X]%。指南整理成可迭代的版本文档，新标注员的上手时间明显缩短。',
      },
    ],
    isSample: true,
  },
  {
    slug: 'safety-red-teaming',
    title: '模型安全红队测试',
    summary: '设计越狱与有害内容测试集，整理风险分级与修复建议',
    role: '红队测试设计 / 风险评估',
    period: '[YYYY.MM–YYYY.MM]',
    tags: ['安全', '红队', '风险评估'],
    cover: '/media/work/safety-red-teaming.v1.webp',
    metrics: [
      { label: '测试用例', value: '[X] 条' },
      { label: '高风险问题', value: '[X] 个' },
      { label: '修复验证通过率', value: '[X]%' },
    ],
    sections: [
      {
        heading: '背景',
        body: '模型上线前，需要确认它不会被轻易诱导输出有害内容。常规评测很少覆盖刻意的攻击方式，风险往往在上线后才暴露。',
      },
      {
        heading: '我的工作',
        body: '我设计越狱和有害内容测试集，并组织红队测试。发现的问题由我按风险分级，整理成可执行的修复建议，同步给模型团队。',
      },
      {
        heading: '方法',
        body: '按风险类别和攻击手法建立测试矩阵，包括角色扮演、多轮诱导和指令拆分等方式。每个问题记录复现步骤、触发条件和影响范围，再按严重程度分级。修复后用同一批用例回归验证，确认问题不会复现。',
      },
      {
        heading: '结果',
        body: '累计设计 [X] 条测试用例，发现 [X] 个高风险问题。修复后的回归验证通过率达到 [X]%，测试集也成为每次版本发布前的固定检查项。',
      },
    ],
    isSample: true,
  },
];

export function getWork(slug: string) {
  const index = WORKS.findIndex((work) => work.slug === slug);
  if (index < 0) return undefined;
  return { work: WORKS[index], prev: WORKS[index - 1], next: WORKS[index + 1] };
}
