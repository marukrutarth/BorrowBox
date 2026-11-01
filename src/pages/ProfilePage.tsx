import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  LogOut,
  MapPin,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import {
  AdminRegistryRecord,
  BorrowBoxUserProfile,
  IndianCity,
  ProductListing,
  RentalRequestRecord,
  UserActiveMode,
} from '../types/marketplace';
import {
  ROLE_DEFINITIONS,
  computeEffectivePermissions,
  shouldShowAdminPanelOption,
} from '../utils/adminRbac';
import {
  ALL_CITIES,
  formatINR,
  validateProfileUpdateInput,
} from '../utils/rentalLogic';
import {
  INDIA_STATES_AND_UTS,
  getStateForCity,
  getLocalitiesForCity,
} from '../data/indiaLocations';
import { updateUserProfileInFirestore } from '../services/firebase';
import { PageRoute } from '../components/Navbar';

interface ProfilePageProps {
  userProfile: BorrowBoxUserProfile;
  verifiedAdminRecord?: AdminRegistryRecord | null;
  onProfileUpdated: (updated: BorrowBoxUserProfile) => void;
  onLogout: () => Promise<void>;
  onNavigate: (route: PageRoute) => void;
  userListings: ProductListing[];
  userRequests: RentalRequestRecord[];
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  verifiedAdminRecord = null,
  onProfileUpdated,
  onLogout,
  onNavigate,
  userListings,
  userRequests,
}) => {
  const [name, setName] = useState(userProfile.name);
  const [photoURL, setPhotoURL] = useState(userProfile.photoURL);
  const [city, setCity] = useState<IndianCity>(userProfile.city);
  const [selectedState, setSelectedState] = useState<string>(
    () => getStateForCity(userProfile.city) || ''
  );
  const [neighborhood, setNeighborhood] = useState(userProfile.neighborhood);

  const availableCities = React.useMemo(() => {
    if (!selectedState) return ALL_CITIES;
    const st = INDIA_STATES_AND_UTS.find((s) => s.name === selectedState);
    return st ? st.cities : ALL_CITIES;
  }, [selectedState]);

  const localitySuggestions = React.useMemo(() => {
    return city ? getLocalitiesForCity(city) : [];
  }, [city]);
  const [phone, setPhone] = useState(userProfile.phone);
  const [activeMode, setActiveMode] = useState<UserActiveMode>(
    userProfile.activeMode
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedCreatedAt = new Date(
    userProfile.createdAtISO
  ).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleModeSwitch = async (newMode: UserActiveMode) => {
    setActiveMode(newMode);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateUserProfileInFirestore(userProfile.uid, {
        name,
        photoURL,
        city,
        neighborhood,
        phone,
        activeMode: newMode,
      });
      onProfileUpdated({
        ...userProfile,
        activeMode: newMode,
        updatedAtISO: new Date().toISOString(),
      });
      setSuccessMessage(
        `Switched active perspective to ${
          newMode === 'renter' ? 'Renter' : 'Owner'
        } mode.`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to update active mode.'
      );
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const validation = validateProfileUpdateInput({
      name,
      photoURL,
      city,
      neighborhood,
      phone,
      activeMode,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      await updateUserProfileInFirestore(userProfile.uid, {
        name: name.trim(),
        photoURL: photoURL.trim(),
        city,
        neighborhood: neighborhood.trim(),
        phone: phone.trim(),
        activeMode,
      });

      onProfileUpdated({
        ...userProfile,
        name: name.trim(),
        photoURL: photoURL.trim(),
        city,
        neighborhood: neighborhood.trim(),
        phone: phone.trim(),
        activeMode,
        updatedAtISO: new Date().toISOString(),
      });
      setSuccessMessage(
        'Your profile and private contact details have been saved to Cloud Firestore.'
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Could not save profile changes to Firestore.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="bg-transparent min-h-screen py-10 lg:py-12 text-[#F8FAFC]">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => onNavigate({ page: 'browse' })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-[#8B5CF6] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Browse Items
          </button>

          <div className="flex items-center gap-2.5">
            {shouldShowAdminPanelOption(verifiedAdminRecord) &&
              verifiedAdminRecord && (
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'admin' })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#F8FAFC] bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 border border-[#8B5CF6]/40 rounded-xl transition-colors cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>Admin Panel</span>
                </button>
              )}

            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogoutClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#F8FAFC] bg-[#161E2E] border border-white/[0.08] rounded-xl hover:bg-[#1D293B] cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5 text-[#EF4444]" />
              {isLoggingOut ? 'Signing Out...' : 'Log Out'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Account Identity Summary & Dual Role Switcher */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 border border-white/[0.08] rounded-2xl bg-[#161E2E] space-y-5 shadow-xl">
              <div className="flex items-center gap-4">
                {userProfile.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt={userProfile.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full object-cover border border-white/[0.12] bg-[#1D293B] shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center text-xl font-bold shrink-0">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-[#F8FAFC] truncate">
                    {userProfile.name}
                  </h1>
                  <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                    {userProfile.email}
                  </p>
                  <p className="text-xs text-[#06B6D4] mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0" />
                    <span>
                      {userProfile.neighborhood}, {userProfile.city}
                    </span>
                  </p>
                </div>
              </div>

              {/* Firestore Profile Attributes */}
              <div className="pt-4 border-t border-white/[0.08] space-y-2.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-[#94A3B8]">Unique User ID (UID)</span>
                  <span className="font-mono-tabular text-[#F8FAFC] truncate max-w-[22ch]">
                    {userProfile.uid}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#94A3B8]">Account Created</span>
                  <span className="font-medium text-[#F8FAFC]">
                    {formattedCreatedAt}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#94A3B8]">
                    Marketplace Capabilities
                  </span>
                  <span className="font-medium text-[#F8FAFC]">
                    Renter & Item Owner
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#94A3B8]">
                    Security Permission Tier
                  </span>
                  <span className="font-medium text-[#22C55E] inline-flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    {shouldShowAdminPanelOption(verifiedAdminRecord) &&
                    verifiedAdminRecord
                      ? `${
                          ROLE_DEFINITIONS[verifiedAdminRecord.role]?.label ||
                          'Administrator'
                        } (/admins)`
                      : 'Standard Member'}
                  </span>
                </div>
              </div>

              {/* Dynamic Admin Panel Card — rendered ONLY for verified active administrators */}
              {shouldShowAdminPanelOption(verifiedAdminRecord) &&
                verifiedAdminRecord && (
                  <div className="pt-4 border-t border-white/[0.08]">
                    <div className="p-4 rounded-xl bg-[#111827] border border-[#8B5CF6]/35 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F8FAFC]">
                          <Shield className="w-3.5 h-3.5 text-[#8B5CF6]" />
                          <span>Verified Administrative Access</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[10px] font-mono text-[#06B6D4]">
                          {
                            computeEffectivePermissions(
                              verifiedAdminRecord.role,
                              verifiedAdminRecord.customPermissions,
                              verifiedAdminRecord.revokedPermissions
                            ).length
                          }{' '}
                          Perms
                        </span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                        Role:{' '}
                        <strong className="text-[#F8FAFC]">
                          {ROLE_DEFINITIONS[verifiedAdminRecord.role]?.label}
                        </strong>
                        . Open your role-based administration console without
                        re-authenticating.
                      </p>
                      <button
                        type="button"
                        onClick={() => onNavigate({ page: 'admin' })}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Open Admin Panel</span>
                      </button>
                    </div>
                  </div>
                )}

              {/* Dual Renter / Owner Mode Switcher */}
              <div className="pt-4 border-t border-white/[0.08] space-y-2">
                <p className="text-xs font-semibold text-[#F8FAFC]">
                  Active Marketplace Perspective
                </p>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Every BorrowBox account can both borrow items from neighbors
                  and list unused belongings to earn in ₹.
                </p>
                <div
                  role="group"
                  aria-label="Switch Renter or Owner Mode"
                  className="grid grid-cols-2 gap-2 pt-1"
                >
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('renter')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                      activeMode === 'renter'
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'bg-[#111827] text-[#94A3B8] border-white/[0.08] hover:text-[#F8FAFC]'
                    }`}
                  >
                    Renter Mode ({userRequests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('owner')}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                      activeMode === 'owner'
                        ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                        : 'bg-[#111827] text-[#94A3B8] border-white/[0.08] hover:text-[#F8FAFC]'
                    }`}
                  >
                    Owner Mode ({userListings.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Active Mode Activity Summary */}
            <div className="p-6 border border-white/[0.08] rounded-2xl bg-[#161E2E] space-y-3 shadow-xl">
              {activeMode === 'renter' ? (
                <>
                  <h2 className="text-sm font-semibold text-[#F8FAFC]">
                    Your Renter Activity
                  </h2>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    You have submitted{' '}
                    <strong className="text-[#F8FAFC]">
                      {userRequests.length}
                    </strong>{' '}
                    rental request(s) in this session.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'browse' })}
                    className="px-4 py-2 bg-[#8B5CF6] text-white text-xs font-semibold rounded-xl hover:bg-[#7C3AED] cursor-pointer"
                  >
                    Explore Items to Rent
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-[#F8FAFC]">
                    Your Owner Listings
                  </h2>
                  <p className="text-xs text-[#94A3B8] leading-relaxed">
                    You have published{' '}
                    <strong className="text-[#F8FAFC]">
                      {userListings.length}
                    </strong>{' '}
                    item listing(s) in this session.
                  </p>
                  {userListings.length > 0 && (
                    <ul className="space-y-1.5 text-xs text-[#F8FAFC] pt-1">
                      {userListings.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between items-center bg-[#111827] p-2.5 rounded-lg border border-white/[0.08]"
                        >
                          <span className="truncate max-w-[24ch] font-medium">
                            {item.title}
                          </span>
                          <span className="font-mono-tabular font-semibold text-[#06B6D4]">
                            {formatINR(item.dailyPriceINR)}/day
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'list-item' })}
                    className="px-4 py-2 bg-[#8B5CF6] text-white text-xs font-semibold rounded-xl hover:bg-[#7C3AED] cursor-pointer"
                  >
                    + List Another Item
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Edit Firestore Profile Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 border border-white/[0.08] rounded-2xl bg-[#161E2E] space-y-6 shadow-2xl">
              <div>
                <h2 className="text-lg font-bold text-[#F8FAFC]">
                  Edit Profile & Isolated Contact Information
                </h2>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Public display fields are stored in{' '}
                  <code className="font-mono-tabular text-[#06B6D4]">
                    /users/{userProfile.uid.slice(0, 8)}...
                  </code>{' '}
                  while your private email and phone number are isolated in{' '}
                  <code className="font-mono-tabular text-[#06B6D4]">
                    /private/info
                  </code>
                  .
                </p>
              </div>

              {successMessage && (
                <div
                  role="status"
                  className="p-3.5 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/30 text-xs text-[#22C55E] flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444]"
                >
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSaveProfile} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                  >
                    Full Name *
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                  />
                  {errors.name && (
                    <p className="text-xs text-[#EF4444] mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="profile-email-readonly"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                  >
                    Verified Account Email (Private PII)
                  </label>
                  <input
                    id="profile-email-readonly"
                    type="email"
                    value={userProfile.email}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-[#111827]/60 border border-white/[0.06] rounded-xl text-sm text-[#94A3B8] cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="profile-state"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                    >
                      State / Union Territory
                    </label>
                    <select
                      id="profile-state"
                      value={selectedState}
                      onChange={(e) => {
                        const nextState = e.target.value;
                        setSelectedState(nextState);
                        if (nextState) {
                          const stateObj = INDIA_STATES_AND_UTS.find(
                            (s) => s.name === nextState
                          );
                          if (stateObj && !stateObj.cities.includes(city)) {
                            setCity(stateObj.cities[0]);
                          }
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                    >
                      <option value="">All States & UTs (or select State)</option>
                      {INDIA_STATES_AND_UTS.map((st) => (
                        <option key={st.name} value={st.name}>
                          {st.name} ({st.type === 'ut' ? 'UT' : 'State'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-city"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                    >
                      City *
                    </label>
                    <select
                      id="profile-city"
                      value={city}
                      onChange={(e) => {
                        const nextCity = e.target.value as IndianCity;
                        setCity(nextCity);
                        if (nextCity) {
                          const parentState = getStateForCity(nextCity);
                          if (parentState) setSelectedState(parentState);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                    >
                      {availableCities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.city && (
                      <p className="text-xs text-[#EF4444] mt-1">{errors.city}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-neighborhood"
                    className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                  >
                    Neighborhood / Locality *
                  </label>
                  <input
                    id="profile-neighborhood"
                    list="profile-locality-options"
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder={
                      city
                        ? `e.g., Locality in ${city}`
                        : 'e.g., Indiranagar, Bandra West'
                    }
                    className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                  />
                  <datalist id="profile-locality-options">
                    {localitySuggestions.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                  {localitySuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {localitySuggestions.slice(0, 6).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setNeighborhood(loc)}
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                            neighborhood === loc
                              ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                              : 'bg-[#111827] text-[#94A3B8] border-white/[0.08] hover:text-[#F8FAFC]'
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.neighborhood && (
                    <p className="text-xs text-[#EF4444] mt-1">
                      {errors.neighborhood}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="profile-phone"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                    >
                      Mobile Number (+91, Private PII)
                    </label>
                    <input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm font-mono-tabular text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    {errors.phone && (
                      <p className="text-xs text-[#EF4444] mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="profile-photo-url"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                    >
                      Profile Image URL (Optional)
                    </label>
                    <input
                      id="profile-photo-url"
                      type="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    {errors.photoURL && (
                      <p className="text-xs text-[#EF4444] mt-1">
                        {errors.photoURL}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl transition-all bb-glow-button cursor-pointer disabled:opacity-50"
                  >
                    <UserIcon className="w-4 h-4" />
                    {isSaving
                      ? 'Saving to Firestore...'
                      : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
