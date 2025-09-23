import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  AuthResult,
  UserProfile,
  SignInData,
  SignUpData,
  UpdateProfileData,
  AuthError
} from '@/types/auth';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

// Browser client for client-side operations
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Server client for server-side operations (App Router)
export async function createServerSupabaseClient() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

// Middleware client for middleware operations
export function createMiddlewareSupabaseClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

// Legacy client for backward compatibility
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Auth utility functions
export class SupabaseAuth {
  private client: ReturnType<typeof createBrowserSupabaseClient>;

  constructor() {
    this.client = createBrowserSupabaseClient();
  }

  async signIn(data: SignInData): Promise<AuthResult> {
    try {
      const { error } = await this.client.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      const { data: authData, error } = await this.client.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName || '',
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      // If user is created but needs email confirmation
      if (authData.user && !authData.session) {
        return {
          success: true,
          data: { requiresConfirmation: true },
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async updatePassword(password: string): Promise<AuthResult> {
    try {
      const { error } = await this.client.auth.updateUser({
        password,
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async updateProfile(profileData: UpdateProfileData): Promise<AuthResult> {
    try {
      const { data: { user } } = await this.client.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      // Update auth user metadata
      if (profileData.fullName) {
        const { error: authError } = await this.client.auth.updateUser({
          data: { full_name: profileData.fullName },
        });

        if (authError) {
          return {
            success: false,
            error: this.mapAuthError(authError.message),
          };
        }
      }

      // Update profile in database
      const { error: profileError } = await this.client
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          avatar_url: profileData.avatarUrl,
          preferences: profileData.preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        return {
          success: false,
          error: 'Failed to update profile',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async resendConfirmation(email: string): Promise<AuthResult> {
    try {
      const { error } = await this.client.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await this.client.auth.getUser();

      if (!user) return null;

      const { data: profile } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      return this.mapProfileFromDatabase(profile);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async getSession() {
    return this.client.auth.getSession();
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }

  private mapAuthError(message: string): string {
    // Map Supabase error messages to user-friendly messages
    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password';
    }
    if (message.includes('Email not confirmed')) {
      return 'Please check your email and click the confirmation link';
    }
    if (message.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long';
    }
    if (message.includes('User already registered')) {
      return 'An account with this email already exists';
    }
    if (message.includes('Invalid email')) {
      return 'Please enter a valid email address';
    }

    return message || 'An unexpected error occurred';
  }

  private mapProfileFromDatabase(profile: any): UserProfile {
    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      preferences: profile.preferences,
      isPro: profile.is_pro || false,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
    };
  }
}

// Export a singleton instance
export const authClient = new SupabaseAuth();

// Type exports
export type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;