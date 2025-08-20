import React, { useState } from 'react';
import { useTheme } from './AgenticWorkspace';

interface WeeklyForecast {
  week_number: number;
  week_dates: string;
  inventory_available_mm: number;
  forecasted_impressions_mm: number;
  fill_rate_percent: number;
  ecpm_dollars: number;
  notes: string;
}

interface ForecastingData {
  advertiser: string;
  campaign_total_budget: number;
  weekly_forecasts: WeeklyForecast[];
  month_totals: {
    inventory_available_mm: number;
    forecasted_impressions_mm: number;
    avg_fill_rate_percent: number;
    avg_ecpm_dollars: number;
  };
  campaign_totals: {
    inventory_available_mm: number;
    forecasted_impressions_mm: number;
    avg_fill_rate_percent: number;
    avg_ecpm_dollars: number;
  };
  forecasting_insights: string[];
}

interface ForecastingTableProps {
  data: ForecastingData;
  confidence: number;
}

const ForecastingTable: React.FC<ForecastingTableProps> = ({ data, confidence }) => {
  const { isGlassmorphism } = useTheme();
  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const formatCurrency = (num: number): string => {
    return `$${num.toFixed(2)}`;
  };

  const getWeekLabel = (forecast: WeeklyForecast): string => {
    return `Week ${forecast.week_number} (${forecast.week_dates})`;
  };

  const getFillRateColor = (fillRate: number): string => {
    if (fillRate >= 85) return 'text-orange-400';
    if (fillRate >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${
            isGlassmorphism 
              ? 'neural-heading-3' 
              : 'text-gray-900'
          }`}>Campaign Forecast</h3>
          <p className={`${
            isGlassmorphism 
              ? 'neural-text-secondary' 
              : 'text-gray-600'
          }`}>
            {data.advertiser} • ${data.campaign_total_budget.toLocaleString()} Budget
          </p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${
            isGlassmorphism 
              ? 'neural-text-label' 
              : 'text-gray-700'
          }`}>Forecast Confidence</div>
          <div className={`text-lg font-semibold ${confidence >= 80 ? 'text-orange-400' : confidence >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {confidence}%
          </div>
        </div>
      </div>

      {/* Forecasting Table */}
      <div className={`${
        isGlassmorphism 
          ? 'neural-glass border border-white border-opacity-20' 
          : 'bg-white border border-gray-200 shadow-sm'
      } rounded-lg overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`${
                isGlassmorphism 
                  ? 'bg-white bg-opacity-5 border-b border-white border-opacity-10' 
                  : 'bg-gray-50 border-b border-gray-200'
              }`}>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isGlassmorphism 
                    ? 'neural-text-label' 
                    : 'text-gray-500'
                }`}>
                  Period
                </th>
                <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                  isGlassmorphism 
                    ? 'neural-text-label' 
                    : 'text-gray-500'
                }`}>
                  Inventory Avail. (MM)
                </th>
                <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                  isGlassmorphism 
                    ? 'neural-text-label' 
                    : 'text-gray-500'
                }`}>
                  Forecasted Impr. (MM)
                </th>
                <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                  isGlassmorphism 
                    ? 'neural-text-label' 
                    : 'text-gray-500'
                }`}>
                  Fill Rate (%)
                </th>
                <th className={`px-4 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                  isGlassmorphism 
                    ? 'neural-text-label' 
                    : 'text-gray-500'
                }`}>
                  eCPM ($)
                </th>
                <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isGlassmorphism 
                    ? 'neural-text-label' 
                    : 'text-gray-500'
                }`}>
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className={`${
              isGlassmorphism 
                ? 'divide-y divide-white divide-opacity-10' 
                : 'divide-y divide-gray-200'
            }`}>
              {/* Weekly Forecasts */}
              {data.weekly_forecasts.map((forecast, index) => (
                <tr key={index} className={`transition-colors ${
                  isGlassmorphism 
                    ? 'hover:bg-white hover:bg-opacity-5' 
                    : 'hover:bg-gray-50'
                }`}>
                  <td className={`px-4 py-3 text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-emphasis' 
                      : 'text-gray-900'
                  }`}>
                    {getWeekLabel(forecast)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right ${
                    isGlassmorphism 
                      ? 'neural-text-secondary' 
                      : 'text-gray-600'
                  }`}>
                    {formatNumber(forecast.inventory_available_mm)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right ${
                    isGlassmorphism 
                      ? 'neural-text-secondary' 
                      : 'text-gray-600'
                  }`}>
                    {formatNumber(forecast.forecasted_impressions_mm)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${getFillRateColor(forecast.fill_rate_percent)}`}>
                    {formatNumber(forecast.fill_rate_percent)}%
                  </td>
                  <td className={`px-4 py-3 text-sm text-right ${
                    isGlassmorphism 
                      ? 'neural-text-secondary' 
                      : 'text-gray-600'
                  }`}>
                    {formatCurrency(forecast.ecpm_dollars)}
                  </td>
                  <td className={`px-4 py-3 text-xs ${
                    isGlassmorphism 
                      ? 'neural-text-muted' 
                      : 'text-gray-500'
                  }`}>
                    {forecast.notes}
                  </td>
                </tr>
              ))}

              {/* Month Total Row */}
              <tr className="bg-white bg-opacity-5 border-t-2 border-white border-opacity-20">
                <td className="px-4 py-3 neural-text-contrast">
                  Month Total
                </td>
                <td className="px-4 py-3 neural-text-emphasis text-right">
                  {formatNumber(data.month_totals.inventory_available_mm)}
                </td>
                <td className="px-4 py-3 neural-text-emphasis text-right">
                  {formatNumber(data.month_totals.forecasted_impressions_mm)}
                </td>
                <td className={`px-4 py-3 text-sm text-right font-semibold ${getFillRateColor(data.month_totals.avg_fill_rate_percent)}`}>
                  {formatNumber(data.month_totals.avg_fill_rate_percent)}%
                </td>
                <td className="px-4 py-3 neural-text-emphasis text-right">
                  {formatCurrency(data.month_totals.avg_ecpm_dollars)}
                </td>
                <td className="px-4 py-3 neural-text-muted text-xs">
                  Monthly averages
                </td>
              </tr>

              {/* Campaign Total Row */}
              <tr className="bg-white bg-opacity-10 border-t border-white border-opacity-20">
                <td className="px-4 py-3 neural-text-contrast font-bold">
                  Campaign Total
                </td>
                <td className="px-4 py-3 neural-text-contrast text-right">
                  {formatNumber(data.campaign_totals.inventory_available_mm)}
                </td>
                <td className="px-4 py-3 neural-text-contrast text-right">
                  {formatNumber(data.campaign_totals.forecasted_impressions_mm)}
                </td>
                <td className={`px-4 py-3 text-sm text-right font-bold ${getFillRateColor(data.campaign_totals.avg_fill_rate_percent)}`}>
                  {formatNumber(data.campaign_totals.avg_fill_rate_percent)}%
                </td>
                <td className="px-4 py-3 neural-text-contrast text-right">
                  {formatCurrency(data.campaign_totals.avg_ecpm_dollars)}
                </td>
                <td className="px-4 py-3 neural-text-muted text-xs">
                  Campaign averages
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights Section */}
      {data.forecasting_insights && data.forecasting_insights.length > 0 && (
        <div className={`${
          isGlassmorphism 
            ? 'neural-glass border border-white border-opacity-20' 
            : 'bg-white border border-gray-200 shadow-sm'
        } rounded-lg p-4`}>
          <h4 className={`text-sm font-semibold mb-3 ${
            isGlassmorphism 
              ? 'neural-text-emphasis' 
              : 'text-gray-900'
          }`}>📊 Forecasting Insights</h4>
          <div className="space-y-2">
            {data.forecasting_insights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <p className={`text-sm ${
                  isGlassmorphism 
                    ? 'neural-text-secondary' 
                    : 'text-gray-600'
                }`}>{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Options */}
      <div className={`flex items-center justify-between pt-4 ${
        isGlassmorphism 
          ? 'border-t border-white border-opacity-10' 
          : 'border-t border-gray-200'
      }`}>
        <div className={`text-xs ${
          isGlassmorphism 
            ? 'neural-text-muted' 
            : 'text-gray-500'
        }`}>
          Last updated: {new Date().toLocaleString()}
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => {
              // Export forecast data as CSV
              const csvHeaders = ['Period', 'Inventory Avail. (MM)', 'Forecasted Impr. (MM)', 'Fill Rate (%)', 'eCPM ($)', 'Notes'];
              const csvRows = [
                csvHeaders.join(','),
                ...data.weekly_forecasts.map(f => [
                  `"${getWeekLabel(f)}"`,
                  formatNumber(f.inventory_available_mm),
                  formatNumber(f.forecasted_impressions_mm),
                  formatNumber(f.fill_rate_percent),
                  formatCurrency(f.ecpm_dollars).replace('$', ''),
                  `"${f.notes}"`
                ].join(',')),
                [
                  '"Month Total"',
                  formatNumber(data.month_totals.inventory_available_mm),
                  formatNumber(data.month_totals.forecasted_impressions_mm),
                  formatNumber(data.month_totals.avg_fill_rate_percent),
                  formatCurrency(data.month_totals.avg_ecpm_dollars).replace('$', ''),
                  '"Monthly averages"'
                ].join(','),
                [
                  '"Campaign Total"',
                  formatNumber(data.campaign_totals.inventory_available_mm),
                  formatNumber(data.campaign_totals.forecasted_impressions_mm),
                  formatNumber(data.campaign_totals.avg_fill_rate_percent),
                  formatCurrency(data.campaign_totals.avg_ecpm_dollars).replace('$', ''),
                  '"Campaign averages"'
                ].join(',')
              ];
              
              const csvContent = csvRows.join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              
              if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${data.advertiser.toLowerCase().replace(/\s+/g, '-')}-forecast-${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}
            className={`text-xs px-3 py-1.5 ${
              isGlassmorphism 
                ? 'neural-btn neural-btn-secondary' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors'
            }`}
          >
            📊 Export CSV
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForecastingTable; 