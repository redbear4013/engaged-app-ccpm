'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Upload,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  User,
  Shield,
  CreditCard,
  Bell,
  Trash2,
} from 'lucide-react';
import {
  Form,
  FormField,
  FormLabel,
  FormInput,
  FormTextarea,
  FormError,
  FormHelp,
  FormSection,
} from '@/components/ui/form-components';
import { OrganizerService } from '@/services/organizer-service';
import { Organizer, UpdateOrganizerRequest } from '@/types/organizer';
import Link from 'next/link';

interface FormData extends UpdateOrganizerRequest {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
}

interface FormErrors {
  organizationName?: string;
  contactEmail?: string;
  contactPhone?: string;
  websiteUrl?: string;
  bio?: string;
  general?: string;
}

interface TabState {
  activeTab: 'profile' | 'notifications' | 'billing' | 'danger';
}

export default function OrganizerSettings() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [formData, setFormData] = useState<FormData>({
    id: '',
    organizationName: '',
    contactEmail: '',
    contactPhone: '',
    websiteUrl: '',
    bio: '',
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [tabState, setTabState] = useState<TabState>({ activeTab: 'profile' });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth?redirect=/organizer/settings');
      return;
    }

    if (isAuthenticated && user?.id) {
      loadOrganizerProfile();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const loadOrganizerProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { organizer: organizerData, error } = await OrganizerService.getOrganizerByUserId(user.id);

      if (error || !organizerData) {
        router.push('/organizer/create');
        return;
      }

      setOrganizer(organizerData);
      setFormData({
        id: organizerData.id,
        organizationName: organizerData.organizationName,
        contactEmail: organizerData.contactEmail,
        contactPhone: organizerData.contactPhone || '',
        websiteUrl: organizerData.websiteUrl || '',
        bio: organizerData.bio || '',
        facebook: organizerData.socialLinks?.facebook || '',
        twitter: organizerData.socialLinks?.twitter || '',
        instagram: organizerData.socialLinks?.instagram || '',
        linkedin: organizerData.socialLinks?.linkedin || '',
      });
      setLogoUrl(organizerData.logoUrl || '');
    } catch (err) {
      console.error('Error loading organizer profile:', err);
      setErrors({ general: 'Failed to load organizer profile' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }

    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    if (formData.contactPhone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.contactPhone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.contactPhone = 'Please enter a valid phone number';
    }

    if (formData.websiteUrl && !/^https?:\/\/.+\..+/.test(formData.websiteUrl)) {
      newErrors.websiteUrl = 'Please enter a valid website URL (including http:// or https://)';
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, general: 'Please select an image file' }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, general: 'Image must be smaller than 2MB' }));
      return;
    }

    setUploadingLogo(true);
    setErrors(prev => ({ ...prev, general: undefined }));

    try {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
      // TODO: Implement actual file upload
    } catch (error) {
      console.error('Error uploading logo:', error);
      setErrors(prev => ({
        ...prev,
        general: 'Failed to upload logo. Please try again.',
      }));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !organizer) return;

    setSaving(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const socialLinks: Record<string, string> = {};
      if (formData.facebook) socialLinks.facebook = formData.facebook;
      if (formData.twitter) socialLinks.twitter = formData.twitter;
      if (formData.instagram) socialLinks.instagram = formData.instagram;
      if (formData.linkedin) socialLinks.linkedin = formData.linkedin;

      const updateData: UpdateOrganizerRequest = {
        id: organizer.id,
        organizationName: formData.organizationName.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim() || undefined,
        websiteUrl: formData.websiteUrl.trim() || undefined,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        bio: formData.bio.trim() || undefined,
        logoUrl: logoUrl || undefined,
      };

      const { organizer: updatedOrganizer, error } = await OrganizerService.updateOrganizerProfile(
        organizer.id,
        updateData
      );

      if (error) {
        setErrors({ general: error });
        return;
      }

      if (updatedOrganizer) {
        setOrganizer(updatedOrganizer);
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error updating organizer profile:', error);
      setErrors({
        general: 'Failed to update profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !organizer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <div className="flex items-center mb-2">
                <Link
                  href="/organizer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 mr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Organizer Settings</h1>
              <p className="text-gray-600 mt-1">
                Manage your organizer profile and preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              <button
                onClick={() => setTabState({ activeTab: 'profile' })}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  tabState.activeTab === 'profile'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <User className="w-4 h-4 mr-3" />
                Profile
              </button>
              <button
                onClick={() => setTabState({ activeTab: 'notifications' })}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  tabState.activeTab === 'notifications'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Bell className="w-4 h-4 mr-3" />
                Notifications
              </button>
              <button
                onClick={() => setTabState({ activeTab: 'billing' })}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  tabState.activeTab === 'billing'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-4 h-4 mr-3" />
                Billing
              </button>
              <button
                onClick={() => setTabState({ activeTab: 'danger' })}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  tabState.activeTab === 'danger'
                    ? 'bg-red-100 text-red-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Shield className="w-4 h-4 mr-3" />
                Danger Zone
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-green-800">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {tabState.activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Organization Profile</h2>

                  <Form onSubmit={handleSubmit}>
                    {errors.general && (
                      <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex">
                          <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <p className="text-sm text-red-700 mt-1">{errors.general}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <FormSection
                      title="Basic Information"
                      description="Update your organization's basic details"
                    >
                      <FormField>
                        <FormLabel htmlFor="organizationName" required>
                          Organization Name
                        </FormLabel>
                        <FormInput
                          id="organizationName"
                          name="organizationName"
                          value={formData.organizationName}
                          onChange={handleInputChange}
                          error={!!errors.organizationName}
                          required
                        />
                        <FormError>{errors.organizationName}</FormError>
                      </FormField>

                      <FormField>
                        <FormLabel htmlFor="contactEmail" required>
                          Contact Email
                        </FormLabel>
                        <FormInput
                          id="contactEmail"
                          name="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={handleInputChange}
                          error={!!errors.contactEmail}
                          required
                        />
                        <FormError>{errors.contactEmail}</FormError>
                      </FormField>

                      <FormField>
                        <FormLabel htmlFor="contactPhone">Contact Phone</FormLabel>
                        <FormInput
                          id="contactPhone"
                          name="contactPhone"
                          type="tel"
                          value={formData.contactPhone}
                          onChange={handleInputChange}
                          error={!!errors.contactPhone}
                        />
                        <FormError>{errors.contactPhone}</FormError>
                      </FormField>

                      <FormField>
                        <FormLabel htmlFor="websiteUrl">Website URL</FormLabel>
                        <FormInput
                          id="websiteUrl"
                          name="websiteUrl"
                          type="url"
                          value={formData.websiteUrl}
                          onChange={handleInputChange}
                          error={!!errors.websiteUrl}
                        />
                        <FormError>{errors.websiteUrl}</FormError>
                      </FormField>

                      <FormField>
                        <FormLabel htmlFor="bio">About Your Organization</FormLabel>
                        <FormTextarea
                          id="bio"
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={4}
                          error={!!errors.bio}
                        />
                        <FormError>{errors.bio}</FormError>
                        <FormHelp>
                          {formData.bio.length}/500 characters
                        </FormHelp>
                      </FormField>
                    </FormSection>

                    <FormSection
                      title="Logo"
                      description="Upload your organization's logo"
                    >
                      <FormField>
                        <FormLabel>Organization Logo</FormLabel>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                          <div className="space-y-1 text-center">
                            {logoUrl ? (
                              <div className="mb-4">
                                <img
                                  src={logoUrl}
                                  alt="Logo preview"
                                  className="mx-auto h-20 w-20 object-cover rounded-lg"
                                />
                              </div>
                            ) : (
                              <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            )}
                            <div className="flex text-sm text-gray-600">
                              <label
                                htmlFor="logo-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                              >
                                <span>{logoUrl ? 'Change logo' : 'Upload a logo'}</span>
                                <input
                                  id="logo-upload"
                                  name="logo-upload"
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={handleLogoUpload}
                                  disabled={uploadingLogo}
                                />
                              </label>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 2MB</p>
                          </div>
                        </div>
                      </FormField>
                    </FormSection>

                    <FormSection
                      title="Social Media"
                      description="Connect your social media accounts"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField>
                          <FormLabel htmlFor="facebook">
                            <Facebook className="w-4 h-4 inline mr-2" />
                            Facebook
                          </FormLabel>
                          <FormInput
                            id="facebook"
                            name="facebook"
                            value={formData.facebook}
                            onChange={handleInputChange}
                            placeholder="https://facebook.com/yourpage"
                          />
                        </FormField>

                        <FormField>
                          <FormLabel htmlFor="twitter">
                            <Twitter className="w-4 h-4 inline mr-2" />
                            Twitter
                          </FormLabel>
                          <FormInput
                            id="twitter"
                            name="twitter"
                            value={formData.twitter}
                            onChange={handleInputChange}
                            placeholder="https://twitter.com/yourhandle"
                          />
                        </FormField>

                        <FormField>
                          <FormLabel htmlFor="instagram">
                            <Instagram className="w-4 h-4 inline mr-2" />
                            Instagram
                          </FormLabel>
                          <FormInput
                            id="instagram"
                            name="instagram"
                            value={formData.instagram}
                            onChange={handleInputChange}
                            placeholder="https://instagram.com/yourhandle"
                          />
                        </FormField>

                        <FormField>
                          <FormLabel htmlFor="linkedin">
                            <Linkedin className="w-4 h-4 inline mr-2" />
                            LinkedIn
                          </FormLabel>
                          <FormInput
                            id="linkedin"
                            name="linkedin"
                            value={formData.linkedin}
                            onChange={handleInputChange}
                            placeholder="https://linkedin.com/company/yourcompany"
                          />
                        </FormField>
                      </div>
                    </FormSection>

                    <div className="flex justify-end pt-6 border-t">
                      <button
                        type="submit"
                        disabled={saving}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </Form>
                </div>
              </div>
            )}

            {/* Other Tabs (Placeholder) */}
            {tabState.activeTab === 'notifications' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h2>
                <p className="text-gray-600">Notification settings will be available soon.</p>
              </div>
            )}

            {tabState.activeTab === 'billing' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Billing & Subscription</h2>
                <p className="text-gray-600">Billing settings will be available soon.</p>
              </div>
            )}

            {tabState.activeTab === 'danger' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <Trash2 className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Delete Organizer Account</h3>
                      <p className="text-sm text-red-700 mt-1">
                        Permanently delete your organizer account and all associated events.
                        This action cannot be undone.
                      </p>
                      <button className="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}