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
  BorrowBoxUserProfile,
  IndianCity,
  ProductListing,
  RentalRequestRecord,
  UserActiveMode,
} from '../types/marketplace';
import {
  ALL_CITIES,
  formatINR,
  validateProfileUpdateInput,
} from '../utils/rentalLogic';
import { updateUserProfileInFirestore } from '../services/firebase';
import { PageRoute } from '../components/Navbar';

interface ProfilePageProps {
  userProfile: BorrowBoxUserProfile;
  onProfileUpdated: (updated: BorrowBoxUserProfile) => void;
  onLogout: () => Promise<void>;
  onNavigate: (route: PageRoute) => void;
  userListings: ProductListing[];
  userRequests: RentalRequestRecord[];
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  userProfile,
  onProfileUpdated,
  onLogout,
  onNavigate,
  userListings,
  userRequests,
}) => {
  const [name, setName] = useState(userProfile.name);
  const [photoURL, setPhotoURL] = useState(userProfile.photoURL);
  const [city, setCity] = useState<IndianCity>(userProfile.city);
  const [neighborhood, setNeighborhood] = useState(userProfile.neighborhood);
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
    <div className="bg-white min-h-screen py-10 lg:py-12">
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-200">
          <button
            type="button"
            onClick={() => onNavigate({ page: 'browse' })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Browse Items
          </button>

          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogoutClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            {isLoggingOut ? 'Signing Out...' : 'Log Out'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Account Identity Summary & Dual Role Switcher */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 border border-slate-200 rounded-xl bg-white space-y-5">
              <div className="flex items-center gap-4">
                {userProfile.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt={userProfile.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 truncate">
                    {userProfile.name}
                  </h1>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {userProfile.email}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>
                      {userProfile.neighborhood}, {userProfile.city}
                    </span>
                  </p>
                </div>
              </div>

              {/* Firestore Profile Attributes */}
              <div className="pt-4 border-t border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Unique User ID (UID)</span>
                  <span className="font-mono-tabular text-slate-800 truncate max-w-[22ch]">
                    {userProfile.uid}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Account Created</span>
                  <span className="font-medium text-slate-800">
                    {formattedCreatedAt}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Marketplace Capabilities</span>
                  <span className="font-medium text-slate-800">
                    Renter & Item Owner
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Security Permission Tier</span>
                  <span className="font-medium text-slate-800 inline-flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    {userProfile.isAdmin
                      ? 'Verified Administrator (/admins)'
                      : 'Standard Member'}
                  </span>
                </div>
              </div>

              {/* Dual Renter / Owner Mode Switcher */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <p className="text-xs font-semibold text-slate-900">
                  Active Marketplace Perspective
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
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
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      activeMode === 'renter'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Renter Mode ({userRequests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('owner')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      activeMode === 'owner'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Owner Mode ({userListings.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Active Mode Activity Summary */}
            <div className="p-6 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
              {activeMode === 'renter' ? (
                <>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Your Renter Activity
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    You have submitted{' '}
                    <strong>{userRequests.length}</strong> rental request(s) in
                    this session.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'browse' })}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    Explore Items to Rent
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Your Owner Listings
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    You have published{' '}
                    <strong>{userListings.length}</strong> item listing(s) in
                    this session.
                  </p>
                  {userListings.length > 0 && (
                    <ul className="space-y-1.5 text-xs text-slate-700 pt-1">
                      {userListings.map((item) => (
                        <li
                          key={item.id}
                          className="flex justify-between items-center bg-white p-2 rounded border border-slate-200"
                        >
                          <span className="truncate max-w-[24ch] font-medium">
                            {item.title}
                          </span>
                          <span className="font-mono-tabular font-semibold">
                            {formatINR(item.dailyPriceINR)}/day
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'list-item' })}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
                  >
                    + List Another Item
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Edit Firestore Profile Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 border border-slate-200 rounded-xl bg-white space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Edit Profile & Isolated Contact Information
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Public display fields are stored in{' '}
                  <code className="font-mono-tabular text-slate-700">
                    /users/{userProfile.uid.slice(0, 8)}...
                  </code>{' '}
                  while your private email and phone number are isolated in{' '}
                  <code className="font-mono-tabular text-slate-700">
                    /private/info
                  </code>
                  .
                </p>
              </div>

              {successMessage && (
                <div
                  role="status"
                  className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
                >
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSaveProfile} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-xs font-semibold text-slate-800 mb-1"
                  >
                    Full Name *
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="profile-email-readonly"
                    className="block text-xs font-semibold text-slate-800 mb-1"
                  >
                    Verified Account Email (Private PII)
                  </label>
                  <input
                    id="profile-email-readonly"
                    type="email"
                    value={userProfile.email}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="profile-city"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      City *
                    </label>
                    <select
                      id="profile-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value as IndianCity)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                    >
                      {ALL_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {errors.city && (
                      <p className="text-xs text-red-600 mt-1">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="profile-neighborhood"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Neighborhood / Locality *
                    </label>
                    <input
                      id="profile-neighborhood"
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="e.g., Indiranagar, Bandra West"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    {errors.neighborhood && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.neighborhood}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="profile-phone"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Mobile Number (+91, Private PII)
                    </label>
                    <input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono-tabular text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="profile-photo-url"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Profile Image URL (Optional)
                    </label>
                    <input
                      id="profile-photo-url"
                      type="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                    {errors.photoURL && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.photoURL}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <UserIcon className="w-4 h-4" />
                    {isSaving ? 'Saving to Firestore...' : 'Save Profile Changes'}
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
