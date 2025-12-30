import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle session restoration and validation
      if (event === 'SIGNED_IN' && session) {
        // Validate the session
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.error('Session validation failed:', error);
          // Clear invalid session
          await supabase.auth.signOut();
        }
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username,
            display_name: username,
          }
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { 
          error: new Error(
            (error as unknown as { message?: string }).message || 'Failed to create account. Please try again.'
          ) 
        };
      }
      
      return { error: null };
    } catch (err: unknown) {
      console.error('Sign up exception:', err);
      return { 
        error: new Error(err instanceof Error ? err.message : 'An unexpected error occurred during sign up') 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        // Return a more user-friendly error message
        return { 
          error: new Error(
            (error as unknown as { message?: string }).message || 'Invalid email or password'
          ) 
        };
      }
      
      return { error: null };
    } catch (err: unknown) {
      console.error('Sign in exception:', err);
      return { 
        error: new Error(err instanceof Error ? err.message : 'An unexpected error occurred during sign in') 
      };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      return { error: error as Error | null };
    } catch (err: unknown) {
      console.error('Google sign in error:', err);
      return { error: err instanceof Error ? err : new Error('An unexpected error occurred during Google sign in') };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
    } catch (err: unknown) {
      console.error('Sign out exception:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
