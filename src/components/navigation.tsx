'use client';

import { useEffect, useState } from 'react';

const sections = ['home', 'about', 'results', 'projects', 'testimonials', 'contact'] as const;

type SectionId = (typeof sections)[number];

export function Navigation() {
  const [active, setActive] = useState<SectionId>('home');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sections.forEach((section) => {
      const el = document.getElementById(section);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActive(section);
            }
          });
        },
        { rootMargin: '-40% 0px -40% 0px' }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  useEffect(() => {
    const closeOnRoute = () => setOpen(false);
    window.addEventListener('hashchange', closeOnRoute);
    return () => window.removeEventListener('hashchange', closeOnRoute);
  }, []);

  return (
    <header className="fixed inset-x-0 top-12 z-40">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-black/80 px-6 py-3 shadow-xl backdrop-blur">
        <a href="#home" className="font-display text-xl font-semibold tracking-wider text-white">
          Austin Humphrey
        </a>
        <button
          type="button"
          className="md:hidden"
          aria-label="Toggle navigation"
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="text-sm uppercase tracking-wide text-zinc-300">Menu</span>
        </button>
        <ul className="hidden items-center gap-6 md:flex">
          {sections.map((section) => (
            <li key={section}>
              <a
                href={`#${section}`}
                className={`relative text-sm font-medium uppercase tracking-wide text-zinc-300 transition hover:text-white ${active === section ? 'text-white' : ''}`}
              >
                {section}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 w-full bg-gradient-to-r from-burnt-orange-400 to-burnt-orange-600 transition-transform ${active === section ? 'scale-x-100' : 'scale-x-0'}`}
                  aria-hidden
                />
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {open ? (
        <div className="md:hidden">
          <ul className="mx-4 mt-4 space-y-2 rounded-2xl border border-white/10 bg-black/90 p-4 text-center text-sm uppercase tracking-wide text-zinc-200 shadow-lg backdrop-blur">
            {sections.map((section) => (
              <li key={section}>
                <a href={`#${section}`} className="block w-full rounded-full px-3 py-2 hover:bg-white/10">
                  {section}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
