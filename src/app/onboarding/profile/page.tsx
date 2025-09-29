'use client';

import * as React from 'react';
const { Suspense } = React;
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormLabel,
  FormInput,
  FormError,
  FormHelp,
  FormSection,
} from '@/components/ui/form-components';

// Validation schema
const onboardingProfileSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  avatarUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
});

type OnboardingProfileData = z.infer<typeof onboardingProfileSchema>;

function OnboardingProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const redirectTo = searchParams.get('redirectTo') || '/';

  const form = useForm<OnboardingProfileData>({
    resolver: zodResolver(onboardingProfileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      avatarUrl: user?.avatarUrl || '',
    },
  });

  const onSubmit = async (data: OnboardingProfileData) => {
    try {
      setIsLoading(true);
      setError(null);

      const success = await updateProfile({
        fullName: data.fullName,
        avatarUrl: data.avatarUrl || undefined,
      });

      if (success) {
        // Redirect to the original destination or home
        router.push(redirectTo);
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If user is not authenticated, redirect to sign in
  React.useEffect(() => {
    if (!user) {
      router.push('/auth/signin');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to Engaged!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Let's set up your profile to get started
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Form onSubmit={form.handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <FormSection title="Profile Information">
              <FormField>
                <FormLabel htmlFor="fullName" required>
                  Full Name
                </FormLabel>
                <FormInput
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  error={!!form.formState.errors.fullName}
                  {...form.register('fullName')}
                />
                <FormError>
                  {form.formState.errors.fullName?.message}
                </FormError>
                <FormHelp>
                  This will be displayed on your public profile and to other users.
                </FormHelp>
              </FormField>

              <FormField>
                <FormLabel htmlFor="avatarUrl">
                  Profile Picture URL (Optional)
                </FormLabel>
                <FormInput
                  id="avatarUrl"
                  type="url"
                  placeholder="https://example.com/your-photo.jpg"
                  error={!!form.formState.errors.avatarUrl}
                  {...form.register('avatarUrl')}
                />
                <FormError>
                  {form.formState.errors.avatarUrl?.message}
                </FormError>
                <FormHelp>
                  Add a profile picture by providing a URL to your image.
                </FormHelp>
              </FormField>
            </FormSection>

            <div className="mt-8">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Setting up your profile...
                  </div>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                You can always update your profile later in your account settings.
              </p>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <OnboardingProfilePageContent />
    </Suspense>
  );
}