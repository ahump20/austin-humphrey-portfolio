import { LineChart, Network, Cpu } from 'lucide-react';

const results = [
  {
    title: 'Hidden Value Index™',
    subtitle: 'MLB front office value unlock',
    metric: '$42M+',
    description:
      'Engineered predictive models for the Baltimore Orioles delivering 94% accuracy on roster decisions and surfacing underpriced assets.',
    icon: LineChart,
  },
  {
    title: 'Blaze Intelligence Platform',
    subtitle: 'Real-time decision architecture',
    metric: '100K+ events/sec',
    description:
      'Elastic TypeScript + Redis infrastructure scoring players, tracking biometrics, and delivering live tactical intel.',
    icon: Network,
  },
  {
    title: 'Decision Velocity Model™',
    subtitle: 'Cognitive performance insights',
    metric: '98% pattern recognition',
    description:
      'Transforms athlete cognitive load data into actionable adjustments for coaching staffs and player development groups.',
    icon: Cpu,
  },
];

export function Results() {
  return (
    <section id="results" className="section-container">
      <div className="mx-auto max-w-6xl">
        <p className="badge mb-4">Outcomes with receipts</p>
        <div className="grid gap-10 lg:grid-cols-[1fr,1.2fr]">
          <header>
            <h2 className="section-heading">Enterprise-grade wins delivered through Blaze Intelligence</h2>
            <p className="section-subheading">
              I deploy AI pipelines that front offices can trust — security reviewed, observable, and grounded in real sports domain knowledge.
            </p>
          </header>
          <div className="grid gap-6">
            {results.map(({ title, subtitle, metric, description, icon: Icon }) => (
              <article key={title} className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-burnt-orange-200">{subtitle}</p>
                    <h3 className="mt-2 font-display text-2xl">{title}</h3>
                  </div>
                  <Icon className="h-10 w-10 text-burnt-orange-400" aria-hidden />
                </div>
                <p className="mt-4 text-sm uppercase tracking-widest text-zinc-400">Key metric</p>
                <p className="text-3xl font-display font-semibold text-white">{metric}</p>
                <p className="mt-4 text-sm text-zinc-300">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
