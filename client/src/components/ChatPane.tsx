import React from 'react';

interface Message {
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface ChatPaneProps {
  messages: Message[];
  currentStep: string;
}

const ChatPane: React.FC<ChatPaneProps> = ({ messages, currentStep }) => {
  const getStepDescription = (step: string) => {
    switch (step) {
      case 'spec':
        return 'Parsing campaign specification';
      case 'prefs':
        return 'Collecting advertiser preferences';
      case 'segments':
        return 'Selecting target audience segments';
      case 'plan':
        return 'Generating campaign plan';
      default:
        return 'Processing';
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">CTV Campaign Assistant</h1>
        <p className="text-blue-100 text-sm">AI-powered campaign planning</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex items-start space-x-2 max-w-xs lg:max-w-md">
              {message.type === 'agent' && (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">AI</span>
                </div>
              )}
              <div
                className={`px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-75 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
              {message.type === 'user' && (
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">U</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Chain of Thought Panel */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Current Process</h3>
        <div className="bg-white rounded-lg p-3 border">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">{getStepDescription(currentStep)}</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="text-xs text-gray-500">
              • Analyzing input data
            </div>
            <div className="text-xs text-gray-500">
              • Processing business rules
            </div>
            <div className="text-xs text-gray-500">
              • Generating recommendations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPane; 