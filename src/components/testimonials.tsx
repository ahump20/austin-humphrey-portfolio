import { Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'MLB Director of Scouting',
    organization: 'St. Louis Cardinals',
    quote:
      'Austin delivers intel we can operationalize the same day. His Blaze Intelligence models surfaced undervalued arms that our internal systems missed.',
  },
  {
    name: 'VP, Player Performance',
    organization: 'Tennessee Titans',
    quote:
      'The Decision Velocity framework reframed how we evaluate QB rooms. His dashboards are on every surface at practice.',
  },
  {
    name: 'Head Coach',
    organization: 'Texas Longhorns Track & Field',
    quote:
      'Austin sees the sport in frames we missed. The QPEF sprints program gave us actionable adjustments without drowning staff in noise.',
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="section-container">
      <div className="mx-auto max-w-5xl text-center">
        <p className="badge mb-4">Voices from the field</p>
        <h2 className="section-heading">Trusted by leaders who expect accountability</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="glass-card flex h-full flex-col gap-4 p-6 text-left">
              <Quote className="h-6 w-6 text-burnt-orange-300" aria-hidden />
              <blockquote className="text-sm text-zinc-300">“{testimonial.quote}”</blockquote>
              <figcaption className="mt-auto text-xs uppercase tracking-[0.3em] text-zinc-500">
                {testimonial.name}
                <span className="block text-[0.65rem] text-zinc-400">{testimonial.organization}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
