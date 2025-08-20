import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import ChatInterface from './ChatInterface';
import CampaignSteps from './CampaignSteps';
import CampaignForecastTable from './CampaignForecastTable';
import CampaignSetup from './CampaignSetup';
import { sendChatMessage, continueWorkflow, resetAgent, getAgentStatus, getAdvertisers } from '../api';

// Theme Context
interface ThemeContextType {
  isGlassmorphism: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isGlassmorphism: true,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface AgentState {
  current_step: string;
  progress: number;
  last_reasoning: string;
  next_action: string;
  avatar_state: 'idle' | 'thinking' | 'analyzing' | 'generating' | 'complete';
}

interface CampaignData {
  step: string;
  data: any;
  confidence: number;
  timestamp: string;
}

interface ChatMessage {
  type: 'user' | 'agent';
  content: string;
  timestamp: string;
}

const AgenticWorkspace: React.FC = () => {
  // Theme state
  const [isGlassmorphism, setIsGlassmorphism] = useState(true);
  
  const toggleTheme = () => {
    setIsGlassmorphism(prev => !prev);
  };

  const [agentState, setAgentState] = useState<AgentState>({
    current_step: 'campaign_data',
    progress: 0,
    last_reasoning: '',
    next_action: '',
    avatar_state: 'idle'
  });

  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaignInput, setCampaignInput] = useState('');
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false);

  const [showAudienceInsights, setShowAudienceInsights] = useState(false);
  
  // Editable campaign parameters
  const [editableParams, setEditableParams] = useState({
    advertiser: '',
    budget: '',
    objective: '',
    targetFrequency: '2.5',
    startDate: '',
    endDate: ''
  });
  
  // Advertiser dropdown data
  const [advertisers, setAdvertisers] = useState<Array<{advertiser_id: string, brand: string, domain: string}>>([]);
  const [loadingAdvertisers, setLoadingAdvertisers] = useState(false);
  
  // Refs to prevent race conditions
  const processingRef = useRef(false);
  const lastRequestRef = useRef<number>(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sync editable params with campaign data
  React.useEffect(() => {
    const currentStepData = campaignData.find(data => data.step === 'campaign_data');
    if (currentStepData?.data) {
      // Parse timeline if it exists (e.g., "Jan 1, 2024 - Feb 28, 2024")
      let startDate = '';
      let endDate = '';
      if (currentStepData.data.timeline) {
        const timelineParts = currentStepData.data.timeline.split(' - ');
        if (timelineParts.length === 2) {
          // Try to parse existing timeline format
          const start = new Date(timelineParts[0]);
          const end = new Date(timelineParts[1]);
          if (!isNaN(start.getTime())) startDate = start.toISOString().split('T')[0];
          if (!isNaN(end.getTime())) endDate = end.toISOString().split('T')[0];
        }
      }
      
      setEditableParams({
        advertiser: currentStepData.data.advertiser || '',
        budget: currentStepData.data.budget?.toString() || '',
        objective: currentStepData.data.objective || '',
        targetFrequency: currentStepData.data.targetFrequency?.toString() || '2.5',
        startDate: startDate,
        endDate: endDate
      });
    }
  }, [campaignData]);
  
  // Load advertisers for dropdown
  const loadAdvertisers = async () => {
    if (loadingAdvertisers || advertisers.length > 0) return;
    
    setLoadingAdvertisers(true);
    try {
      const response = await getAdvertisers(500); // Get top 500 advertisers
      if (response.data?.advertisers) {
        const formattedAdvertisers = response.data.advertisers.map((adv: any) => ({
          advertiser_id: adv.advertiser_id,
          brand: adv.brand || adv.domain?.split('.')[0] || 'Unknown',
          domain: adv.domain || ''
        }));
        setAdvertisers(formattedAdvertisers);
      }
    } catch (error) {
      console.error('Failed to load advertisers:', error);
    } finally {
      setLoadingAdvertisers(false);
    }
  };
  
  // Load advertisers on component mount
  React.useEffect(() => {
    loadAdvertisers();
  }, []);
  
  // Handle transition to forecasting input step (frontend-only)
  const handleGoToForecastingInput = () => {
    // Create forecasting_input step data with line item context
    const lineItemData = campaignData.find(data => data.step === 'campaign_generation');
    
    if (lineItemData) {
      // Add the forecasting_input step to campaign data
      setCampaignData(prev => {
        const existingIndex = prev.findIndex(item => item.step === 'forecasting_input');
        const newStepData = {
          step: 'forecasting_input',
          data: {
            line_items: lineItemData.data.line_items,
            ready_for_forecast: true,
            campaign_budget: lineItemData.data.line_items?.reduce((sum: number, item: any) => sum + (item.budget || 0), 0) || 250000
          },
          confidence: 100,
          timestamp: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newStepData;
          return updated;
        } else {
          return [...prev, newStepData];
        }
      });
      
      // Update agent state to forecasting_input (frontend-only step)
      setAgentState(prev => ({
        ...prev,
        current_step: 'forecasting_input',
        progress: 85, // Between campaign_generation (80%) and forecasting (100%)
        last_reasoning: 'Ready to configure forecast parameters',
        next_action: 'Set budget, dates, and frequency then generate forecast',
        avatar_state: 'idle'
      }));

      // Pre-populate editable params from line item data
      if (lineItemData.data.line_items?.length > 0) {
        const totalBudget = lineItemData.data.line_items.reduce((sum: number, item: any) => sum + (item.budget || 0), 0);
        setEditableParams(prev => ({
          ...prev,
          budget: totalBudget.toString(),
          // Keep existing dates and frequency, or set defaults
          startDate: prev.startDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
          endDate: prev.endDate || new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 weeks from now
          targetFrequency: prev.targetFrequency || '2.5',
          timeline: prev.timeline || '4 weeks'
        }));
      }
    }
  };

  // Calculate duration in weeks between two dates
  const calculateDurationWeeks = (startDate: string, endDate: string): string => {
    if (!startDate || !endDate) return '4 weeks';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.ceil(diffDays / 7);
    
    // Round to common durations
    if (weeks <= 2) return '2 weeks';
    if (weeks <= 4) return '4 weeks';
    if (weeks <= 6) return '6 weeks';
    if (weeks <= 8) return '8 weeks';
    return '12 weeks';
  };

  // Handle updating editable parameters
  const updateEditableParam = (field: keyof typeof editableParams, value: string) => {
    setEditableParams(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-sync campaign duration when dates change
      if (field === 'startDate' || field === 'endDate') {
        const startDate = field === 'startDate' ? value : prev.startDate;
        const endDate = field === 'endDate' ? value : prev.endDate;
        
        if (startDate && endDate) {
          updated.timeline = calculateDurationWeeks(startDate, endDate);
        }
      }
      
      return updated;
    });
    
    // Update the campaign data as well
    setCampaignData(prev => {
      const updated = [...prev];
      const campaignDataIndex = updated.findIndex(item => item.step === 'campaign_data');
      if (campaignDataIndex >= 0) {
        const updatedData = { ...updated[campaignDataIndex].data };
        
        if (field === 'budget') {
          updatedData[field] = parseInt(value) || 0;
        } else if (field === 'targetFrequency') {
          updatedData[field] = parseFloat(value) || 2.5;
        } else if (field === 'startDate' || field === 'endDate') {
          // Update the individual date field and reconstruct timeline
          const newParams = { ...editableParams, [field]: value };
          if (newParams.startDate && newParams.endDate) {
            const startDate = new Date(newParams.startDate);
            const endDate = new Date(newParams.endDate);
            updatedData.timeline = `${startDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })} - ${endDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}`;
          } else if (newParams.startDate) {
            const startDate = new Date(newParams.startDate);
            updatedData.timeline = `${startDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })} - TBD`;
          } else {
            updatedData.timeline = 'TBD';
          }
        } else {
          updatedData[field] = value;
        }
        
        updated[campaignDataIndex] = { ...updated[campaignDataIndex], data: updatedData };
      }
      return updated;
    });
  };
  
  // Session management to prevent conflicts between browser tabs
  const sessionId = useRef<string>(
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );

  // Remove automatic reset on mount - let user control when to reset

  const resetWorkflow = async () => {
    // Prevent multiple rapid resets
    if (processingRef.current) {
      console.log('Already processing, skipping reset');
      return;
    }

    // Add debouncing to prevent rapid resets
    const now = Date.now();
    if (now - lastRequestRef.current < 2000) {
      console.log('Reset debounced - too soon after last request');
      return;
    }
    lastRequestRef.current = now;

    processingRef.current = true;
    
    try {
      console.log(`🔄 Resetting workflow (${sessionId.current})...`);
      await resetAgent();
      setAgentState({
        current_step: 'campaign_data',
        progress: 0,
        last_reasoning: '',
        next_action: '',
        avatar_state: 'idle'
      });
      setCampaignData([]);
      setChatMessages([]);
      setError(null);
      setCampaignInput('');
      console.log('✅ Workflow reset complete');
    } catch (error) {
      console.error('Reset error:', error);
    } finally {
      processingRef.current = false;
    }
  };



  // Sync with backend state periodically to prevent drift (with debouncing)
  const syncWithBackend = React.useCallback(async () => {
    // Prevent multiple concurrent sync calls
    if (syncTimeoutRef.current) return;
    
    try {
      const response = await getAgentStatus();
      if (response.data) {
        const backendStatus = response.data;
        
        // Only update if there's a meaningful difference to prevent unnecessary re-renders
        if (backendStatus.current_step !== agentState.current_step || 
            Math.abs(backendStatus.progress - agentState.progress) > 5) {
          console.log('🔄 Syncing frontend with backend state:', {
            frontend: { step: agentState.current_step, progress: agentState.progress },
            backend: { step: backendStatus.current_step, progress: backendStatus.progress }
          });
          
          setAgentState(prev => ({
            ...prev,
            current_step: backendStatus.current_step,
            progress: backendStatus.progress,
            avatar_state: backendStatus.avatar_state || prev.avatar_state
          }));
        }
      }
    } catch (error) {
      // Silently fail - don't spam console with sync errors
      console.warn('Sync with backend failed:', error.message);
    } finally {
      // Clear the timeout ref after the request completes
      syncTimeoutRef.current = null;
    }
  }, [agentState.current_step, agentState.progress]);

  // Removed automatic polling - only sync when user manually triggers actions

  const validateStateTransition = (currentStep: string, nextStep: string): boolean => {
    const validTransitions: { [key: string]: string } = {
      'campaign_data': 'advertiser_preferences',
      'advertiser_preferences': 'audience_generation', 
      'audience_generation': 'campaign_generation',
      'campaign_generation': 'forecasting',
      'forecasting': 'complete'
    };
    
    return validTransitions[currentStep] === nextStep;
  };

  const advanceToNextStep = async () => {
    // Prevent concurrent requests
    if (processingRef.current || isProcessing) {
      console.log('Already processing, skipping request');
      return;
    }

    // Debouncing - prevent rapid clicks
    const now = Date.now();
    if (now - lastRequestRef.current < 2000) {
      console.log('Request too recent, debouncing');
      return;
    }
    lastRequestRef.current = now;

    // Validate current state
    if (agentState.progress >= 100) {
      console.log('Workflow already complete');
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setError(null);
    setAgentState(prev => ({ ...prev, avatar_state: 'analyzing' }));
    
    try {
      console.log(`🔄 Advancing from step: ${agentState.current_step} (${agentState.progress}%)`);
      
      // Use the chat workflow continuation endpoint
      const response = await continueWorkflow();
      
      if (!response.data) {
        throw new Error(`Workflow continuation failed: no data received`);
      }
      
      const result = response.data;
      console.log(`✅ Workflow continued:`, result);
      
      if (result.workflow_result) {
        const workflowResult = result.workflow_result;
        const newProgress = workflowResult.progress;
        
        // Add agent reasoning to chat
        setChatMessages(prev => [...prev, {
          type: 'agent',
          content: workflowResult.action || `${workflowResult.step} completed successfully`,
          timestamp: new Date().toISOString()
        }]);
        
        // Update campaign data - prevent duplicates
        setCampaignData(prev => {
          const existingIndex = prev.findIndex(item => item.step === workflowResult.step);
          const newData = {
            step: workflowResult.step,
            data: workflowResult.data || {},
            confidence: workflowResult.confidence ? (workflowResult.confidence * 100) : 95, // Convert from 0-1 to percentage
            timestamp: new Date().toISOString()
          };
          
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newData;
            return updated;
          } else {
            return [...prev, newData];
          }
        });
        
        // Update agent state to match backend current step
        setAgentState(prev => ({ 
          ...prev, 
          current_step: workflowResult.current_step, // Should match backend's current step
          progress: newProgress,
          last_reasoning: workflowResult.action,
          next_action: newProgress >= 100 ? 'Workflow complete' : 'Continue to next step',
          avatar_state: newProgress >= 100 ? 'complete' : 'thinking'
        }));

        console.log(`🎉 Step completed: ${workflowResult.step} → current: ${workflowResult.current_step} (${newProgress}%)`);
        
        // Sync with backend status to ensure alignment
        setTimeout(async () => {
          try {
            const statusResponse = await getAgentStatus();
            if (statusResponse.data) {
              const backendStatus = statusResponse.data;
              console.log('🔄 Post-advance sync with backend:', backendStatus);
              
              setAgentState(prev => ({
                ...prev,
                current_step: backendStatus.current_step,
                progress: backendStatus.progress,
                avatar_state: backendStatus.avatar_state || prev.avatar_state
              }));
            }
          } catch (syncError) {
            console.warn('⚠️ Could not sync after advance:', syncError);
          }
        }, 300);
      }
      
    } catch (error) {
      console.error('❌ Step advancement error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Step advancement failed: ${errorMessage}`);
      
      setChatMessages(prev => [...prev, {
        type: 'agent',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again or reset the workflow.`,
        timestamp: new Date().toISOString()
      }]);
      
      setAgentState(prev => ({ ...prev, avatar_state: 'idle' }));
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const getProgressForStep = (step: string): number => {
    const progressMap: { [key: string]: number } = {
      'campaign_data': 20,
      'advertiser_preferences': 40,
      'audience_generation': 60,
      'campaign_generation': 80,
      'forecasting': 100
    };
    return progressMap[step] || 0;
  };

  const handleContinueWorkflow = async () => {
    // Prevent concurrent requests
    if (processingRef.current || isProcessing) {
      console.log('Already processing, skipping continue workflow');
      return;
    }

    // Add debouncing to prevent rapid successive calls
    const now = Date.now();
    if (now - lastRequestRef.current < 1000) {
      console.log('Continue workflow debounced - too soon after last request');
      return;
    }
    lastRequestRef.current = now;

    processingRef.current = true;
    setIsProcessing(true);
    setError(null);

    try {
      console.log(`🔄 Continuing workflow from step: ${agentState.current_step} (${sessionId.current})`);
      
      // Call the continue workflow API
      const response = await continueWorkflow();
      
      if (response.data?.workflow_result) {
        const workflowResult = response.data.workflow_result;
        
        // Update agent state with the new step
        const newProgress = getProgressForStep(workflowResult.current_step);
        
        setAgentState(prev => ({
          ...prev,
          current_step: workflowResult.current_step,
          progress: newProgress,
          last_reasoning: workflowResult.action,
          next_action: newProgress >= 100 ? 'Workflow complete' : 'Continue to next step',
          avatar_state: newProgress >= 100 ? 'complete' : 'thinking'
        }));

        // Add workflow result to campaign data
        setCampaignData(prev => {
          const existingIndex = prev.findIndex(item => item.step === workflowResult.step);
          const newData = {
            step: workflowResult.step,
            data: workflowResult.data || {},
            confidence: workflowResult.confidence ? (workflowResult.confidence * 100) : 95,
            timestamp: new Date().toISOString()
          };
          
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newData;
            return updated;
          } else {
            return [...prev, newData];
          }
        });

        // Add success message to chat
        setChatMessages(prev => [...prev, {
          type: 'agent',
          content: workflowResult.action || `${workflowResult.step} completed successfully`,
          timestamp: new Date().toISOString()
        }]);

        console.log(`✅ Workflow continued: ${workflowResult.step} → ${workflowResult.current_step} (${newProgress}%)`);
        
      } else {
        throw new Error(response.data?.message || 'Failed to continue workflow');
      }
      
    } catch (error) {
      console.error('Continue workflow error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      
      // Check if it's a workflow state conflict (common with multiple browser sessions)
      if (errorMessage.includes('Prerequisites not met') || errorMessage.includes('Invalid transition')) {
        console.warn('Workflow state conflict detected - likely multiple browser sessions');
        setError('Workflow state conflict detected. Please use only one browser tab or reset the workflow.');
        
        setChatMessages(prev => [...prev, {
          type: 'agent',
          content: '⚠️ Multiple browser sessions detected. Please close other tabs or reset the workflow to continue.',
          timestamp: new Date().toISOString()
        }]);
      } else {
        setError(`Failed to continue workflow: ${errorMessage}`);
        
        setChatMessages(prev => [...prev, {
          type: 'agent',
          content: `Sorry, I encountered an error continuing the workflow: ${errorMessage}. Please try again.`,
          timestamp: new Date().toISOString()
        }]);
      }
      
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const handleCampaignInput = async (input: string, files?: FileList) => {
    // Prevent concurrent requests
    if (processingRef.current || isProcessing) {
      console.log('Already processing, skipping campaign input');
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setError(null);
    
    // Add user message to chat
    setChatMessages(prev => [...prev, {
      type: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }]);
    
    try {
      console.log('🚀 Sending message to conversational agent');
      
      // Send message to the enhanced chat endpoint
      const response = await sendChatMessage(input);
      
      if (!response.data) {
        throw new Error(`Chat failed: no data received`);
      }
      
      const result = response.data;
      console.log('✅ Chat response received:', result);
      
      // Add agent response to chat
      setChatMessages(prev => [...prev, {
        type: 'agent',
        content: result.response,
        timestamp: new Date().toISOString()
      }]);
      
      // If workflow was triggered, update agent state and campaign data
      if (result.workflow_triggered && result.workflow_result) {
        const workflowResult = result.workflow_result;
        
        // Add campaign data first
        setCampaignData(prev => {
          const newData = {
            step: workflowResult.step,
            data: workflowResult.data || {},
            confidence: workflowResult.confidence ? (workflowResult.confidence * 100) : 95, // Convert from 0-1 to percentage
            timestamp: new Date().toISOString()
          };
          
          // Check if this step already exists
          const existingIndex = prev.findIndex(item => item.step === workflowResult.step);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newData;
            return updated;
          } else {
            return [...prev, newData];
          }
        });
        
        // Update agent state to match the backend current step
        setAgentState(prev => ({
          ...prev,
          current_step: workflowResult.current_step, // This should match backend's current step
          progress: workflowResult.progress,
          last_reasoning: workflowResult.action,
          next_action: workflowResult.progress >= 100 ? 'Workflow complete' : 'Continue to next step',
          avatar_state: workflowResult.progress >= 100 ? 'complete' : 'thinking'
        }));
        
        console.log(`🎉 Workflow triggered: ${workflowResult.step} → current: ${workflowResult.current_step} (${workflowResult.progress}%)`);
        
        // After a short delay, sync with backend state to ensure we're aligned
        setTimeout(async () => {
          try {
            const statusResponse = await getAgentStatus();
            if (statusResponse.data) {
              const backendStatus = statusResponse.data;
              console.log('🔄 Syncing with backend status:', backendStatus);
              
              setAgentState(prev => ({
                ...prev,
                current_step: backendStatus.current_step,
                progress: backendStatus.progress,
                avatar_state: backendStatus.avatar_state || prev.avatar_state
              }));
            }
          } catch (syncError) {
            console.warn('⚠️ Could not sync with backend status:', syncError);
          }
        }, 500);
      }
      
    } catch (error) {
      console.error('❌ Chat processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Chat processing failed: ${errorMessage}`);
      
      setChatMessages(prev => [...prev, {
        type: 'agent',
        content: `I'm having trouble processing your request. ${errorMessage}. Please try again.`,
        timestamp: new Date().toISOString()
      }]);
      
      setAgentState(prev => ({ ...prev, avatar_state: 'idle' }));
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  // Handle reforecasting with updated campaign parameters
  const handleReforecast = async () => {
    // Prevent concurrent requests
    if (processingRef.current || isProcessing) {
      console.log('Already processing, skipping reforecast');
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('🔄 Triggering forecast generation with updated campaign parameters');
      
      // If we're in forecasting_input step, trigger the backend forecasting workflow
      if (agentState.current_step === 'forecasting_input') {
        // Create a message that will trigger forecasting workflow continuation
        const forecastMessage = `Generate forecast with budget $${editableParams.budget}, timeline ${editableParams.startDate} to ${editableParams.endDate}, frequency ${editableParams.targetFrequency}x`;
        
        // Add user message to chat
        setChatMessages(prev => [...prev, {
          type: 'user',
          content: "Generate forecast with my configured parameters",
          timestamp: new Date().toISOString()
        }]);
        
        // Continue the workflow to trigger forecasting
        const response = await fetch('/chat/workflow-continue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: forecastMessage })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ Forecasting workflow triggered:', result);
        
        // Add agent response
        setChatMessages(prev => [...prev, {
          type: 'agent',
          content: result.message || 'Generating forecast with your parameters...',
          timestamp: new Date().toISOString()
        }]);
        
        // Update state to forecasting step if successful
        if (result.workflow_result) {
          const workflowResult = result.workflow_result;
          
          // Update campaign data with forecast
          setCampaignData(prev => {
            const newData = {
              step: workflowResult.step,
              data: workflowResult.data || {},
              confidence: workflowResult.confidence ? (workflowResult.confidence * 100) : 95,
              timestamp: new Date().toISOString()
            };
            
            // Replace existing forecasting data
            const existingIndex = prev.findIndex(item => item.step === workflowResult.step);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = newData;
              return updated;
            } else {
              return [...prev, newData];
            }
          });
          
          // Update agent state to forecasting
          setAgentState(prev => ({
            ...prev,
            current_step: 'forecasting',
            progress: 100,
            last_reasoning: workflowResult.action || 'Forecast generated successfully',
            next_action: 'Review forecast results',
            avatar_state: 'complete'
          }));
        }
        
        return; // Exit early for forecasting_input flow
      }
      
      // Regular reforecast for existing forecasting step
      const reforecastMessage = "Please regenerate the forecast with the updated campaign parameters.";
      
      // Add user message to chat
      setChatMessages(prev => [...prev, {
        type: 'user',
        content: reforecastMessage,
        timestamp: new Date().toISOString()
      }]);
      
      // Send reforecast request to backend
      const response = await sendChatMessage(reforecastMessage);
      
      if (!response.data) {
        throw new Error(`Reforecast failed: no data received`);
      }
      
      const result = response.data;
      console.log('✅ Reforecast response received:', result);
      
      // Add agent response to chat
      setChatMessages(prev => [...prev, {
        type: 'agent',
        content: result.response,
        timestamp: new Date().toISOString()
      }]);
      
      // If workflow was triggered, update the forecasting data
      if (result.workflow_triggered && result.workflow_result) {
        const workflowResult = result.workflow_result;
        
        // Update campaign data with new forecast
        setCampaignData(prev => {
          const newData = {
            step: workflowResult.step,
            data: workflowResult.data || {},
            confidence: workflowResult.confidence ? (workflowResult.confidence * 100) : 95,
            timestamp: new Date().toISOString()
          };
          
          // Replace existing forecasting data
          const existingIndex = prev.findIndex(item => item.step === workflowResult.step);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newData;
            return updated;
          } else {
            return [...prev, newData];
          }
        });
        
        // Update agent state - keep in forecasting step for iterative adjustments
        setAgentState(prev => ({
          ...prev,
          current_step: 'forecasting', // Force stay in forecasting step
          progress: 100,
          last_reasoning: workflowResult.action || 'Forecast regenerated successfully',
          next_action: 'Adjust parameters or continue with forecast',
          avatar_state: 'complete'
        }));
        
        console.log('🎉 Reforecast complete:', workflowResult.step);
      }
      
    } catch (error) {
      console.error('❌ Reforecast error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Reforecast failed: ${errorMessage}`);
      
      setChatMessages(prev => [...prev, {
        type: 'agent',
        content: `I'm having trouble regenerating the forecast. ${errorMessage}. Please try again.`,
        timestamp: new Date().toISOString()
      }]);
      
      setAgentState(prev => ({ ...prev, avatar_state: 'idle' }));
    } finally {
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  const steps = [
    { id: 'campaign_data', title: 'Campaign Parameters', icon: '📊', color: 'blue' },
    { id: 'advertiser_preferences', title: 'Historical Data', icon: '📈', color: 'purple' },
    { id: 'audience_generation', title: 'Audience Analysis', icon: '🎯', color: 'orange' },
    { id: 'campaign_generation', title: 'Media Plan', icon: '⚡', color: 'orange' },
    { id: 'forecasting_input', title: 'Forecasting Input', icon: '📝', color: 'indigo' },
    { id: 'forecasting', title: 'Campaign Forecast', icon: '🔮', color: 'green' }
  ];

  const getCurrentStepData = () => {
    return campaignData.find(data => data.step === agentState.current_step);
  };

  const isWorkflowComplete = () => {
    return agentState.avatar_state === 'complete' || agentState.progress >= 100 || agentState.current_step === 'forecasting';
  };

  const isStepDataLoaded = (stepId: string) => {
    const stepHasData = campaignData.some(data => data.step === stepId);
    return stepHasData || isWorkflowComplete();
  };

  const canAdvanceToNextStep = () => {
    return campaignData.length > 0 && 
           agentState.progress < 100 && 
           !isProcessing && 
           !processingRef.current &&
           agentState.avatar_state !== 'complete';
  };

  const downloadMediaPlan = () => {
    const currentStepData = campaignData.find(data => data.step === 'campaign_generation');
    
    if (!currentStepData?.data?.line_items) {
      console.warn('No line items data available for download');
      return;
    }

    const lineItems = currentStepData.data.line_items;
    
    // Create CSV headers
    const headers = ['Line Item Name', 'Budget', 'CPM', 'Audience', 'Status', 'Estimated Impressions', 'Flight Dates'];
    
    // Convert line items to CSV rows
    const csvRows = [
      headers.join(','),
      ...lineItems.map((item: any) => [
        `"${item.name || 'N/A'}"`,
        item.budget || 0,
        item.cpm || 0,
        `"${item.audience || 'N/A'}"`,
        `"${item.status || 'Ready'}"`,
        item.estimated_impressions || Math.round((item.budget || 0) / (item.cpm || 1) * 1000),
        `"${item.flight_dates || 'TBD'}"`
      ].join(','))
    ];
    
    // Create and download CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `neural-ads-media-plan-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileContent = await file.text();
      
      // Append file content to campaign input
      const fileInfo = `\n\n--- Uploaded File: ${file.name} ---\n${fileContent}`;
      setCampaignInput(prev => prev + fileInfo);
      
      // Add notification (will be formatted in ChatInterface)
      setChatMessages(prev => [...prev, {
        type: 'agent',
        content: `✅ File "${file.name}" uploaded successfully`,
        timestamp: new Date().toISOString()
      }]);
      
    } catch (error) {
      console.error('File upload error:', error);
      setError('Failed to read file. Please ensure it\'s a valid text file.');
    }
    
    // Clear the file input
    event.target.value = '';
  };

  // Processing Indicator Component
  const renderProcessingIndicator = () => {
    if (!isProcessing && !processingRef.current) return null;
    
    const getProcessingMessage = () => {
      if (agentState.last_reasoning) {
        return agentState.last_reasoning;
      }
      
      // Default messages based on current step
      const stepMessages = {
        'campaign_data': 'Analyzing campaign requirements and extracting key parameters...',
        'advertiser_preferences': 'Analyzing historical viewing patterns and advertiser preferences...',
        'audience_generation': 'Generating ACR audience segments and targeting criteria...',
        'campaign_generation': 'Building executable line items and media strategy...',
        'forecasting': 'Generating spend forecast and inventory analysis...'
      };
      
      return stepMessages[agentState.current_step] || 'Processing your request...';
    };
    
    const getNextAction = () => {
      if (agentState.next_action && agentState.next_action !== 'Continue to next step') {
        return agentState.next_action;
      }
      
      const nextActions = {
        'campaign_data': 'Proceeding to historical pattern analysis',
        'advertiser_preferences': 'Generating ACR audience segments',
        'audience_generation': 'Building executable line items',
        'campaign_generation': 'Generating spend forecast and inventory analysis',
        'forecasting': 'Campaign forecasting complete - ready for deployment'
      };
      
      return nextActions[agentState.current_step] || 'Continuing to next step';
    };
    
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${
        isGlassmorphism 
          ? 'bg-black bg-opacity-40 backdrop-blur-sm' 
          : 'bg-gray-900 bg-opacity-50'
      }`}>
        <div className={`max-w-md w-full mx-4 p-8 rounded-xl ${
          isGlassmorphism 
            ? 'neural-glass-panel' 
            : 'bg-white shadow-2xl border border-gray-200'
        }`}>
          {/* Neural Avatar */}
          <div className="text-center mb-6">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-4 ${
              isGlassmorphism 
                ? 'neural-glass-info animate-pulse' 
                : 'bg-blue-100 animate-pulse'
            }`}>
              🧠
            </div>
            <h3 className={`text-xl font-semibold ${
              isGlassmorphism 
                ? 'neural-text-emphasis' 
                : 'text-gray-900'
            }`}>
              Neural is Processing
            </h3>
          </div>
          
          {/* Processing Message */}
          <div className="space-y-4">
            <div className={`text-center ${
              isGlassmorphism 
                ? 'neural-text-body' 
                : 'text-gray-700'
            }`}>
              {getProcessingMessage()}
            </div>
            
            {/* Progress Bar */}
            <div className={`w-full h-2 rounded-full ${
              isGlassmorphism 
                ? 'bg-white bg-opacity-20' 
                : 'bg-gray-200'
            }`}>
              <div 
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse"
                style={{ width: '60%' }}
              ></div>
            </div>
            
            {/* Next Action */}
            <div className={`text-sm text-center ${
              isGlassmorphism 
                ? 'neural-text-muted' 
                : 'text-gray-500'
            }`}>
              Next: {getNextAction()}
            </div>
          </div>
          
          {/* Animated Dots */}
          <div className="flex justify-center mt-6 space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  isGlassmorphism 
                    ? 'bg-blue-400' 
                    : 'bg-blue-500'
                } animate-bounce`}
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    const currentStepData = campaignData.find(data => data.step === agentState.current_step);
    
    switch (agentState.current_step) {
      case 'campaign_data':
        if (campaignData.length === 0) {
          return (
            <div className="py-8">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Campaign Data Analysis</h3>
              
              {/* Campaign Requirements Input */}
              <div className="space-y-6">
                <div>
                  <label className={`mb-3 block text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-label' 
                      : 'text-gray-700'
                  }`}>
                    Campaign Requirements
                  </label>
                  <textarea
                    placeholder="Paste your campaign brief here or describe your requirements:&#10;&#10;• Advertiser: [Brand Name]&#10;• Budget: $[Amount]&#10;• Objective: [Brand Awareness/Performance/etc.]&#10;• Target Audience: [Demographics]&#10;• Timeline: [Start - End Date]&#10;• Additional Notes: [Any specific requirements]"
                    className={`w-full h-40 p-4 rounded-lg resize-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                      isGlassmorphism 
                        ? 'neural-glass border border-white border-opacity-20 text-gray-800 placeholder-gray-500 backdrop-blur-lg' 
                        : 'border border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                    value={campaignInput}
                    onChange={(e) => setCampaignInput(e.target.value)}
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Upload Campaign Brief Button */}
                    <label className={`cursor-pointer ${
                      isGlassmorphism 
                        ? 'neural-btn neural-btn-secondary' 
                        : 'px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg border border-gray-300 transition-colors'
                    }`}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <div className="flex items-center space-x-2">
                        <span>📎</span>
                        <span>Upload Brief</span>
                      </div>
                    </label>
                    
                    {/* Clear Button */}
                    <button
                      onClick={() => setCampaignInput('')}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                  
                  {/* Analyze Button */}
                  <button
                    onClick={() => campaignInput.trim() && handleCampaignInput(campaignInput)}
                    disabled={!campaignInput.trim() || isProcessing}
                    className={`px-6 py-2 ${
                      isGlassmorphism 
                        ? `neural-btn ${campaignInput.trim() && !isProcessing ? 'neural-btn-primary' : 'neural-btn-secondary'}` 
                        : campaignInput.trim() && !isProcessing
                        ? 'bg-blue-600 hover:bg-blue-700 text-white rounded-lg border border-blue-600 transition-colors'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg border border-gray-300 transition-colors'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span>🚀</span>
                      <span>Analyze Campaign</span>
                    </div>
                  </button>
                </div>
              </div>
              


              {/* Helper Text */}
              <div className={`mt-6 p-4 rounded-lg ${
                isGlassmorphism 
                  ? 'neural-glass-info' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <p className={`text-sm ${
                  isGlassmorphism 
                    ? 'neural-text-secondary' 
                    : 'text-blue-700'
                }`}>
                  <span className={`font-semibold ${
                    isGlassmorphism 
                      ? 'neural-text-emphasis' 
                      : 'text-blue-900'
                  }`}>Tip:</span> Provide as much detail as possible for better AI analysis. You can paste campaign briefs, 
                  upload documents, or use the chat interface for interactive campaign planning.
                </p>
              </div>
            </div>
          );
        }
        
        return (
          <div>
            <h3 className="neural-heading-3 mb-6">Campaign Parameters Identified</h3>
            {currentStepData?.data && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={`mb-1 block text-sm font-medium ${
                      isGlassmorphism 
                        ? 'neural-text-label' 
                        : 'text-gray-700'
                    }`}>Advertiser</label>
                    <div className="relative">
                      <select
                        value={editableParams.advertiser}
                        onChange={(e) => updateEditableParam('advertiser', e.target.value)}
                        className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 appearance-none cursor-pointer ${
                          isGlassmorphism 
                            ? 'neural-glass text-gray-800 border border-white border-opacity-20 backdrop-blur-lg' 
                            : 'bg-white border border-gray-300 text-gray-900'
                        }`}
                        disabled={loadingAdvertisers}
                      >
                        <option value="">
                          {loadingAdvertisers ? 'Loading advertisers...' : 'Select an advertiser'}
                        </option>
                        {advertisers.map((adv) => (
                          <option key={adv.advertiser_id} value={adv.brand}>
                            {adv.brand} {adv.domain && `(${adv.domain})`}
                          </option>
                        ))}
                        <option value="custom">+ Enter custom advertiser</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className={`w-4 h-4 ${isGlassmorphism ? 'text-gray-300' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {editableParams.advertiser === 'custom' && (
                      <input
                        type="text"
                        placeholder="Enter custom advertiser name"
                        className={`w-full mt-2 p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                          isGlassmorphism 
                            ? 'neural-glass text-gray-800 placeholder-gray-500 border border-white border-opacity-20 backdrop-blur-lg' 
                            : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                        }`}
                        onChange={(e) => updateEditableParam('advertiser', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            updateEditableParam('advertiser', e.currentTarget.value.trim());
                          }
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <label className={`mb-1 block text-sm font-medium ${
                      isGlassmorphism 
                        ? 'neural-text-label' 
                        : 'text-gray-700'
                    }`}>Campaign Budget</label>
                    <input
                      type="number"
                      value={editableParams.budget}
                      onChange={(e) => updateEditableParam('budget', e.target.value)}
                      placeholder="Enter budget amount"
                      className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                        isGlassmorphism 
                          ? 'neural-glass text-gray-800 placeholder-gray-500 border border-white border-opacity-20 backdrop-blur-lg' 
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={`mb-1 block text-sm font-medium ${
                      isGlassmorphism 
                        ? 'neural-text-label' 
                        : 'text-gray-700'
                    }`}>Campaign Objective</label>
                    <input
                      type="text"
                      value={editableParams.objective}
                      onChange={(e) => updateEditableParam('objective', e.target.value)}
                      placeholder="Enter campaign objective"
                      className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                        isGlassmorphism 
                          ? 'neural-glass text-gray-800 placeholder-gray-500 border border-white border-opacity-20 backdrop-blur-lg' 
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`mb-1 block text-sm font-medium ${
                      isGlassmorphism 
                        ? 'neural-text-label' 
                        : 'text-gray-700'
                    }`}>Target Frequency</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="10.0"
                      value={editableParams.targetFrequency}
                      onChange={(e) => updateEditableParam('targetFrequency', e.target.value)}
                      placeholder="2.5"
                      className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                        isGlassmorphism 
                          ? 'neural-glass text-gray-800 placeholder-gray-500 border border-white border-opacity-20 backdrop-blur-lg' 
                          : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    />
                    <p className={`text-xs mt-1 ${
                      isGlassmorphism ? 'neural-text-muted' : 'text-gray-500'
                    }`}>
                      Average times each viewer sees the ad
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={`mb-1 block text-sm font-medium ${
                      isGlassmorphism 
                        ? 'neural-text-label' 
                        : 'text-gray-700'
                    }`}>Start Date</label>
                    <input
                      type="date"
                      value={editableParams.startDate}
                      onChange={(e) => updateEditableParam('startDate', e.target.value)}
                      className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                        isGlassmorphism 
                          ? 'neural-glass text-gray-800 border border-white border-opacity-20 backdrop-blur-lg' 
                          : 'bg-white border border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`mb-1 block text-sm font-medium ${
                      isGlassmorphism 
                        ? 'neural-text-label' 
                        : 'text-gray-700'
                    }`}>End Date</label>
                    <input
                      type="date"
                      value={editableParams.endDate}
                      onChange={(e) => updateEditableParam('endDate', e.target.value)}
                      min={editableParams.startDate} // End date can't be before start date
                      className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                        isGlassmorphism 
                          ? 'neural-glass text-gray-800 border border-white border-opacity-20 backdrop-blur-lg' 
                          : 'bg-white border border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="neural-glass-info mt-6 p-4">
              <div className="flex items-center">
                <div className="text-blue-400 mr-3">✓</div>
                <div>
                  <p className={`font-semibold ${
                    isGlassmorphism 
                      ? 'neural-text-emphasis' 
                      : 'text-gray-900'
                  }`}>Campaign parameters successfully parsed</p>
                  <p className={`${
                    isGlassmorphism 
                      ? 'neural-text-secondary' 
                      : 'text-gray-600'
                  }`}>Confidence: {currentStepData?.confidence}%</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'advertiser_preferences':
        if (!currentStepData) {
          return (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <h3 className={`text-lg font-medium mb-2 ${
                isGlassmorphism 
                  ? 'text-white' 
                  : 'text-gray-900'
              }`}>Analyzing Historical Data</h3>
              <p className={`${
                isGlassmorphism 
                  ? 'text-gray-300' 
                  : 'text-gray-500'
              }`}>Analyzing historical viewing patterns and content preferences...</p>
            </div>
          );
        }
        
        return (
          <div>
            <h3 className="neural-heading-3 mb-6">Historical Patterns Retrieved</h3>
            {currentStepData.data && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${
                    isGlassmorphism 
                      ? 'neural-glass-purple' 
                      : 'bg-purple-50 border border-purple-200'
                  }`}>
                    <h4 className={`mb-2 font-semibold ${
                      isGlassmorphism 
                        ? 'neural-text-emphasis' 
                        : 'text-gray-900'
                    }`}>Content Preferences</h4>
                    <ul className={`space-y-1 ${
                      isGlassmorphism 
                        ? 'neural-text-secondary' 
                        : 'text-gray-600'
                    }`}>
                      {currentStepData.data.content_preferences?.map((item: string, index: number) => (
                        <li key={index}>• {item}</li>
                      )) || <li>No historical content data</li>}
                    </ul>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    isGlassmorphism 
                      ? 'neural-glass-purple' 
                      : 'bg-purple-50 border border-purple-200'
                  }`}>
                    <h4 className={`mb-2 font-semibold ${
                      isGlassmorphism 
                        ? 'neural-text-emphasis' 
                        : 'text-gray-900'
                    }`}>Channel Preferences</h4>
                    <ul className={`space-y-1 ${
                      isGlassmorphism 
                        ? 'neural-text-secondary' 
                        : 'text-gray-600'
                    }`}>
                      {currentStepData.data.channel_preferences?.map((item: string, index: number) => (
                        <li key={index}>• {item}</li>
                      )) || <li>No historical channel data</li>}
                    </ul>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    isGlassmorphism 
                      ? 'neural-glass-purple' 
                      : 'bg-purple-50 border border-purple-200'
                  }`}>
                    <h4 className={`mb-2 font-semibold ${
                      isGlassmorphism 
                        ? 'neural-text-emphasis' 
                        : 'text-gray-900'
                    }`}>Network Preferences</h4>
                    <ul className={`space-y-1 ${
                      isGlassmorphism 
                        ? 'neural-text-secondary' 
                        : 'text-gray-600'
                    }`}>
                      {currentStepData.data.network_preferences?.map((item: string, index: number) => (
                        <li key={index}>• {item}</li>
                      )) || <li>No historical network data</li>}
                    </ul>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    isGlassmorphism 
                      ? 'neural-glass-purple' 
                      : 'bg-purple-50 border border-purple-200'
                  }`}>
                    <h4 className={`mb-2 font-semibold ${
                      isGlassmorphism 
                        ? 'neural-text-emphasis' 
                        : 'text-gray-900'
                    }`}>Geographic Focus</h4>
                    <ul className={`space-y-1 ${
                      isGlassmorphism 
                        ? 'neural-text-secondary' 
                        : 'text-gray-600'
                    }`}>
                      {currentStepData.data.geo_preferences?.map((item: string, index: number) => (
                        <li key={index}>• ZIP {item}</li>
                      )) || <li>No geographic patterns</li>}
                    </ul>
                  </div>
                </div>
                
                {/* Key Insights */}
                <div className={`p-4 rounded-lg ${
                  isGlassmorphism 
                    ? 'neural-glass-purple' 
                    : 'bg-purple-50 border border-purple-200'
                }`}>
                  <h4 className={`mb-2 font-semibold ${
                    isGlassmorphism 
                      ? 'neural-text-emphasis' 
                      : 'text-gray-900'
                  }`}>Key Insights</h4>
                  <ul className={`space-y-1 ${
                    isGlassmorphism 
                      ? 'neural-text-secondary' 
                      : 'text-gray-600'
                  }`}>
                    {currentStepData.data.insights?.map((insight: string, index: number) => (
                      <li key={index}>• {insight}</li>
                    )) || <li>No insights available</li>}
                  </ul>
                </div>
              </div>
            )}
            <div className="neural-glass-panel mt-6 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-purple-400 mr-3">✓</div>
                  <div>
                      <p className={`font-semibold ${
                        isGlassmorphism 
                          ? 'neural-text-emphasis' 
                          : 'text-gray-900'
                      }`}>Historical patterns successfully analyzed</p>
                      <p className={`${
                        isGlassmorphism 
                          ? 'neural-text-secondary' 
                          : 'text-gray-600'
                      }`}>Confidence: {currentStepData?.confidence}%</p>
                  </div>
                </div>
                
                {/* Continue to Audience Generation Button */}
                <button
                  onClick={handleContinueWorkflow}
                  disabled={isProcessing}
                  className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isGlassmorphism 
                      ? 'neural-btn neural-btn-primary' 
                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white border border-blue-600'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Continue to Audience Generation"
                >
                  <div className="flex items-center space-x-2">
                    <span>🎯</span>
                    <span>{isProcessing ? 'Processing...' : 'Generate Audience'}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      case 'audience_generation':
        // Show ACR audience segments - using mock data for demonstration
        const segments = currentStepData?.data?.segments || [
          {
            name: "Premium Sports Enthusiasts",
            description: "High-income viewers who watch premium sports content on streaming platforms, particularly interested in NFL, NBA, and premium sports documentaries.",
            scale: 2450000,
            cpm: 12.50,
            reach: 8.2,
            demographics: "Adults 25-54, HHI $75K+",
            behaviors: ["Sports streaming", "Premium subscriptions", "Live events"]
          },
          {
            name: "Cord-Cutting Millennials",
            description: "Tech-savvy millennials who have completely transitioned to streaming services, heavy consumers of original content and documentaries.",
            scale: 3200000,
            cpm: 9.75,
            reach: 12.1,
            demographics: "Adults 28-42, Urban/Suburban",
            behaviors: ["Streaming-first", "Mobile viewing", "Social sharing"]
          },
          {
            name: "Family Entertainment Seekers",
            description: "Families with children who prioritize family-friendly content, educational programming, and weekend movie nights via CTV platforms.",
            scale: 1850000,
            cpm: 8.25,
            reach: 6.8,
            demographics: "Adults 30-50, HH with children",
            behaviors: ["Family viewing", "Educational content", "Weekend streaming"]
          }
        ];
        
        return (
          <div>
            <div className="mb-6">
              <h3 className="neural-heading-3 mb-2">🎯 AI-Generated Audience Segments</h3>
              <div className={`text-sm p-3 rounded-lg ${
                isGlassmorphism 
                  ? 'neural-glass-info' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-center">
                  <div className="text-blue-400 mr-2">ℹ️</div>
                  <span className={`${
                    isGlassmorphism 
                      ? 'neural-text-secondary' 
                      : 'text-blue-700'
                  }`}>
                    <strong>ACR Audience Analysis:</strong> Using behavioral analytics to identify high-value audience segments for this campaign.
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {segments.map((segment, index) => (
                <div key={index} className={`rounded-lg p-6 ${
                  isGlassmorphism 
                    ? 'neural-glass-secondary' 
                    : 'bg-purple-50 border border-purple-200'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className={`font-semibold text-lg ${
                      isGlassmorphism 
                        ? 'neural-text-emphasis' 
                        : 'text-gray-900'
                    }`}>{segment.name}</h4>
                    <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                      isGlassmorphism 
                        ? 'bg-purple-500/20 text-purple-300' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {segment.scale.toLocaleString()} HH
                    </div>
                  </div>
                  
                  <p className={`mb-4 ${
                    isGlassmorphism 
                      ? 'neural-text-secondary' 
                      : 'text-gray-600'
                  }`}>{segment.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className={`p-3 rounded ${
                      isGlassmorphism 
                        ? 'bg-black/20' 
                        : 'bg-white border'
                    }`}>
                      <div className={`text-xs font-medium mb-1 ${
                        isGlassmorphism 
                          ? 'neural-text-muted' 
                          : 'text-gray-500'
                      }`}>DEMOGRAPHICS</div>
                      <div className={`text-sm ${
                        isGlassmorphism 
                          ? 'neural-text-secondary' 
                          : 'text-gray-700'
                      }`}>{segment.demographics}</div>
                    </div>
                    
                    <div className={`p-3 rounded ${
                      isGlassmorphism 
                        ? 'bg-black/20' 
                        : 'bg-white border'
                    }`}>
                      <div className={`text-xs font-medium mb-1 ${
                        isGlassmorphism 
                          ? 'neural-text-muted' 
                          : 'text-gray-500'
                      }`}>KEY BEHAVIORS</div>
                      <div className="flex flex-wrap gap-1">
                        {segment.behaviors.map((behavior, idx) => (
                          <span key={idx} className={`text-xs px-2 py-1 rounded ${
                            isGlassmorphism 
                              ? 'bg-purple-500/30 text-purple-200' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {behavior}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-orange-200/30">
                    <div className="flex gap-6 text-sm">
                      <span className={`${
                        isGlassmorphism 
                          ? 'neural-text-muted' 
                          : 'text-gray-500'
                      }`}>
                        <strong>CPM:</strong> ${segment.cpm}
                      </span>
                      <span className={`${
                        isGlassmorphism 
                          ? 'neural-text-muted' 
                          : 'text-gray-500'
                      }`}>
                        <strong>Est. Reach:</strong> {segment.reach}%
                      </span>
                    </div>
                    <div className={`text-sm font-medium ${
                      isGlassmorphism 
                        ? 'text-orange-300' 
                        : 'text-orange-600'
                    }`}>
                      High Confidence
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="neural-glass-warning mt-6 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-orange-400 mr-3">✓</div>
                  <div>
                    <p className={`font-semibold ${
                      isGlassmorphism 
                        ? 'neural-text-emphasis' 
                        : 'text-gray-900'
                    }`}>Audience segments generated with pricing insights</p>
                    <p className={`${
                      isGlassmorphism 
                        ? 'neural-text-secondary' 
                        : 'text-gray-600'
                    }`}>Demo Confidence: 92% • Total Addressable: 7.5M households</p>
                  </div>
                </div>
                
                {/* Continue to Campaign Generation Button */}
                <button
                  onClick={handleContinueWorkflow}
                  disabled={isProcessing}
                  className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isGlassmorphism 
                      ? 'neural-btn neural-btn-primary' 
                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white border border-blue-600'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Continue to Campaign Generation"
                >
                  <div className="flex items-center space-x-2">
                    <span>🚀</span>
                    <span>{isProcessing ? 'Processing...' : 'Generate Campaign'}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      case 'campaign_generation':
        if (!currentStepData) {
          return (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <h3 className={`text-lg font-medium mb-2 ${
                isGlassmorphism 
                  ? 'text-white' 
                  : 'text-gray-900'
              }`}>Building Line Items</h3>
              <p className={`${
                isGlassmorphism 
                  ? 'text-gray-300' 
                  : 'text-gray-500'
              }`}>Constructing executable campaign structure...</p>
            </div>
          );
        }
        
        return (
          <div>
            <h3 className="neural-heading-3 mb-6">Line Items Successfully Constructed</h3>
            {currentStepData.data?.line_items && (
              <div className="overflow-x-auto neural-glass rounded-lg border border-white border-opacity-20">
                <table className="min-w-full divide-y divide-white divide-opacity-20">
                  <thead className="neural-glass-header">
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isGlassmorphism 
                          ? 'neural-text-label' 
                          : 'text-gray-500'
                      }`}>
                        Line Item Name
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isGlassmorphism 
                          ? 'neural-text-label' 
                          : 'text-gray-500'
                      }`}>
                        Budget
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isGlassmorphism 
                          ? 'neural-text-label' 
                          : 'text-gray-500'
                      }`}>
                        CPM
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isGlassmorphism 
                          ? 'neural-text-label' 
                          : 'text-gray-500'
                      }`}>
                        Audience
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        isGlassmorphism 
                          ? 'neural-text-label' 
                          : 'text-gray-500'
                      }`}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="neural-glass divide-y divide-white divide-opacity-10">
                    {currentStepData.data.line_items.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-white hover:bg-opacity-10 transition-colors">
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          isGlassmorphism 
                            ? 'neural-text-emphasis' 
                            : 'text-gray-900'
                        }`}>
                          {item.name}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isGlassmorphism 
                            ? 'neural-text-secondary' 
                            : 'text-gray-600'
                        }`}>
                          ${item.budget?.toLocaleString() || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isGlassmorphism 
                            ? 'neural-text-secondary' 
                            : 'text-gray-600'
                        }`}>
                          ${item.cpm || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          isGlassmorphism 
                            ? 'neural-text-secondary' 
                            : 'text-gray-600'
                        }`}>
                          {item.audience}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-purple-500 bg-opacity-20 text-purple-800 rounded-full border border-purple-400 border-opacity-30">
                            Ready
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="neural-glass-warning mt-6 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-orange-400 mr-3">✓</div>
                  <div>
                    <p className={`font-semibold ${
                      isGlassmorphism 
                        ? 'neural-text-emphasis' 
                        : 'text-gray-900'
                    }`}>Campaign structure ready for deployment</p>
                    <p className={`${
                      isGlassmorphism 
                        ? 'neural-text-secondary' 
                        : 'text-gray-600'
                    }`}>Confidence: {currentStepData?.confidence}%</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={downloadMediaPlan}
                    className={`px-6 py-2 text-sm ${
                      isGlassmorphism 
                        ? 'neural-btn neural-btn-secondary' 
                        : 'bg-gray-600 hover:bg-gray-700 text-white rounded-lg border border-gray-600 transition-colors'
                    }`}
                    title="Download Media Plan as CSV"
                  >
                    <div className="flex items-center space-x-2">
                      <span>📥</span>
                      <span>Download CSV</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={handleGoToForecastingInput}
                    disabled={isProcessing}
                    className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isGlassmorphism 
                        ? 'neural-btn neural-btn-primary' 
                        : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white border border-blue-600'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Continue to Forecasting Input"
                  >
                    <div className="flex items-center space-x-2">
                      <span>📝</span>
                      <span>{isProcessing ? 'Processing...' : 'Setup Forecast'}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'forecasting_input':
        const lineItemData = campaignData.find(data => data.step === 'campaign_generation');
        
        return (
          <div>
            <h3 className="neural-heading-3 mb-6">Forecasting Input</h3>
            <p className={`mb-6 ${
              isGlassmorphism 
                ? 'neural-text-secondary' 
                : 'text-gray-600'
            }`}>
              Configure your CTV campaign parameters and generate forecasting analysis.
            </p>
            
            {/* Show Line Items Summary */}
            {lineItemData?.data?.line_items && (
              <div className="mb-8">
                <h4 className={`text-lg font-semibold mb-4 ${
                  isGlassmorphism 
                    ? 'neural-text-emphasis' 
                    : 'text-gray-900'
                }`}>📋 Line Items Summary</h4>
                <div className={`rounded-lg p-4 mb-6 ${
                  isGlassmorphism 
                    ? 'neural-glass border border-white border-opacity-20' 
                    : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`text-sm ${
                        isGlassmorphism 
                          ? 'neural-text-secondary' 
                          : 'text-gray-600'
                      }`}>
                        {lineItemData.data.line_items.length} line items • Total Budget: ${lineItemData.data.line_items.reduce((sum: number, item: any) => sum + (item.budget || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      isGlassmorphism 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      Ready for Forecasting
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Simplified Forecasting Parameters */}
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className={`mb-1 block text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-label' 
                      : 'text-gray-700'
                  }`}>Total Budget ($)</label>
                  <input
                    type="number"
                    value={editableParams.budget}
                    onChange={(e) => updateEditableParam('budget', e.target.value)}
                    className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                      isGlassmorphism 
                        ? 'neural-glass text-gray-800 placeholder-gray-500 border border-white border-opacity-20 backdrop-blur-lg' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="250000"
                  />
                </div>
                
                <div>
                  <label className={`mb-1 block text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-label' 
                      : 'text-gray-700'
                  }`}>Start Date</label>
                  <input
                    type="date"
                    value={editableParams.startDate}
                    onChange={(e) => updateEditableParam('startDate', e.target.value)}
                    className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                      isGlassmorphism 
                        ? 'neural-glass text-gray-800 placeholder-gray-500 border border-white border-opacity-20 backdrop-blur-lg' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`mb-1 block text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-label' 
                      : 'text-gray-700'
                  }`}>End Date</label>
                  <input
                    type="date"
                    value={editableParams.endDate}
                    onChange={(e) => updateEditableParam('endDate', e.target.value)}
                    className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                      isGlassmorphism 
                        ? 'neural-glass text-gray-800 placeholder-gray-500 border border-white border-opacity-20 backdrop-blur-lg' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={`mb-1 block text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-label' 
                      : 'text-gray-700'
                  }`}>Target Frequency</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editableParams.targetFrequency}
                    onChange={(e) => updateEditableParam('targetFrequency', e.target.value)}
                    className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                      isGlassmorphism 
                        ? 'neural-glass text-gray-800 placeholder-gray-500 border border-white border-opacity-20 backdrop-blur-lg' 
                        : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    placeholder="2.5"
                  />
                </div>
                
                <div>
                  <label className={`mb-1 block text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-label' 
                      : 'text-gray-700'
                  }`}>Campaign Duration</label>
                  <div className="relative">
                    <select
                      value={editableParams.timeline || '4 weeks'}
                      onChange={(e) => updateEditableParam('timeline', e.target.value)}
                      className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 appearance-none cursor-pointer ${
                        isGlassmorphism 
                          ? 'neural-glass text-gray-800 border border-white border-opacity-20 backdrop-blur-lg' 
                          : 'bg-white border border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="2 weeks">2 weeks</option>
                      <option value="4 weeks">4 weeks</option>
                      <option value="6 weeks">6 weeks</option>
                      <option value="8 weeks">8 weeks</option>
                      <option value="12 weeks">12 weeks</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className={`w-4 h-4 ${isGlassmorphism ? 'text-gray-300' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className={`text-xs mt-1 ${
                    isGlassmorphism ? 'neural-text-muted' : 'text-gray-500'
                  }`}>
                    Auto-calculated from date range
                  </p>
                </div>
              </div>

              {/* Generate Forecast Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`text-lg font-semibold ${
                      isGlassmorphism 
                        ? 'neural-text-emphasis' 
                        : 'text-gray-900'
                    }`}>Ready to Generate Forecast</h4>
                    <p className={`text-sm ${
                      isGlassmorphism 
                        ? 'neural-text-secondary' 
                        : 'text-gray-600'
                    }`}>
                      Click below to generate detailed campaign forecasting analysis
                    </p>
                  </div>
                  <button
                    onClick={handleReforecast}
                    disabled={isProcessing}
                    className={`px-8 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isGlassmorphism 
                        ? 'neural-btn neural-btn-primary' 
                        : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white border border-green-600'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Generate Campaign Forecast"
                  >
                    <div className="flex items-center space-x-2">
                      <span>🔮</span>
                      <span>{isProcessing ? 'Generating...' : 'Generate Forecast'}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'forecasting':
        return (
          <div>
            {/* Audience Insights Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowAudienceInsights(!showAudienceInsights)}
                className={`${
                  isGlassmorphism 
                    ? 'neural-btn neural-btn-secondary' 
                    : 'px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg border border-purple-600 transition-colors'
                } px-4 py-2 text-sm`}
                title="View ACR Audience Analysis"
              >
                <div className="flex items-center space-x-2">
                  <span>🎯</span>
                  <span>{showAudienceInsights ? 'Hide' : 'Show'} Audience Insights</span>
                </div>
              </button>
            </div>

            {/* Audience Insights Panel */}
            {showAudienceInsights && (
              <div className="mb-8">
                <div className="mb-6">
                  <h3 className="neural-heading-3 mb-2">🎯 AI-Generated Audience Segments</h3>
                  <div className={`text-sm p-3 rounded-lg ${
                    isGlassmorphism 
                      ? 'neural-glass-info' 
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex items-center">
                      <div className="text-blue-400 mr-2">ℹ️</div>
                      <span className={`${
                        isGlassmorphism 
                          ? 'neural-text-secondary' 
                          : 'text-blue-700'
                      }`}>
                        <strong>ACR Audience Analysis:</strong> Using behavioral analytics to identify high-value audience segments for this campaign.
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  {[
                    {
                      name: "Premium Sports Enthusiasts",
                      description: "High-income viewers who watch premium sports content on streaming platforms, particularly interested in NFL, NBA, and premium sports documentaries.",
                      scale: 2450000,
                      cpm: 12.50,
                      reach: 8.2,
                      demographics: "Adults 25-54, HHI $75K+",
                      behaviors: ["Sports streaming", "Premium subscriptions", "Live events"]
                    },
                    {
                      name: "Cord-Cutting Millennials", 
                      description: "Tech-savvy millennials who have completely transitioned to streaming services, heavy consumers of original content and documentaries.",
                      scale: 3200000,
                      cpm: 9.75,
                      reach: 12.1,
                      demographics: "Adults 28-42, Urban/Suburban",
                      behaviors: ["Streaming-first", "Mobile viewing", "Social sharing"]
                    },
                    {
                      name: "Family Entertainment Seekers",
                      description: "Families with children who prioritize family-friendly content, educational programming, and weekend movie nights via CTV platforms.",
                      scale: 1850000,
                      cpm: 8.25,
                      reach: 6.8,
                      demographics: "Adults 30-50, HH with children",
                      behaviors: ["Family viewing", "Educational content", "Weekend streaming"]
                    }
                  ].map((segment, index) => (
                    <div key={index} className={`rounded-lg p-6 ${
                      isGlassmorphism 
                        ? 'neural-glass-success' 
                        : 'bg-green-50 border border-green-200'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className={`font-semibold text-lg ${
                          isGlassmorphism 
                            ? 'neural-text-emphasis' 
                            : 'text-gray-900'
                        }`}>{segment.name}</h4>
                        <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                          isGlassmorphism 
                            ? 'bg-purple-500/20 text-purple-300' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {segment.scale.toLocaleString()} HH
                        </div>
                      </div>
                      
                      <p className={`mb-4 ${
                        isGlassmorphism 
                          ? 'neural-text-secondary' 
                          : 'text-gray-600'
                      }`}>{segment.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className={`p-3 rounded ${
                          isGlassmorphism 
                            ? 'bg-black/20' 
                            : 'bg-white border'
                        }`}>
                          <div className={`text-xs font-medium mb-1 ${
                            isGlassmorphism 
                              ? 'neural-text-muted' 
                              : 'text-gray-500'
                          }`}>DEMOGRAPHICS</div>
                          <div className={`text-sm ${
                            isGlassmorphism 
                              ? 'neural-text-secondary' 
                              : 'text-gray-700'
                          }`}>{segment.demographics}</div>
                        </div>
                        
                        <div className={`p-3 rounded ${
                          isGlassmorphism 
                            ? 'bg-black/20' 
                            : 'bg-white border'
                        }`}>
                          <div className={`text-xs font-medium mb-1 ${
                            isGlassmorphism 
                              ? 'neural-text-muted' 
                              : 'text-gray-500'
                          }`}>KEY BEHAVIORS</div>
                          <div className={`text-sm ${
                            isGlassmorphism 
                              ? 'neural-text-secondary' 
                              : 'text-gray-700'
                          }`}>{segment.behaviors.join(", ")}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-4">
                          <div className={`text-sm ${
                            isGlassmorphism 
                              ? 'neural-text-muted' 
                              : 'text-gray-500'
                          }`}>
                            CPM: <span className={`font-medium ${
                              isGlassmorphism 
                                ? 'neural-text-secondary' 
                                : 'text-gray-700'
                            }`}>${segment.cpm.toFixed(2)}</span>
                          </div>
                          <div className={`text-sm ${
                            isGlassmorphism 
                              ? 'neural-text-muted' 
                              : 'text-gray-500'
                          }`}>
                            Reach: <span className={`font-medium ${
                              isGlassmorphism 
                                ? 'neural-text-secondary' 
                                : 'text-gray-700'
                            }`}>{segment.reach}%</span>
                          </div>
                        </div>
                        
                        <div className={`text-xs px-2 py-1 rounded ${
                          isGlassmorphism 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          ACR Verified
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Forecasting Input Panel for Iterative Adjustments */}
            <div className={`rounded-xl p-6 mb-8 ${
              isGlassmorphism 
                ? 'neural-glass' 
                : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <div className="mb-6">
                <h3 className={`text-xl font-bold mb-2 ${
                  isGlassmorphism 
                    ? 'neural-text-primary' 
                    : 'text-gray-900'
                }`}>📝 Forecasting Parameters</h3>
                <p className={`text-sm ${
                  isGlassmorphism 
                    ? 'neural-text-muted' 
                    : 'text-gray-600'
                }`}>
                  Adjust parameters and regenerate forecasts to optimize your campaign performance
                </p>
              </div>

              {/* Line Items Summary */}
              <div className={`rounded-lg p-4 mb-6 ${
                isGlassmorphism 
                  ? 'neural-glass-info' 
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <h4 className={`font-semibold mb-2 ${
                  isGlassmorphism 
                    ? 'neural-text-emphasis' 
                    : 'text-gray-900'
                }`}>📊 Line Items Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className={`text-sm ${
                      isGlassmorphism ? 'neural-text-muted' : 'text-gray-600'
                    }`}>Line Items: </span>
                    <span className={`font-medium ${
                      isGlassmorphism ? 'neural-text-secondary' : 'text-gray-900'
                    }`}>
                      {(() => {
                        const campaignGenStep = campaignData.find(step => step.step === 'campaign_generation');
                        if (campaignGenStep?.data?.line_items) {
                          return campaignGenStep.data.line_items.length;
                        }
                        return 'N/A';
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className={`text-sm ${
                      isGlassmorphism ? 'neural-text-muted' : 'text-gray-600'
                    }`}>Total Budget: </span>
                    <span className={`font-medium ${
                      isGlassmorphism ? 'neural-text-secondary' : 'text-gray-900'
                    }`}>
                      {(() => {
                        const campaignGenStep = campaignData.find(step => step.step === 'campaign_generation');
                        if (campaignGenStep?.data?.line_items) {
                          const totalBudget = campaignGenStep.data.line_items.reduce((sum: number, item: any) => 
                            sum + (parseFloat(item.budget) || 0), 0
                          );
                          return `$${totalBudget.toLocaleString()}`;
                        }
                        return '$0';
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Forecasting Parameters Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className={`mb-1 block text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-label' 
                      : 'text-gray-700'
                  }`}>Total Budget ($)</label>
                  <input
                    type="number"
                    value={editableParams.budget || ''}
                    onChange={(e) => updateEditableParam('budget', e.target.value)}
                    className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                      isGlassmorphism 
                        ? 'neural-glass text-gray-800 border border-white border-opacity-20 backdrop-blur-lg' 
                        : 'bg-white border border-gray-300 text-gray-900'
                    }`}
                    placeholder="50000"
                  />
                </div>

                <div>
                  <label className={`mb-1 block text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-label' 
                      : 'text-gray-700'
                  }`}>Target Frequency</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editableParams.frequency || ''}
                    onChange={(e) => updateEditableParam('frequency', e.target.value)}
                    className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                      isGlassmorphism 
                        ? 'neural-glass text-gray-800 border border-white border-opacity-20 backdrop-blur-lg' 
                        : 'bg-white border border-gray-300 text-gray-900'
                    }`}
                    placeholder="2.5"
                  />
                </div>

                <div>
                  <label className={`mb-1 block text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-label' 
                      : 'text-gray-700'
                  }`}>Start Date</label>
                  <input
                    type="date"
                    value={editableParams.startDate || ''}
                    onChange={(e) => updateEditableParam('startDate', e.target.value)}
                    className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                      isGlassmorphism 
                        ? 'neural-glass text-gray-800 border border-white border-opacity-20 backdrop-blur-lg' 
                        : 'bg-white border border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`mb-1 block text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-label' 
                      : 'text-gray-700'
                  }`}>End Date</label>
                  <input
                    type="date"
                    value={editableParams.endDate || ''}
                    onChange={(e) => updateEditableParam('endDate', e.target.value)}
                    className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 ${
                      isGlassmorphism 
                        ? 'neural-glass text-gray-800 border border-white border-opacity-20 backdrop-blur-lg' 
                        : 'bg-white border border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={`mb-1 block text-sm font-medium ${
                    isGlassmorphism 
                      ? 'neural-text-label' 
                      : 'text-gray-700'
                  }`}>Campaign Duration</label>
                  <div className="relative">
                    <select
                      value={editableParams.timeline || '4 weeks'}
                      onChange={(e) => updateEditableParam('timeline', e.target.value)}
                      className={`w-full p-3 rounded-lg font-semibold focus:ring-2 focus:ring-blue-400 focus:border-blue-400 appearance-none cursor-pointer ${
                        isGlassmorphism 
                          ? 'neural-glass text-gray-800 border border-white border-opacity-20 backdrop-blur-lg' 
                          : 'bg-white border border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="2 weeks">2 weeks</option>
                      <option value="4 weeks">4 weeks</option>
                      <option value="6 weeks">6 weeks</option>
                      <option value="8 weeks">8 weeks</option>
                      <option value="12 weeks">12 weeks</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className={`w-4 h-4 ${isGlassmorphism ? 'text-gray-300' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className={`text-xs mt-1 ${
                    isGlassmorphism ? 'neural-text-muted' : 'text-gray-500'
                  }`}>
                    Auto-calculated from date range
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className={`${
                      isGlassmorphism ? 'neural-text-muted' : 'text-gray-600'
                    }`}>
                      Adjust parameters and regenerate forecast, or finish when satisfied
                    </span>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={async () => {
                        if (agentState.current_step === 'forecasting') {
                          await handleReforecast();
                        }
                      }}
                      disabled={isProcessing}
                      className={`px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                        isProcessing 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : isGlassmorphism
                            ? 'neural-btn neural-btn-primary hover:scale-105' 
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      {isProcessing ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Regenerating...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>🔮</span>
                          <span>Regenerate Forecast</span>
                        </div>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        // Mark workflow as complete
                        setAgentState(prev => ({
                          ...prev,
                          current_step: 'complete',
                          progress: 100,
                          last_reasoning: 'Campaign setup completed successfully',
                          next_action: 'Campaign ready for launch',
                          avatar_state: 'complete'
                        }));
                      }}
                      disabled={isProcessing}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                        isProcessing 
                          ? 'bg-gray-400 cursor-not-allowed text-white' 
                          : isGlassmorphism
                            ? 'neural-btn neural-btn-success hover:scale-105' 
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>✅</span>
                        <span>Finish Setup</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );



      case 'complete':
        return (
          <div className="text-center py-12">
            <div className={`rounded-xl p-8 ${
              isGlassmorphism 
                ? 'neural-glass' 
                : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <div className="text-6xl mb-4">🎉</div>
              <h3 className={`text-2xl font-bold mb-4 ${
                isGlassmorphism 
                  ? 'neural-text-primary' 
                  : 'text-gray-900'
              }`}>Campaign Setup Complete!</h3>
              <p className={`mb-6 ${
                isGlassmorphism 
                  ? 'neural-text-secondary' 
                  : 'text-gray-600'
              }`}>
                Your campaign has been successfully configured with optimized forecasting parameters. 
                You can now proceed with launching your campaign or make additional adjustments.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => window.location.reload()}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    isGlassmorphism
                      ? 'neural-btn neural-btn-secondary' 
                      : 'bg-gray-600 hover:bg-gray-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>🔄</span>
                    <span>Start New Campaign</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setAgentState(prev => ({
                      ...prev,
                      current_step: 'forecasting',
                      next_action: 'Review forecast or make adjustments'
                    }));
                  }}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                    isGlassmorphism
                      ? 'neural-btn neural-btn-primary' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>📊</span>
                    <span>Review Forecast</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h3 className={`text-lg font-medium mb-2 ${
              isGlassmorphism 
                ? 'text-white' 
                : 'text-gray-900'
            }`}>Peggy - AI Planning Assistant</h3>
            <p className={`mb-6 ${
              isGlassmorphism 
                ? 'text-gray-300' 
                : 'text-gray-500'
            }`}>I'll help you create targeted CTV campaigns with data-driven insights.</p>
            <div className={`rounded-lg p-4 max-w-md mx-auto ${
              isGlassmorphism 
                ? 'neural-glass-info' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`text-sm ${
                isGlassmorphism 
                                  ? 'text-blue-100' 
                : 'text-blue-800'
              }`}>
                Start by describing your campaign requirements in the chat panel.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <ThemeContext.Provider value={{ isGlassmorphism, toggleTheme }}>
      <div className={`min-h-screen relative overflow-hidden ${
        isGlassmorphism 
          ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' 
          : 'bg-white'
      }`}>

      
      {/* Main content */}
      <div className="relative z-10">
        {/* Enhanced Floating Header */}
        <div className="p-4 pb-0">
          <header className={`${
            isGlassmorphism 
              ? 'neural-glass-card shadow-glass' 
              : 'bg-white border border-gray-200 rounded-2xl shadow-lg'
          }`}>
            <div className={`${
              isGlassmorphism 
                ? 'neural-glass-header' 
                : 'bg-gray-50 border-b border-gray-200 rounded-t-2xl'
            } py-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    {/* Company Logo */}
                    <div className="w-24 h-24 flex items-center justify-center">
                      <img 
                        src={isGlassmorphism ? "/main-logo-white-transparent.svg" : "/logo.png"}
                        alt="Company Logo" 
                        className="w-24 h-24 object-contain"
                      />
                    </div>
                    <div>
                      <h1 className={`text-2xl font-bold tracking-tight ${
                        isGlassmorphism 
                          ? 'neural-header-title' 
                          : 'text-gray-900'
                      }`}>Neural Ads</h1>
                      <p className={`${
                        isGlassmorphism 
                          ? 'text-gray-200' 
                          : 'text-gray-600'
                      }`}>AI-Powered CTV Campaign Intelligence</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Theme Toggle Button */}
                  <button
                    onClick={toggleTheme}
                    className={`${
                      isGlassmorphism 
                        ? 'neural-btn neural-btn-secondary' 
                        : 'px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg border border-gray-300 transition-colors'
                    } px-4 py-2 text-sm`}
                    title={isGlassmorphism ? "Switch to Traditional Mode" : "Switch to Glass Mode"}
                  >
                    {isGlassmorphism ? (
                      <div className="flex items-center space-x-2">
                        <span>🎨</span>
                        <span>Glass</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>📝</span>
                        <span>Traditional</span>
                      </div>
                    )}
                  </button>

                  {/* Settings Button */}
                  <button
                    onClick={resetWorkflow}
                    disabled={isProcessing}
                    className={`${
                      isGlassmorphism 
                        ? 'neural-btn neural-btn-secondary' 
                        : 'px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg border border-gray-300 transition-colors'
                    } px-4 py-2 text-sm`}
                    title="Reset Workflow"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </header>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="text-xs text-red-600 underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Four Panel Layout */}
        <div className="flex h-[calc(100vh-88px)]">
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col p-6 space-y-6 h-full max-h-full overflow-hidden">
            
            {/* Main Content */}
            <div className={`grid gap-6 h-[calc(100vh-200px)] min-h-0 transition-all duration-300 ${
              // Show 4 columns when forecasting is available and progress panel is not collapsed
              (agentState.current_step === 'forecasting' || campaignData.some(data => data.step === 'forecasting')) && !isProgressCollapsed
                ? 'grid-cols-1 lg:grid-cols-4'
                // Show 3 columns when forecasting is available but progress panel is collapsed
                : (agentState.current_step === 'forecasting' || campaignData.some(data => data.step === 'forecasting')) && isProgressCollapsed
                ? 'grid-cols-1 lg:grid-cols-3'
                // Default layout without forecasting
                : isProgressCollapsed 
                ? 'grid-cols-1 lg:grid-cols-2' 
                : 'grid-cols-1 lg:grid-cols-3'
            }`}>
              
              {/* Chat Assistant Panel */}
              <div className={`${
                isGlassmorphism 
                  ? 'neural-glass-card neural-fade-in shadow-glass' 
                  : 'bg-white border border-gray-200 rounded-2xl shadow-lg'
              } flex flex-col max-h-full overflow-hidden`} style={{animationDelay: '0s'}}>
                <div className={`${
                  isGlassmorphism 
                    ? 'neural-glass-header' 
                    : 'bg-gray-50 border-b border-gray-200 rounded-t-2xl p-6'
                } flex-shrink-0`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-lg">⚡</span>
                      </div>
                      <div>
                        <h4 className={`text-lg font-semibold ${
                          isGlassmorphism 
                            ? 'neural-text-contrast' 
                            : 'text-gray-900'
                        }`}>Peggy@Assistant</h4>
                        <p className={`text-sm ${
                          isGlassmorphism 
                            ? 'neural-text-secondary' 
                            : 'text-gray-600'
                        }`}>AI-powered campaign planning</p>
                      </div>
                    </div>
                    <button
                      onClick={resetWorkflow}
                      disabled={isProcessing}
                      className={`p-2 rounded-lg transition-colors ${
                        isGlassmorphism 
                          ? 'neural-btn neural-btn-secondary' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transform'}`}
                      title="Reset Campaign & Start Fresh"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className={`${
                  isGlassmorphism 
                    ? 'neural-glass-content' 
                    : 'bg-white rounded-b-2xl'
                } p-0 flex-1 min-h-0`}>
                  <ChatInterface 
                    onCampaignInput={handleCampaignInput}
                    isProcessing={isProcessing}
                    agentState={agentState}
                    chatMessages={chatMessages}
                  />
                </div>
              </div>

              {/* Current Step Content */}
              <div className={`${
                isGlassmorphism 
                  ? 'neural-glass-card neural-fade-in shadow-glass' 
                  : 'bg-white border border-gray-200 rounded-2xl shadow-lg'
              } max-h-full overflow-hidden flex flex-col`} style={{animationDelay: '0.1s'}}>
                <div className={`${
                  isGlassmorphism 
                    ? 'neural-glass-header' 
                    : 'bg-gray-50 border-b border-gray-200 rounded-t-2xl p-6'
                } flex-shrink-0`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-lg ${
                      agentState.current_step === 'campaign_data' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                      agentState.current_step === 'advertiser_preferences' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' :
                      agentState.current_step === 'audience_generation' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' :
                      agentState.current_step === 'campaign_generation' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                      'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                    }`}>
                      {steps.find(s => s.id === agentState.current_step)?.icon || '📊'}
                    </div>
                    <div>
                      <h4 className={`text-lg font-semibold ${
                        isGlassmorphism 
                          ? 'neural-text-contrast' 
                          : 'text-gray-900'
                      }`}>
                        {steps.find(s => s.id === agentState.current_step)?.title || 'Campaign Parameters'}
                      </h4>
                      <p className={`text-sm ${
                        isGlassmorphism 
                          ? 'neural-text-secondary' 
                          : 'text-gray-600'
                      }`}>
                        {agentState.current_step === 'campaign_data' ? 'Define campaign basics' :
                         agentState.current_step === 'advertiser_preferences' ? 'Analyze viewing patterns' :
                         agentState.current_step === 'audience_generation' ? 'Analyze target audience' :
                         agentState.current_step === 'campaign_generation' ? 'Generate media strategy' :
                         'Configure campaign settings'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={`${
                  isGlassmorphism 
                    ? 'neural-glass-content' 
                    : 'bg-white rounded-b-2xl p-6'
                } flex-1 min-h-0 overflow-y-auto`}>
                  {renderStepContent()}
                  
                  {/* Continue to Next Step Button */}
                  {(campaignData.length > 0 && agentState.current_step !== 'forecasting' && agentState.current_step !== 'forecasting_input' && agentState.current_step !== 'campaign_generation' && !isProcessing) && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-sm text-gray-600">
                            Step {Math.ceil(agentState.progress / 20) || 1} of 5 • {agentState.progress}% Complete
                          </div>
                        </div>
                        <button
                          onClick={advanceToNextStep}
                          disabled={isProcessing || processingRef.current}
                          className={`px-8 py-3 font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer ${
                            isGlassmorphism 
                              ? `neural-btn ${isProcessing ? 'neural-btn-secondary' : 'neural-btn-primary'}` 
                              : isProcessing 
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600'
                          }`}
                          style={{ position: 'relative', zIndex: 999 }}
                        >
                          {isProcessing ? (
                            <div className="flex items-center space-x-2">
                              <div className="neural-spinner w-4 h-4"></div>
                              <span>Processing...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>
                                {agentState.current_step === 'campaign_data' ? 'Continue to Historical Data' :
                                 agentState.current_step === 'advertiser_preferences' ? 'Generate Audience Segments' :
                                 agentState.current_step === 'audience_generation' ? 'Continue to Media Plan' :
                                 agentState.current_step === 'campaign_generation' ? 'Generate Forecast' :
                                 'Continue to Next Step'}
                              </span>
                              <span className="text-lg">→</span>
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Forecasting Panel - Show when forecasting step is active or complete */}
              {(agentState.current_step === 'forecasting' || campaignData.some(data => data.step === 'forecasting')) && (
                <div className={`${
                  isGlassmorphism 
                    ? 'neural-glass-card neural-fade-in shadow-glass' 
                    : 'bg-white border border-gray-200 rounded-2xl shadow-lg'
                } max-h-full overflow-hidden flex flex-col`} style={{animationDelay: '0.3s'}}>
                  <div className={`${
                    isGlassmorphism 
                      ? 'neural-glass-header' 
                      : 'bg-gray-50 border-b border-gray-200 rounded-t-2xl p-6'
                  } flex-shrink-0`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                        <span className="text-white text-lg">🔮</span>
                      </div>
                      <div>
                        <h4 className={`text-lg font-semibold ${
                          isGlassmorphism 
                            ? 'neural-text-contrast' 
                            : 'text-gray-900'
                        }`}>Campaign Forecast</h4>
                        <p className={`text-sm ${
                          isGlassmorphism 
                            ? 'neural-text-secondary' 
                            : 'text-gray-600'
                        }`}>Weekly spend & inventory analysis</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`${
                    isGlassmorphism 
                      ? 'neural-glass-content' 
                      : 'bg-white rounded-b-2xl p-6'
                  } flex-1 min-h-0 overflow-y-auto`}>
                    {(() => {
                      const forecastData = campaignData.find(data => data.step === 'forecasting');
                      if (!forecastData) {
                        return (
                          <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                            <h3 className={`text-lg font-medium mb-2 ${
                              isGlassmorphism 
                                ? 'text-white' 
                                : 'text-gray-900'
                            }`}>Generating Forecast</h3>
                            <p className={`${
                              isGlassmorphism 
                                ? 'text-gray-300' 
                                : 'text-gray-500'
                            }`}>Analyzing inventory availability and spend forecasting...</p>
                          </div>
                        );
                      }
                      
                      return (
                        <CampaignForecastTable 
                          data={forecastData.data}
                          confidence={forecastData.confidence}
                        />
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Progress Tracker Panel - Collapsible */}
              {!isProgressCollapsed && (
                <div className={`${
                  isGlassmorphism 
                    ? 'neural-glass-card neural-fade-in shadow-glass' 
                    : 'bg-white border border-gray-200 rounded-2xl shadow-lg'
                } max-h-full overflow-hidden flex flex-col transition-all duration-300`} style={{animationDelay: '0.2s'}}>
                  <div className={`${
                    isGlassmorphism 
                      ? 'neural-glass-header' 
                      : 'bg-gray-50 border-b border-gray-200 rounded-t-2xl p-6'
                  } flex-shrink-0`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
                          <span className="text-white text-lg">📈</span>
                        </div>
                        <div>
                          <h4 className={`text-lg font-semibold ${
                            isGlassmorphism 
                              ? 'neural-text-contrast' 
                              : 'text-gray-900'
                          }`}>Progress Tracker</h4>
                          <p className={`text-sm ${
                            isGlassmorphism 
                              ? 'neural-text-secondary' 
                              : 'text-gray-600'
                          }`}>Monitor workflow completion</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsProgressCollapsed(true)}
                        className="neural-btn neural-btn-secondary p-2 text-sm"
                        title="Collapse Progress Panel"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className={`${
                    isGlassmorphism 
                      ? 'neural-glass-content' 
                      : 'bg-white rounded-b-2xl p-6'
                  } flex-1 min-h-0 overflow-y-auto`}>
                    <CampaignSteps 
                      currentStep={agentState.current_step}
                      progress={agentState.progress}
                      campaignData={campaignData}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Floating Expand Button when Progress Panel is Collapsed */}
            {isProgressCollapsed && (
              <div className="fixed bottom-6 right-6 z-50">
                <button
                  onClick={() => setIsProgressCollapsed(false)}
                  className="neural-btn neural-btn-primary p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                  title="Show Progress Panel"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    
    {/* Processing Indicator Overlay */}
    {renderProcessingIndicator()}
    
    </ThemeContext.Provider>
  );
};

export default AgenticWorkspace; 