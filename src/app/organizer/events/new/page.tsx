'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  Upload,
  AlertCircle,
  Save,
  Send,
  ArrowLeft,
  Info,
  Tag,
  DollarSign,
  Users,
  ExternalLink,
  Plus,
  X,
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
import { EventSubmissionData, EventDuplicate } from '@/types/organizer';
import Link from 'next/link';

interface FormData {
  title: string;
  description: string;
  shortDescription: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  allDay: boolean;
  customLocation: string;
  categoryId: string;
  posterUrl: string;
  tags: string[];
  currentTag: string;
  isFree: boolean;
  minPrice: string;
  maxPrice: string;
  ticketUrl: string;
  registrationRequired: boolean;
  capacity: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  customLocation?: string;
  minPrice?: string;
  maxPrice?: string;
  capacity?: string;
  general?: string;
}

export default function CreateEvent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    shortDescription: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    allDay: false,
    customLocation: '',
    categoryId: '',
    posterUrl: '',
    tags: [],
    currentTag: '',
    isFree: true,
    minPrice: '',
    maxPrice: '',
    ticketUrl: '',
    registrationRequired: false,
    capacity: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<EventDuplicate[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth?redirect=/organizer/events/new');
      return;
    }

    if (isAuthenticated && user?.id) {
      loadOrganizerProfile();
      loadCategories();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const loadOrganizerProfile = async () => {
    if (!user?.id) return;

    const { organizer, error } = await OrganizerService.getOrganizerByUserId(user.id);

    if (error || !organizer) {
      router.push('/organizer/create');
      return;
    }

    setOrganizerId(organizer.id);
  };

  const loadCategories = async () => {
    // Mock categories for now
    // In a real implementation, you'd fetch from your categories API
    setCategories([
      { id: '1', name: 'Music & Concerts', slug: 'music' },
      { id: '2', name: 'Arts & Culture', slug: 'arts' },
      { id: '3', name: 'Food & Drink', slug: 'food' },
      { id: '4', name: 'Sports & Fitness', slug: 'sports' },
      { id: '5', name: 'Business & Networking', slug: 'business' },
      { id: '6', name: 'Technology', slug: 'tech' },
      { id: '7', name: 'Education', slug: 'education' },
      { id: '8', name: 'Community', slug: 'community' },
    ]);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Event description is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.allDay && !formData.startTime) {
      newErrors.startTime = 'Start time is required for non-all-day events';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (!formData.allDay && !formData.endTime) {
      newErrors.endTime = 'End time is required for non-all-day events';
    }

    // Validate date/time logic
    if (formData.startDate && formData.endDate) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime || '23:59'}`);

      if (endDateTime <= startDateTime) {
        newErrors.endDate = 'End date/time must be after start date/time';
      }
    }

    if (!formData.customLocation.trim()) {
      newErrors.customLocation = 'Event location is required';
    }

    if (!formData.isFree) {
      if (!formData.minPrice || parseFloat(formData.minPrice) < 0) {
        newErrors.minPrice = 'Please enter a valid minimum price';
      }
      if (!formData.maxPrice || parseFloat(formData.maxPrice) < 0) {
        newErrors.maxPrice = 'Please enter a valid maximum price';
      }
      if (formData.minPrice && formData.maxPrice &&
          parseFloat(formData.maxPrice) < parseFloat(formData.minPrice)) {
        newErrors.maxPrice = 'Maximum price must be greater than or equal to minimum price';
      }
    }

    if (formData.capacity && (parseInt(formData.capacity) < 1 || parseInt(formData.capacity) > 100000)) {
      newErrors.capacity = 'Capacity must be between 1 and 100,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }

    // Auto-populate end date if only start date is set
    if (name === 'startDate' && value && !formData.endDate) {
      setFormData(prev => ({ ...prev, endDate: value }));
    }
  };

  const handleAddTag = () => {
    if (formData.currentTag.trim() && !formData.tags.includes(formData.currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.currentTag.trim()],
        currentTag: '',
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && formData.currentTag.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, general: 'Please select an image file' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, general: 'Image must be smaller than 5MB' }));
      return;
    }

    setUploadingImage(true);
    setErrors(prev => ({ ...prev, general: undefined }));

    try {
      // Create a temporary URL for preview
      const url = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, posterUrl: url }));

      // TODO: Implement actual file upload to Supabase Storage or similar
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrors(prev => ({
        ...prev,
        general: 'Failed to upload image. Please try again.',
      }));
    } finally {
      setUploadingImage(false);
    }
  };

  const checkForDuplicates = async () => {
    if (!formData.title || !formData.startDate || !formData.customLocation) return;

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`);
      const duplicates = await OrganizerService.checkForDuplicates({
        title: formData.title,
        startTime: startDateTime,
        customLocation: formData.customLocation,
      });

      if (duplicates.length > 0) {
        setDuplicates(duplicates);
        setShowDuplicates(true);
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error);
    }
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!validateForm() || !organizerId) return;

    setLoading(true);
    setErrors({});

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime || '23:59'}`);

      const eventData: EventSubmissionData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription.trim() || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        timezone: formData.timezone,
        allDay: formData.allDay,
        customLocation: formData.customLocation.trim(),
        categoryId: formData.categoryId || undefined,
        posterUrl: formData.posterUrl || undefined,
        tags: formData.tags,
        isFree: formData.isFree,
        priceRange: formData.isFree
          ? [0, 0]
          : [parseFloat(formData.minPrice) || 0, parseFloat(formData.maxPrice) || 0],
        ticketUrl: formData.ticketUrl.trim() || undefined,
        registrationRequired: formData.registrationRequired,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        saveAsDraft: isDraft,
      };

      const { event, error } = await OrganizerService.createEvent(organizerId, eventData);

      if (error) {
        if (error.includes('duplicate')) {
          await checkForDuplicates();
          setErrors({ general: error });
        } else {
          setErrors({ general: error });
        }
        return;
      }

      if (event) {
        const redirectPath = isDraft
          ? `/organizer/events?created=true&status=draft`
          : `/organizer/events?created=true&status=pending`;
        router.push(redirectPath);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      setErrors({
        general: 'Failed to create event. Please try again.',
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

  if (!isAuthenticated || !organizerId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Link
              href="/organizer"
              className="inline-flex items-center text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
          <p className="text-gray-600 mt-2">
            Fill in the details below to create your event. You can save as draft or submit for approval.
          </p>
        </div>

        {/* Duplicate Warning */}
        {showDuplicates && duplicates.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  Potential Duplicate Events Found
                </h3>
                <div className="text-sm text-yellow-700 mt-1">
                  <p className="mb-2">We found similar events that might be duplicates:</p>
                  <ul className="space-y-1">
                    {duplicates.map((duplicate) => (
                      <li key={duplicate.id} className="flex justify-between">
                        <span>"{duplicate.title}" on {duplicate.startTime.toLocaleDateString()}</span>
                        <span className="text-yellow-600">
                          {Math.round(duplicate.similarity * 100)}% similar
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2">Please review and confirm this is a new, unique event.</p>
                </div>
                <button
                  onClick={() => setShowDuplicates(false)}
                  className="mt-2 text-sm text-yellow-800 hover:text-yellow-900 font-medium"
                >
                  Continue anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow">
          <Form onSubmit={(e) => { e.preventDefault(); }}>
            {errors.general && (
              <div className="p-6 bg-red-50 border-b border-red-200">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{errors.general}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 space-y-8">
              {/* Basic Information */}
              <FormSection
                title="Basic Information"
                description="Essential details about your event"
              >
                <FormField>
                  <FormLabel htmlFor="title" required>
                    Event Title
                  </FormLabel>
                  <FormInput
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    onBlur={checkForDuplicates}
                    placeholder="e.g., Summer Music Festival 2024"
                    error={!!errors.title}
                    required
                  />
                  <FormError>{errors.title}</FormError>
                </FormField>

                <FormField>
                  <FormLabel htmlFor="shortDescription">
                    Short Description
                  </FormLabel>
                  <FormInput
                    id="shortDescription"
                    name="shortDescription"
                    value={formData.shortDescription}
                    onChange={handleInputChange}
                    placeholder="A brief, catchy description that appears in event listings"
                    maxLength={150}
                  />
                  <FormHelp>
                    {formData.shortDescription.length}/150 characters. This appears in event cards and search results.
                  </FormHelp>
                </FormField>

                <FormField>
                  <FormLabel htmlFor="description" required>
                    Full Description
                  </FormLabel>
                  <FormTextarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide a detailed description of your event, including what attendees can expect, agenda, speakers, activities, etc."
                    rows={6}
                    error={!!errors.description}
                    required
                  />
                  <FormError>{errors.description}</FormError>
                  <FormHelp>
                    Include important details like agenda, speakers, what's included, and what attendees should bring.
                  </FormHelp>
                </FormField>

                <FormField>
                  <FormLabel htmlFor="categoryId">Category</FormLabel>
                  <select
                    id="categoryId"
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <option value="">Select a category (optional)</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <FormHelp>
                    Helps people discover your event through category browsing
                  </FormHelp>
                </FormField>
              </FormSection>

              {/* Date & Time */}
              <FormSection
                title="Date & Time"
                description="When your event takes place"
              >
                <div className="space-y-4">
                  <FormField>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="allDay"
                        name="allDay"
                        checked={formData.allDay}
                        onChange={handleInputChange}
                        className="rounded border-gray-300"
                      />
                      <FormLabel htmlFor="allDay" className="mb-0">
                        All day event
                      </FormLabel>
                    </div>
                  </FormField>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField>
                      <FormLabel htmlFor="startDate" required>
                        <Calendar className="w-4 h-4 inline mr-2" />
                        Start Date
                      </FormLabel>
                      <FormInput
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        error={!!errors.startDate}
                        required
                      />
                      <FormError>{errors.startDate}</FormError>
                    </FormField>

                    <FormField>
                      <FormLabel htmlFor="endDate" required>
                        <Calendar className="w-4 h-4 inline mr-2" />
                        End Date
                      </FormLabel>
                      <FormInput
                        id="endDate"
                        name="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        error={!!errors.endDate}
                        required
                      />
                      <FormError>{errors.endDate}</FormError>
                    </FormField>
                  </div>

                  {!formData.allDay && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField>
                        <FormLabel htmlFor="startTime" required>
                          <Clock className="w-4 h-4 inline mr-2" />
                          Start Time
                        </FormLabel>
                        <FormInput
                          id="startTime"
                          name="startTime"
                          type="time"
                          value={formData.startTime}
                          onChange={handleInputChange}
                          error={!!errors.startTime}
                          required
                        />
                        <FormError>{errors.startTime}</FormError>
                      </FormField>

                      <FormField>
                        <FormLabel htmlFor="endTime" required>
                          <Clock className="w-4 h-4 inline mr-2" />
                          End Time
                        </FormLabel>
                        <FormInput
                          id="endTime"
                          name="endTime"
                          type="time"
                          value={formData.endTime}
                          onChange={handleInputChange}
                          error={!!errors.endTime}
                          required
                        />
                        <FormError>{errors.endTime}</FormError>
                      </FormField>
                    </div>
                  )}

                  <FormField>
                    <FormLabel htmlFor="timezone">Timezone</FormLabel>
                    <select
                      id="timezone"
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      <option value="Asia/Hong_Kong">Hong Kong Time (HKT)</option>
                      <option value="Asia/Shanghai">China Standard Time (CST)</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                      <option value="UTC">Coordinated Universal Time (UTC)</option>
                    </select>
                  </FormField>
                </div>
              </FormSection>

              {/* Location */}
              <FormSection
                title="Location"
                description="Where your event takes place"
              >
                <FormField>
                  <FormLabel htmlFor="customLocation" required>
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Event Location
                  </FormLabel>
                  <FormInput
                    id="customLocation"
                    name="customLocation"
                    value={formData.customLocation}
                    onChange={handleInputChange}
                    onBlur={checkForDuplicates}
                    placeholder="e.g., Central Park Bandshell, New York, NY or Online via Zoom"
                    error={!!errors.customLocation}
                    required
                  />
                  <FormError>{errors.customLocation}</FormError>
                  <FormHelp>
                    Include the full address or clear directions. For online events, specify the platform.
                  </FormHelp>
                </FormField>
              </FormSection>

              {/* Event Image */}
              <FormSection
                title="Event Image"
                description="Upload an image for your event"
              >
                <FormField>
                  <FormLabel>Event Poster/Cover Image</FormLabel>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                    <div className="space-y-1 text-center">
                      {formData.posterUrl ? (
                        <div className="mb-4">
                          <img
                            src={formData.posterUrl}
                            alt="Event poster preview"
                            className="mx-auto h-32 w-auto object-cover rounded-lg"
                          />
                        </div>
                      ) : (
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      )}
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="poster-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                        >
                          <span>{formData.posterUrl ? 'Change image' : 'Upload an image'}</span>
                          <input
                            id="poster-upload"
                            name="poster-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploadingImage}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 5MB. Recommended size: 1200x630px
                      </p>
                      {uploadingImage && (
                        <p className="text-xs text-blue-600">Uploading...</p>
                      )}
                    </div>
                  </div>
                </FormField>
              </FormSection>

              {/* Tags */}
              <FormSection
                title="Tags"
                description="Help people discover your event"
              >
                <FormField>
                  <FormLabel htmlFor="currentTag">
                    <Tag className="w-4 h-4 inline mr-2" />
                    Event Tags
                  </FormLabel>
                  <div className="flex space-x-2">
                    <FormInput
                      id="currentTag"
                      name="currentTag"
                      value={formData.currentTag}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Add tags like 'live music', 'networking', 'family-friendly'"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      disabled={!formData.currentTag.trim()}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-2 hover:text-blue-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <FormHelp>
                    Add relevant tags to help people find your event. Press Enter or click + to add each tag.
                  </FormHelp>
                </FormField>
              </FormSection>

              {/* Pricing */}
              <FormSection
                title="Pricing & Tickets"
                description="Set your event pricing"
              >
                <FormField>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isFree"
                        name="isFree"
                        checked={formData.isFree}
                        onChange={handleInputChange}
                        className="rounded border-gray-300"
                      />
                      <FormLabel htmlFor="isFree" className="mb-0">
                        This is a free event
                      </FormLabel>
                    </div>

                    {!formData.isFree && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField>
                          <FormLabel htmlFor="minPrice" required>
                            <DollarSign className="w-4 h-4 inline mr-2" />
                            Minimum Price (HKD)
                          </FormLabel>
                          <FormInput
                            id="minPrice"
                            name="minPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.minPrice}
                            onChange={handleInputChange}
                            placeholder="0.00"
                            error={!!errors.minPrice}
                            required
                          />
                          <FormError>{errors.minPrice}</FormError>
                        </FormField>

                        <FormField>
                          <FormLabel htmlFor="maxPrice" required>
                            <DollarSign className="w-4 h-4 inline mr-2" />
                            Maximum Price (HKD)
                          </FormLabel>
                          <FormInput
                            id="maxPrice"
                            name="maxPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.maxPrice}
                            onChange={handleInputChange}
                            placeholder="0.00"
                            error={!!errors.maxPrice}
                            required
                          />
                          <FormError>{errors.maxPrice}</FormError>
                        </FormField>
                      </div>
                    )}

                    <FormField>
                      <FormLabel htmlFor="ticketUrl">
                        <ExternalLink className="w-4 h-4 inline mr-2" />
                        Ticket/Registration URL
                      </FormLabel>
                      <FormInput
                        id="ticketUrl"
                        name="ticketUrl"
                        type="url"
                        value={formData.ticketUrl}
                        onChange={handleInputChange}
                        placeholder="https://tickets.example.com/event"
                      />
                      <FormHelp>
                        Link to where people can buy tickets or register for your event
                      </FormHelp>
                    </FormField>
                  </div>
                </FormField>
              </FormSection>

              {/* Additional Settings */}
              <FormSection
                title="Additional Settings"
                description="Extra options for your event"
              >
                <div className="space-y-4">
                  <FormField>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="registrationRequired"
                        name="registrationRequired"
                        checked={formData.registrationRequired}
                        onChange={handleInputChange}
                        className="rounded border-gray-300"
                      />
                      <FormLabel htmlFor="registrationRequired" className="mb-0">
                        Registration required
                      </FormLabel>
                    </div>
                    <FormHelp>
                      Check this if attendees must register in advance
                    </FormHelp>
                  </FormField>

                  <FormField>
                    <FormLabel htmlFor="capacity">
                      <Users className="w-4 h-4 inline mr-2" />
                      Event Capacity
                    </FormLabel>
                    <FormInput
                      id="capacity"
                      name="capacity"
                      type="number"
                      min="1"
                      max="100000"
                      value={formData.capacity}
                      onChange={handleInputChange}
                      placeholder="Leave blank for unlimited capacity"
                      error={!!errors.capacity}
                    />
                    <FormError>{errors.capacity}</FormError>
                    <FormHelp>
                      Maximum number of attendees (optional)
                    </FormHelp>
                  </FormField>
                </div>
              </FormSection>
            </div>

            {/* Form Actions */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-between">
              <div className="flex items-center text-sm text-gray-600">
                <Info className="w-4 h-4 mr-2" />
                Drafts are saved privately. Submissions go to admin review.
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}