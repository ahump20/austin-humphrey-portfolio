'use client';

import { useEffect, useState } from 'react';

export function ValueBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className={`sticky top-0 z-50 w-full bg-gradient-to-r from-burnt-orange-500 to-rose-600 text-center text-sm font-semibold tracking-wide text-white transition-opacity duration-500 md:text-base ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <p className="py-3">
        🎯 I HELP SPORTS TEAMS WIN USING AI • $42M+ VALUE IDENTIFIED •{' '}
        <a className="underline decoration-dashed underline-offset-4" href="#contact">
          BOOK FREE CONSULTATION →
        </a>
      </p>
    </div>
  );
}
