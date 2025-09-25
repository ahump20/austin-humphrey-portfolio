'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Loader2, Send } from 'lucide-react';

const contactSchema = z.object({
  name: z.string().min(2, 'Tell me who I am partnering with.'),
  email: z.string().email('Provide a valid email so I can respond quickly.'),
  organization: z.string().min(2, 'Which team or organization are you building for?'),
  message: z.string().min(20, 'Add context so I can prep value before we connect.'),
});

type ContactPayload = z.infer<typeof contactSchema>;

export function Contact() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload: ContactPayload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      organization: String(formData.get('organization') ?? ''),
      message: String(formData.get('message') ?? ''),
    };

    const validation = contactSchema.safeParse(payload);

    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Please review your information.');
      return;
    }

    try {
      setStatus('submitting');
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setStatus('success');
      event.currentTarget.reset();
    } catch (err) {
      console.error('Contact form submission failed', err);
      setError('Something went wrong. Email me at humphrey.austin20@gmail.com.');
      setStatus('error');
    }
  };

  return (
    <section id="contact" className="section-container">
      <div className="mx-auto max-w-4xl">
        <p className="badge mb-4">Let’s build your competitive edge</p>
        <h2 className="section-heading">Schedule a Blaze Intelligence strategy session</h2>
        <p className="section-subheading">
          Share your current analytics stack and mission. I’ll respond within 24 hours with next steps and a tailored prep agenda.
        </p>
        <form onSubmit={handleSubmit} className="mt-10 grid gap-6 rounded-3xl border border-white/10 bg-black/70 p-8 shadow-xl">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-zinc-200">
              Name
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-burnt-orange-400"
                name="name"
                autoComplete="name"
                required
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-200">
              Email
              <input
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-burnt-orange-400"
                type="email"
                name="email"
                autoComplete="email"
                required
              />
            </label>
          </div>
          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            Organization
            <input
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-burnt-orange-400"
              name="organization"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            Mission / Challenge
            <textarea
              className="min-h-[160px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-burnt-orange-400"
              name="message"
              required
            />
          </label>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button type="submit" className="button-primary justify-center" disabled={status === 'submitting'}>
            {status === 'submitting' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send intel request
              </>
            )}
          </button>
          {status === 'success' ? (
            <p className="text-sm text-burnt-orange-200">Message received. I’ll respond personally within 24 hours.</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
