import React, { useState, useEffect } from 'react';
import { useTheme } from './AgenticWorkspace';
import axios from 'axios';

// Get API base URL (same logic as api.ts)
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.PROD) {
    return 'https://adagent-alb-1033327405.us-east-1.elb.amazonaws.com';
  }
  return 'http://localhost:8000';
};

interface CampaignSetupProps {
  onCampaignSubmit: (campaignData: CampaignFormData) => void;
  isProcessing?: boolean;
}

interface CampaignFormData {
  advertiser: string;
  campaignName: string;
  budget: number;
  startDate: string;
  endDate: string;
  objective: string;
  targetAudience: string;
  geography: string[];
  devices: string[];
  contentTypes: string[];
  dayparts: string[];
  notes: string;
}

const CampaignSetup: React.FC<CampaignSetupProps> = ({ onCampaignSubmit, isProcessing = false }) => {
  const { isGlassmorphism } = useTheme();
  
  const [formData, setFormData] = useState<CampaignFormData>({
    advertiser: '',
    campaignName: '',
    budget: 250000,
    startDate: '',
    endDate: '',
    objective: 'brand_awareness',
    targetAudience: '',
    geography: ['nationwide'],
    devices: ['ctv'],
    contentTypes: ['premium'],
    dayparts: ['primetime'],
    notes: ''
  });

  const [errors, setErrors] = useState<Partial<CampaignFormData>>({});
  const [advertiserSuggestions, setAdvertiserSuggestions] = useState<Array<{brand: string, domain: string, category: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<CampaignFormData> = {};
    
    if (!formData.advertiser.trim()) newErrors.advertiser = 'Advertiser name is required';
    if (!formData.campaignName.trim()) newErrors.campaignName = 'Campaign name is required';
    if (formData.budget <= 0) newErrors.budget = 'Budget must be greater than 0';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.targetAudience.trim()) newErrors.targetAudience = 'Target audience description is required';
    
    // Validate date range
    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onCampaignSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof CampaignFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleMultiSelectChange = (field: keyof CampaignFormData, value: string, checked: boolean) => {
    setFormData(prev => {
      const currentArray = prev[field] as string[];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  // Fetch advertiser suggestions based on search query
  const fetchAdvertiserSuggestions = async (query: string) => {
    if (query.length < 2) {
      setAdvertiserSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      // Try vector database search first
      const baseUrl = getApiBaseUrl();
      const response = await axios.post(`${baseUrl}/vector/search`, {
        query: query,
        limit: 5
      });
      
      if (response.data.advertisers) {
        setAdvertiserSuggestions(response.data.advertisers);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.warn('Vector search failed, trying fallback');
      try {
        // Fallback to regular advertiser endpoint
        const response = await axios.get(`${baseUrl}/advertisers?limit=10`);
        if (response.data.advertisers) {
          const filtered = response.data.advertisers.filter((adv: any) => 
            (adv.brand && adv.brand.toLowerCase().includes(query.toLowerCase())) ||
            (adv.domain && adv.domain.toLowerCase().includes(query.toLowerCase()))
          ).slice(0, 5);
          setAdvertiserSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        }
      } catch (fallbackError) {
        console.error('Failed to fetch advertiser suggestions:', fallbackError);
        setAdvertiserSuggestions([]);
        setShowSuggestions(false);
      }
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle advertiser input change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.advertiser.trim()) {
        fetchAdvertiserSuggestions(formData.advertiser);
      } else {
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [formData.advertiser]);

  // Handle clicking on a suggestion
  const handleSuggestionClick = (suggestion: any) => {
    const advertiserName = suggestion.brand || suggestion.domain?.split('.')[0] || 'Unknown';
    setFormData(prev => ({ ...prev, advertiser: advertiserName }));
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className={`text-lg font-semibold mb-2 ${
          isGlassmorphism 
            ? 'neural-heading-3' 
            : 'text-gray-900'
        }`}>Campaign Setup</h3>
        <p className={`${
          isGlassmorphism 
            ? 'neural-text-secondary' 
            : 'text-gray-600'
        }`}>
          Configure your CTV campaign parameters to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className={`${
          isGlassmorphism 
            ? 'neural-glass border border-white border-opacity-20' 
            : 'bg-white border border-gray-200 shadow-sm'
        } rounded-lg p-6`}>
          <h4 className={`text-md font-semibold mb-4 ${
            isGlassmorphism 
              ? 'neural-text-emphasis' 
              : 'text-gray-900'
          }`}>📋 Basic Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className={`block text-sm font-medium mb-2 ${
                isGlassmorphism 
                  ? 'neural-text-label' 
                  : 'text-gray-700'
              }`}>
                Advertiser Name *
              </label>
              <input
                type="text"
                value={formData.advertiser}
                onChange={(e) => handleInputChange('advertiser', e.target.value)}
                onFocus={() => formData.advertiser.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  errors.advertiser ? 'border-red-500' : 
                  isGlassmorphism 
                    ? 'border-white border-opacity-20 bg-white bg-opacity-10 text-white placeholder-gray-300 backdrop-blur-sm' 
                    : 'border-gray-300 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                placeholder="Start typing to search advertisers..."
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-y-auto ${
                  isGlassmorphism 
                    ? 'neural-glass border-white border-opacity-20 backdrop-blur-sm' 
                    : 'bg-white border-gray-300'
                }`}>
                  {isLoadingSuggestions ? (
                    <div className={`px-3 py-2 text-sm ${
                      isGlassmorphism ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      Searching advertisers...
                    </div>
                  ) : advertiserSuggestions.length > 0 ? (
                    advertiserSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`px-3 py-2 cursor-pointer transition-colors border-b last:border-b-0 ${
                          isGlassmorphism 
                            ? 'hover:bg-white hover:bg-opacity-10 border-white border-opacity-10 text-white' 
                            : 'hover:bg-gray-50 border-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="font-medium">
                          {suggestion.brand || suggestion.domain?.split('.')[0] || 'Unknown'}
                        </div>
                        <div className={`text-xs ${
                          isGlassmorphism ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {suggestion.category} • {suggestion.domain}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`px-3 py-2 text-sm ${
                      isGlassmorphism ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      No advertisers found. You can still enter a custom name.
                    </div>
                  )}
                </div>
              )}
              
              {errors.advertiser && <p className="text-red-500 text-xs mt-1">{errors.advertiser}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isGlassmorphism 
                  ? 'neural-text-label' 
                  : 'text-gray-700'
              }`}>
                Campaign Name *
              </label>
              <input
                type="text"
                value={formData.campaignName}
                onChange={(e) => handleInputChange('campaignName', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  errors.campaignName ? 'border-red-500' : 
                  isGlassmorphism 
                    ? 'border-white border-opacity-20 bg-white bg-opacity-10 text-white placeholder-gray-300 backdrop-blur-sm' 
                    : 'border-gray-300 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                placeholder="e.g., Holiday 2024 Brand Campaign"
              />
              {errors.campaignName && <p className="text-red-500 text-xs mt-1">{errors.campaignName}</p>}
            </div>
          </div>
        </div>

        {/* Budget & Timeline */}
        <div className={`${
          isGlassmorphism 
            ? 'neural-glass border border-white border-opacity-20' 
            : 'bg-white border border-gray-200 shadow-sm'
        } rounded-lg p-6`}>
          <h4 className={`text-md font-semibold mb-4 ${
            isGlassmorphism 
              ? 'neural-text-emphasis' 
              : 'text-gray-900'
          }`}>💰 Budget & Timeline</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isGlassmorphism 
                  ? 'neural-text-label' 
                  : 'text-gray-700'
              }`}>
                Total Budget ($) *
              </label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  errors.budget ? 'border-red-500' : 
                  isGlassmorphism 
                    ? 'border-white border-opacity-20 bg-white bg-opacity-10 text-white placeholder-gray-300 backdrop-blur-sm' 
                    : 'border-gray-300 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                min="1000"
                step="1000"
              />
              {errors.budget && <p className="text-red-500 text-xs mt-1">{errors.budget}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isGlassmorphism 
                  ? 'neural-text-label' 
                  : 'text-gray-700'
              }`}>
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  errors.startDate ? 'border-red-500' : 
                  isGlassmorphism 
                    ? 'border-white border-opacity-20 bg-white bg-opacity-10 text-white placeholder-gray-300 backdrop-blur-sm' 
                    : 'border-gray-300 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isGlassmorphism 
                  ? 'neural-text-label' 
                  : 'text-gray-700'
              }`}>
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  errors.endDate ? 'border-red-500' : 
                  isGlassmorphism 
                    ? 'border-white border-opacity-20 bg-white bg-opacity-10 text-white placeholder-gray-300 backdrop-blur-sm' 
                    : 'border-gray-300 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              />
              {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>
        </div>

        {/* Campaign Objective */}
        <div className={`${
          isGlassmorphism 
            ? 'neural-glass border border-white border-opacity-20' 
            : 'bg-white border border-gray-200 shadow-sm'
        } rounded-lg p-6`}>
          <h4 className={`text-md font-semibold mb-4 ${
            isGlassmorphism 
              ? 'neural-text-emphasis' 
              : 'text-gray-900'
          }`}>🎯 Campaign Objective</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isGlassmorphism 
                  ? 'neural-text-label' 
                  : 'text-gray-700'
              }`}>
                Primary Objective
              </label>
              <select
                value={formData.objective}
                onChange={(e) => handleInputChange('objective', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  isGlassmorphism 
                    ? 'border-white border-opacity-20 bg-white bg-opacity-10 text-white backdrop-blur-sm' 
                    : 'border-gray-300 focus:border-blue-500 bg-white text-gray-900'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
              >
                <option value="brand_awareness">Brand Awareness</option>
                <option value="reach">Reach & Frequency</option>
                <option value="video_completion">Video Completion</option>
                <option value="traffic">Website Traffic</option>
                <option value="conversions">Conversions</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isGlassmorphism 
                  ? 'neural-text-label' 
                  : 'text-gray-700'
              }`}>
                Target Audience Description *
              </label>
              <input
                type="text"
                value={formData.targetAudience}
                onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  errors.targetAudience ? 'border-red-500' : 
                  isGlassmorphism 
                    ? 'border-white border-opacity-20 bg-white bg-opacity-10 text-white placeholder-gray-300 backdrop-blur-sm' 
                    : 'border-gray-300 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                placeholder="e.g., Adults 25-54, Parents with children"
              />
              {errors.targetAudience && <p className="text-red-500 text-xs mt-1">{errors.targetAudience}</p>}
            </div>
          </div>
        </div>

        {/* Targeting Options */}
        <div className={`${
          isGlassmorphism 
            ? 'neural-glass border border-white border-opacity-20' 
            : 'bg-white border border-gray-200 shadow-sm'
        } rounded-lg p-6`}>
          <h4 className={`text-md font-semibold mb-4 ${
            isGlassmorphism 
              ? 'neural-text-emphasis' 
              : 'text-gray-900'
          }`}>🌍 Targeting Options</h4>
          
          <div className="space-y-4">
            {/* Geography */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isGlassmorphism 
                  ? 'neural-text-label' 
                  : 'text-gray-700'
              }`}>
                Geography
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['nationwide', 'northeast', 'southeast', 'midwest', 'southwest', 'west'].map(geo => (
                  <label key={geo} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.geography.includes(geo)}
                      onChange={(e) => handleMultiSelectChange('geography', geo, e.target.checked)}
                      className={`rounded text-blue-600 focus:ring-blue-500 ${
                        isGlassmorphism 
                          ? 'border-white border-opacity-30 bg-white bg-opacity-10 backdrop-blur-sm' 
                          : 'border-gray-300'
                      }`}
                    />
                    <span className={`text-sm capitalize ${
                      isGlassmorphism 
                        ? 'neural-text-secondary' 
                        : 'text-gray-700'
                    }`}>{geo}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Devices */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isGlassmorphism 
                  ? 'neural-text-label' 
                  : 'text-gray-700'
              }`}>
                Devices
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['ctv', 'mobile', 'desktop', 'tablet'].map(device => (
                  <label key={device} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.devices.includes(device)}
                      onChange={(e) => handleMultiSelectChange('devices', device, e.target.checked)}
                      className={`rounded text-blue-600 focus:ring-blue-500 ${
                        isGlassmorphism 
                          ? 'border-white border-opacity-30 bg-white bg-opacity-10 backdrop-blur-sm' 
                          : 'border-gray-300'
                      }`}
                    />
                    <span className={`text-sm uppercase ${
                      isGlassmorphism 
                        ? 'neural-text-secondary' 
                        : 'text-gray-700'
                    }`}>{device}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Content Types */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isGlassmorphism 
                  ? 'neural-text-label' 
                  : 'text-gray-700'
              }`}>
                Content Types
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['premium', 'sports', 'news', 'entertainment', 'kids', 'reality'].map(content => (
                  <label key={content} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.contentTypes.includes(content)}
                      onChange={(e) => handleMultiSelectChange('contentTypes', content, e.target.checked)}
                      className={`rounded text-blue-600 focus:ring-blue-500 ${
                        isGlassmorphism 
                          ? 'border-white border-opacity-30 bg-white bg-opacity-10 backdrop-blur-sm' 
                          : 'border-gray-300'
                      }`}
                    />
                    <span className={`text-sm capitalize ${
                      isGlassmorphism 
                        ? 'neural-text-secondary' 
                        : 'text-gray-700'
                    }`}>{content}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Dayparts */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isGlassmorphism 
                  ? 'neural-text-label' 
                  : 'text-gray-700'
              }`}>
                Dayparts
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['early_morning', 'daytime', 'primetime', 'late_night'].map(daypart => (
                  <label key={daypart} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.dayparts.includes(daypart)}
                      onChange={(e) => handleMultiSelectChange('dayparts', daypart, e.target.checked)}
                      className={`rounded text-blue-600 focus:ring-blue-500 ${
                        isGlassmorphism 
                          ? 'border-white border-opacity-30 bg-white bg-opacity-10 backdrop-blur-sm' 
                          : 'border-gray-300'
                      }`}
                    />
                    <span className={`text-sm ${
                      isGlassmorphism 
                        ? 'neural-text-secondary' 
                        : 'text-gray-700'
                    }`}>{daypart.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className={`${
          isGlassmorphism 
            ? 'neural-glass border border-white border-opacity-20' 
            : 'bg-white border border-gray-200 shadow-sm'
        } rounded-lg p-6`}>
          <h4 className={`text-md font-semibold mb-4 ${
            isGlassmorphism 
              ? 'neural-text-emphasis' 
              : 'text-gray-900'
          }`}>📝 Additional Notes</h4>
          
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border transition-colors ${
              isGlassmorphism 
                ? 'border-white border-opacity-20 bg-white bg-opacity-10 text-white placeholder-gray-300 backdrop-blur-sm' 
                : 'border-gray-300 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-500'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
            rows={3}
            placeholder="Any additional requirements, creative notes, or special considerations..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-6">
          <button
            type="submit"
            disabled={isProcessing}
            className={`px-8 py-3 font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isGlassmorphism 
                ? `neural-btn ${isProcessing ? 'neural-btn-secondary' : 'neural-btn-primary'}` 
                : isProcessing 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300' 
                : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transform'}`}
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="neural-spinner w-4 h-4"></div>
                <span>Creating Campaign...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>🚀</span>
                <span>Create Campaign</span>
              </div>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CampaignSetup; 