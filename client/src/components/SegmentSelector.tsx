import React, { useState, useEffect } from 'react';
import { fetchSegments } from '../api';
import type { Segment } from '../api';

interface SegmentSelectorProps {
  onComplete: (segments: Segment[]) => void;
  onMessage: (type: 'user' | 'agent', content: string) => void;
}

const SegmentSelector: React.FC<SegmentSelectorProps> = ({ onComplete, onMessage }) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      const response = await fetchSegments();
      setSegments(response.data.segments);
      onMessage('agent', 'Loaded available audience segments. Select the ones that match your campaign goals.');
    } catch (error) {
      onMessage('agent', 'Error loading segments. Using sample data.');
      // Fallback data
      setSegments([
        {
          segmentId: 1,
          name: 'SportsFansLA',
          size: 50000,
          geo: 'Los Angeles',
          demoTags: ['Sports', '18-34']
        },
        {
          segmentId: 2,
          name: 'DramaWatchersNY',
          size: 75000,
          geo: 'New York',
          demoTags: ['Drama', '25-44']
        },
        {
          segmentId: 3,
          name: 'ComedyLoversCHI',
          size: 60000,
          geo: 'Chicago',
          demoTags: ['Comedy', '18-49']
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSegmentToggle = (segmentId: number) => {
    setSelectedSegments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(segmentId)) {
        newSet.delete(segmentId);
      } else {
        newSet.add(segmentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedSegments.size === segments.length) {
      setSelectedSegments(new Set());
    } else {
      setSelectedSegments(new Set(segments.map(s => s.segmentId)));
    }
  };

  const handleContinue = () => {
    const selected = segments.filter(s => selectedSegments.has(s.segmentId));
    if (selected.length === 0) {
      onMessage('agent', 'Please select at least one audience segment to continue.');
      return;
    }
    
    onMessage('user', `Selected ${selected.length} audience segment(s): ${selected.map(s => s.name).join(', ')}`);
    onComplete(selected);
  };

  const getTotalReach = () => {
    return segments
      .filter(s => selectedSegments.has(s.segmentId))
      .reduce((total, s) => total + s.size, 0);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Audience Segments</h2>
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {selectedSegments.size === segments.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Choose audience segments that align with your campaign objectives.
        </p>

        {/* Segments Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Select
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Segment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Geography
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Demographics
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {segments.map((segment) => (
                <tr 
                  key={segment.segmentId}
                  className={`hover:bg-gray-50 ${selectedSegments.has(segment.segmentId) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedSegments.has(segment.segmentId)}
                      onChange={() => handleSegmentToggle(segment.segmentId)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{segment.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{segment.size.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{segment.geo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {segment.demoTags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selection Summary */}
        {selectedSegments.size > 0 && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="text-sm font-medium text-green-800 mb-2">Selection Summary</h3>
            <div className="text-sm text-green-700">
              <div>Selected Segments: {selectedSegments.size} of {segments.length}</div>
              <div>Total Reach: {getTotalReach().toLocaleString()} people</div>
            </div>
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={selectedSegments.size === 0}
                      className="neural-btn neural-btn-success w-full mt-6 font-medium"
        >
          Generate Campaign Plan ({selectedSegments.size} segments selected)
        </button>
      </div>
    </div>
  );
};

export default SegmentSelector; 