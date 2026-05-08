'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MapPin, Send, Loader2, CheckCircle } from 'lucide-react';

// NOTE: Replace this URL with the Google Apps Script Web App URL once deployed!
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx2tR3yxR3hPRreH5QFUnqoZ3Bj3TaPxbEgYNl-StY_LC2noH6Py9duXHM4NnGTjIk1/exec";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    
    setStatus('submitting');

    try {
      // Using no-cors prevents CORS blocking
      // We must use x-www-form-urlencoded for no-cors to pass parameters properly to Google Apps Script
      const searchParams = new URLSearchParams();
      searchParams.append("name", formData.name);
      searchParams.append("email", formData.email);
      searchParams.append("message", formData.message);

      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: searchParams.toString(),
      });

      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error("Form submission error:", error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <main className="min-h-screen bg-[#0F0E0D] px-6 py-24 pb-32">
      <div className="max-w-4xl mx-auto">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16 border-b border-[#2F2A26] pb-10"
        >
            <p className="text-xs uppercase tracking-widest text-[#C5A059] mb-2 font-bold">Get In Touch</p>
            <h1 className="text-5xl md:text-7xl font-serif text-[#F3F4F6]">Contact</h1>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Contact Info */}
            <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.2 }}
                 className="space-y-8"
            >
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#191614] rounded-full text-[#C5A059] border border-[#2F2A26]">
                        <Mail size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-serif text-[#F3F4F6] mb-1">Email</h3>
                        <a href="mailto:victoriaodueso06@gmail.com" className="text-gray-400 hover:text-[#C5A059] transition-colors">
                            victoriaodueso06@gmail.com
                        </a>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#191614] rounded-full text-[#C5A059] border border-[#2F2A26]">
                        <MapPin size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-serif text-[#F3F4F6] mb-1">Location</h3>
                        <p className="text-gray-400">
                            Global / Remote
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Form */}
            <motion.form 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
                onSubmit={handleSubmit}
            >
                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2" htmlFor="name">Name</label>
                    <input 
                        id="name"
                        type="text" 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#191614] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none transition-all placeholder-gray-600 disabled:opacity-50"
                        placeholder="Your Name"
                        disabled={status === 'submitting'}
                    />
                </div>
                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2" htmlFor="email">Email</label>
                    <input 
                        id="email"
                        type="email" 
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-[#191614] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none transition-all placeholder-gray-600 disabled:opacity-50"
                        placeholder="your@email.com"
                        disabled={status === 'submitting'}
                    />
                </div>
                <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2" htmlFor="message">Message</label>
                    <textarea 
                        id="message"
                        rows={4}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full bg-[#191614] border border-[#2F2A26] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-[#C5A059] outline-none transition-all placeholder-gray-600 disabled:opacity-50"
                        placeholder="How can we work together?"
                        disabled={status === 'submitting'}
                    />
                </div>

                <button 
                    type="submit"
                    disabled={status === 'submitting'}
                    className="flex items-center gap-2 bg-[#C5A059] text-black px-8 py-3 rounded-lg font-bold uppercase tracking-widest hover:bg-[#d4b06a] transition-colors w-full justify-center disabled:opacity-70"
                >
                    {status === 'submitting' ? (
                        <>Sending... <Loader2 size={16} className="animate-spin" /></>
                    ) : status === 'success' ? (
                        <>Message Sent! <CheckCircle size={16} /></>
                    ) : (
                        <>Send Message <Send size={16} /></>
                    )}
                </button>

                {status === 'error' && (
                    <p className="text-red-500 text-sm text-center">Something went wrong. Please try again.</p>
                )}
            </motion.form>

        </div>
      </div>
    </main>
  );
}
