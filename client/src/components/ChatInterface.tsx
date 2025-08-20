import React, { useState, useRef, useEffect } from 'react';
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

interface AgentState {
  current_step: string;
  progress: number;
  last_reasoning: string;
  next_action: string;
  avatar_state: 'thinking' | 'generating' | 'analyzing' | 'complete';
}

interface ChatInterfaceProps {
  onCampaignInput: (input: string, files?: FileList) => void;
  isProcessing: boolean;
  agentState: AgentState;
  chatMessages?: Array<{type: 'user' | 'agent', content: string, timestamp: string}>;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  onCampaignInput, 
  isProcessing, 
  agentState,
  chatMessages = []
}) => {
  const { isGlassmorphism } = useTheme();
  const [input, setInput] = useState('');
  const [areSuggestionsVisible, setAreSuggestionsVisible] = useState(true);
  const [advertiserCount, setAdvertiserCount] = useState<number>(0);
  const [isLoadingAdvertisers, setIsLoadingAdvertisers] = useState(true);
  const [sampleAdvertisers, setSampleAdvertisers] = useState<string[]>(['Tide', 'McDonald\'s', 'Unilever']);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Add CSS animation styles
  const fadeInStyle = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out forwards;
      opacity: 0;
    }
  `;

  // Insert the styles into the document head if not already present
  React.useEffect(() => {
    const styleId = 'chat-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = fadeInStyle;
      document.head.appendChild(style);
    }
  }, []);

  // Load advertiser count and sample advertisers on component mount
  React.useEffect(() => {
    const loadAdvertiserData = async () => {
      try {
        setIsLoadingAdvertisers(true);
        // Try vector database first, fallback to old endpoint
        try {
          const baseUrl = getApiBaseUrl();
          const vectorResponse = await axios.get(`${baseUrl}/vector/stats`);
          setAdvertiserCount(vectorResponse.data.total_advertisers || 0);
          
          // Fetch sample advertisers for dynamic suggestions
          const advertisersResponse = await axios.get(`${baseUrl}/vector/advertisers?limit=10`);
          if (advertisersResponse.data.advertisers && advertisersResponse.data.advertisers.length > 0) {
            const sampleBrands = advertisersResponse.data.advertisers
              .slice(0, 3)
              .map((adv: any) => adv.brand || adv.domain?.split('.')[0] || 'Unknown')
              .filter((brand: string) => brand !== 'Unknown');
            if (sampleBrands.length > 0) {
              setSampleAdvertisers(sampleBrands);
            }
          }
        } catch (vectorError) {
          console.warn('Vector DB not available, falling back to old endpoint');
          const response = await axios.get(`${baseUrl}/advertisers`);
          setAdvertiserCount(response.data.total_count || 0);
          
          // Try to get sample advertisers from old endpoint
          if (response.data.advertisers && response.data.advertisers.length > 0) {
            const sampleBrands = response.data.advertisers
              .slice(0, 3)
              .map((adv: any) => adv.brand || adv.advertiser_id?.replace('real_', '').replace(/_/g, '.') || 'Unknown')
              .filter((brand: string) => brand !== 'Unknown');
            if (sampleBrands.length > 0) {
              setSampleAdvertisers(sampleBrands);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load advertiser data:', error);
        setAdvertiserCount(0);
      } finally {
        setIsLoadingAdvertisers(false);
      }
    };

    loadAdvertiserData();
  }, []);

  // Format agent responses to be more conversational with multiple messages
  const formatAgentMessage = (content: string) => {
    // Split long responses into multiple conversational messages
    const responses = [];
    
    if (content.includes('Campaign parsing complete') || content.includes('parsing complete') || content.includes('campaign_data complete')) {
      responses.push("Perfect! I've got your campaign details. 📊");
      responses.push("Let me dive into the historical data for this advertiser to understand their audience preferences...");
      return responses;
    }
    
    if (content.includes('Advertiser analysis complete') || content.includes('advertiser_preferences complete')) {
      responses.push("Great insights found! 🎯");
      responses.push("I can see their content preferences, preferred channels, and geographic patterns from past campaigns.");
      responses.push("Now generating targeted audience segments based on this analysis...");
      return responses;
    }
    
    if (content.includes('Audience generation complete') || content.includes('audience_generation complete')) {
      responses.push("Audience segments created! ⚡");
      responses.push("Each segment is optimized with pricing insights and market data.");
      responses.push("Building your complete media plan now...");
      return responses;
    }
    
    if (content.includes('Line item generation complete') || content.includes('campaign_generation complete')) {
      responses.push("Campaign ready! 🚀");
      responses.push("Your comprehensive media plan is complete with optimized line items, budgets, and targeting.");
      responses.push("You can download the detailed plan using the button above.");
      return responses;
    }
    
    if (content.includes('Forecasting complete') || content.includes('forecasting complete')) {
      responses.push("Forecasting analysis complete! 📈");
      responses.push("I've analyzed projected performance, reach estimates, and budget optimization recommendations.");
      responses.push("Your campaign is fully planned and ready for execution!");
      return responses;
    }
    
    if (content.includes('error') || content.includes('failed') || content.toLowerCase().includes('error:')) {
      const errorPart = content.split(':').pop()?.trim() || content;
      responses.push("I encountered an issue... 🔧");
      responses.push(`${errorPart}`);
      responses.push("Let me help you resolve this - please try again or provide additional details.");
      return responses;
    }
    
    // Handle step transitions more conversationally
    if (content.includes('Advancing:') || content.includes('→')) {
      responses.push("Moving to the next step...");
      return responses;
    }
    
    // For file uploads
    if (content.includes('uploaded successfully')) {
      responses.push("File received! 📎");
      responses.push("I'll include this information in my analysis.");
      return responses;
    }
    
    // Handle generic completion messages
    if (content.includes('complete') && !content.includes('Campaign')) {
      responses.push("Step completed! ✅");
      responses.push("Moving to the next phase...");
      return responses;
    }
    
    // Default: break long messages into smaller parts
    if (content.length > 150) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      return sentences.map(sentence => sentence.trim() + (sentence.includes('?') ? '' : '.'));
    }
    
    return [content];
  };

  // Create display messages with conversational formatting
  const createDisplayMessages = () => {
    if (chatMessages.length > 0) {
      const expandedMessages = [];
      
      chatMessages.forEach((msg, index) => {
        if (msg.type === 'agent') {
          const formattedResponses = formatAgentMessage(msg.content);
          if (Array.isArray(formattedResponses)) {
            formattedResponses.forEach((response, responseIndex) => {
              expandedMessages.push({
                ...msg,
                content: response,
                timestamp: new Date(new Date(msg.timestamp).getTime() + responseIndex * 1000).toISOString(),
                messageId: `${index}-${responseIndex}`
              });
            });
          } else {
            expandedMessages.push({
              ...msg,
              content: formattedResponses,
              messageId: `${index}-0`
            });
          }
        } else {
          expandedMessages.push({
            ...msg,
            messageId: `${index}-0`
          });
        }
      });
      
      return expandedMessages;
    }
    
    // Default welcome messages - split into conversational parts
    return [
      {
        type: 'agent',
        content: 'Hello! I\'m Peggy, your AI Assistant 👋',
        timestamp: new Date().toISOString(),
        messageId: 'welcome-0'
      },
      {
        type: 'agent',
        content: 'I specialize in creating data-driven CTV campaigns using real advertiser insights and market intelligence.',
        timestamp: new Date(Date.now() + 1000).toISOString(),
        messageId: 'welcome-1'
      },
      {
        type: 'agent',
        content: 'I can help you:\n• Build targeted campaigns with historical data\n• Generate optimized audience segments\n• Create detailed media plans\n• Provide pricing and reach estimates',
        timestamp: new Date(Date.now() + 2000).toISOString(),
        messageId: 'welcome-2'
      },
      {
        type: 'agent',
        content: 'What campaign would you like to work on today?',
        timestamp: new Date(Date.now() + 3000).toISOString(),
        messageId: 'welcome-3'
      }
    ];
  };

  const displayMessages = createDisplayMessages();

  // Simple autoscroll - always scroll to bottom when messages change or processing state changes
  useEffect(() => {
    const element = chatMessagesRef.current;
    if (!element) return;

    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
      });
    };

    // Always scroll to bottom with smooth animation
    scrollToBottom();
    
    // Also scroll after a small delay to catch any delayed renders
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [displayMessages.length, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    onCampaignInput(input);
    setInput('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isProcessing) return;
    onCampaignInput(suggestion);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    onCampaignInput(`Uploaded file: ${files[0].name}`, files);
  };

  const suggestions = [
    {
      category: 'CAMPAIGN PLANNING',
      text: `Plan a $250K awareness campaign for ${sampleAdvertisers[0]} targeting families`
    },
    {
      category: 'MEDIA STRATEGY',
      text: `Create a $500K conversion campaign for ${sampleAdvertisers[1] || sampleAdvertisers[0]} focusing on millennials`
    },
    {
      category: 'PRODUCT LAUNCH',
      text: `Design a $750K brand building campaign for ${sampleAdvertisers[2] || sampleAdvertisers[0]} for new product launch`
    }
  ];

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Status Indicator */}
      <div className={`px-4 pt-4 pb-2 flex-shrink-0 ${
        isGlassmorphism 
          ? 'border-b border-white border-opacity-10' 
          : 'border-b border-gray-200'
      }`}>
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className={`${
            isGlassmorphism 
              ? 'text-blue-100' 
              : 'text-gray-600'
          }`}>
            {isLoadingAdvertisers 
              ? 'Loading advertisers...' 
              : `${advertiserCount.toLocaleString()} advertisers loaded`
            } • AI ready
          </span>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={chatMessagesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0 max-h-full">
        {displayMessages.map((message, index) => (
          <div
            key={message.messageId || index}
            className={`${
              message.type === 'user' 
                ? 'ml-8 flex justify-end' 
                : 'mr-8'
            } animate-fadeIn`}
            style={{
              animationDelay: message.messageId?.includes('welcome') ? `${index * 800}ms` : '0ms'
            }}
          >
            <div className={`max-w-[85%] p-3 rounded-2xl ${
              message.type === 'user' 
                ? isGlassmorphism 
                  ? 'neural-glass-info text-white' 
                  : 'bg-blue-600 text-white'
                : isGlassmorphism 
                ? 'neural-glass-panel text-white' 
                : 'bg-white border border-gray-200 text-gray-900'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg'
                }`}>
                  {message.type === 'user' ? '👤' : '🤖'}
                </div>
                <div className="flex-1">
                  <div className={`text-xs font-semibold mb-1 ${
                    message.type === 'user' || isGlassmorphism 
                      ? 'text-white opacity-90' 
                      : 'text-gray-600'
                  }`}>
                    {message.type === 'user' ? 'You' : 'Peggy'}
                  </div>
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    message.type === 'user' || isGlassmorphism 
                      ? 'text-blue-100' 
                      : 'text-gray-800'
                  }`}>
                    {message.content}
                  </div>
                  <div className={`text-xs mt-1 opacity-60 ${
                    message.type === 'user' || isGlassmorphism 
                      ? 'text-gray-300' 
                      : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicator */}
        {isProcessing && (
          <div className="mr-8 animate-fadeIn">
            <div className={`max-w-[85%] p-3 rounded-2xl ${
              isGlassmorphism 
                ? 'neural-glass-panel' 
                : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse shadow-lg">
                  🤖
                </div>
                <div className="flex-1">
                  <div className={`text-xs font-semibold mb-1 ${
                    isGlassmorphism 
                      ? 'text-white opacity-90' 
                      : 'text-gray-600'
                  }`}>
                    Peggy
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className={`text-sm ${
                      isGlassmorphism 
                        ? 'text-blue-100' 
                        : 'text-gray-700'
                    }`}>
                      {agentState.avatar_state === 'analyzing' ? 'Analyzing your campaign data...' :
                       agentState.avatar_state === 'generating' ? 'Generating insights and recommendations...' :
                       agentState.avatar_state === 'thinking' ? 'Processing your request...' :
                       'Working on your campaign...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Quick Suggestions */}
      {!isProcessing && chatMessages.length === 0 && areSuggestionsVisible && (
        <div className="fixed bottom-6 left-80 z-40 max-w-sm">
          <div className={`p-4 rounded-lg shadow-xl ${
            isGlassmorphism 
              ? 'bg-gray-800 bg-opacity-60 backdrop-blur-sm border border-gray-600' 
              : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">✨</span>
                <span className={`text-sm font-semibold ${
                  isGlassmorphism 
                    ? 'text-white' 
                    : 'text-gray-900'
                }`}>
                  Campaign Ideas
                </span>
              </div>
              <button
                onClick={() => setAreSuggestionsVisible(false)}
                className={`p-1 rounded-full hover:bg-opacity-20 transition-colors ${
                  isGlassmorphism 
                    ? 'text-gray-300 hover:bg-white' 
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
                title="Close suggestions"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  className={`w-full text-left p-2 transition-all duration-300 group rounded ${
                    isGlassmorphism 
                      ? 'neural-glass hover:bg-white hover:bg-opacity-10' 
                      : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                  }`}
                  disabled={isProcessing}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center group-hover:from-blue-400 group-hover:to-indigo-400 transition-all duration-300 shadow-lg">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-semibold mb-1 uppercase tracking-wide ${
                        isGlassmorphism 
                          ? 'text-blue-300' 
                          : 'text-blue-600'
                      }`}>
                        {suggestion.category}
                      </div>
                      <p className={`text-xs leading-relaxed ${
                        isGlassmorphism 
                          ? 'text-white' 
                          : 'text-gray-900'
                      }`}>
                        {suggestion.text}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area - Fixed at bottom */}
      <div className={`px-4 py-4 flex-shrink-0 ${
        isGlassmorphism 
          ? 'border-t border-white border-opacity-10 neural-glass-header' 
          : 'border-t border-gray-200 bg-gray-50'
      }`}>
        <form onSubmit={handleSubmit}>
          {/* Enhanced Text Input Section */}
          <div className={`flex space-x-3 items-end rounded-2xl p-3 transition-all duration-300 ${
            isGlassmorphism 
              ? 'neural-glass-panel focus-within:bg-white focus-within:bg-opacity-15' 
              : 'bg-white border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200'
          }`}>
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me about campaign planning, audience targeting, or media strategy..."
                className={`w-full px-4 py-3 text-sm border-0 rounded-xl bg-transparent focus:outline-none resize-none ${
                  isGlassmorphism 
                    ? 'text-white placeholder-gray-300' 
                    : 'text-gray-900 placeholder-gray-500'
                }`}
                disabled={isProcessing}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className={`neural-btn ${
                input.trim() && !isProcessing 
                  ? 'neural-btn-primary transform hover:scale-105' 
                  : 'neural-btn-secondary cursor-not-allowed'
              } w-12 h-12 rounded-full flex items-center justify-center`}
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface; 