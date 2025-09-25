import { ValueBanner } from '@/components/value-banner';
import { Navigation } from '@/components/navigation';
import { Hero } from '@/components/hero';
import { About } from '@/components/about';
import { Results } from '@/components/results';
import { Projects } from '@/components/projects';
import { Testimonials } from '@/components/testimonials';
import { Contact } from '@/components/contact';

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ValueBanner />
      <Navigation />
      <main className="pt-36">
        <Hero />
        <About />
        <Results />
        <Projects />
        <Testimonials />
        <Contact />
      </main>
      <footer className="border-t border-white/10 bg-black/80 py-10 text-center text-sm text-zinc-400">
        © {new Date().getFullYear()} Austin Humphrey. Built with Blaze Intelligence discipline.
      </footer>
    </div>
  );
}
