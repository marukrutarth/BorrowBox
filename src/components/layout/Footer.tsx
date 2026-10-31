import React from 'react';
import { BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH } from '../../utils/introAnimation';
import { PageRoute } from '../Navbar';

export type FooterInfoPageKey =
  | 'about'
  | 'how-it-works'
  | 'help'
  | 'safety'
  | 'contact'
  | 'terms'
  | 'privacy';

export interface FooterProps {
  onNavigate: (route: PageRoute) => void;
  onOpenInfoModal: (infoKey: FooterInfoPageKey) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenInfoModal,
}) => {
  return (
    <footer className="bg-[#0B0F19] border-t border-white/[0.08] text-[#94A3B8] relative z-10 pb-20 md:pb-0">
      <div className="bb-container py-10 sm:py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand Summary */}
          <div className="col-span-2 md:col-span-5 space-y-3">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate({ page: 'home' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-[#F8FAFC]"
            >
              <img
                src={BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH}
                alt=""
                className="w-10 h-10 object-contain shrink-0 -mx-1.5"
              />
              <span>
                Borrow<span className="text-[#8B5CF6]">Box</span>
              </span>
            </a>
            <p className="text-sm text-[#94A3B8] max-w-sm leading-relaxed">
              Access more. Own less. Rent quality cameras, gaming consoles,
              tools, and travel gear from verified people around you.
            </p>
          </div>

          {/* BorrowBox Column */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC]">
              BorrowBox
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('about')}
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('how-it-works')}
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  How It Works
                </button>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div className="col-span-1 md:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC]">
              Support
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('help')}
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Help Centre
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('safety')}
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Safety Centre
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('contact')}
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="col-span-2 sm:col-span-1 md:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC]">
              Legal
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('terms')}
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Terms
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('privacy')}
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Privacy
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#64748B]">
          <p>© {new Date().getFullYear()} BorrowBox. All prices in ₹ (INR).</p>
          <p>Bengaluru · Mumbai · Delhi NCR · Hyderabad · Pune · Chennai</p>
        </div>
      </div>
    </footer>
  );
};
