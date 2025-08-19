import React from 'react';

interface AgentThinkingProps {
  reasoning: string;
  currentStep: string;
  progress: number;
  avatarState: 'thinking' | 'generating' | 'analyzing' | 'complete';
}

const AgentThinking: React.FC<AgentThinkingProps> = ({ 
  reasoning, 
  currentStep, 
  progress, 
  avatarState 
}) => {
  const getStepTitle = (step: string) => {
    const titles = {
      'campaign_data': 'Analyzing Campaign Requirements',
      'advertiser_preferences': 'Accessing Behavioral Intelligence',
      'audience_generation': 'Generating Audience Segments',
      'campaign_generation': 'Creating Line Items',
      'complete': 'Campaign Ready'
    };
    return titles[step] || 'Processing...';
  };

  const getAvatarIcon = () => {
    switch (avatarState) {
      case 'thinking': return '🤔';
      case 'generating': return '⚡';
      case 'analyzing': return '🔍';
      case 'complete': return '✅';
      default: return '🤖';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Agent Status */}
      <div className="flex items-center space-x-3 mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
          avatarState === 'thinking' ? 'bg-blue-100 animate-pulse' :
          avatarState === 'generating' ? 'bg-green-100' :
          avatarState === 'analyzing' ? 'bg-yellow-100' :
          'bg-purple-100'
        }`}>
          {getAvatarIcon()}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{getStepTitle(currentStep)}</h3>
          <p className="text-sm text-gray-500 capitalize">{avatarState}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500">{progress.toFixed(0)}% Complete</p>

      {/* Chain of Thought Display */}
      <div className="bg-white rounded-lg border p-4">
        <h4 className="font-medium text-gray-900 mb-2">Agent Reasoning:</h4>
        {reasoning ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {reasoning}
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic">
            Waiting for agent input...
          </div>
        )}
      </div>

      {/* Thinking Indicators */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${avatarState !== 'complete' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
          <span className="text-xs text-gray-600">Processing campaign data</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${avatarState === 'generating' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
          <span className="text-xs text-gray-600">Applying behavioral intelligence</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${avatarState === 'analyzing' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`}></div>
          <span className="text-xs text-gray-600">Optimizing recommendations</span>
        </div>
      </div>
    </div>
  );
};

export default AgentThinking; 