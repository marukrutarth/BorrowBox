import { CategoryName } from '../types/marketplace';
import { ALL_CATEGORIES } from './rentalLogic';
import { PageRoute } from '../components/Navbar';

export interface HeaderNavItem {
  id: string;
  label: string;
  href: string;
  route: PageRoute;
  isPrimaryAction?: boolean;
}

export const CATEGORY_DISPLAY_LABELS: Record<CategoryName, string> = {
  Electronics: 'Electronics & Projectors',
  Photography: 'Cameras & Photography',
  Gaming: 'Gaming & Consoles',
  Tools: 'Tools & DIY Equipment',
  Outdoor: 'Travel & Outdoor Gear',
  Events: 'Events & Audio Systems',
  'Musical Instruments': 'Musical Instruments',
  Education: 'Education & Study Gear',
};

/**
 * Primary desktop navigation items shown directly in the top bar.
 * Prioritises the core marketplace actions: Home, Browse, and List Your Item.
 */
export const DESKTOP_PRIMARY_NAV_ITEMS: HeaderNavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    route: { page: 'home' },
  },
  {
    id: 'browse',
    label: 'Browse',
    href: '/browse',
    route: { page: 'browse' },
  },
  {
    id: 'list-item',
    label: 'List Your Item',
    href: '/list-item',
    route: { page: 'list-item' },
    isPrimaryAction: true,
  },
];

/**
 * Secondary navigation links grouped logically inside the desktop "More" dropdown
 * and mobile slide-over navigation drawer so no destination is lost.
 */
export const SECONDARY_INFO_NAV_ITEMS: HeaderNavItem[] = [
  {
    id: 'how-it-works',
    label: 'How It Works',
    href: '/how-it-works',
    route: { page: 'how-it-works' },
  },
  {
    id: 'about',
    label: 'About Us',
    href: '/about',
    route: { page: 'about' },
  },
  {
    id: 'team',
    label: 'Our Team',
    href: '/team',
    route: { page: 'team' },
  },
  {
    id: 'support',
    label: 'Support Center',
    href: '/support',
    route: { page: 'support' },
  },
  {
    id: 'contact',
    label: 'Contact Us',
    href: '/contact',
    route: { page: 'contact' },
  },
];

export function isPrimaryNavActive(
  itemId: string,
  currentRoute: PageRoute
): boolean {
  if (itemId === 'home') {
    return currentRoute.page === 'home';
  }
  if (itemId === 'browse') {
    return currentRoute.page === 'browse' || currentRoute.page === 'details';
  }
  if (itemId === 'list-item') {
    return currentRoute.page === 'list-item';
  }
  return currentRoute.page === itemId;
}

export function isSecondaryDropdownActive(currentRoute: PageRoute): boolean {
  return SECONDARY_INFO_NAV_ITEMS.some(
    (item) => item.route.page === currentRoute.page
  );
}

export function getCategoryDropdownItems(): Array<{
  category: CategoryName;
  displayLabel: string;
  route: PageRoute;
}> {
  return ALL_CATEGORIES.map((category) => ({
    category,
    displayLabel: CATEGORY_DISPLAY_LABELS[category] || category,
    route: { page: 'browse', category },
  }));
}
