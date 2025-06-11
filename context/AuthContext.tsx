import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../utils/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextData {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
  }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to handle navigation after auth state changes
  const handleAuthStateChange = (_event: string, session: Session | null) => {
    setSession(session);
    setUser(session?.user ?? null);
    setIsLoading(false);
    
    // Perform navigation based on auth state if needed
    // (Navigation will be handled in the individual screens via the useEffect hooks)
  };

  useEffect(() => {
    // Only run on client side - more comprehensive check
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Check for active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'manna://auth/callback',
      },
    });
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 