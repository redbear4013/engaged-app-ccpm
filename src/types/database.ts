// Database types matching the actual schema
export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          short_description: string | null;
          start_time: string;
          end_time: string;
          timezone: string;
          all_day: boolean;
          venue_id: string | null;
          custom_location: string | null;
          organizer_id: string | null;
          category_id: string | null;
          poster_url: string | null;
          gallery_urls: string[];
          tags: string[];
          is_free: boolean;
          price_range: number[];
          ticket_url: string | null;
          registration_required: boolean;
          capacity: number | null;
          ai_score_factors: Json;
          popularity_score: number;
          quality_score: number;
          status: string;
          is_featured: boolean;
          is_trending: boolean;
          source_url: string | null;
          source_type: string | null;
          last_scraped_at: string | null;
          scrape_hash: string | null;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          short_description?: string | null;
          start_time: string;
          end_time: string;
          timezone?: string;
          all_day?: boolean;
          venue_id?: string | null;
          custom_location?: string | null;
          organizer_id?: string | null;
          category_id?: string | null;
          poster_url?: string | null;
          gallery_urls?: string[];
          tags?: string[];
          is_free?: boolean;
          price_range?: number[];
          ticket_url?: string | null;
          registration_required?: boolean;
          capacity?: number | null;
          ai_score_factors?: Json;
          popularity_score?: number;
          quality_score?: number;
          status?: string;
          is_featured?: boolean;
          is_trending?: boolean;
          source_url?: string | null;
          source_type?: string | null;
          last_scraped_at?: string | null;
          scrape_hash?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          short_description?: string | null;
          start_time?: string;
          end_time?: string;
          timezone?: string;
          all_day?: boolean;
          venue_id?: string | null;
          custom_location?: string | null;
          organizer_id?: string | null;
          category_id?: string | null;
          poster_url?: string | null;
          gallery_urls?: string[];
          tags?: string[];
          is_free?: boolean;
          price_range?: number[];
          ticket_url?: string | null;
          registration_required?: boolean;
          capacity?: number | null;
          ai_score_factors?: Json;
          popularity_score?: number;
          quality_score?: number;
          status?: string;
          is_featured?: boolean;
          is_trending?: boolean;
          source_url?: string | null;
          source_type?: string | null;
          last_scraped_at?: string | null;
          scrape_hash?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
      };
      event_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          color: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          icon?: string | null;
          color?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          icon?: string | null;
          color?: string;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      venues: {
        Row: {
          id: string;
          name: string;
          slug: string;
          address: string;
          city: string;
          latitude: number | null;
          longitude: number | null;
          website_url: string | null;
          contact_info: Json;
          capacity: number | null;
          venue_type: string | null;
          amenities: string[];
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          address: string;
          city?: string;
          latitude?: number | null;
          longitude?: number | null;
          website_url?: string | null;
          contact_info?: Json;
          capacity?: number | null;
          venue_type?: string | null;
          amenities?: string[];
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          address?: string;
          city?: string;
          latitude?: number | null;
          longitude?: number | null;
          website_url?: string | null;
          contact_info?: Json;
          capacity?: number | null;
          venue_type?: string | null;
          amenities?: string[];
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizers: {
        Row: {
          id: string;
          user_id: string | null;
          organization_name: string;
          contact_email: string;
          contact_phone: string | null;
          website_url: string | null;
          social_links: Json;
          bio: string | null;
          logo_url: string | null;
          is_verified: boolean;
          verification_level: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          organization_name: string;
          contact_email: string;
          contact_phone?: string | null;
          website_url?: string | null;
          social_links?: Json;
          bio?: string | null;
          logo_url?: string | null;
          is_verified?: boolean;
          verification_level?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          organization_name?: string;
          contact_email?: string;
          contact_phone?: string | null;
          website_url?: string | null;
          social_links?: Json;
          bio?: string | null;
          logo_url?: string | null;
          is_verified?: boolean;
          verification_level?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
          city: string;
          preferred_radius: number;
          preferred_categories: string[];
          preferred_times: string[];
          preferred_price_range: number[];
          ai_preferences: Json;
          is_pro: boolean;
          pro_expires_at: string | null;
          stripe_customer_id: string | null;
          notification_preferences: Json;
          is_public: boolean;
          email_verified: boolean;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
          city?: string;
          preferred_radius?: number;
          preferred_categories?: string[];
          preferred_times?: string[];
          preferred_price_range?: number[];
          ai_preferences?: Json;
          is_pro?: boolean;
          pro_expires_at?: string | null;
          stripe_customer_id?: string | null;
          notification_preferences?: Json;
          is_public?: boolean;
          email_verified?: boolean;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
          city?: string;
          preferred_radius?: number;
          preferred_categories?: string[];
          preferred_times?: string[];
          preferred_price_range?: number[];
          ai_preferences?: Json;
          is_pro?: boolean;
          pro_expires_at?: string | null;
          stripe_customer_id?: string | null;
          notification_preferences?: Json;
          is_public?: boolean;
          email_verified?: boolean;
        };
      };
      user_events: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          save_type: string;
          calendar_reminder: boolean;
          reminder_minutes: number;
          personal_notes: string | null;
          is_public: boolean;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          save_type?: string;
          calendar_reminder?: boolean;
          reminder_minutes?: number;
          personal_notes?: string | null;
          is_public?: boolean;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          save_type?: string;
          calendar_reminder?: boolean;
          reminder_minutes?: number;
          personal_notes?: string | null;
          is_public?: boolean;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
