"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';

// Profile validation schema
const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than 50 characters'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than 50 characters'),
  contactNumber: z.string().min(10, 'Contact number must be at least 10 digits').max(15, 'Contact number must be less than 15 digits'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  location: z.string().min(1, 'Location is required').max(100, 'Location must be less than 100 characters'),
});

interface ProfileData {
  firstName: string;
  lastName: string;
  contactNumber: string;
  dateOfBirth: string;
  location: string;
  email: string; // readonly
  profilePhotoUrl?: string;
}

interface City {
  id: number;
  name: string;
  stateName: string;
  countryName: string;
  stateCode: string;
  countryCode: string;
  displayName: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    contactNumber: '',
    dateOfBirth: '',
    location: '',
    email: '',
    profilePhotoUrl: undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Photo upload states
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      console.log('🔄 ProfilePage: Starting to load profile data...');
      console.log('🌍 ProfilePage: Current window location:', window.location.href);
      console.log('🍪 ProfilePage: Current cookies:', document.cookie);
      
      try {
        console.log('📡 ProfilePage: Making API request to /api/profile');
        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include', // Ensure cookies are sent
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📊 ProfilePage: API response status:', response.status);
        console.log('📊 ProfilePage: API response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ ProfilePage: Raw API response data:', data);
          
          const newProfile = {
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            contactNumber: data.contactNumber || '',
            dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '', // Format date for input
            location: data.location || '',
            email: data.username || '', // username is email
            profilePhotoUrl: data.profilePhotoUrl || undefined
          };
          
          console.log('📋 ProfilePage: Processed profile data:', newProfile);
          console.log('📋 ProfilePage: Individual field values:');
          console.log('   - firstName:', data.firstName, '→', newProfile.firstName);
          console.log('   - lastName:', data.lastName, '→', newProfile.lastName);
          console.log('   - contactNumber:', data.contactNumber, '→', newProfile.contactNumber);
          console.log('   - dateOfBirth:', data.dateOfBirth, '→', newProfile.dateOfBirth);
          console.log('   - location:', data.location, '→', newProfile.location);
          console.log('   - email:', data.username, '→', newProfile.email);
          
          setProfile(newProfile);
          console.log('✅ ProfilePage: Profile state updated successfully');
          
          // Verify the state was actually set by logging it after a brief delay
          setTimeout(() => {
            console.log('🔍 ProfilePage: Verifying profile state was set correctly...');
            console.log('📊 ProfilePage: Current profile state in component:', {
              firstName: newProfile.firstName,
              lastName: newProfile.lastName,
              contactNumber: newProfile.contactNumber,
              dateOfBirth: newProfile.dateOfBirth,
              location: newProfile.location,
              email: newProfile.email
            });
          }, 100);
        } else {
          console.error('❌ ProfilePage: API request failed with status:', response.status);
          const errorText = await response.text();
          console.error('❌ ProfilePage: Error response body:', errorText);
          
          if (response.status === 401) {
            console.log('🚪 ProfilePage: Unauthorized - redirecting to login');
            router.push('/');
          }
        }
      } catch (error) {
        console.error('❌ ProfilePage: Exception during profile loading:', error);
        console.error('❌ ProfilePage: Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        setMessage('Failed to load profile data');
      } finally {
        console.log('🏁 ProfilePage: Loading completed, setting isLoading = false');
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  // Search cities function
  const searchCities = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setCities([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/cities?search=${encodeURIComponent(searchTerm)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setCities(data.cities || []);
        setShowDropdown(true);
      } else {
        setCities([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error searching cities:', error);
      setCities([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationSearch.trim()) {
        searchCities(locationSearch.trim());
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [locationSearch]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🚀 ProfilePage: Form submission started...');
    e.preventDefault();
    setMessage('');
    setErrors({});

    console.log('📋 ProfilePage: Current profile data:', profile);

    // Validate with Zod
    console.log('🔍 ProfilePage: Validating form data with schema...');
    const validation = profileSchema.safeParse({
      firstName: profile.firstName,
      lastName: profile.lastName,
      contactNumber: profile.contactNumber,
      dateOfBirth: profile.dateOfBirth,
      location: profile.location,
    });

    if (!validation.success) {
      console.error('❌ ProfilePage: Form validation failed:', validation.error.errors);
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    console.log('✅ ProfilePage: Form validation passed');
    
    setIsSaving(true);
    try {
      const requestData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        contactNumber: profile.contactNumber,
        dateOfBirth: profile.dateOfBirth,
        location: profile.location,
      };
      
      console.log('📤 ProfilePage: Sending PUT request with data:', requestData);
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📊 ProfilePage: API response status:', response.status);
      console.log('📊 ProfilePage: API response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ ProfilePage: Profile update successful:', responseData);
        setMessage('Profile updated successfully!');
      } else {
        const errorData = await response.json();
        console.error('❌ ProfilePage: Profile update failed:', errorData);
        setMessage(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('❌ ProfilePage: Exception during profile update:', error);
      setMessage('Failed to update profile');
    } finally {
      setIsSaving(false);
      console.log('🔄 ProfilePage: Form submission completed');
    }
  };

  // Photo upload functions
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('📸 ProfilePage: Photo selected:', file.name, file.size, file.type);
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setMessage('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setMessage('File too large. Maximum size is 5MB.');
        return;
      }

      setSelectedPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedPhoto) return;

    console.log('📸 ProfilePage: Starting photo upload...');
    setIsUploadingPhoto(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('photo', selectedPhoto);

      const response = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ ProfilePage: Photo upload successful:', data);
        
        // Update profile with new photo URL
        setProfile(prev => ({
          ...prev,
          profilePhotoUrl: data.photo.url
        }));
        
        // Clear selection
        setSelectedPhoto(null);
        setPhotoPreview(null);
        
        setMessage('Profile photo updated successfully!');
      } else {
        const errorData = await response.json();
        console.error('❌ ProfilePage: Photo upload failed:', errorData);
        setMessage(errorData.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('❌ ProfilePage: Exception during photo upload:', error);
      setMessage('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async () => {
    console.log('🗑️ ProfilePage: Starting photo deletion...');
    setIsDeletingPhoto(true);
    setMessage('');

    try {
      const response = await fetch('/api/profile/photo', {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('✅ ProfilePage: Photo deletion successful');
        
        // Update profile to remove photo
        setProfile(prev => ({
          ...prev,
          profilePhotoUrl: undefined
        }));
        
        setMessage('Profile photo deleted successfully!');
      } else {
        const errorData = await response.json();
        console.error('❌ ProfilePage: Photo deletion failed:', errorData);
        setMessage(errorData.error || 'Failed to delete photo');
      }
    } catch (error) {
      console.error('❌ ProfilePage: Exception during photo deletion:', error);
      setMessage('Failed to delete photo');
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  const cancelPhotoSelection = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    // Clear the file input
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <button
                onClick={() => router.push('/home')}
                className="hover:text-blue-600 transition-colors"
              >
                Dashboard
              </button>
              <span>›</span>
              <span className="text-gray-900 font-medium">Profile Settings</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h1>
            <p className="text-gray-600">Update your personal information</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Profile Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Profile Photo
              </label>
              
              <div className="flex items-center space-x-6">
                {/* Current/Preview Photo */}
                <div className="relative">
                  {photoPreview || profile.profilePhotoUrl ? (
                    <div className="w-20 h-20 rounded-full border-2 border-gray-300 overflow-hidden">
                      <img
                        src={photoPreview || profile.profilePhotoUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-gray-300 bg-gray-100 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1">
                  {!selectedPhoto ? (
                    <div className="space-y-2">
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        Choose Photo
                      </label>
                      {profile.profilePhotoUrl && (
                        <button
                          type="button"
                          onClick={handlePhotoDelete}
                          disabled={isDeletingPhoto}
                          className="ml-3 inline-flex items-center px-4 py-2 border border-red-300 rounded-lg shadow-sm bg-white text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isDeletingPhoto ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500 mr-2"></div>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Remove Photo
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        Selected: {selectedPhoto.name} ({Math.round(selectedPhoto.size / 1024)} KB)
                      </p>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={handlePhotoUpload}
                          disabled={isUploadingPhoto}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isUploadingPhoto ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 12l2 2 4-4"
                                />
                              </svg>
                              Upload Photo
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelPhotoSelection}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Supported formats: JPEG, PNG, GIF, WebP. Maximum size: 5MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Email (readonly) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">Email address cannot be changed</p>
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <Input
                id="firstName"
                type="text"
                placeholder="Enter your first name"
                value={profile.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter your last name"
                value={profile.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>

            {/* Contact Number */}
            <div>
              <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number *
              </label>
              <Input
                id="contactNumber"
                type="tel"
                placeholder="Enter your contact number"
                value={profile.contactNumber}
                onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  errors.contactNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.contactNumber && (
                <p className="mt-1 text-sm text-red-500">{errors.contactNumber}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth *
              </label>
              <Input
                id="dateOfBirth"
                type="date"
                value={profile.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                  errors.dateOfBirth ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.dateOfBirth && (
                <p className="mt-1 text-sm text-red-500">{errors.dateOfBirth}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="relative">
                <Input
                  ref={locationInputRef}
                  id="location"
                  type="text"
                  placeholder="Search by state name (e.g., California, Texas)"
                  value={locationSearch || profile.location}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    if (!e.target.value.trim()) {
                      handleInputChange('location', '');
                      setShowDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (cities.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                    errors.location ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
                
                {/* Search Results Dropdown */}
                {showDropdown && cities.length > 0 && (
                  <div 
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                  >
                    {cities.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          handleInputChange('location', city.displayName);
                          setLocationSearch('');
                          setShowDropdown(false);
                        }}
                      >
                        <div className="font-medium text-gray-900">{city.name}</div>
                        <div className="text-sm text-gray-500">{city.stateName}, {city.countryName}</div>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* No results message */}
                {showDropdown && cities.length === 0 && locationSearch.length >= 2 && !isSearching && (
                  <div 
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4"
                  >
                    <div className="text-sm text-gray-500 text-center">
                      No cities found for "{locationSearch}"
                    </div>
                  </div>
                )}
              </div>
              {errors.location && (
                <p className="mt-1 text-sm text-red-500">{errors.location}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Search for your city by typing a state name (e.g., California, New York)
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Update Profile'}
              </Button>
              <Button
                type="button"
                onClick={() => router.push('/home')}
                className="px-6 bg-gray-500 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Cancel
              </Button>
            </div>
          </form>

          {/* Success/Error Message */}
          {message && (
            <div className={`mt-6 text-center text-sm ${
              message.includes('successfully') ? 'text-green-600' : 'text-red-500'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}