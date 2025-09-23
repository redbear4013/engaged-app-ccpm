// Mock Supabase environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock window object for browser APIs
if (typeof window !== 'undefined') {
  // Delete and redefine location to avoid conflict
  delete (window as any).location;
  (window as any).location = {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
    search: '',
    pathname: '/',
  };

  // Mock localStorage for Zustand persist
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  if (!window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });
  }

  // Mock sessionStorage
  if (!window.sessionStorage) {
    Object.defineProperty(window, 'sessionStorage', {
      value: localStorageMock,
    });
  }
}

export {};