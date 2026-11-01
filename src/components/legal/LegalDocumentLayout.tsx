import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Printer,
  Shield,
} from 'lucide-react';
import { PageRoute } from '../Navbar';

export interface TableOfContentsItem {
  id: string;
  title: string;
  sectionNumber: string;
}

export interface LegalDocumentLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  documentNumber: string;
  legalNotice?: string;
  tocItems: TableOfContentsItem[];
  children: React.ReactNode;
  onNavigate: (route: PageRoute) => void;
}

export const LegalDocumentLayout: React.FC<LegalDocumentLayoutProps> = ({
  title,
  subtitle,
  lastUpdated,
  documentNumber,
  legalNotice,
  tocItems,
  children,
  onNavigate,
}) => {
  const [activeSectionId, setActiveSectionId] = useState<string>(
    tocItems[0]?.id || ''
  );
  const [readingProgress, setReadingProgress] = useState(0);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      if (totalScroll > 0) {
        setReadingProgress(Math.min(100, (currentScroll / totalScroll) * 100));
      }

      // Determine active section based on scroll position
      const scrollPosition = window.scrollY + 140;
      for (let i = tocItems.length - 1; i >= 0; i--) {
        const item = tocItems[i];
        const element = document.getElementById(item.id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSectionId(item.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [tocItems]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const topOffset = 84;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveSectionId(id);
      setMobileTocOpen(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] relative">
      {/* Top Reading Progress Indicator */}
      <div
        className="fixed top-0 left-0 right-0 h-1 bg-white/[0.06] z-50 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-[#D8B4FE] transition-all duration-75 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Atmospheric Ambient Lighting */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[340px] rounded-full bg-[#8B5CF6]/10 blur-[140px]"
        aria-hidden="true"
      />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-8">
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

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#94A3B8] font-mono">
              <Shield className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>{documentNumber}</span>
            </span>
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print or save document as PDF"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Editorial Document Header */}
        <header className="mb-12 border-b border-white/[0.08] pb-10">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A78BFA] mb-3">
            <FileText className="w-4 h-4" />
            <span>BorrowBox Legal Repository</span>
            <span aria-hidden="true">·</span>
            <span>Official Policy Document</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F8FAFC] leading-tight max-w-4xl">
            {title}
          </h1>

          <p className="text-base sm:text-lg text-[#94A3B8] mt-3 max-w-3xl leading-relaxed">
            {subtitle}
          </p>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-6 text-xs text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <span className="text-[#64748B]">Effective Date:</span>
              <span className="font-mono text-[#F8FAFC]">{lastUpdated}</span>
            </div>
            <span className="text-[#64748B]" aria-hidden="true">
              ·
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#64748B]">Jurisdiction:</span>
              <span className="text-[#F8FAFC]">Republic of India</span>
            </div>
            <span className="text-[#64748B]" aria-hidden="true">
              ·
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[#64748B]">Currency:</span>
              <span className="font-mono text-[#F8FAFC]">INR (₹)</span>
            </div>
          </div>

          {legalNotice && (
            <div className="mt-6 p-4 rounded-xl bg-[#161E2E] border border-[#8B5CF6]/30 text-xs text-[#CBD5E1] flex items-start gap-3">
              <Shield className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
              <p className="leading-relaxed">{legalNotice}</p>
            </div>
          )}
        </header>

        {/* Mobile Sticky Table of Contents Dropdown */}
        <div className="lg:hidden mb-8 sticky top-16 z-30">
          <button
            type="button"
            onClick={() => setMobileTocOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#161E2E] border border-white/[0.08] shadow-lg text-xs font-semibold text-[#F8FAFC] cursor-pointer"
          >
            <span className="flex items-center gap-2 truncate">
              <FileText className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>
                Jump to Section (
                {tocItems.find((i) => i.id === activeSectionId)?.sectionNumber ||
                  '1.0'}
                )
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#94A3B8] transition-transform ${
                mobileTocOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {mobileTocOpen && (
            <div className="mt-2 p-2 rounded-xl bg-[#161E2E] border border-white/[0.08] shadow-2xl max-h-72 overflow-y-auto space-y-1">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    activeSectionId === item.id
                      ? 'bg-[#8B5CF6]/20 text-[#D8B4FE] font-semibold'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="truncate">
                    <span className="font-mono text-[#A78BFA] mr-2">
                      {item.sectionNumber}
                    </span>
                    {item.title}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Two-Column Grid: Sticky Table of Contents on Left, Article Body on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Desktop Sticky Table of Contents */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4">
            <div className="p-5 rounded-2xl bg-[#161E2E] border border-white/[0.08]">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Table of Contents
                </span>
                <span className="text-[10px] font-mono text-[#A78BFA]">
                  {tocItems.length} Sections
                </span>
              </div>

              <nav
                aria-label="Document Sections"
                className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1"
              >
                {tocItems.map((item) => {
                  const isActive = activeSectionId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors duration-150 flex items-start gap-2.5 cursor-pointer ${
                        isActive
                          ? 'bg-[#8B5CF6]/15 text-[#F8FAFC] font-semibold border-l-2 border-[#8B5CF6]'
                          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="font-mono text-[11px] text-[#A78BFA] shrink-0 pt-0.5">
                        {item.sectionNumber}
                      </span>
                      <span className="leading-snug">{item.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Document Content */}
          <main className="lg:col-span-8 min-w-0 space-y-12 leading-relaxed text-[#CBD5E1]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
