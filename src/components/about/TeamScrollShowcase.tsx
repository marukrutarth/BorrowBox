import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import {
  TEAM_PAGE_CONTENT,
  TeamMember,
  getContributorMember,
  getFounderMembers,
  getGuideMember,
} from '../../data/teamMembers';
import {
  computeCardVisualState,
  computeSectionScrollProgress,
  computeTimelinePosition,
  getActiveCardIndex,
  getScrollTargetForCardIndex,
} from '../../utils/teamScrollAnimation';
import { ContributorProfile } from './ContributorProfile';
import { FoundingTeam } from './FoundingTeam';
import { GuideProfile } from './GuideProfile';
import { TeamPortrait } from './TeamPortrait';

export interface TeamScrollShowcaseProps {
  members: TeamMember[];
}

const STICKY_TOP_OFFSET_PX = 84;

export const TeamScrollShowcase: React.FC<TeamScrollShowcaseProps> = ({
  members,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const runwayRef = useRef<HTMLDivElement | null>(null);

  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });

  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [timelinePosition, setTimelinePosition] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = () => {
      setIsDesktopViewport(mediaQuery.matches);
    };
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const updateScrollState = useCallback(() => {
    const runwayEl = runwayRef.current;
    if (!runwayEl || typeof window === 'undefined') return;

    const rect = runwayEl.getBoundingClientRect();
    const progress = computeSectionScrollProgress(
      rect.top,
      rect.height,
      window.innerHeight,
      STICKY_TOP_OFFSET_PX
    );
    const timeline = computeTimelinePosition(progress, members.length);

    setScrollProgress(progress);
    setTimelinePosition(timeline);
  }, [members.length]);

  useEffect(() => {
    if (!isDesktopViewport || prefersReducedMotion) return;

    let rafId: number | null = null;
    const onScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateScrollState();
      });
    };

    updateScrollState();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isDesktopViewport, prefersReducedMotion, updateScrollState]);

  const activeIndex = getActiveCardIndex(timelinePosition, members.length);
  const activeMember = members[activeIndex] || members[0];

  const scrollToMemberIndex = useCallback(
    (targetIndex: number) => {
      const clampedIndex = Math.max(
        0,
        Math.min(members.length - 1, targetIndex)
      );
      const runwayEl = runwayRef.current;
      if (!runwayEl || typeof window === 'undefined') {
        setTimelinePosition(clampedIndex);
        return;
      }

      const rect = runwayEl.getBoundingClientRect();
      const documentTopY = window.scrollY + rect.top;
      const targetScrollTop = getScrollTargetForCardIndex(
        clampedIndex,
        members.length,
        documentTopY,
        rect.height,
        window.innerHeight,
        STICKY_TOP_OFFSET_PX
      );

      window.scrollTo({
        top: targetScrollTop,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    },
    [members.length, prefersReducedMotion]
  );

  // Keyboard arrow navigation when on Desktop showcase
  useEffect(() => {
    if (!isDesktopViewport || prefersReducedMotion) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollToMemberIndex(activeIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToMemberIndex(activeIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, isDesktopViewport, prefersReducedMotion, scrollToMemberIndex]);

  // Mobile / Tablet (< 1024px) OR Reduced-Motion Fallback
  if (!isDesktopViewport || prefersReducedMotion) {
    const founders = getFounderMembers(members);
    const guide = getGuideMember(members);
    const contributor = getContributorMember(members);

    return (
      <div
        data-testid="team-responsive-layout"
        className="divide-y divide-white/[0.08]"
      >
        <FoundingTeam
          sectionHeading={TEAM_PAGE_CONTENT.sections.foundersHeading}
          founders={founders}
        />
        <GuideProfile
          sectionHeading={TEAM_PAGE_CONTENT.sections.guideHeading}
          guide={guide}
        />
        <ContributorProfile
          sectionHeading={TEAM_PAGE_CONTENT.sections.contributorHeading}
          contributor={contributor}
        />
      </div>
    );
  }

  return (
    <section
      ref={runwayRef}
      data-testid="team-scroll-runway"
      aria-label="BorrowBox Team Interactive Showcase"
      className="relative h-[380vh] pt-4"
    >
      {/* Sticky Desktop Presentation Stage */}
      <div
        data-testid="team-sticky-stage"
        data-active-member-id={activeMember.id}
        data-active-member-index={activeIndex}
        className="sticky top-[84px] flex flex-col gap-4 py-2"
      >
        {/* Stage Top Bar: Active Group Label & 6-Step Member Progress Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold text-[#A78BFA]">
              0{activeMember.order} / 0{members.length}
            </span>
            <span className="h-3.5 w-px bg-white/[0.12]" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F8FAFC]">
                {activeMember.groupLabel}
              </p>
            </div>
          </div>

          {/* Interactive Roster Progress Selector + Prev/Next Controls */}
          <div className="flex items-center gap-2">
            <nav
              aria-label="Team member progress"
              className="flex items-center gap-1 p-1 rounded-xl bg-[#0B0F19]/80 border border-white/[0.08]"
            >
              {members.map((member, idx) => {
                const isCurrent = idx === activeIndex;

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => scrollToMemberIndex(idx)}
                    aria-label={`View ${member.name}, ${member.role}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`group relative px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-[#1D293B] text-[#F8FAFC] shadow-sm'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#161E2E]/70'
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] ${
                        isCurrent ? 'text-[#A78BFA]' : 'text-[#94A3B8]'
                      }`}
                    >
                      0{member.order}
                    </span>
                    <span className="hidden xl:inline">
                      {member.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollToMemberIndex(activeIndex - 1)}
                disabled={activeIndex === 0}
                aria-label="Previous team member"
                className="p-2 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] disabled:opacity-35 disabled:pointer-events-none border border-white/[0.08] text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollToMemberIndex(activeIndex + 1)}
                disabled={activeIndex === members.length - 1}
                aria-label="Next team member"
                className="p-2 rounded-lg bg-[#161E2E] hover:bg-[#1D293B] disabled:opacity-35 disabled:pointer-events-none border border-white/[0.08] text-[#F8FAFC] transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Center Featured Card Stage (One featured profile card displayed at a time with smooth scroll-driven swap) */}
        <div className="relative h-[435px] xl:h-[465px] w-full flex items-center justify-center">
          {members.map((member, idx) => {
            const visual = computeCardVisualState(idx, timelinePosition);
            const nextMember = members[idx + 1] || null;
            const isGuide = member.category === 'guide';
            const isTechLead = member.category === 'contributor';

            // Visually distinct surface treatments for Founders vs Project Guide vs Technical Lead
            const cardSurfaceClasses = isGuide
              ? 'bg-[#1D293B] border-[#A78BFA]/30'
              : isTechLead
              ? 'bg-[#161E2E] border-[#8B5CF6]/35'
              : 'bg-[#161E2E] border-white/[0.08]';

            return (
              <article
                key={member.id}
                data-testid={`team-featured-card-${member.id}`}
                data-active={visual.isActive ? 'true' : 'false'}
                aria-hidden={!visual.isActive}
                style={{
                  transform: `translate3d(${visual.translateX}px, ${visual.translateY}px, 0) scale(${visual.scale})`,
                  opacity: visual.opacity,
                  zIndex: visual.zIndex,
                  pointerEvents: visual.isActive ? 'auto' : 'none',
                  willChange: 'transform, opacity',
                }}
                className={`absolute inset-0 rounded-2xl border ${cardSurfaceClasses} overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition-colors duration-300`}
              >
                {/* Top Hairline Accent Bar for visually distinct Guide and Technical Lead cards */}
                {(isGuide || isTechLead) && (
                  <div
                    className={`pointer-events-none absolute top-0 inset-x-0 h-[2px] ${
                      isGuide
                        ? 'bg-gradient-to-r from-[#A78BFA] via-[#8B5CF6] to-transparent'
                        : 'bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-transparent'
                    }`}
                    aria-hidden="true"
                  />
                )}

                <div className="h-full grid grid-cols-12 gap-8 xl:gap-12 p-6 lg:p-7 xl:p-9 items-center">
                  {/* Left: Prominent 4:5 Portrait Photograph */}
                  <div className="col-span-5 h-full flex items-center justify-center">
                    <div className="relative aspect-[4/5] h-full max-h-[380px] xl:max-h-[405px] w-auto rounded-xl overflow-hidden bg-[#111827] border border-white/[0.08]">
                      <TeamPortrait
                        member={member}
                        priority
                        className="w-full h-full"
                      />

                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0B0F19]/65 to-transparent"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  {/* Right: Editorial Profile Information */}
                  <div className="col-span-7 h-full flex flex-col justify-between py-1">
                    {/* Card Top Category Context (clean borderless micro-typography) */}
                    <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
                      <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#94A3B8]">
                        {isGuide
                          ? 'Academic & Project Guidance'
                          : isTechLead
                          ? 'Platform Architecture & Engineering'
                          : `Founding Team · Co-Founder 0${member.order}`}
                      </span>

                      <span className="text-xs font-mono text-[#A78BFA]">
                        0{member.order} / 0{members.length}
                      </span>
                    </div>

                    {/* Main Profile Identity & Bio */}
                    <div className="space-y-4 my-auto py-3">
                      <div className="space-y-1.5">
                        <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-[#A78BFA]">
                          {member.role}
                        </p>
                        <h2 className="text-3xl lg:text-4xl xl:text-[2.65rem] font-bold tracking-tight text-[#F8FAFC] leading-[1.12]">
                          {member.name}
                        </h2>
                      </div>

                      <div
                        className="h-px w-14 bg-[#8B5CF6]/50"
                        aria-hidden="true"
                      />

                      <p className="text-base xl:text-lg text-[#94A3B8] leading-relaxed max-w-xl">
                        {member.bio}
                      </p>

                      {/* Distinct editorial metadata row for Guide and Technical Lead (no stacked pills) */}
                      {isGuide && (
                        <div className="pt-3 grid grid-cols-2 gap-6 border-t border-white/[0.08] text-xs">
                          <div>
                            <p className="text-[#94A3B8]">Focus</p>
                            <p className="font-medium text-[#F8FAFC] mt-0.5">
                              Academic &amp; Strategic Mentorship
                            </p>
                          </div>
                          <div>
                            <p className="text-[#94A3B8]">Scope</p>
                            <p className="font-medium text-[#F8FAFC] mt-0.5">
                              Project Direction &amp; Review
                            </p>
                          </div>
                        </div>
                      )}

                      {isTechLead && (
                        <div className="pt-3 grid grid-cols-3 gap-4 border-t border-white/[0.08] text-xs">
                          <div>
                            <p className="text-[#94A3B8]">Architecture</p>
                            <p className="font-medium text-[#F8FAFC] mt-0.5">
                              Full-Stack Platform
                            </p>
                          </div>
                          <div>
                            <p className="text-[#94A3B8]">Application</p>
                            <p className="font-medium text-[#F8FAFC] mt-0.5">
                              Frontend &amp; Backend
                            </p>
                          </div>
                          <div>
                            <p className="text-[#94A3B8]">Data Layer</p>
                            <p className="font-medium text-[#F8FAFC] mt-0.5">
                              Database Integrations
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Bottom Sequence Bar */}
                    <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-4 text-xs text-[#94A3B8]">
                      <div className="flex items-center gap-2">
                        {members.map((m, dotIdx) => (
                          <span
                            key={m.id}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              dotIdx === idx
                                ? 'w-7 bg-[#8B5CF6]'
                                : m.category === 'founder'
                                ? 'w-2 bg-white/20'
                                : 'w-2 bg-[#A78BFA]/35'
                            }`}
                          />
                        ))}
                      </div>

                      {nextMember ? (
                        <button
                          type="button"
                          onClick={() => scrollToMemberIndex(idx + 1)}
                          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                        >
                          <span>
                            Next:{' '}
                            <strong className="font-medium text-[#F8FAFC]">
                              {nextMember.name}
                            </strong>{' '}
                            ({nextMember.role})
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#A78BFA]" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => scrollToMemberIndex(0)}
                          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                        >
                          <span>Return to 01 · {members[0].name}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Stage Bottom Continuous Scroll Progress Rail */}
        <div className="pt-1 flex items-center justify-between gap-6">
          <div className="flex-1 h-1 rounded-full bg-[#0B0F19] overflow-hidden">
            <div
              data-testid="team-scroll-progress-bar"
              style={{
                width: `${Math.max(
                  16.67,
                  Math.min(100, ((timelinePosition + 1) / members.length) * 100)
                )}%`,
              }}
              className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] transition-[width] duration-150 ease-out"
            />
          </div>

          <div className="shrink-0 flex items-center gap-4 text-xs text-[#94A3B8]">
            <span className="font-mono text-[#A78BFA]">
              {Math.round(scrollProgress * 100)}% scrolled
            </span>
            <span>Scroll or use arrow keys to explore</span>
          </div>
        </div>
      </div>
    </section>
  );
};
