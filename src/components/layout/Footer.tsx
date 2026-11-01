import React from 'react';
import { BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH } from '../../utils/introAnimation';
import { PageRoute } from '../Navbar';

export type FooterInfoPageKey = string;

export interface FooterProps {
  onNavigate: (route: PageRoute) => void;
  onOpenInfoModal?: (infoKey: string) => void;
}

interface FooterLinkItem {
  label: string;
  href: string;
  route: PageRoute;
}

const FooterComponent: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent, route: PageRoute) => {
    e.preventDefault();
    onNavigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const aboutUsLinks: FooterLinkItem[] = [
    { label: 'About Us', href: '/about', route: { page: 'about' } },
    { label: 'How It Works', href: '/how-it-works', route: { page: 'how-it-works' } },
    { label: 'Our Team', href: '/team', route: { page: 'team' } },
  ];

  const supportLinks: FooterLinkItem[] = [
    { label: 'Contact Us', href: '/contact', route: { page: 'contact' } },
    { label: 'Support', href: '/support', route: { page: 'support' } },
  ];

  const legalLinks: FooterLinkItem[] = [
    { label: 'Terms & Conditions', href: '/terms', route: { page: 'terms' } },
    { label: 'Privacy Policy', href: '/privacy', route: { page: 'privacy' } },
  ];

  return (
    <footer className="bg-[#0B0F19] border-t border-white/[0.08] text-[#94A3B8] relative z-10 pb-20 md:pb-0">
      <div className="bb-container py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14">
          {/* Brand Summary */}
          <div className="md:col-span-4 space-y-4">
            <a
              href="/"
              onClick={(e) => handleLinkClick(e, { page: 'home' })}
              className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#F8FAFC] group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] rounded-lg"
            >
              <img
                src={BORROWBOX_TRANSPARENT_SYMBOL_ASSET_PATH}
                alt="BorrowBox Logo"
                className="w-10 h-10 object-contain shrink-0 -mx-1.5 transition-transform duration-200 group-hover:scale-105"
              />
              <span>
                Borrow<span className="text-[#8B5CF6]">Box</span>
              </span>
            </a>
            <p className="text-sm text-[#94A3B8] leading-relaxed max-w-sm">
              Access more. Own less. India&apos;s verified peer-to-peer rental marketplace
              for professional cameras, gaming gear, power tools, and outdoor equipment.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#64748B] pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Direct peer-to-peer handovers with escrow protection</span>
            </div>
          </div>

          {/* Navigation Columns - Exactly 3 Columns */}
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 lg:gap-8">
            {/* Column 1: ABOUT US */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                <span>About Us</span>
              </h3>
              <ul className="space-y-2.5 text-sm">
                {aboutUsLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={(e) => handleLinkClick(e, link.route)}
                      className="group inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] transition-colors duration-200 relative py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] rounded"
                    >
                      <span>{link.label}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#8B5CF6] transition-all duration-300 ease-out group-hover:w-full" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: SUPPORT */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                <span>Support</span>
              </h3>
              <ul className="space-y-2.5 text-sm">
                {supportLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={(e) => handleLinkClick(e, link.route)}
                      className="group inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] transition-colors duration-200 relative py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] rounded"
                    >
                      <span>{link.label}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#8B5CF6] transition-all duration-300 ease-out group-hover:w-full" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: LEGAL */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                <span>Legal</span>
              </h3>
              <ul className="space-y-2.5 text-sm">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={(e) => handleLinkClick(e, link.route)}
                      className="group inline-flex items-center text-[#94A3B8] hover:text-[#F8FAFC] transition-colors duration-200 relative py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] rounded"
                    >
                      <span>{link.label}</span>
                      <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#8B5CF6] transition-all duration-300 ease-out group-hover:w-full" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#64748B]">
          <p>© {new Date().getFullYear()} BorrowBox. All prices in ₹ (INR).</p>
          <div className="space-y-0.5 text-left sm:text-right">
            <p className="font-semibold text-[#F8FAFC]">Available Across India</p>
            <p className="text-[11px] text-[#94A3B8]">
              Discover rental opportunities across cities and communities throughout India.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const Footer = React.memo(FooterComponent);
