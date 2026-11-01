import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PageRoute } from '../components/Navbar';
import {
  ALLOWED_CONTACT_CATEGORIES,
  ContactEnquiryCategory,
} from '../types/contact';

interface ContactPageProps {
  onNavigate: (route: PageRoute) => void;
  userEmail?: string;
  userName?: string;
}

export const ContactPage: React.FC<ContactPageProps> = ({
  onNavigate,
  userEmail = '',
  userName = '',
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Form state
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [category, setCategory] = useState<ContactEnquiryCategory>('General Enquiry');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Submission & validation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedEnquiryId, setSubmittedEnquiryId] = useState<string | null>(
    null
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Please provide your name (at least 2 characters).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
    if (!category) {
      errors.category = 'Please select a category.';
    }
    if (!subject.trim() || subject.trim().length < 3) {
      errors.subject = 'Please enter a subject (at least 3 characters).';
    }
    if (!message.trim() || message.trim().length < 10) {
      errors.message = 'Please enter your message (at least 10 characters).';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(
          data.error || 'Unable to submit enquiry. Please try again.'
        );
        return;
      }

      setSubmittedEnquiryId(data.enquiryId || 'ENQ-RECEIVED');
      setSubject('');
      setMessage('');
      setFieldErrors({});
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Network error. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] relative">
      {/* Ambient Lighting */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[360px] rounded-full bg-[#8B5CF6]/12 blur-[150px]"
        aria-hidden="true"
      />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onNavigate({ page: 'home' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#8B5CF6]" />
            <span>Back to Marketplace</span>
          </button>

          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A78BFA]">
            BorrowBox Operations Desk
          </span>
        </div>

        {/* Hero Section */}
        <header className="mb-12 border-b border-white/[0.08] pb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161E2E] border border-white/[0.08] text-xs font-semibold text-[#A78BFA] mb-4">
            <Mail className="w-3.5 h-3.5" />
            <span>Community Support & Partnership Inquiries</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#F8FAFC]">
            Let&apos;s Talk.
          </h1>

          <p className="text-base sm:text-xl text-[#94A3B8] mt-3 max-w-2xl leading-relaxed">
            Have a question, an idea or need assistance? We&apos;d like to hear from you.
          </p>
        </header>

        {/* Split Screen Composition: Form on Left, Editorial Information on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Interactive Contact Form */}
          <div className="lg:col-span-7 bg-[#161E2E] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">
                  Send Us a Direct Message
                </h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  General inquiries, partnerships, and marketplace feedback.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#06B6D4]">
                Response &lt; 24h
              </span>
            </div>

            {/* Success State */}
            <AnimatePresence>
              {submittedEnquiryId && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-6 p-5 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 space-y-2"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#22C55E]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Enquiry Submitted Successfully</span>
                  </div>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">
                    Thank you, <strong className="text-white">{name}</strong>. Your reference ID is{' '}
                    <span className="font-mono text-[#22C55E] font-bold">
                      {submittedEnquiryId}
                    </span>
                    . Our team has received your message and will reply to{' '}
                    <span className="font-mono text-white">{email}</span> within one business day.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedEnquiryId(null)}
                    className="mt-2 text-xs font-semibold text-[#A78BFA] hover:text-[#D8B4FE] underline cursor-pointer"
                  >
                    Submit another enquiry
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-3 text-xs text-[#EF4444]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8]"
                  >
                    Full Name <span className="text-[#8B5CF6]">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="e.g. Priya Sharma"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors ${
                      fieldErrors.name
                        ? 'border-[#EF4444] focus:border-[#EF4444]'
                        : 'border-white/[0.08] focus:border-[#8B5CF6]'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] text-[#EF4444]">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8]"
                  >
                    Email Address <span className="text-[#8B5CF6]">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="e.g. priya@gmail.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors ${
                      fieldErrors.email
                        ? 'border-[#EF4444] focus:border-[#EF4444]'
                        : 'border-white/[0.08] focus:border-[#8B5CF6]'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-[#EF4444]">{fieldErrors.email}</p>
                  )}
                </div>
              </div>

              {/* Enquiry Category */}
              <div className="space-y-1.5">
                <label
                  htmlFor="contact-category"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8]"
                >
                  Enquiry Category <span className="text-[#8B5CF6]">*</span>
                </label>
                <select
                  id="contact-category"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as ContactEnquiryCategory)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                >
                  {ALLOWED_CONTACT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#111827]">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label
                  htmlFor="contact-subject"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8]"
                >
                  Subject <span className="text-[#8B5CF6]">*</span>
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (fieldErrors.subject) setFieldErrors((prev) => ({ ...prev, subject: '' }));
                  }}
                  placeholder="Summary of your question or idea"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors ${
                    fieldErrors.subject
                      ? 'border-[#EF4444] focus:border-[#EF4444]'
                      : 'border-white/[0.08] focus:border-[#8B5CF6]'
                  }`}
                />
                {fieldErrors.subject && (
                  <p className="text-[11px] text-[#EF4444]">{fieldErrors.subject}</p>
                )}
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8]"
                  >
                    Message <span className="text-[#8B5CF6]">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    {message.length} / 2500
                  </span>
                </div>
                <textarea
                  id="contact-message"
                  rows={5}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (fieldErrors.message) setFieldErrors((prev) => ({ ...prev, message: '' }));
                  }}
                  placeholder="Tell us more about how we can help..."
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-[#111827] border text-xs text-[#F8FAFC] placeholder:text-[#64748B] focus:outline-none transition-colors resize-y ${
                    fieldErrors.message
                      ? 'border-[#EF4444] focus:border-[#EF4444]'
                      : 'border-white/[0.08] focus:border-[#8B5CF6]'
                  }`}
                />
                {fieldErrors.message && (
                  <p className="text-[11px] text-[#EF4444]">{fieldErrors.message}</p>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-60 text-white text-xs font-semibold transition-all shadow-lg shadow-[#8B5CF6]/20 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Enquiry...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Message to BorrowBox</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Editorial Support Overview & City Hubs */}
          <div className="lg:col-span-5 space-y-6">
            {/* Active Support Desk Callout */}
            <div className="p-6 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#A78BFA]">
                <ShieldCheck className="w-4 h-4" />
                <span>Existing Booking or Dispute?</span>
              </div>
              <h3 className="text-base font-bold text-[#F8FAFC]">
                Use the Verified Support Desk
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                If you are a Borrower or Owner with an active reservation, handover verification issue, or deposit question, please open a formal support ticket so our team can immediately inspect your booking record.
              </p>
              <button
                type="button"
                onClick={() => {
                  onNavigate({ page: 'support' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B5CF6] hover:text-[#A78BFA] transition-colors cursor-pointer"
              >
                <span>Go to BorrowBox Support</span>
                <span>→</span>
              </button>
            </div>

            {/* Operating Hours & Expectations */}
            <div className="p-6 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-3 text-xs text-[#CBD5E1]">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#06B6D4]">
                <Clock className="w-4 h-4" />
                <span>Operating Timelines</span>
              </div>
              <div className="space-y-1 text-[#94A3B8]">
                <p>
                  <strong className="text-[#F8FAFC]">Support Operations:</strong> Monday to Sunday, 8:00 AM – 10:00 PM IST
                </p>
                <p>
                  <strong className="text-[#F8FAFC]">General Enquiries Response:</strong> Typically within 1 business day
                </p>
                <p>
                  <strong className="text-[#F8FAFC]">Official Support Email:</strong>{' '}
                  <span className="font-mono text-[#F8FAFC]">support@borrowbox.in</span>
                </p>
              </div>
            </div>

            {/* Indian Metropolitan Hubs */}
            <div className="p-6 rounded-2xl bg-[#161E2E] border border-white/[0.08] space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-[#A78BFA]">
                <MapPin className="w-4 h-4" />
                <span>Active Metropolitan Rental Hubs</span>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                BorrowBox peer-to-peer equipment handovers operate across verified neighborhoods in:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#F8FAFC]">
                <div className="p-2.5 rounded-lg bg-[#111827] border border-white/[0.05]">
                  <div className="font-semibold">Bengaluru</div>
                  <div className="text-[10px] text-[#94A3B8]">Indiranagar · HSR · Koramangala</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#111827] border border-white/[0.05]">
                  <div className="font-semibold">Mumbai</div>
                  <div className="text-[10px] text-[#94A3B8]">Andheri · Powai · Bandra</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#111827] border border-white/[0.05]">
                  <div className="font-semibold">Delhi NCR</div>
                  <div className="text-[10px] text-[#94A3B8]">Hauz Khas · Gurgaon · Noida</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#111827] border border-white/[0.05]">
                  <div className="font-semibold">Hyderabad</div>
                  <div className="text-[10px] text-[#94A3B8]">Jubilee Hills · Gachibowli · Hitec</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#111827] border border-white/[0.05]">
                  <div className="font-semibold">Pune</div>
                  <div className="text-[10px] text-[#94A3B8]">Koregaon Park · Kothrud · Baner</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#111827] border border-white/[0.05]">
                  <div className="font-semibold">Chennai</div>
                  <div className="text-[10px] text-[#94A3B8]">Adyar · Besant Nagar · OMR</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
