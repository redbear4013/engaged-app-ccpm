'use client';

import { useAuth } from '@/hooks/use-auth';
import { ProfileForm } from '@/components/profile/profile-form';
import { ProfileSettings } from '@/components/profile/profile-settings';
import { useState } from 'react';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Unable to load profile. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile Information
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Settings & Preferences
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white shadow rounded-lg">
          {activeTab === 'profile' ? (
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">
                Profile Information
              </h2>
              <ProfileForm user={user} />
            </div>
          ) : (
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">
                Settings & Preferences
              </h2>
              <ProfileSettings user={user} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}