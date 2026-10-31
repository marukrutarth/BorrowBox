import React from 'react';
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
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="md:col-span-1 space-y-3">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate({ page: 'home' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-lg font-bold tracking-tight text-slate-900 inline-block"
            >
              BorrowBox
            </a>
            <p className="text-sm text-slate-600 leading-relaxed">
              Rent What You Need. Earn From What You Own. India’s neighborhood
              peer-to-peer rental marketplace with transparent ₹ daily pricing
              and refundable security deposits.
            </p>
            <p className="text-xs text-slate-500 pt-1">
              Serving Bengaluru · Mumbai · Delhi NCR · Hyderabad · Pune · Chennai
            </p>
          </div>

          {/* Popular Categories */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 tracking-wide mb-3">
              Popular Categories
            </h3>
            <ul className="space-y-2 text-sm">
              {ALL_CATEGORIES.slice(0, 5).map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className="text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* More Categories & Actions */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 tracking-wide mb-3">
              More Categories & Actions
            </h3>
            <ul className="space-y-2 text-sm">
              {ALL_CATEGORIES.slice(5).map((cat) => (
                <li key={cat}>
                  <button
                    type="button"
                    onClick={() => handleCategoryClick(cat)}
                    className="text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
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
                  className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  List Your Item →
                </button>
              </li>
            </ul>
          </div>

          {/* Company, Support & Legal (Requested Footer Links) */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 tracking-wide mb-3">
              Company & Support
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('about')}
                  className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('contact')}
                  className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('terms')}
                  className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Terms
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('privacy')}
                  className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenInfoModal('help')}
                  className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Help
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} BorrowBox India. All prices displayed in Indian Rupees (₹).</p>
          <p>
            Demonstration environment · Sample listings are separated from session listings.
          </p>
        </div>
      </div>
    </footer>
  );
};
