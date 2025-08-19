import React from 'react';
import { useTheme } from './AgenticWorkspace';

interface CampaignData {
  step: string;
  data: any;
  confidence: number;
  timestamp: string;
}

interface CampaignStepsProps {
  currentStep: string;
  progress: number;
  campaignData: CampaignData[];
}

const CampaignSteps: React.FC<CampaignStepsProps> = ({ 
  currentStep, 
  progress, 
  campaignData 
}) => {
  const { isGlassmorphism } = useTheme();
  const steps = [
    {
      id: 'campaign_data',
      title: 'Campaign Parameters',
      description: 'Define campaign basics',
      color: 'blue'
    },
    {
      id: 'advertiser_preferences',
      title: 'Historical Data',
      description: 'Analyze viewing patterns',
      color: 'purple'
    },
    {
      id: 'audience_generation',
      title: 'Audience Analysis',
      description: 'Analyze target audience',
      color: 'green'
    },
    {
      id: 'campaign_generation',
      title: 'Media Plan',
      description: 'Generate media strategy',
      color: 'orange'
    }
  ];

  const getStepStatus = (stepId: string) => {
    if (currentStep === stepId) return 'active';
    
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    if (stepIndex < currentIndex || progress >= 100) return 'completed';
    return 'pending';
  };

  const getStepData = (stepId: string) => {
    return campaignData.find(data => data.step === stepId);
  };

  const getConfidenceClass = (confidence: number) => {
    if (confidence > 80) return 'high';
    if (confidence > 60) return 'medium';
    return 'low';
  };

  return (
    <div className={`p-6 ${
      isGlassmorphism 
        ? 'neural-glass-card neural-slide-in' 
        : 'bg-white border border-gray-200 rounded-2xl shadow-lg'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-lg font-semibold ${
            isGlassmorphism 
              ? 'text-white' 
              : 'text-gray-900'
          }`}>Ad Planning Progress</h3>
          <p className={`text-sm mt-1 ${
            isGlassmorphism 
              ? 'text-gray-100' 
              : 'text-gray-600'
          }`}>Track your campaign setup</p>
        </div>
        <div className="text-right">
          <div className={`px-3 py-1 rounded-lg ${
            isGlassmorphism 
              ? 'neural-glass-info' 
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <span className={`text-sm font-medium ${
              isGlassmorphism 
                ? 'text-white' 
                : 'text-blue-800'
            }`}>
              {progress < 100 ? `${Math.ceil((progress / 25))} Step${progress > 25 ? 's' : ''} Running` : 'Complete'}
            </span>
          </div>
          <div className={`text-sm mt-1 ${
            isGlassmorphism 
              ? 'text-gray-100' 
              : 'text-gray-600'
          }`}>{progress.toFixed(0)}% Complete</div>
        </div>
      </div>

      {/* Modern Progress Timeline */}
      <div className={`mb-8 p-6 ${
        isGlassmorphism 
          ? 'neural-glass-panel' 
          : 'bg-gray-50 border border-gray-200 rounded-lg'
      }`}>
        <div className="flex items-center justify-between relative">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const stepData = getStepData(step.id);
            
            return (
              <div key={step.id} className={`relative flex flex-col items-center min-w-0 flex-1`}>
                <div className={`neural-step-circle ${status}`}>
                  {status === 'completed' ? '✓' : index + 1}
                </div>
                <div className="mt-3 text-center">
                  <div className={`text-xs font-medium mb-1 ${
                    isGlassmorphism 
                      ? 'text-gray-200' 
                      : 'text-gray-500'
                  }`}>Step {index + 1}</div>
                  <div className={`text-sm font-medium ${
                    isGlassmorphism 
                      ? 'text-white' 
                      : 'text-gray-900'
                  }`}>{step.title.split(' ')[0]}</div>
                  {status === 'active' && (
                    <div className="mt-1">
                      <div className={`w-8 h-1 rounded-full mx-auto ${
                        isGlassmorphism 
                          ? 'bg-white bg-opacity-20' 
                          : 'bg-gray-200'
                      }`}>
                        <div className="h-1 bg-blue-400 rounded-full animate-pulse" style={{width: '60%'}}></div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Connection line */}
                {index < steps.length - 1 && (
                  <div className={`absolute top-5 left-1/2 w-full h-0.5 -translate-x-1/2 -z-10 ${
                    status === 'completed' ? 'bg-gradient-to-r from-green-400 to-green-500' :
                    status === 'active' ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                    isGlassmorphism ? 'bg-white bg-opacity-20' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const stepData = getStepData(step.id);
          
          return (
            <div key={step.id} className={`${
              isGlassmorphism 
                ? `neural-glass-card neural-fade-in ${status === 'active' ? 'ring-2 ring-blue-500 ring-opacity-30' : ''}` 
                : `bg-white border border-gray-200 rounded-lg shadow-lg ${status === 'active' ? 'ring-2 ring-blue-500' : ''}`
            }`} style={{animationDelay: `${index * 0.1}s`}}>
              
              {/* Card Header */}
              <div className={`p-4 ${
                isGlassmorphism 
                  ? `neural-glass-header ${
                      status === 'active' ? 'neural-glass-info' :
                      status === 'completed' ? 'neural-glass-success' :
                      'neural-glass-panel'
                    }`
                  : `${
                      status === 'active' ? 'bg-blue-50 border-b border-blue-200' :
                      status === 'completed' ? 'bg-green-50 border-b border-green-200' :
                      'bg-gray-50 border-b border-gray-200'
                    }`
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className={`font-semibold ${
                        isGlassmorphism 
                          ? 'text-white' 
                          : 'text-gray-900'
                      }`}>{step.title}</h4>
                      <p className={`text-sm ${
                        isGlassmorphism 
                          ? 'text-gray-100' 
                          : 'text-gray-600'
                      }`}>{step.description}</p>
                    </div>
                  </div>
                  
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'active' ? 'bg-blue-400 animate-pulse' :
                    status === 'completed' ? 'bg-green-400' :
                    'bg-gray-400'
                  }`}></div>
                </div>
              </div>

              {/* Card Content */}
              <div className={`p-4 ${
                isGlassmorphism 
                  ? 'neural-glass-content' 
                  : 'bg-white'
              }`}>
                {status === 'pending' && (
                  <div className="text-center py-4">
                    <div className={`${
                      isGlassmorphism 
                        ? 'text-gray-200' 
                        : 'text-gray-500'
                    }`}>Waiting for previous steps...</div>
                  </div>
                )}

                {status === 'active' && !stepData && (
                  <div className="text-center py-4">
                    <div className={`animate-spin rounded-full h-6 w-6 border-2 mx-auto mb-2 ${
                      isGlassmorphism 
                        ? 'border-white border-opacity-30 border-t-blue-400' 
                        : 'border-gray-200 border-t-blue-600'
                    }`}></div>
                    <div className={`${
                      isGlassmorphism 
                        ? 'text-gray-200' 
                        : 'text-gray-500'
                    }`}>Processing...</div>
                  </div>
                )}

                {stepData && (
                  <div className="space-y-3">
                    {/* Confidence Indicator */}
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        isGlassmorphism 
                          ? 'text-white' 
                          : 'text-gray-900'
                      }`}>Confidence</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        stepData.confidence > 80 ? 'bg-green-500 text-white' :
                        stepData.confidence > 60 ? 'bg-yellow-500 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {stepData.confidence.toFixed(0)}%
                      </span>
                    </div>
                    
                    <div className={`w-full rounded-full h-2 ${
                      isGlassmorphism 
                        ? 'bg-white bg-opacity-20' 
                        : 'bg-gray-200'
                    }`}>
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          stepData.confidence > 80 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                          stepData.confidence > 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                          'bg-gradient-to-r from-red-400 to-red-500'
                        }`}
                        style={{ width: `${Math.min(stepData.confidence, 100)}%` }}
                      ></div>
                    </div>

                    {/* Key Data Points */}
                    {stepData.data && (
                      <div className="space-y-2">
                        {Object.entries(stepData.data).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center text-sm">
                            <span className={`capitalize ${
                              isGlassmorphism 
                                ? 'text-gray-200' 
                                : 'text-gray-600'
                            }`}>
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className={`font-medium truncate ml-2 max-w-24 ${
                              isGlassmorphism 
                                ? 'text-white' 
                                : 'text-gray-900'
                            }`}>
                              {typeof value === 'object' ? 
                                (Array.isArray(value) ? `${value.length} items` : 'Object') :
                                String(value).length > 20 ? String(value).slice(0, 20) + '...' : String(value)
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className={`pt-2 border-t ${
                      isGlassmorphism 
                        ? 'border-white border-opacity-20' 
                        : 'border-gray-200'
                    }`}>
                      <div className={`text-xs ${
                        isGlassmorphism 
                          ? 'text-gray-300' 
                          : 'text-gray-500'
                      }`}>
                        {new Date(stepData.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Section */}
      <div className={`mt-8 pt-6 border-t ${
        isGlassmorphism 
          ? 'border-white border-opacity-20' 
          : 'border-gray-200'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
              isGlassmorphism 
                ? `neural-btn ${progress >= 100 ? 'neural-btn-success' : 'neural-btn-primary'}` 
                : progress >= 100 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500'
            }`}
            disabled={progress < 25}
          >
            {progress < 25 ? 'Waiting to start...' :
             progress < 100 ? `Processing Step ${Math.ceil(progress / 25)}...` : 
             'Campaign Ready'}
          </button>
          
          {progress >= 25 && (
            <button className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
              isGlassmorphism 
                ? 'neural-btn-secondary' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
            }`}>
              <span className="flex items-center justify-center">
                Modify Parameters
              </span>
            </button>
          )}
        </div>

        {/* Progress Summary */}
        {progress > 0 && (
          <div className={`mt-4 p-4 ${
            isGlassmorphism 
              ? 'neural-glass-info' 
              : 'bg-blue-50 border border-blue-200 rounded-lg'
          }`}>
            <div className="flex items-center justify-between text-sm">
              <span className={`${
                isGlassmorphism 
                  ? 'text-white' 
                  : 'text-blue-800'
              }`}>
                {progress >= 100 ? 'All steps completed successfully!' :
                 `Step ${Math.ceil(progress / 25)} of 4 in progress...`}
              </span>
              <div className="flex items-center space-x-2">
                <div className={`w-16 rounded-full h-1.5 ${
                  isGlassmorphism 
                    ? 'bg-white bg-opacity-20' 
                    : 'bg-blue-200'
                }`}>
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className={`text-xs font-medium ${
                  isGlassmorphism 
                    ? 'text-blue-200' 
                    : 'text-blue-600'
                }`}>{progress.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignSteps; 