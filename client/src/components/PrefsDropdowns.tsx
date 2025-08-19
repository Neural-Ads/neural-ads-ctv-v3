import React, { useState, useEffect } from 'react';
import { fetchPrefs } from '../api';
import type { CampaignSpec } from '../api';

interface PrefsDropdownsProps {
  spec: CampaignSpec;
  onComplete: (prefs: any) => void;
  onMessage: (type: 'user' | 'agent', content: string) => void;
}

interface Preferences {
  networks: string[];
  genres: string[];
  devices: string[];
  locations: string[];
}

const PrefsDropdowns: React.FC<PrefsDropdownsProps> = ({ spec, onComplete, onMessage }) => {
  const [availablePrefs, setAvailablePrefs] = useState<Preferences>({
    networks: [],
    genres: [],
    devices: [],
    locations: []
  });
  const [selectedPrefs, setSelectedPrefs] = useState<Preferences>({
    networks: [],
    genres: [],
    devices: [],
    locations: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      // Use a default advertiser ID for now
      const response = await fetchPrefs('default');
      const prefs = response.data.preferences;
      setAvailablePrefs(prefs);
      
      // Pre-select some defaults
      setSelectedPrefs({
        networks: [prefs.networks[0]] || [],
        genres: [prefs.genres[0]] || [],
        devices: [prefs.devices[0]] || [],
        locations: [prefs.locations[0]] || []
      });
      
      onMessage('agent', 'Loaded advertiser preferences. Please customize your selections.');
    } catch (error) {
      onMessage('agent', 'Error loading preferences. Using default options.');
      // Set default preferences if API fails
      const defaults = {
        networks: ['Hulu', 'Roku', 'Tubi'],
        genres: ['Sports', 'Comedy', 'Drama'],
        devices: ['SmartTV', 'Mobile'],
        locations: ['Los Angeles', 'New York', 'Chicago']
      };
      setAvailablePrefs(defaults);
      setSelectedPrefs({
        networks: [defaults.networks[0]],
        genres: [defaults.genres[0]],
        devices: [defaults.devices[0]],
        locations: [defaults.locations[0]]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = (category: keyof Preferences, value: string, checked: boolean) => {
    setSelectedPrefs(prev => {
      const updated = { ...prev };
      if (checked) {
        if (!updated[category].includes(value)) {
          updated[category] = [...updated[category], value];
        }
      } else {
        updated[category] = updated[category].filter(item => item !== value);
      }
      return updated;
    });
  };

  const handleContinue = () => {
    onMessage('user', 'Selected preferences and continuing to audience segments');
    onComplete(selectedPrefs);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Advertiser Preferences</h2>
        <p className="text-gray-600 mb-6">Customize your targeting preferences for "{spec.name}"</p>
        
        <div className="space-y-6">
          {/* Networks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Networks</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availablePrefs.networks.map((network) => (
                <label key={network} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPrefs.networks.includes(network)}
                    onChange={(e) => handleSelectionChange('networks', network, e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{network}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Genres</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availablePrefs.genres.map((genre) => (
                <label key={genre} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPrefs.genres.includes(genre)}
                    onChange={(e) => handleSelectionChange('genres', genre, e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{genre}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Devices */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Devices</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availablePrefs.devices.map((device) => (
                <label key={device} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPrefs.devices.includes(device)}
                    onChange={(e) => handleSelectionChange('devices', device, e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{device}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Locations</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availablePrefs.locations.map((location) => (
                <label key={location} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPrefs.locations.includes(location)}
                    onChange={(e) => handleSelectionChange('locations', location, e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{location}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Selection Summary</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <div>Networks: {selectedPrefs.networks.join(', ') || 'None selected'}</div>
            <div>Genres: {selectedPrefs.genres.join(', ') || 'None selected'}</div>
            <div>Devices: {selectedPrefs.devices.join(', ') || 'None selected'}</div>
            <div>Locations: {selectedPrefs.locations.join(', ') || 'None selected'}</div>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedPrefs.networks.length && !selectedPrefs.genres.length}
                      className="neural-btn neural-btn-success w-full mt-6 font-medium"
        >
          Continue to Audience Segments
        </button>
      </div>
    </div>
  );
};

export default PrefsDropdowns; 