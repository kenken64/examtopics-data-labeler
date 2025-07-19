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
    email: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      console.log('🔄 ProfilePage: Starting to load profile data...');
      try {
        console.log('📡 ProfilePage: Making API request to /api/profile');
        const response = await fetch('/api/profile');
        
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
            email: data.username || '' // username is email
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
    e.preventDefault();
    setMessage('');
    setErrors({});

    // Validate with Zod
    const validation = profileSchema.safeParse({
      firstName: profile.firstName,
      lastName: profile.lastName,
      contactNumber: profile.contactNumber,
      dateOfBirth: profile.dateOfBirth,
      location: profile.location,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        if (error.path[0]) {
          fieldErrors[error.path[0] as string] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName,
          contactNumber: profile.contactNumber,
          dateOfBirth: profile.dateOfBirth,
          location: profile.location,
        }),
      });

      if (response.ok) {
        setMessage('Profile updated successfully!');
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
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