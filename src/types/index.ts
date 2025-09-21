export * from './database';

// Event related types
export interface Event {
  id: string;
  title: string;
  description?: string | undefined;
  startDate: Date;
  endDate?: Date | undefined;
  location?: string | undefined;
  imageUrl?: string | undefined;
  sourceUrl?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventFilters {
  categories?: string[] | undefined;
  dateRange?:
    | {
        start: Date;
        end: Date;
      }
    | undefined;
  location?: string | undefined;
  search?: string | undefined;
}

// User related types
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
  isPro: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  categories?: string[];
  locations?: string[];
  notifications?: {
    email: boolean;
    push: boolean;
  };
  privacy?: {
    shareProfile: boolean;
    shareActivity: boolean;
  };
}

// AI Matching types
export interface SwipeAction {
  eventId: string;
  action: 'like' | 'dislike' | 'save';
  timestamp: Date;
}

export interface MatchingPreferences {
  categoryWeights: Record<string, number>;
  locationWeights: Record<string, number>;
  timePreferences: {
    weekdays: boolean;
    weekends: boolean;
    mornings: boolean;
    afternoons: boolean;
    evenings: boolean;
  };
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
