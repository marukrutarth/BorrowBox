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
      message: 'Google Sign-In popup was closed before completing authentication.',
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
  const [city, setCity] = useState<IndianCity>('Bengaluru');
  const [neighborhood, setNeighborhood] = useState('Indiranagar');
  const [photoURL, setPhotoURL] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showEmailProviderGuide, setShowEmailProviderGuide] = useState(false);

  // Sync external mode prop changes when user clicks Login / Sign Up in Navbar
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
    <div className="bg-white min-h-screen py-12 lg:py-16">
      <div className="max-w-[480px] mx-auto px-4 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate({ page: 'home' })}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to BorrowBox Home
        </button>

        {redirectReason && (
          <div
            role="status"
            className="mb-4 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-medium"
          >
            {redirectReason}
          </div>
        )}

        <div className="border border-slate-200 rounded-xl p-6 sm:p-8 bg-white space-y-6">
          {/* Header */}
          <div className="border-b border-slate-200 pb-4">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {viewMode === 'login'
                ? 'Log In to BorrowBox'
                : viewMode === 'signup'
                ? 'Create Your BorrowBox Account'
                : 'Reset Your Password'}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              {viewMode === 'login'
                ? 'Sign in with Firebase Authentication to access your Renter and Owner profile.'
                : viewMode === 'signup'
                ? 'Register a single account to both rent nearby items and list your own gear in ₹.'
                : 'Enter your email address to receive a Firebase password reset link.'}
            </p>
          </div>

          {/* Google Sign-In Button (Pre-provisioned in AI Studio Firebase) */}
          {viewMode !== 'reset' && (
            <div className="space-y-3">
              <button
                type="button"
                disabled={isGoogleLoading || isLoading}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <span>Continue with Google</span>
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200" />
                <span className="shrink mx-3 text-xs text-slate-400">
                  or use email & password
                </span>
                <div className="grow border-t border-slate-200" />
              </div>
            </div>
          )}

          {/* Success Banner */}
          {statusMessage && (
            <div
              role="status"
              className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {authError && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-2"
            >
              <div className="flex items-start gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>

              {showEmailProviderGuide && (
                <div className="pt-2 border-t border-red-200 text-slate-700 bg-white p-3 rounded border space-y-1.5">
                  <p className="font-semibold text-slate-900">
                    How to enable Email/Password in Firebase Console (1 minute):
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>
                      Open{' '}
                      <a
                        href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 underline font-medium"
                      >
                        Firebase Console → Authentication → Sign-in method
                      </a>
                    </li>
                    <li>
                      Click <strong>Email/Password</strong> in the provider list.
                    </li>
                    <li>
                      Toggle <strong>Enable</strong> on and click{' '}
                      <strong>Save</strong>.
                    </li>
                  </ol>
                  <p className="text-xs text-slate-500 pt-1">
                    Note: <strong>Continue with Google</strong> above is already
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
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  Full Name *
                </label>
                <input
                  id="auth-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Priya Sharma"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                />
                {errors.fullName && (
                  <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-slate-800 mb-1"
              >
                Email Address *
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.in"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            {viewMode === 'signup' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="auth-phone"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Mobile Number (+91) *
                    </label>
                    <input
                      id="auth-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono-tabular text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="auth-city"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Primary City *
                    </label>
                    <select
                      id="auth-city"
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="auth-neighborhood"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Neighborhood / Locality *
                    </label>
                    <input
                      id="auth-neighborhood"
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="e.g., Indiranagar"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                    />
                    {errors.neighborhood && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.neighborhood}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="auth-photo"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Profile Image URL (Optional)
                    </label>
                    <input
                      id="auth-photo"
                      type="url"
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                    />
                    {errors.photoURL && (
                      <p className="text-xs text-red-600 mt-1">
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
                    className="block text-xs font-semibold text-slate-800"
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
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
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
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                />
                {errors.password && (
                  <p className="text-xs text-red-600 mt-1">{errors.password}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
          <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600 space-y-2">
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
                  className="font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
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
                  className="font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Back to Login
                </button>
              </p>
            )}

            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
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
