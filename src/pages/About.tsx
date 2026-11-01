import React from 'react';
import { ArrowLeft, Compass } from 'lucide-react';
import { PageRoute } from '../components/Navbar';
import { TEAM_MEMBERS, TEAM_PAGE_CONTENT } from '../data/teamMembers';
import { TeamIntroduction } from '../components/about/TeamIntroduction';
import { TeamScrollShowcase } from '../components/about/TeamScrollShowcase';

export interface AboutProps {
  onNavigate: (route: PageRoute) => void;
}

export const About: React.FC<AboutProps> = ({ onNavigate }) => {
  return (
    <div className="relative min-h-screen bg-[#0B0F19] text-[#F8FAFC] py-8 sm:py-12 lg:py-14 px-4 sm:px-6 lg:px-8 overflow-x-clip">
      {/* Lightweight GPU-friendly radial gradient atmosphere (no expensive blur overdraw) */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1080px] h-[380px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12)_0%,rgba(11,15,25,0)_72%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1280px] mx-auto">
        {/* Top Back Navigation */}
        <div className="mb-6 sm:mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onNavigate({ page: 'home' });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#94A3B8] hover:text-[#F8FAFC] bb-btn-interactive cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#8B5CF6]" />
            <span>Back to BorrowBox</span>
          </button>

          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#94A3B8]">
            BorrowBox · Our Team
          </span>
        </div>

        {/* Main Team Container (#111827 secondary background, rgba(255,255,255,0.08) border) */}
        <div className="relative rounded-2xl bg-[#111827] border border-white/[0.08] px-5 sm:px-8 md:px-10 lg:px-12 py-8 sm:py-10 lg:py-12">
          <TeamIntroduction
            eyebrow={TEAM_PAGE_CONTENT.intro.eyebrow}
            heading={TEAM_PAGE_CONTENT.intro.heading}
            description={TEAM_PAGE_CONTENT.intro.description}
          />

          <TeamScrollShowcase members={TEAM_MEMBERS} />

          {/* Restrained Bottom Navigation Footer */}
          <div className="mt-12 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#F8FAFC]">
                Built for everyday access across India
              </p>
              <p className="text-xs text-[#94A3B8]">
                Explore verified peer-to-peer rentals or read more about the
                BorrowBox mission.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onNavigate({ page: 'about' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] text-xs font-semibold text-[#F8FAFC] bb-btn-interactive cursor-pointer"
              >
                <span>About BorrowBox</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate({ page: 'browse' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold bb-glow-button cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Marketplace</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
