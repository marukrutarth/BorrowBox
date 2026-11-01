import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { BorrowBoxUserProfile, IndianCity } from '../types/marketplace';
import { ALL_CITIES, validateAuthInput } from '../utils/rentalLogic';
import {
  INDIA_STATES_AND_UTS,
  getStateForCity,
  getLocalitiesForCity,
} from '../data/indiaLocations';
import {
  FIREBASE_PROJECT_ID,
  registerWithEmailAndProfile,
  sendPasswordReset,
  signInWithEmail,
  signInWithGooglePopup,
} from '../services/firebase';
import { PageRoute } from '../components/Navbar';

interface AuthPageProps {
  mode: 'login' | 'signup';
  onSwitchMode: (newMode: 'login' | 'signup') => void;
  onAuthenticated: (profile: BorrowBoxUserProfile) => void;
  onNavigate: (route: PageRoute) => void;
  redirectReason?: string | null;
}

function formatFirebaseAuthError(error: unknown): {
  message: string;
  needsEmailProviderEnable: boolean;
} {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('auth/operation-not-allowed')) {
    return {
      message:
        'Email/Password sign-in is not yet enabled in your Firebase Console for this project.',
      needsEmailProviderEnable: true,
    };
  }
  if (
    raw.includes('auth/invalid-credential') ||
    raw.includes('auth/wrong-password') ||
    raw.includes('auth/user-not-found')
  ) {
    return {
      message:
        'Invalid email or password. Please check your credentials or create a new account.',
      needsEmailProviderEnable: false,
    };
  }
  if (raw.includes('auth/email-already-in-use')) {
    return {
      message:
        'An account with this email already exists. Please switch to Login or reset your password.',
      needsEmailProviderEnable: false,
    };
  }
  if (raw.includes('auth/popup-closed-by-user')) {
    return {
      message:
        'Google Sign-In popup was closed before completing authentication.',
      needsEmailProviderEnable: false,
    };
  }
  if (raw.includes('auth/too-many-requests')) {
    return {
      message:
        'Too many unsuccessful attempts. Please wait a moment or reset your password.',
      needsEmailProviderEnable: false,
    };
  }
  return {
    message: raw,
    needsEmailProviderEnable: false,
  };
}

export const AuthPage: React.FC<AuthPageProps> = ({
  mode,
  onSwitchMode,
  onAuthenticated,
  onNavigate,
  redirectReason,
}) => {
  const [viewMode, setViewMode] = useState<'login' | 'signup' | 'reset'>(mode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [city, setCity] = useState<IndianCity | ''>('');
  const [neighborhood, setNeighborhood] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [password, setPassword] = useState('');

  const availableCities = React.useMemo(() => {
    if (!selectedState) return ALL_CITIES;
    const st = INDIA_STATES_AND_UTS.find((s) => s.name === selectedState);
    return st ? st.cities : ALL_CITIES;
  }, [selectedState]);

  const localitySuggestions = React.useMemo(() => {
    return city ? getLocalitiesForCity(city) : [];
  }, [city]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showEmailProviderGuide, setShowEmailProviderGuide] = useState(false);

  React.useEffect(() => {
    setViewMode(mode);
    setErrors({});
    setAuthError(null);
    setStatusMessage(null);
  }, [mode]);

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setStatusMessage(null);
    setShowEmailProviderGuide(false);

    if (viewMode === 'reset') {
      const emailTrimmed = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        setErrors({ email: 'Enter your registered email address.' });
        return;
      }
      setErrors({});
      setIsLoading(true);
      try {
        await sendPasswordReset(emailTrimmed);
        setStatusMessage(
          `Password reset instructions have been sent to ${emailTrimmed} if an account exists.`
        );
      } catch (err) {
        const formatted = formatFirebaseAuthError(err);
        setAuthError(formatted.message);
        setShowEmailProviderGuide(formatted.needsEmailProviderEnable);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const validation = validateAuthInput(viewMode, {
      fullName,
      email,
      phone,
      city,
      neighborhood,
      photoURL,
      password,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsLoading(true);
    try {
      if (viewMode === 'signup') {
        const profile = await registerWithEmailAndProfile({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          city,
          neighborhood: neighborhood.trim() || 'Indiranagar',
          photoURL: photoURL.trim(),
        });
        setStatusMessage('Account registered and profile saved to Firestore.');
        onAuthenticated(profile);
      } else {
        const profile = await signInWithEmail(email.trim(), password);
        setStatusMessage('Signed in successfully.');
        onAuthenticated(profile);
      }
    } catch (err) {
      const formatted = formatFirebaseAuthError(err);
      setAuthError(formatted.message);
      setShowEmailProviderGuide(formatted.needsEmailProviderEnable);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setStatusMessage(null);
    setShowEmailProviderGuide(false);
    setIsGoogleLoading(true);
    try {
      const profile = await signInWithGooglePopup();
      onAuthenticated(profile);
    } catch (err) {
      const formatted = formatFirebaseAuthError(err);
      setAuthError(formatted.message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="bg-transparent min-h-screen py-12 lg:py-16 text-[#F8FAFC]">
      <div className="max-w-[480px] mx-auto px-4 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate({ page: 'home' })}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8] hover:text-[#8B5CF6] mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to BorrowBox Home
        </button>

        {redirectReason && (
          <div
            role="status"
            className="mb-4 p-3.5 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-xs text-[#F8FAFC] font-medium"
          >
            {redirectReason}
          </div>
        )}

        <div className="border border-white/[0.08] rounded-2xl p-6 sm:p-8 bg-[#161E2E] space-y-6 shadow-2xl">
          {/* Header */}
          <div className="border-b border-white/[0.08] pb-4">
            <h1 className="text-2xl font-bold text-[#F8FAFC] tracking-tight">
              {viewMode === 'login'
                ? 'Log In to BorrowBox'
                : viewMode === 'signup'
                ? 'Create Your BorrowBox Account'
                : 'Reset Your Password'}
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              {viewMode === 'login'
                ? 'Sign in with Firebase Authentication to access your Renter and Owner profile.'
                : viewMode === 'signup'
                ? 'Register a single account to both rent nearby items and list your own gear in ₹.'
                : 'Enter your email address to receive a Firebase password reset link.'}
            </p>
          </div>

          {/* Google Sign-In Button */}
          {viewMode !== 'reset' && (
            <div className="space-y-3">
              <button
                type="button"
                disabled={isGoogleLoading || isLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 bg-[#1D293B] hover:bg-[#334155] text-[#F8FAFC] border border-white/[0.12] text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <span>Continue with Google</span>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-white/[0.08]" />
                <span className="shrink mx-3 text-xs text-[#94A3B8]">
                  or use email & password
                </span>
                <div className="grow border-t border-white/[0.08]" />
              </div>
            </div>
          )}

          {/* Success Banner */}
          {statusMessage && (
            <div
              role="status"
              className="p-3.5 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/30 text-xs text-[#22C55E] flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {authError && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] space-y-2"
            >
              <div className="flex items-start gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>

              {showEmailProviderGuide && (
                <div className="pt-2 border-t border-[#EF4444]/20 text-[#94A3B8] bg-[#111827] p-3 rounded border border-white/[0.08] space-y-1.5">
                  <p className="font-semibold text-[#F8FAFC]">
                    How to enable Email/Password in Firebase Console (1 minute):
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>
                      Open{' '}
                      <a
                        href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8B5CF6] underline font-medium"
                      >
                        Firebase Console → Authentication → Sign-in method
                      </a>
                    </li>
                    <li>
                      Click <strong className="text-[#F8FAFC]">Email/Password</strong> in the provider list.
                    </li>
                    <li>
                      Toggle <strong className="text-[#F8FAFC]">Enable</strong> on and click{' '}
                      <strong className="text-[#F8FAFC]">Save</strong>.
                    </li>
                  </ol>
                  <p className="text-xs text-[#94A3B8] pt-1">
                    Note: <strong className="text-[#F8FAFC]">Continue with Google</strong> above is already
                    enabled automatically.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Email / Password / Reset Form */}
          <form onSubmit={handleEmailAuthSubmit} noValidate className="space-y-4">
            {viewMode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                >
                  Full Name *
                </label>
                <input
                  id="auth-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Priya Sharma"
                  className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                />
                {errors.fullName && (
                  <p className="text-xs text-[#EF4444] mt-1">{errors.fullName}</p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-[#F8FAFC] mb-1"
              >
                Email Address *
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.in"
                className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
              />
              {errors.email && (
                <p className="text-xs text-[#EF4444] mt-1">{errors.email}</p>
              )}
            </div>

            {viewMode === 'signup' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="auth-phone"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                    >
                      Mobile Number (+91) *
                    </label>
                    <input
                      id="auth-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm font-mono-tabular text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    {errors.phone && (
                      <p className="text-xs text-[#EF4444] mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="auth-state"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                    >
                      State / Union Territory
                    </label>
                    <select
                      id="auth-state"
                      value={selectedState}
                      onChange={(e) => {
                        const nextState = e.target.value;
                        setSelectedState(nextState);
                        if (nextState) {
                          const stateObj = INDIA_STATES_AND_UTS.find(
                            (s) => s.name === nextState
                          );
                          if (stateObj && !stateObj.cities.includes(city as IndianCity)) {
                            setCity('');
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="auth-city"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                    >
                      Primary City *
                    </label>
                    <select
                      id="auth-city"
                      value={city}
                      onChange={(e) => {
                        const nextCity = e.target.value as IndianCity | '';
                        setCity(nextCity);
                        if (nextCity) {
                          const parentState = getStateForCity(nextCity);
                          if (parentState) setSelectedState(parentState);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] focus:outline-none focus:border-[#8B5CF6]"
                    >
                      <option value="">Select your city</option>
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

                  <div>
                    <label
                      htmlFor="auth-neighborhood"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                    >
                      Neighborhood / Locality *
                    </label>
                    <input
                      id="auth-neighborhood"
                      list="auth-locality-options"
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder={
                        city
                          ? `e.g. Locality in ${city}`
                          : 'e.g., Koramangala, Bandra West'
                      }
                      className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    <datalist id="auth-locality-options">
                      {localitySuggestions.map((loc) => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                    {errors.neighborhood && (
                      <p className="text-xs text-[#EF4444] mt-1">
                        {errors.neighborhood}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="auth-photo"
                      className="block text-xs font-semibold text-[#F8FAFC] mb-1"
                    >
                      Profile Image URL (Optional)
                    </label>
                    <input
                      id="auth-photo"
                      type="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                    />
                    {errors.photoURL && (
                      <p className="text-xs text-[#EF4444] mt-1">
                        {errors.photoURL}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {viewMode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-semibold text-[#F8FAFC]"
                  >
                    Password *
                  </label>
                  {viewMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setErrors({});
                        setAuthError(null);
                        setStatusMessage(null);
                        setViewMode('reset');
                      }}
                      className="text-xs font-semibold text-[#8B5CF6] hover:text-[#A78BFA] cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 bg-[#111827] border border-white/[0.08] rounded-xl text-sm text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#8B5CF6]"
                />
                {errors.password && (
                  <p className="text-xs text-[#EF4444] mt-1">{errors.password}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl transition-all bb-glow-button flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {viewMode === 'login'
                      ? 'Signing In...'
                      : viewMode === 'signup'
                      ? 'Creating Profile...'
                      : 'Sending Reset Email...'}
                  </span>
                </>
              ) : viewMode === 'login' ? (
                'Log In'
              ) : viewMode === 'signup' ? (
                'Create Account'
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Password Reset Link</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Mode Switch */}
          <div className="pt-4 border-t border-white/[0.08] text-center text-xs text-[#94A3B8] space-y-2">
            {viewMode === 'login' ? (
              <p>
                New to BorrowBox?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrors({});
                    setAuthError(null);
                    setStatusMessage(null);
                    onSwitchMode('signup');
                  }}
                  className="font-semibold text-[#8B5CF6] hover:text-[#A78BFA] cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrors({});
                    setAuthError(null);
                    setStatusMessage(null);
                    onSwitchMode('login');
                  }}
                  className="font-semibold text-[#8B5CF6] hover:text-[#A78BFA] cursor-pointer"
                >
                  Back to Login
                </button>
              </p>
            )}

            <p className="text-[11px] text-[#94A3B8] flex items-center justify-center gap-1 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#06B6D4]" />
              <span>
                Secured by Firebase Authentication & Cloud Firestore Rules
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
