export const FAVORITES_STORAGE_KEY = 'borrowbox_favorite_ids';
export const WISHLIST_CHANGE_EVENT = 'borrowbox-wishlist-changed';

export function loadWishlistIds(): string[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleWishlistId(listingId: string): string[] {
  const current = loadWishlistIds();
  const next = current.includes(listingId)
    ? current.filter((id) => id !== listingId)
    : [...current, listingId];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(
        new CustomEvent(WISHLIST_CHANGE_EVENT, { detail: { ids: next } })
      );
    }
  } catch {
    // Ignore storage quota errors
  }
  return next;
}
