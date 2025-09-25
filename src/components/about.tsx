import { Trophy, Brain, Activity } from 'lucide-react';

const pillars = [
  {
    icon: Trophy,
    title: 'Athlete DNA',
    description:
      'Champion High School RB #20, elite travel baseball, track sprinter. Every model I ship is rooted in lived competitive reps.',
  },
  {
    icon: Brain,
    title: 'Pattern Recognition Ops',
    description:
      'Creator of Hidden Value Index™ and Decision Velocity Model™. I convert noisy datasets into actionable scouting intel.',
  },
  {
    icon: Activity,
    title: 'Texas-Fueled Delivery',
    description:
      'Memphis wisdom, Texas courage. Transparent partnerships that move fast, ship secure, and deliver measurable gains.',
  },
];

export function About() {
  return (
    <section id="about" className="section-container">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div>
          <p className="badge mb-4">The Austin Humphrey Protocol</p>
          <h2 className="section-heading">Athlete → Analyst → Builder of Blaze Intelligence</h2>
          <p className="text-lg text-zinc-300">
            Born in Memphis, engineered in Texas. I architect Blaze Intelligence to help front offices, athletic departments, and
            elite training outfits weaponize data. My work bridges AI, financial modeling, and on-field empathy to deliver
            championship-level clarity.
          </p>
          <ul className="mt-8 space-y-4 text-zinc-300">
            <li>• $42M+ MLB market inefficiencies surfaced for the Baltimore Orioles (Hidden Value Index™)</li>
            <li>• 100K+ events/second processed in Blaze Intelligence real-time analytics pipeline</li>
            <li>• Northwestern Mutual Power of 10 Award & Spectrum Reach 47% revenue lift</li>
            <li>• Graduate study at Full Sail (Entertainment Business / Sports Management) to formalize the system</li>
          </ul>
        </div>
        <div className="space-y-4">
          {pillars.map(({ icon: Icon, title, description }) => (
            <article key={title} className="glass-card p-6">
              <Icon className="h-8 w-8 text-burnt-orange-400" aria-hidden />
              <h3 className="mt-4 font-display text-xl">{title}</h3>
              <p className="mt-2 text-sm text-zinc-300">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
