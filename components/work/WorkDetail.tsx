import Link from 'next/link';
import type { Work } from '@/content/works';
import { SITE } from '@/content/site';
import { Tag } from '@/components/ui/Tag';
import { Footer } from '@/components/sections/Footer';

type Props = { work: Work; prev?: Work; next?: Work };

function Neighbor({
  work,
  label,
  dir,
}: {
  work?: Work;
  label: string;
  dir: 'prev' | 'next';
}) {
  if (!work) {
    return (
      <span
        className={`work-nav-link work-nav-${dir}`}
        aria-disabled="true"
        data-disabled=""
      >
        <span className="work-nav-label">{label}</span>
        <span className="work-nav-title">{SITE.work.none}</span>
      </span>
    );
  }
  return (
    <Link
      className={`work-nav-link work-nav-${dir}`}
      href={`/work/${work.slug}`}
      rel={dir}
      data-cursor="hover"
    >
      <span className="work-nav-label">{label}</span>
      <span className="work-nav-title">{work.title}</span>
    </Link>
  );
}

/** Detail layout (spec §8): title + 「示例」, meta, metrics, cover, four sections, neighbours, back. */
export function WorkDetail({ work, prev, next }: Props) {
  return (
    <>
      <main id="main" className="section-shell work-detail">
        <Link className="work-back" href="/#work" data-cursor="hover">
          ← {SITE.work.backToWork}
        </Link>
        <header className="work-detail-head">
          <div className="work-detail-title">
            <h1>{work.title}</h1>
            {work.isSample && <span className="work-sample">{SITE.work.sample}</span>}
          </div>
          <p className="work-detail-summary">{work.summary}</p>
          <dl className="work-meta">
            <div>
              <dt>{SITE.work.role}</dt>
              <dd>{work.role}</dd>
            </div>
            <div>
              <dt>{SITE.work.period}</dt>
              <dd>{work.period}</dd>
            </div>
            <div>
              <dt>{SITE.work.tags}</dt>
              <dd className="work-tags">
                {work.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </dd>
            </div>
          </dl>
        </header>
        <figure className="work-detail-cover">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, pre-sized WebP */}
          <img
            src={work.cover}
            alt={`${work.title}封面（示意图）`}
            width={1280}
            height={800}
          />
        </figure>
        <ul className="work-metrics" aria-label={SITE.work.metrics}>
          {work.metrics.map((metric) => (
            <li key={metric.label}>
              <span className="work-metric-value">{metric.value}</span>
              <span className="work-metric-label">{metric.label}</span>
            </li>
          ))}
        </ul>
        <div className="work-sections">
          {work.sections.map((section) => (
            <section key={section.heading} className="work-section">
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
        <nav className="work-nav" aria-label={SITE.work.title}>
          <Neighbor work={prev} label={SITE.work.prevWork} dir="prev" />
          <Link
            className="btn btn-secondary work-nav-back"
            href="/#work"
            data-cursor="hover"
          >
            {SITE.work.backToWork}
          </Link>
          <Neighbor work={next} label={SITE.work.nextWork} dir="next" />
        </nav>
      </main>
      <Footer />
    </>
  );
}
