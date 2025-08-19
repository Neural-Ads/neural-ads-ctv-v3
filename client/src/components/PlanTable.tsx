import React, { useState, useEffect } from 'react';
import { generatePlan } from '../api';
import type { CampaignSpec, Segment, CampaignPlan } from '../api';
import { useTheme } from './AgenticWorkspace';

interface PlanTableProps {
  spec: CampaignSpec;
  segments: Segment[];
  onComplete: (plan: CampaignPlan) => void;
  onMessage: (type: 'user' | 'agent', content: string) => void;
}

const PlanTable: React.FC<PlanTableProps> = ({ spec, segments, onComplete, onMessage }) => {
  const { isGlassmorphism } = useTheme();
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    generateCampaignPlan();
  }, []);

  const generateCampaignPlan = async () => {
    try {
      setLoading(true);
      onMessage('agent', 'Generating your campaign plan...');
      
      // Create an updated spec with selected segments
      const updatedSpec = {
        ...spec,
        preferences: {
          segment_ids: segments.map(s => s.segmentId)
        }
      };
      
      const response = await generatePlan(updatedSpec);
      setPlan(response.data);
      onComplete(response.data);
      onMessage('agent', `🎯 Campaign plan generated successfully! Created ${response.data.plan.line_items.length} line items.`);
    } catch (error) {
      onMessage('agent', '❌ Error generating campaign plan. Please try again.');
      console.error('Plan generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (plan?.csvUrl) {
      const link = document.createElement('a');
      link.href = plan.csvUrl;
      link.download = `campaign-plan-${spec.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onMessage('user', '📥 Downloaded campaign plan CSV');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'ctv': return '📺';
      case 'mobile': return '📱';
      case 'desktop': return '💻';
      case 'tablet': return '📟';
      default: return '📱';
    }
  };

  const getContentIcon = (content: string) => {
    switch (content.toLowerCase()) {
      case 'sports': return '⚽';
      case 'news': return '📰';
      case 'family animation': return '🎬';
      case 'reality shows': return '🎭';
      case 'lifestyle': return '✨';
      case 'drama': return '🎭';
      case 'comedy': return '😄';
      default: return '🎥';
    }
  };

  const getBudgetGradient = (budget: number, totalBudget: number) => {
    const percentage = (budget / totalBudget) * 100;
    if (percentage >= 25) return 'bg-gradient-to-r from-emerald-500 to-green-600';
    if (percentage >= 15) return 'bg-gradient-to-r from-blue-500 to-indigo-600';
    if (percentage >= 10) return 'bg-gradient-to-r from-yellow-500 to-orange-600';
    return 'bg-gradient-to-r from-purple-500 to-pink-600';
  };

  if (loading) {
    return (
      <div className={`p-8 rounded-xl ${isGlassmorphism ? 'bg-white/10 backdrop-blur-lg border border-white/20' : 'bg-white border border-gray-200 shadow-lg'}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-6"></div>
            <p className={`text-lg font-medium ${isGlassmorphism ? 'text-white' : 'text-gray-700'}`}>
              🧠 Neural networks analyzing campaign requirements...
            </p>
            <p className={`text-sm mt-2 ${isGlassmorphism ? 'text-gray-300' : 'text-gray-500'}`}>
              Optimizing targeting and budget allocation
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className={`p-8 rounded-xl ${isGlassmorphism ? 'bg-white/10 backdrop-blur-lg border border-white/20' : 'bg-white border border-gray-200 shadow-lg'}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className={`text-lg font-medium mb-4 ${isGlassmorphism ? 'text-white' : 'text-gray-700'}`}>
            Failed to generate campaign plan
          </p>
          <button
            onClick={generateCampaignPlan}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              isGlassmorphism 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className={`p-8 rounded-xl ${isGlassmorphism ? 'bg-white/10 backdrop-blur-lg border border-white/20' : 'bg-white border border-gray-200 shadow-lg'}`}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className={`text-3xl font-bold mb-2 ${isGlassmorphism ? 'text-white' : 'text-gray-900'}`}>
              🎯 Campaign Plan Generated
            </h2>
            <p className={`text-lg ${isGlassmorphism ? 'text-gray-300' : 'text-gray-600'}`}>
              Neural-optimized line items for <span className="font-semibold">{spec.name}</span>
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className={`flex rounded-lg p-1 ${isGlassmorphism ? 'bg-white/20' : 'bg-gray-100'}`}>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : isGlassmorphism 
                      ? 'text-gray-300 hover:text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : isGlassmorphism 
                      ? 'text-gray-300 hover:text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 Table
              </button>
            </div>
            <button
              onClick={handleDownloadCSV}
              className={`px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors ${
                isGlassmorphism 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Campaign Overview */}
        <div className={`p-6 rounded-xl ${
          isGlassmorphism 
            ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-400/40' 
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-4xl font-bold mb-1 ${isGlassmorphism ? 'text-white' : 'text-blue-900'}`}>
                {formatCurrency(plan.plan.total_budget_allocated)}
              </div>
              <div className={`text-sm font-medium ${isGlassmorphism ? 'text-blue-200' : 'text-blue-700'}`}>
                💰 Total Budget
              </div>
            </div>
            <div className="text-center">
              <div className={`text-4xl font-bold mb-1 ${isGlassmorphism ? 'text-white' : 'text-blue-900'}`}>
                {plan.plan.line_items.length}
              </div>
              <div className={`text-sm font-medium ${isGlassmorphism ? 'text-blue-200' : 'text-blue-700'}`}>
                🎯 Line Items
              </div>
            </div>
            <div className="text-center">
              <div className={`text-4xl font-bold mb-1 ${isGlassmorphism ? 'text-white' : 'text-blue-900'}`}>
                {plan.summary.networks_covered?.length || 0}
              </div>
              <div className={`text-sm font-medium ${isGlassmorphism ? 'text-blue-200' : 'text-blue-700'}`}>
                📺 Networks
              </div>
            </div>
            <div className="text-center">
              <div className={`text-4xl font-bold mb-1 ${isGlassmorphism ? 'text-white' : 'text-blue-900'}`}>
                {plan.summary.locations_covered?.length || 0}
              </div>
              <div className={`text-sm font-medium ${isGlassmorphism ? 'text-blue-200' : 'text-blue-700'}`}>
                🗺️ Markets
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Display */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {plan.plan.line_items.map((lineItem, index) => (
            <div 
              key={lineItem.id || index} 
              className={`p-6 rounded-xl transition-all duration-300 hover:scale-105 ${
                isGlassmorphism 
                  ? 'bg-white/10 backdrop-blur-lg border border-white/20 hover:bg-white/20' 
                  : 'bg-white border border-gray-200 shadow-lg hover:shadow-xl'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{getContentIcon(lineItem.content || '')}</div>
                  <div>
                    <h3 className={`font-bold text-lg ${isGlassmorphism ? 'text-white' : 'text-gray-900'}`}>
                      {lineItem.name}
                    </h3>
                    <p className={`text-sm ${isGlassmorphism ? 'text-gray-300' : 'text-gray-600'}`}>
                      ID: {lineItem.id}
                    </p>
                  </div>
                </div>
                <div className="text-2xl">{getDeviceIcon(lineItem.device || '')}</div>
              </div>

              {/* Budget Display */}
              <div className={`mb-6 p-4 rounded-lg text-white ${getBudgetGradient(lineItem.budget, plan.plan.total_budget_allocated)}`}>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency(lineItem.budget)}</div>
                  <div className="text-sm opacity-90">
                    {((lineItem.budget / plan.plan.total_budget_allocated) * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>

              {/* Targeting Tags */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-500 text-white">
                    📍 {lineItem.geo || 'Nationwide'}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white">
                    🎯 {lineItem.audience || 'General'}
                  </span>
                </div>
                
                {lineItem.genres && (
                  <div className="flex flex-wrap gap-1">
                    {lineItem.genres.slice(0, 2).map((genre, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-500 text-white"
                      >
                        {genre}
                      </span>
                    ))}
                    {lineItem.genres.length > 2 && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-500 text-white">
                        +{lineItem.genres.length - 2} more
                      </span>
                    )}
                  </div>
                )}

                {lineItem.devices && (
                  <div className="flex flex-wrap gap-1">
                    {lineItem.devices.slice(0, 2).map((device, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-500 text-white"
                      >
                        {getDeviceIcon(device)} {device}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Performance Metrics */}
              <div className={`mt-6 pt-4 border-t ${isGlassmorphism ? 'border-white/20' : 'border-gray-200'}`}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className={`font-medium ${isGlassmorphism ? 'text-gray-300' : 'text-gray-600'}`}>Duration</div>
                    <div className={`${isGlassmorphism ? 'text-white' : 'text-gray-900'}`}>
                      {lineItem.start_date && lineItem.end_date 
                        ? `${formatDate(lineItem.start_date)} - ${formatDate(lineItem.end_date)}`
                        : 'Campaign Duration'
                      }
                    </div>
                  </div>
                  <div>
                    <div className={`font-medium ${isGlassmorphism ? 'text-gray-300' : 'text-gray-600'}`}>Networks</div>
                    <div className={`${isGlassmorphism ? 'text-white' : 'text-gray-900'}`}>
                      {lineItem.networks?.length || 0} networks
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className={`rounded-xl overflow-hidden ${isGlassmorphism ? 'bg-white/10 backdrop-blur-lg border border-white/20' : 'bg-white border border-gray-200 shadow-lg'}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className={`${isGlassmorphism ? 'bg-white/10' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isGlassmorphism ? 'text-gray-200' : 'text-gray-500'}`}>
                    Line Item
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isGlassmorphism ? 'text-gray-200' : 'text-gray-500'}`}>
                    Budget
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isGlassmorphism ? 'text-gray-200' : 'text-gray-500'}`}>
                    Duration
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isGlassmorphism ? 'text-gray-200' : 'text-gray-500'}`}>
                    Networks
                  </th>
                  <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isGlassmorphism ? 'text-gray-200' : 'text-gray-500'}`}>
                    Targeting
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isGlassmorphism ? 'divide-white/10' : 'divide-gray-200'}`}>
                {plan.plan.line_items.map((lineItem, index) => (
                  <tr 
                    key={lineItem.id || index} 
                    className={`transition-colors duration-200 ${
                      isGlassmorphism 
                        ? 'hover:bg-white/5' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getContentIcon(lineItem.content || '')}</div>
                        <div>
                          <div className={`text-sm font-medium ${isGlassmorphism ? 'text-white' : 'text-gray-900'}`}>
                            {lineItem.name}
                          </div>
                          <div className={`text-sm ${isGlassmorphism ? 'text-gray-300' : 'text-gray-600'}`}>
                            ID: {lineItem.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${isGlassmorphism ? 'text-white' : 'text-gray-900'}`}>
                        {formatCurrency(lineItem.budget)}
                      </div>
                      <div className={`text-xs ${isGlassmorphism ? 'text-gray-300' : 'text-gray-600'}`}>
                        {((lineItem.budget / plan.plan.total_budget_allocated) * 100).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isGlassmorphism ? 'text-white' : 'text-gray-900'}`}>
                        {lineItem.start_date && lineItem.end_date 
                          ? `${formatDate(lineItem.start_date)} - ${formatDate(lineItem.end_date)}`
                          : 'Campaign Duration'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {lineItem.networks?.slice(0, 2).map((network, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500 text-white"
                          >
                            {network}
                          </span>
                        ))}
                        {lineItem.networks && lineItem.networks.length > 2 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500 text-white">
                            +{lineItem.networks.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {lineItem.genres?.slice(0, 2).map((genre, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white"
                            >
                              {genre}
                            </span>
                          ))}
                          {lineItem.genres && lineItem.genres.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-500 text-white">
                              +{lineItem.genres.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success Message */}
      <div className={`p-6 rounded-xl text-center ${
        isGlassmorphism 
          ? 'bg-green-600/20 border border-green-400/40' 
          : 'bg-green-50 border border-green-200'
      }`}>
        <div className="text-4xl mb-2">🎉</div>
        <h3 className={`text-lg font-semibold mb-2 ${isGlassmorphism ? 'text-white' : 'text-green-900'}`}>
          Campaign Plan Successfully Generated!
        </h3>
        <p className={`text-sm ${isGlassmorphism ? 'text-green-200' : 'text-green-700'}`}>
          Your neural-optimized campaign is ready for deployment. Review the line items above and export when ready.
        </p>
      </div>
    </div>
  );
};

export default PlanTable; 