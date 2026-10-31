import React from 'react';
import { Box, ShieldCheck } from 'lucide-react';
import { CategoryName } from '../types/marketplace';
import { ALL_CATEGORIES } from '../utils/rentalLogic';
import { PageRoute } from './Navbar';

export type FooterInfoPageKey =
  | 'about'
  | 'contact'
  | 'terms'
  | 'privacy'
  | 'help';

interface FooterProps {
  onNavigate: (route: PageRoute) => void;
  onOpenInfoModal: (infoKey: FooterInfoPageKey) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenInfoModal,
}) => {
  const handleCategoryClick = (cat: CategoryName) => {
    onNavigate({ page: 'browse', category: cat });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#090D16] border-t border-white/[0.07] text-[#94A3B8] relative z-10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate({ page: 'home' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#F8FAFC]"
            >
              <span className="w-7 h-7 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
                <Box className="w-4 h-4" />
              </span>
              <span>
                Borrow<span className="text-[#8B5CF6]">Box</span>
              </span>
            </a>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Rent What You Need. Earn From What You Own. India’s neighborhood
              peer-to-peer rental marketplace with transparent ₹ daily pricing
              and refundable security deposits.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#94A3B8] pt-1">
              <ShieldCheck className="w-4 h-4 text-[#06B6D4] shrink-0" />
              <span>
                Bengaluru · Mumbai · Delhi NCR · Hyderabad · Pune · Chennai
              </span>
            </div>
          </div>

          {/* Popular Categories */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC] mb-4">
              Popular Categories
            </h3>
            <ul className="space-y-2.5 text-sm">
              {ALL_CATEGORIES.slice(0, 5).map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className="text-[#94A3B8] hover:text-[#8B5CF6] transition-colors cursor-pointer"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* More Categories & Actions */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC] mb-4">
              More Categories & Actions
            </h3>
            <ul className="space-y-2.5 text-sm">
              {ALL_CATEGORIES.slice(5).map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className="text-[#94A3B8] hover:text-[#8B5CF6] transition-colors cursor-pointer"
                  >
                    {cat}
                  </button>
                </li>
              ))}
              <li className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate({ page: 'list-item' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-[#8B5CF6] font-semibold hover:text-[#A78BFA] transition-colors cursor-pointer"
                >
                  List Your Item →
                </button>
              </li>
            </ul>
          </div>

          {/* Company, Support & Legal */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC] mb-4">
              Company & Support
            </h3>
            <ul className="space-y-2.5 text-sm">
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
                  onClick={() => onOpenInfoModal('contact')}
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </li>
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
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('help')}
                  className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
                >
                  Help
                </button>
              </li>
              <li>
                <a
                  href="/admin"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate({ page: 'admin' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-[#94A3B8] hover:text-[#8B5CF6] transition-colors cursor-pointer font-mono text-xs"
                >
                  Admin Console (/admin)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#94A3B8]">
          <p>
            © {new Date().getFullYear()} BorrowBox India. All prices displayed
            in Indian Rupees (₹).
          </p>
          <p>
            Peer-to-peer rental platform · Sample listings are separated from
            community listings.
          </p>
        </div>
      </div>
    </footer>
  );
};
