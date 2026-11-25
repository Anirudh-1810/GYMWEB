import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../supabase';
import { mapSupabaseAuthError, parseOAuthCallbackParams } from '../utils/supabasePayloads';

export interface AuthAccount {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

interface AuthContextValue {
  user: AuthAccount | null;
  authReady: boolean;
  authLoading: boolean;
  authError: string | null;
  authNotice: string | null;
  clearAuthMessages: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthAccount(user: User | null): AuthAccount | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = user.email ?? '';
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (email.includes('@') ? email.split('@')[0] : 'Gym Owner');
  const photoURL =
    (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
    (typeof meta.picture === 'string' && meta.picture.trim()) ||
    null;

  return {
    id: user.id,
    email,
    displayName,
    photoURL,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthAccount | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const popupWatchRef = useRef<number | null>(null);

  const clearPopupWatch = useCallback(() => {
    if (popupWatchRef.current !== null) {
      window.clearInterval(popupWatchRef.current);
      popupWatchRef.current = null;
    }
  }, []);

  const clearAuthMessages = useCallback(() => {
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  // Resolve initial Supabase session & subscribe to auth state transitions
  useEffect(() => {
    let active = true;

    if (!isSupabaseConfigured) {
      setAuthReady(true);
      setAuthError(
        'Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
      );
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setAuthError(mapSupabaseAuthError(error));
        }
        setUser(toAuthAccount(data.session?.user ?? null));
        setAuthReady(true);
      })
      .catch((err) => {
        if (!active) return;
        setAuthError(mapSupabaseAuthError(err));
        setAuthReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(toAuthAccount(session?.user ?? null));
      setAuthReady(true);
      if (session?.user) {
        clearPopupWatch();
        setAuthLoading(false);
        setAuthError(null);
      }
    });

    return () => {
      active = false;
      clearPopupWatch();
      listener.subscription.unsubscribe();
    };
  }, [clearPopupWatch]);

  // Receive Google OAuth callback payload from popup window (same-origin verified)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as
        | { type?: string; search?: string; hash?: string }
        | null
        | undefined;
      if (!data || data.type !== 'SUPABASE_OAUTH_CALLBACK') {
        return;
      }

      clearPopupWatch();
      const parsed = parseOAuthCallbackParams(data.search ?? '', data.hash ?? '');

      if (parsed.error) {
        setAuthError(
          mapSupabaseAuthError(parsed.errorDescription || parsed.error)
        );
        setAuthLoading(false);
        return;
      }

      try {
        if (parsed.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(parsed.code);
          if (error) {
            setAuthError(mapSupabaseAuthError(error));
          }
        } else if (parsed.accessToken && parsed.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: parsed.accessToken,
            refresh_token: parsed.refreshToken,
          });
          if (error) {
            setAuthError(mapSupabaseAuthError(error));
          }
        } else {
          const { data: sessionData } = await supabase.auth.getSession();
          setUser(toAuthAccount(sessionData.session?.user ?? null));
        }
      } catch (err) {
        setAuthError(mapSupabaseAuthError(err));
      } finally {
        setAuthLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [clearPopupWatch]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthNotice(null);
    if (!isSupabaseConfigured) {
      setAuthError('Supabase is not configured yet.');
      return;
    }

    setAuthLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error || !data?.url) {
        setAuthError(mapSupabaseAuthError(error || 'Could not start Google Sign-In.'));
        setAuthLoading(false);
        return;
      }

      const width = 520;
      const height = 660;
      const left = Math.max(0, Math.round((window.screen.width - width) / 2));
      const top = Math.max(0, Math.round((window.screen.height - height) / 2));
      const popup = window.open(
        data.url,
        'supabase_google_oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=yes`
      );

      if (!popup) {
        setAuthError(
          'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.'
        );
        setAuthLoading(false);
        return;
      }

      clearPopupWatch();
      popupWatchRef.current = window.setInterval(() => {
        if (popup.closed) {
          clearPopupWatch();
          setAuthLoading(false);
        }
      }, 450);
    } catch (err) {
      setAuthError(mapSupabaseAuthError(err));
      setAuthLoading(false);
    }
  }, [clearPopupWatch]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setAuthNotice(null);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setAuthError(mapSupabaseAuthError(error));
      }
    } catch (err) {
      setAuthError(mapSupabaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName?: string) => {
      setAuthError(null);
      setAuthNotice(null);
      setAuthLoading(true);
      try {
        const trimmedName = fullName?.trim();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: trimmedName ? { full_name: trimmedName } : undefined,
          },
        });
        if (error) {
          setAuthError(mapSupabaseAuthError(error));
          return;
        }
        if (!data.session) {
          setAuthNotice(
            'Account created! Check your email inbox to confirm your address, then sign in.'
          );
        }
      } catch (err) {
        setAuthError(mapSupabaseAuthError(err));
      } finally {
        setAuthLoading(false);
      }
    },
    []
  );

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    setAuthNotice(null);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError(mapSupabaseAuthError(error));
      }
      setUser(null);
    } catch (err) {
      setAuthError(mapSupabaseAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authReady,
      authLoading,
      authError,
      authNotice,
      clearAuthMessages,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOutUser,
    }),
    [
      user,
      authReady,
      authLoading,
      authError,
      authNotice,
      clearAuthMessages,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOutUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
