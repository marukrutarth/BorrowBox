import React from 'react';
import {
  Camera,
  Compass,
  Cpu,
  Gamepad2,
  GraduationCap,
  Music,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CATEGORY_DIRECTORY } from '../../data/demoCatalog';
import { CategoryName, ProductListing } from '../../types/marketplace';
import {
  SCROLL_VIEWPORT_CONFIG,
  sectionScrollRevealVariants,
} from '../../utils/motionVariants';
import { formatINR } from '../../utils/rentalLogic';

export interface CategorySectionProps {
  listings: ProductListing[];
  onSelectCategory: (category: CategoryName) => void;
}

const CATEGORY_META_DISPLAY: Record<
  CategoryName,
  { label: string; icon: React.ReactNode }
> = {
  Electronics: {
    label: 'Electronics',
    icon: <Cpu className="w-5 h-5 text-[#8B5CF6]" />,
  },
  Photography: {
    label: 'Cameras',
    icon: <Camera className="w-5 h-5 text-[#8B5CF6]" />,
  },
  Gaming: {
    label: 'Gaming',
    icon: <Gamepad2 className="w-5 h-5 text-[#8B5CF6]" />,
  },
  Tools: {
    label: 'Tools',
    icon: <Wrench className="w-5 h-5 text-[#8B5CF6]" />,
  },
  Outdoor: {
    label: 'Travel & Outdoor',
    icon: <Compass className="w-5 h-5 text-[#8B5CF6]" />,
  },
  Events: {
    label: 'Events & Audio',
    icon: <Sparkles className="w-5 h-5 text-[#8B5CF6]" />,
  },
  'Musical Instruments': {
    label: 'Instruments',
    icon: <Music className="w-5 h-5 text-[#8B5CF6]" />,
  },
  Education: {
    label: 'Study & Tech',
    icon: <GraduationCap className="w-5 h-5 text-[#8B5CF6]" />,
  },
};

export const CategorySection: React.FC<CategorySectionProps> = ({
  listings,
  onSelectCategory,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const countsByCategory = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of listings) {
      if (item.status === 'archived') continue;
      map[item.category] = (map[item.category] || 0) + 1;
    }
    return map;
  }, [listings]);

  return (
    <motion.section
      id="categories"
      initial={prefersReducedMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={SCROLL_VIEWPORT_CONFIG}
      variants={sectionScrollRevealVariants}
      className="py-8 sm:py-10 lg:py-12"
    >
      <div className="bb-container space-y-5 sm:space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] tracking-tight">
              Explore Categories
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
              Browse verified equipment across every category.
            </p>
          </div>
        </div>

        {/* Mobile: horizontal scrolling tiles | Desktop: responsive 4-col / 8-col grid */}
        <div className="flex sm:grid sm:grid-cols-4 lg:grid-cols-8 gap-3 overflow-x-auto bb-no-scrollbar pb-1 sm:pb-0 snap-x">
          {CATEGORY_DIRECTORY.map((cat) => {
            const display = CATEGORY_META_DISPLAY[cat.name] || {
              label: cat.name,
              icon: <Cpu className="w-5 h-5 text-[#8B5CF6]" />,
            };
            const count = countsByCategory[cat.name] || 0;

            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => onSelectCategory(cat.name)}
                className="group shrink-0 w-36 sm:w-auto snap-start text-left p-3.5 sm:p-4 rounded-xl bg-[#161E2E] hover:bg-[#1D293B] border border-white/[0.08] hover:border-white/[0.16] bb-btn-interactive flex flex-col justify-between gap-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B5CF6]"
              >
                <div className="w-10 h-10 rounded-lg bg-[#111827] border border-white/[0.08] group-hover:border-[#8B5CF6]/40 flex items-center justify-center transition-colors">
                  {display.icon}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#F8FAFC] group-hover:text-white truncate">
                    {display.label}
                  </h3>
                  <p className="text-[11px] text-[#64748B] font-mono-tabular mt-0.5 truncate">
                    {count} {count === 1 ? 'item' : 'items'} · from{' '}
                    {formatINR(cat.startingPriceINR)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
};
