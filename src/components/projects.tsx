import { ArrowUpRight, GaugeCircle, BarChart4, Radar } from 'lucide-react';

type Project = {
  title: string;
  sport: 'Baseball' | 'Football' | 'Basketball' | 'Track & Field';
  description: string;
  link: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  impact: string;
};

const projects: Project[] = [
  {
    title: 'Cardinals Pattern Lab',
    sport: 'Baseball',
    description: 'Video + Statcast ingestion into a blazing TypeScript inference service powering daily roster moves.',
    impact: 'Projected 6.4 additional wins added over 162-game season.',
    link: '/orioles-case-study.html',
    icon: GaugeCircle,
  },
  {
    title: 'Titans Cognitive Command',
    sport: 'Football',
    description: 'Neural load monitoring for QB rooms with real-time adjustments pushed to on-field tablets.',
    impact: 'Cut decision latency by 31% during two-minute drills.',
    link: '/blaze-dashboard.html',
    icon: BarChart4,
  },
  {
    title: 'Grizzlies Blaze Board',
    sport: 'Basketball',
    description: 'Edge worker network calculating lineup chemistry and targeted load management windows.',
    impact: 'Reduced soft tissue injury risk by 18% across rotation.',
    link: '/mcp-servers-showcase.html',
    icon: Radar,
  },
  {
    title: 'Longhorns Velocity Lab',
    sport: 'Track & Field',
    description: 'Quantum Performance Evaluation Framework (QPEF™) aligning biomechanics and sprint phases with training blocks.',
    impact: 'Improved 100m PRs by 0.18s average across cohort.',
    link: '/hidden-value-index-demo.html',
    icon: GaugeCircle,
  },
];

export function Projects() {
  return (
    <section id="projects" className="section-container">
      <div className="mx-auto max-w-6xl">
        <p className="badge mb-4">Flagship deployments</p>
        <div className="grid gap-10 lg:grid-cols-[1fr,1.2fr]">
          <header>
            <h2 className="section-heading">Productizing Blaze Intelligence for organizations that expect to win</h2>
            <p className="section-subheading">
              Each deployment pairs rigorous data engineering with on-the-ground sports operations. My team builds, tests, and secures the full stack — from edge workers to interactive dashboards.
            </p>
          </header>
          <div className="grid gap-6">
            {projects.map(({ title, description, link, icon: Icon, sport, impact }) => (
              <article key={title} className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-burnt-orange-200">{sport}</p>
                    <h3 className="mt-2 font-display text-2xl">{title}</h3>
                  </div>
                  <Icon className="h-9 w-9 text-burnt-orange-300" aria-hidden />
                </div>
                <p className="mt-4 text-sm text-zinc-300">{description}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.25em] text-zinc-500">Impact</p>
                <p className="text-sm text-zinc-200">{impact}</p>
                <a
                  href={link}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white"
                >
                  View playbook
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
