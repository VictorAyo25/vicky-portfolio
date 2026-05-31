'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, Send, Loader2, CheckCircle, MessageSquare } from 'lucide-react';
import { trackEvent, setVisitorName } from '@/lib/analytics';

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx2tR3yxR3hPRreH5QFUnqoZ3Bj3TaPxbEgYNl-StY_LC2noH6Py9duXHM4NnGTjIk1/exec";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setStatus('submitting');

    try {
      const searchParams = new URLSearchParams();
      searchParams.append("name", formData.name);
      searchParams.append("email", formData.email);
      searchParams.append("subject", formData.subject);
      searchParams.append("message", formData.message);

      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: searchParams.toString(),
      });

      // Save name for session tracking
      setVisitorName(formData.name);

      trackEvent('contact_form_submit', { 
        name: formData.name, 
        email: formData.email, 
        subject: formData.subject 
      });

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error("Form submission error:", error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <main className="min-h-screen bg-[#0F0E0D]">
      {/* Hero */}
      <section className="pt-28 md:pt-36 pb-12 md:pb-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-[#C5A059] mb-3 font-sans font-semibold">Get In Touch</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-[#F3F4F6] tracking-tight">
              Let's Work<br />
              <span className="text-gray-500/40 italic">Together</span>
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="px-4 md:px-8 pb-20 md:pb-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 md:gap-12">

            {/* Left — Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-2 space-y-8"
            >
              <div>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                  Have a project in mind? Whether you need compelling copy, a content strategy, or a long-term writing partner — I'd love to hear from you.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059] shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-[0.15em] text-gray-500 mb-1 font-sans">Email</h3>
                    <a href="mailto:victoriaodueso06@gmail.com" className="text-[#F3F4F6] hover:text-[#C5A059] transition-colors text-sm md:text-base">
                      victoriaodueso06@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059] shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-[0.15em] text-gray-500 mb-1 font-sans">Location</h3>
                    <p className="text-[#F3F4F6] text-sm md:text-base">Global / Remote</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 flex items-center justify-center text-[#C5A059] shrink-0">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-[0.15em] text-gray-500 mb-1 font-sans">Response Time</h3>
                    <p className="text-[#F3F4F6] text-sm md:text-base">Within 24 hours</p>
                  </div>
                </div>
              </div>

              {/* Decorative */}
              <div className="hidden lg:block pt-8">
                <div className="w-16 h-px bg-[#2F2A26]" />
                <p className="text-gray-600 text-xs mt-4 italic font-serif">
                  "The right words can transform a brand."
                </p>
              </div>
            </motion.div>

            {/* Right — Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="lg:col-span-3"
            >
              <div className="bg-[#141210] border border-[#2F2A26]/60 rounded-2xl p-6 md:p-8 lg:p-10">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="name" className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-sans">Name *</label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 disabled:opacity-50"
                        placeholder="Your Name"
                        disabled={status === 'submitting'}
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-sans">Email *</label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 disabled:opacity-50"
                        placeholder="your@email.com"
                        disabled={status === 'submitting'}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-sans">Subject</label>
                    <input
                      id="subject"
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 disabled:opacity-50"
                      placeholder="Project inquiry, collaboration, etc."
                      disabled={status === 'submitting'}
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-2 font-sans">Message *</label>
                    <textarea
                      id="message"
                      rows={5}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full bg-[#0F0E0D] border border-[#2F2A26] rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-[#C5A059] focus:border-[#C5A059] outline-none transition-all placeholder-gray-600 resize-none disabled:opacity-50"
                      placeholder="Tell me about your project..."
                      disabled={status === 'submitting'}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full flex items-center justify-center gap-2.5 bg-[#C5A059] text-[#0F0E0D] px-8 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-[0.15em] hover:bg-[#d4b06a] active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
                  >
                    {status === 'submitting' ? (
                      <>Sending <Loader2 size={15} className="animate-spin" /></>
                    ) : status === 'success' ? (
                      <>Message Sent! <CheckCircle size={15} /></>
                    ) : (
                      <>Send Message <Send size={15} /></>
                    )}
                  </button>

                  {status === 'error' && (
                    <p className="text-red-400 text-xs text-center">Something went wrong. Please try again.</p>
                  )}
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
