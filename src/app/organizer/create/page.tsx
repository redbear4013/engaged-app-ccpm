'use client';

import { useState } from 'react';
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
  AlertCircle,
  CheckCircle,
  ArrowLeft,
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
import { CreateOrganizerRequest } from '@/types/organizer';
import Link from 'next/link';

interface FormData extends CreateOrganizerRequest {
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

export default function CreateOrganizerProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    organizationName: '',
    contactEmail: user?.email || '',
    contactPhone: '',
    websiteUrl: '',
    bio: '',
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, general: 'Please select an image file' }));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, general: 'Image must be smaller than 2MB' }));
      return;
    }

    setUploadingLogo(true);
    setErrors(prev => ({ ...prev, general: undefined }));

    try {
      // Create a temporary URL for preview
      const url = URL.createObjectURL(file);
      setLogoUrl(url);

      // In a real implementation, you would upload to a file storage service
      // For now, we'll just use the object URL
      // TODO: Implement actual file upload to Supabase Storage or similar

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

    if (!validateForm() || !user?.id) return;

    setLoading(true);
    setErrors({});

    try {
      const socialLinks: Record<string, string> = {};
      if (formData.facebook) socialLinks.facebook = formData.facebook;
      if (formData.twitter) socialLinks.twitter = formData.twitter;
      if (formData.instagram) socialLinks.instagram = formData.instagram;
      if (formData.linkedin) socialLinks.linkedin = formData.linkedin;

      const organizerData: CreateOrganizerRequest = {
        organizationName: formData.organizationName.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim() || undefined,
        websiteUrl: formData.websiteUrl.trim() || undefined,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        bio: formData.bio.trim() || undefined,
        logoUrl: logoUrl || undefined,
      };

      const { organizer, error } = await OrganizerService.createOrganizerProfile(
        user.id,
        organizerData
      );

      if (error) {
        setErrors({ general: error });
        return;
      }

      if (organizer) {
        router.push('/organizer?created=true');
      }
    } catch (error) {
      console.error('Error creating organizer profile:', error);
      setErrors({
        general: 'Failed to create organizer profile. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/auth?redirect=/organizer/create');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 rounded-full p-3">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Organizer Profile</h1>
          <p className="text-gray-600 mt-2">
            Set up your organization profile to start creating and managing events
          </p>
        </div>

        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <Form onSubmit={handleSubmit}>
            {errors.general && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      Error Creating Profile
                    </h3>
                    <p className="text-sm text-red-700 mt-1">{errors.general}</p>
                  </div>
                </div>
              </div>
            )}

            <FormSection
              title="Basic Information"
              description="Tell us about your organization"
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
                  placeholder="e.g., EventCorp, Community Events Ltd."
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
                  placeholder="contact@organization.com"
                  error={!!errors.contactEmail}
                  required
                />
                <FormError>{errors.contactEmail}</FormError>
                <FormHelp>
                  This email will be used for event-related communications
                </FormHelp>
              </FormField>

              <FormField>
                <FormLabel htmlFor="contactPhone">Contact Phone</FormLabel>
                <FormInput
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
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
                  placeholder="https://www.organization.com"
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
                  placeholder="Tell people about your organization, what types of events you create, and what makes you unique..."
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
              title="Logo & Branding"
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
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 2MB
                    </p>
                    {uploadingLogo && (
                      <p className="text-xs text-blue-600">Uploading...</p>
                    )}
                  </div>
                </div>
              </FormField>
            </FormSection>

            <FormSection
              title="Social Media"
              description="Connect your social media accounts (optional)"
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

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Profile...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create Organizer Profile
                  </>
                )}
              </button>
            </div>
          </Form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                What happens next?
              </h3>
              <div className="text-sm text-blue-700 mt-1">
                <ul className="list-disc list-inside space-y-1">
                  <li>Your organizer profile will be created</li>
                  <li>You can immediately start creating draft events</li>
                  <li>Events require admin approval before going live</li>
                  <li>Verified organizers have faster approval times</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}