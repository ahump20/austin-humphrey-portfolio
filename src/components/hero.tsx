'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';

const counters = [
  { label: 'Prediction accuracy', value: 94, suffix: '%', description: 'MLB forecasting precision (Baltimore Orioles case study)' },
  { label: 'Identified value', value: 42, suffix: 'M', description: 'Hidden Value Index™ insights surfaced for front offices' },
  { label: 'Data points analyzed', value: 224_500, suffix: '+', description: 'Streaming telemetry flowing through Blaze Intelligence' },
];

function useAnimatedCounter(target: number, duration = 1600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(target * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

export function Hero() {
  const accuracy = useAnimatedCounter(counters[0]!.value);
  const value = useAnimatedCounter(counters[1]!.value);
  const telemetry = useAnimatedCounter(counters[2]!.value);
  const animatedValues = [accuracy, value, telemetry];

  return (
    <section id="home" className="section-container relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,136,0,0.28),_transparent_55%)]" aria-hidden />
      <div className="glass-card relative mx-auto max-w-5xl px-8 py-16 text-center">
        <div className="mb-6 flex items-center justify-center gap-2 text-sm text-burnt-orange-200">
          <Sparkles className="h-4 w-4" />
          <span>Blaze Intelligence founder • Texas-bred pattern recognition engineer</span>
        </div>
        <h1 className="font-display text-4xl leading-tight md:text-6xl">
          Sports Intelligence Architect turning data into championships
        </h1>
        <p className="mt-6 text-lg text-zinc-300 md:text-xl">
          From Memphis grit to Texas execution — I weaponize AI, cognitive analytics, and front-office finance to surface $42M+
          in hidden value for pro organizations.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a href="#contact" className="button-primary">
            Book Austin <ChevronRight className="h-4 w-4" />
          </a>
          <a
            href="/real-case-studies.html"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-burnt-orange-400/80"
          >
            See case studies
          </a>
        </div>
        <dl className="mt-12 grid gap-6 sm:grid-cols-3">
          {counters.map((counter, index) => (
            <motion.div
              key={counter.label}
              className="rounded-2xl border border-white/10 bg-black/60 p-6 shadow-inner"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
            >
              <dt className="text-sm uppercase tracking-widest text-zinc-400">{counter.label}</dt>
              <dd className="mt-2 font-display text-3xl font-semibold">
                {animatedValues[index].toLocaleString()}
                {counter.suffix}
              </dd>
              <p className="mt-3 text-sm text-zinc-400">{counter.description}</p>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
