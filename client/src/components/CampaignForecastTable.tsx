import React, { useState } from 'react';
import { useTheme } from './AgenticWorkspace';

interface CampaignForecast {
  campaign_duration: string;
  campaign_dates: string;
  total_inventory_available_mm: number;
  forecasted_impressions_mm: number;
  fill_rate_percent: number;
  effective_cpm_dollars: number;
  estimated_reach: number;
  frequency: number;
  notes: string[];
}

interface ForecastingData {
  advertiser: string;
  campaign_total_budget: number;
  campaign_forecast: CampaignForecast;
  performance_breakdown: {
    total_impressions_mm: number;
    effective_cpm: number;
    fill_rate_percent: number;
    estimated_reach: number;
    average_frequency: number;
    inventory_utilization_percent: number;
  };
  forecasting_insights: string[];
}

interface CampaignSetupData {
  advertiser?: string;
  budget?: number;
  objective?: string;
  timeline?: string;
  targetFrequency?: number;
  additional_requirements?: any;
}

interface CampaignForecastTableProps {
  data: ForecastingData;
  confidence: number;
  campaignSetup?: CampaignSetupData;
}

const CampaignForecastTable: React.FC<CampaignForecastTableProps> = ({ data, confidence, campaignSetup }) => {
  const { isGlassmorphism } = useTheme();
  const [showDetails, setShowDetails] = useState(false);

  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const formatCurrency = (num: number): string => {
    return `$${num.toFixed(2)}`;
  };

  const formatReach = (reach: number): string => {
    if (reach >= 1000000) {
      return `${(reach / 1000000).toFixed(1)}M`;
    } else if (reach >= 1000) {
      return `${(reach / 1000).toFixed(0)}K`;
    }
    return reach.toString();
  };

  const getFillRateColor = (fillRate: number): string => {
    if (fillRate >= 85) return 'text-orange-400';
    if (fillRate >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceColor = (conf: number): string => {
    // Confidence is now passed as percentage (0-100), not decimal (0-1)
    if (conf >= 80) return 'text-green-400';
    if (conf >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const campaign = data.campaign_forecast;
  const breakdown = data.performance_breakdown;

  return (
    <div className={`rounded-lg overflow-hidden ${
      isGlassmorphism 
        ? 'neural-glass-secondary backdrop-blur-md border border-white border-opacity-20' 
        : 'bg-white border border-gray-200 shadow-sm'
    }`}>
      {/* Header */}
      <div className={`px-6 py-4 ${
        isGlassmorphism 
          ? 'border-b border-white border-opacity-20' 
          : 'border-b border-gray-200 bg-gray-50'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${
              isGlassmorphism ? 'neural-text-contrast' : 'text-gray-900'
            }`}>
              📊 Campaign Forecast - {data.advertiser}
            </h3>
            <p className={`text-sm ${
              isGlassmorphism ? 'neural-text-secondary' : 'text-gray-600'
            }`}>
              {campaign.campaign_duration} • {campaign.campaign_dates}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${
              isGlassmorphism ? 'neural-text-emphasis' : 'text-gray-900'
            }`}>
              Budget: {formatCurrency(data.campaign_total_budget)}
            </div>
            <div className={`text-xs ${getConfidenceColor(confidence)}`}>
              {confidence.toFixed(0)}% Confidence
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Setup Summary */}
      {campaignSetup && (
        <div className={`px-6 py-4 ${
          isGlassmorphism 
            ? 'border-b border-white border-opacity-20' 
            : 'border-b border-gray-200 bg-gray-50'
        }`}>
          <h4 className={`text-sm font-medium mb-3 ${
            isGlassmorphism ? 'neural-text-emphasis' : 'text-gray-900'
          }`}>
            📋 Campaign Setup
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {campaignSetup.objective && (
              <div>
                <span className={`block ${isGlassmorphism ? 'neural-text-label' : 'text-gray-500'}`}>
                  Objective
                </span>
                <span className={`${isGlassmorphism ? 'neural-text-secondary' : 'text-gray-700'}`}>
                  {campaignSetup.objective}
                </span>
              </div>
            )}
            {campaignSetup.targetFrequency && (
              <div>
                <span className={`block ${isGlassmorphism ? 'neural-text-label' : 'text-gray-500'}`}>
                  Target Frequency
                </span>
                <span className={`${isGlassmorphism ? 'neural-text-secondary' : 'text-gray-700'}`}>
                  {campaignSetup.targetFrequency}x
                </span>
              </div>
            )}
            {campaignSetup.timeline && (
              <div>
                <span className={`block ${isGlassmorphism ? 'neural-text-label' : 'text-gray-500'}`}>
                  Timeline
                </span>
                <span className={`${isGlassmorphism ? 'neural-text-secondary' : 'text-gray-700'}`}>
                  {campaignSetup.timeline}
                </span>
              </div>
            )}
            {campaignSetup.budget && (
              <div>
                <span className={`block ${isGlassmorphism ? 'neural-text-label' : 'text-gray-500'}`}>
                  Budget
                </span>
                <span className={`${isGlassmorphism ? 'neural-text-secondary' : 'text-gray-700'}`}>
                  {formatCurrency(campaignSetup.budget)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          {/* Impressions */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              isGlassmorphism ? 'neural-text-contrast' : 'text-gray-900'
            }`}>
              {formatNumber(campaign.forecasted_impressions_mm)}M
            </div>
            <div className={`text-sm ${
              isGlassmorphism ? 'neural-text-label' : 'text-gray-500'
            }`}>
              Impressions
            </div>
          </div>

          {/* Reach */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              isGlassmorphism ? 'neural-text-contrast' : 'text-gray-900'
            }`}>
              {formatReach(campaign.estimated_reach)}
            </div>
            <div className={`text-sm ${
              isGlassmorphism ? 'neural-text-label' : 'text-gray-500'
            }`}>
              Reach
            </div>
          </div>

          {/* Fill Rate */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${getFillRateColor(campaign.fill_rate_percent)}`}>
              {formatNumber(campaign.fill_rate_percent)}%
            </div>
            <div className={`text-sm ${
              isGlassmorphism ? 'neural-text-label' : 'text-gray-500'
            }`}>
              Fill Rate
            </div>
          </div>

          {/* eCPM */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              isGlassmorphism ? 'neural-text-contrast' : 'text-gray-900'
            }`}>
              {formatCurrency(campaign.effective_cpm_dollars)}
            </div>
            <div className={`text-sm ${
              isGlassmorphism ? 'neural-text-label' : 'text-gray-500'
            }`}>
              eCPM
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${
            isGlassmorphism 
              ? 'bg-white bg-opacity-5 border border-white border-opacity-10' 
              : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className={`text-sm ${
              isGlassmorphism ? 'neural-text-label' : 'text-gray-500'
            }`}>
              Frequency
            </div>
            <div className={`text-lg font-semibold ${
              isGlassmorphism ? 'neural-text-emphasis' : 'text-gray-900'
            }`}>
              {formatNumber(campaign.frequency)}x
            </div>
            {campaignSetup?.targetFrequency && (
              <div className={`text-xs mt-1 ${
                Math.abs(campaign.frequency - campaignSetup.targetFrequency) < 0.1 
                  ? 'text-green-500' 
                  : 'text-yellow-500'
              }`}>
                Target: {campaignSetup.targetFrequency}x
                {Math.abs(campaign.frequency - campaignSetup.targetFrequency) < 0.1 && ' ✓'}
              </div>
            )}
          </div>

          <div className={`p-4 rounded-lg ${
            isGlassmorphism 
              ? 'bg-white bg-opacity-5 border border-white border-opacity-10' 
              : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className={`text-sm ${
              isGlassmorphism ? 'neural-text-label' : 'text-gray-500'
            }`}>
              Inventory Available
            </div>
            <div className={`text-lg font-semibold ${
              isGlassmorphism ? 'neural-text-emphasis' : 'text-gray-900'
            }`}>
              {formatNumber(campaign.total_inventory_available_mm)}M
            </div>
          </div>

          <div className={`p-4 rounded-lg ${
            isGlassmorphism 
              ? 'bg-white bg-opacity-5 border border-white border-opacity-10' 
              : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className={`text-sm ${
              isGlassmorphism ? 'neural-text-label' : 'text-gray-500'
            }`}>
              Inventory Utilization
            </div>
            <div className={`text-lg font-semibold ${
              isGlassmorphism ? 'neural-text-emphasis' : 'text-gray-900'
            }`}>
              {formatNumber(breakdown.inventory_utilization_percent)}%
            </div>
          </div>
        </div>

        {/* Campaign Notes */}
        {campaign.notes && campaign.notes.length > 0 && (
          <div className="mb-6">
            <h4 className={`text-sm font-medium mb-3 ${
              isGlassmorphism ? 'neural-text-emphasis' : 'text-gray-900'
            }`}>
              📝 Campaign Notes
            </h4>
            <div className="space-y-2">
              {campaign.notes.map((note, index) => (
                <div key={index} className={`text-sm ${
                  isGlassmorphism ? 'neural-text-secondary' : 'text-gray-600'
                }`}>
                  • {note}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        {data.forecasting_insights && data.forecasting_insights.length > 0 && (
          <div className="mb-4">
            <h4 className={`text-sm font-medium mb-3 ${
              isGlassmorphism ? 'neural-text-emphasis' : 'text-gray-900'
            }`}>
              💡 Strategic Insights
            </h4>
            <div className="space-y-2">
              {data.forecasting_insights.slice(0, showDetails ? undefined : 3).map((insight, index) => (
                <div key={index} className={`text-sm ${
                  isGlassmorphism ? 'neural-text-secondary' : 'text-gray-600'
                }`}>
                  • {insight}
                </div>
              ))}
              {data.forecasting_insights.length > 3 && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={`text-xs font-medium ${
                    isGlassmorphism ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                  }`}
                >
                  {showDetails ? 'Show Less' : `Show ${data.forecasting_insights.length - 3} More Insights`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              const csvContent = [
                'Campaign Forecast Export',
                `Advertiser,${data.advertiser}`,
                `Budget,${data.campaign_total_budget}`,
                `Duration,${campaign.campaign_duration}`,
                `Dates,${campaign.campaign_dates}`,
                `Impressions (M),${campaign.forecasted_impressions_mm}`,
                `Reach,${campaign.estimated_reach}`,
                `Frequency,${campaign.frequency}`,
                `Fill Rate (%),${campaign.fill_rate_percent}`,
                `eCPM ($),${campaign.effective_cpm_dollars}`,
                `Inventory Available (M),${campaign.total_inventory_available_mm}`,
                `Confidence,${confidence.toFixed(0)}%`,
                '',
                'Campaign Notes:',
                ...campaign.notes.map(note => `"${note}"`),
                '',
                'Strategic Insights:',
                ...data.forecasting_insights.map(insight => `"${insight}"`)
              ].join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${data.advertiser}_campaign_forecast.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              isGlassmorphism
                ? 'neural-glass-secondary border border-white border-opacity-20 neural-text-emphasis hover:bg-white hover:bg-opacity-10'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            } transition-colors`}
          >
            📊 Export Forecast
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignForecastTable;
