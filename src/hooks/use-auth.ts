import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';

export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, setLoading } =
    useAuthStore();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      setLoading(true);
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        setUser(null);
        return;
      }

      if (session?.user) {
        // Fetch user profile from database
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const userProfile: UserProfile = {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
            preferences: profile.preferences,
            isPro: profile.is_pro,
            createdAt: new Date(profile.created_at),
            updatedAt: new Date(profile.updated_at),
          };
          setUser(userProfile);
        }
      } else {
        setUser(null);
      }
    };

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const userProfile: UserProfile = {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
            preferences: profile.preferences,
            isPro: profile.is_pro,
            createdAt: new Date(profile.created_at),
            updatedAt: new Date(profile.updated_at),
          };
          setUser(userProfile);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading]);

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}
