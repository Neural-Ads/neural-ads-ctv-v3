import React from 'react';
import { useTheme } from './AgenticWorkspace';

interface CampaignData {
  step: string;
  data: any;
  confidence: number;
  timestamp: string;
}

interface DataViewerProps {
  campaignData: CampaignData[];
  currentStep: string;
  onDownload: (data: any) => void;
}

const DataViewer: React.FC<DataViewerProps> = ({ 
  campaignData, 
  currentStep, 
  onDownload 
}) => {
  const { isGlassmorphism } = useTheme();
  const getCurrentStepData = () => {
    return campaignData.find(data => data.step === currentStep);
  };

  const getLatestData = () => {
    return campaignData[campaignData.length - 1];
  };

  const formatDataValue = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return JSON.stringify(value, null, 2);
    }
    return value?.toString() || 'N/A';
  };

  const currentData = getCurrentStepData() || getLatestData();

  return (
    <div className="p-4 space-y-4">
      {/* Current Step Output */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Current Output</h3>
          <span className="text-sm text-gray-500 capitalize">{currentStep.replace('_', ' ')}</span>
        </div>

        {currentData ? (
          <div className="space-y-3">
            {/* Confidence Score */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Confidence</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      currentData.confidence > 0.8 ? 'bg-green-500' :
                      currentData.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${currentData.confidence * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{(currentData.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Data Fields */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentData.data && Object.entries(currentData.data).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <div className="flex justify-between items-start py-1">
                    <span className="text-gray-600 capitalize font-medium">{key.replace('_', ' ')}:</span>
                    <span className="text-gray-900 text-right max-w-xs break-words">
                      {formatDataValue(value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>Waiting for agent data...</p>
          </div>
        )}
      </div>

      {/* Data History */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Processing History</h3>
        
        {campaignData.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {campaignData.map((data, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <span className="text-sm font-medium capitalize">{data.step.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(data.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  data.confidence > 0.8 ? 'bg-green-500' :
                  data.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No data generated yet</p>
        )}
      </div>

      {/* Download Options */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Download & Export</h3>
        
        <div className="space-y-2">
          <button 
            onClick={() => onDownload(campaignData)}
            disabled={campaignData.length === 0}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isGlassmorphism 
                ? 'neural-btn neural-btn-success' 
                : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 disabled:text-gray-500'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download Campaign Data (JSON)</span>
          </button>
          
          <button 
            disabled={currentStep !== 'campaign_generation'}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isGlassmorphism 
                ? 'neural-btn neural-btn-primary' 
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download Line Items (CSV)</span>
          </button>
          
          <button 
            disabled={campaignData.length === 0}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isGlassmorphism 
                ? 'neural-btn neural-btn-glass' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 disabled:bg-gray-300 disabled:text-gray-500'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span>Share Campaign Summary</span>
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      {currentData && currentData.step === 'campaign_generation' && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Predicted Performance</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className={`text-center p-3 ${
              isGlassmorphism 
                ? 'neural-glass-info' 
                : 'bg-blue-50 border border-blue-200 rounded'
            }`}>
              <div className={`text-lg font-bold ${
                isGlassmorphism 
                  ? 'text-white' 
                  : 'text-blue-900'
              }`}>75-85%</div>
              <div className={`text-sm ${
                isGlassmorphism 
                  ? 'text-gray-100' 
                  : 'text-blue-700'
              }`}>Completion Rate</div>
            </div>
            <div className={`text-center p-3 ${
              isGlassmorphism 
                ? 'neural-glass-success' 
                : 'bg-green-50 border border-green-200 rounded'
            }`}>
              <div className={`text-lg font-bold ${
                isGlassmorphism 
                  ? 'text-white' 
                  : 'text-green-900'
              }`}>2.1%</div>
              <div className={`text-sm ${
                isGlassmorphism 
                  ? 'text-gray-100' 
                  : 'text-green-700'
              }`}>Expected CTR</div>
            </div>
            <div className={`text-center p-3 ${
              isGlassmorphism 
                ? 'neural-glass-panel' 
                : 'bg-gray-50 border border-gray-200 rounded'
            }`}>
              <div className={`text-lg font-bold ${
                isGlassmorphism 
                  ? 'text-white' 
                  : 'text-gray-900'
              }`}>$12.50</div>
              <div className={`text-sm ${
                isGlassmorphism 
                  ? 'text-gray-100' 
                  : 'text-gray-700'
              }`}>Avg CPM</div>
            </div>
            <div className={`text-center p-3 ${
              isGlassmorphism 
                ? 'neural-glass-warning' 
                : 'bg-yellow-50 border border-yellow-200 rounded'
            }`}>
              <div className={`text-lg font-bold ${
                isGlassmorphism 
                  ? 'text-white' 
                  : 'text-yellow-900'
              }`}>85</div>
              <div className={`text-sm ${
                isGlassmorphism 
                  ? 'text-gray-100' 
                  : 'text-yellow-700'
              }`}>Line Items</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataViewer; 