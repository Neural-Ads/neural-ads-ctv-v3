import axios from 'axios';

// Get API base URL from environment or default to localhost for development
const getApiBaseUrl = () => {
  // Check for environment variable first (for both dev and prod)
  if (import.meta.env.VITE_API_URL) {
    console.log('🔧 Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  
  // Production fallback - use HTTPS ALB endpoint
  if (import.meta.env.PROD) {
    console.log('🔧 Using production fallback HTTPS ALB endpoint');
    return 'https://adagent-alb-1033327405.us-east-1.elb.amazonaws.com';
  }
  
  // Development fallback - use localhost
  console.log('🔧 Using development fallback localhost');
  return 'http://localhost:8000';
};

// Check if we should use mock data (when no valid backend URL is configured)
const shouldUseMockData = () => {
  const apiUrl = getApiBaseUrl();
  // Use mock data if no API URL is configured or if it's the default placeholder
  return !import.meta.env.VITE_API_URL || 
         import.meta.env.VITE_API_URL === 'https://your-backend-api.com' ||
         apiUrl === 'https://your-backend-api.com';
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export interface CampaignSpec {
  name: string;
  total_budget: number;
  start_date: string;
  end_date: string;
  objective: string;
  description?: string;
  preferences?: any;
  line_items?: LineItem[];
}

export interface LineItem {
  id?: string;
  name: string;
  budget: number;
  start_date: string;
  end_date: string;
  networks: string[];
  genres: string[];
  devices: string[];
  locations: string[];
  segment_ids: number[];
  targeting?: any;
}

export interface Segment {
  segmentId: number;
  name: string;
  size: number;
  geo: string;
  demoTags: string[];
}

export interface CampaignPlan {
  plan: {
    campaign: CampaignSpec;
    line_items: LineItem[];
    total_budget_allocated: number;
    summary: any;
  };
  csvUrl: string;
  summary: any;
}

// Mock data for demo purposes
const mockCampaignSpec: CampaignSpec = {
  name: "Sample Brand Campaign",
  total_budget: 250000,
  start_date: "2024-03-01",
  end_date: "2024-05-31",
  objective: "Brand Awareness",
  description: "Sample awareness campaign targeting families and working professionals.",
  preferences: {
    preferred_networks: ["Hulu", "Roku", "Samsung TV Plus"],
    target_demographics: ["Adults 25-54", "Families with children"],
    content_categories: ["Lifestyle", "Family", "Home & Garden"]
  }
};

const mockSegments: Segment[] = [
  {
    segmentId: 1,
    name: "Working Parents",
    size: 2500000,
    geo: "National",
    demoTags: ["Adults 25-44", "Families", "Working Professionals"]
  },
  {
    segmentId: 2,
    name: "Busy Households",
    size: 1800000,
    geo: "Urban Areas",
    demoTags: ["Adults 35-54", "High Income", "Urban"]
  },
  {
    segmentId: 3,
    name: "Value Shoppers",
    size: 3200000,
    geo: "Suburban",
    demoTags: ["Adults 25-65", "Price Conscious", "Suburban"]
  },
  {
    segmentId: 4,
    name: "Premium Households",
    size: 1200000,
    geo: "Metropolitan",
    demoTags: ["Adults 35-65", "High Income", "Premium Brands"]
  },
  {
    segmentId: 5,
    name: "Eco-Conscious Families",
    size: 950000,
    geo: "National",
    demoTags: ["Adults 25-45", "Environmentally Conscious", "Families"]
  },
  {
    segmentId: 6,
    name: "Young Professionals",
    size: 1600000,
    geo: "Urban Areas",
    demoTags: ["Adults 22-35", "Single", "Urban Professionals"]
  }
];

const mockLineItems: LineItem[] = [
  {
    id: "li_001",
    name: "Working Parents - Hulu",
    budget: 45000,
    start_date: "2024-03-01",
    end_date: "2024-05-31",
    networks: ["Hulu"],
    genres: ["Family", "Comedy", "Drama"],
    devices: ["CTV", "Mobile"],
    locations: ["National"],
    segment_ids: [1],
    targeting: { age_range: "25-44", interests: ["Family", "Home Care"] }
  },
  {
    id: "li_002",
    name: "Busy Households - Roku",
    budget: 40000,
    start_date: "2024-03-01",
    end_date: "2024-05-31",
    networks: ["Roku"],
    genres: ["Lifestyle", "News", "Entertainment"],
    devices: ["CTV"],
    locations: ["Urban Areas"],
    segment_ids: [2],
    targeting: { age_range: "35-54", interests: ["Efficiency", "Home"] }
  },
  {
    id: "li_003",
    name: "Value Shoppers - Samsung TV Plus",
    budget: 50000,
    start_date: "2024-03-01",
    end_date: "2024-05-31",
    networks: ["Samsung TV Plus"],
    genres: ["Lifestyle", "Reality", "Family"],
    devices: ["CTV", "Smart TV"],
    locations: ["Suburban"],
    segment_ids: [3],
    targeting: { age_range: "25-65", interests: ["Value", "Savings"] }
  },
  {
    id: "li_004",
    name: "Premium Households - Multi-Network",
    budget: 35000,
    start_date: "2024-03-15",
    end_date: "2024-05-15",
    networks: ["Hulu", "Roku"],
    genres: ["Premium Content", "Drama", "Documentary"],
    devices: ["CTV", "Tablet"],
    locations: ["Metropolitan"],
    segment_ids: [4],
    targeting: { age_range: "35-65", interests: ["Premium", "Quality"] }
  },
  {
    id: "li_005",
    name: "Eco-Conscious - Targeted Campaign",
    budget: 30000,
    start_date: "2024-03-01",
    end_date: "2024-04-30",
    networks: ["Hulu", "Samsung TV Plus"],
    genres: ["Documentary", "Lifestyle", "Health"],
    devices: ["CTV", "Mobile", "Tablet"],
    locations: ["National"],
    segment_ids: [5],
    targeting: { age_range: "25-45", interests: ["Environment", "Sustainability"] }
  },
  {
    id: "li_006",
    name: "Young Professionals - Digital Focus",
    budget: 50000,
    start_date: "2024-03-01",
    end_date: "2024-05-31",
    networks: ["Hulu", "Roku"],
    genres: ["Comedy", "Drama", "Sports"],
    devices: ["Mobile", "CTV", "Desktop"],
    locations: ["Urban Areas"],
    segment_ids: [6],
    targeting: { age_range: "22-35", interests: ["Career", "Convenience"] }
  }
];

const mockCampaignPlan: CampaignPlan = {
  plan: {
    campaign: mockCampaignSpec,
    line_items: mockLineItems,
    total_budget_allocated: 250000,
    summary: {
      total_line_items: 6,
      total_reach: 11250000,
      avg_cpm: 8.50,
      total_impressions: 29411765,
      campaign_duration: "12 weeks",
      primary_networks: ["Hulu", "Roku", "Samsung TV Plus"],
      target_demographics: ["Adults 25-54", "Families", "Working Professionals"]
    }
  },
  csvUrl: "/mock-campaign-export.csv",
  summary: {
    performance_forecast: {
      estimated_reach: 11250000,
      estimated_impressions: 29411765,
      estimated_ctr: 0.65,
      estimated_completion_rate: 0.78
    },
    budget_allocation: {
      hulu: 125000,
      roku: 75000,
      samsung_tv_plus: 50000
    },
    audience_breakdown: {
      working_parents: 22.5,
      busy_households: 18.0,
      value_shoppers: 25.0,
      premium_households: 12.0,
      eco_conscious: 10.5,
      young_professionals: 12.0
    }
  }
};

// Mock API functions that return promises with sample data
const mockApiDelay = (ms: number = 1000) => new Promise(resolve => setTimeout(resolve, ms));

const mockParseCampaign = async (file: File) => {
  await mockApiDelay(1500);
  return { data: mockCampaignSpec };
};

const mockFetchPrefs = async (advId: string) => {
  await mockApiDelay(800);
  return {
    data: {
      advertiser_id: advId,
      preferences: {
        preferred_networks: ["Hulu", "Roku", "Samsung TV Plus"],
        target_demographics: ["Adults 25-54", "Families with children"],
        content_categories: ["Lifestyle", "Family", "Home & Garden"],
        budget_allocation: {
          hulu: 0.45,
          roku: 0.35,
          samsung_tv_plus: 0.20
        },
        geographic_focus: ["National", "Urban", "Suburban"],
        device_preferences: ["CTV", "Mobile", "Tablet"]
      }
    }
  };
};

const mockFetchSegments = async () => {
  await mockApiDelay(600);
  return { data: { segments: mockSegments } };
};

const mockGeneratePlan = async (spec: CampaignSpec) => {
  await mockApiDelay(2000);
  return { data: mockCampaignPlan };
};

const mockCheckHealth = async () => {
  await mockApiDelay(200);
  return { data: { status: "healthy", mode: "demo", timestamp: new Date().toISOString() } };
};

// API functions with mock fallback
export const parseCampaign = (file: File) => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - parseCampaign');
    return mockParseCampaign(file);
  }
  const form = new FormData();
  form.append('file', file);
  return api.post<CampaignSpec>('/parse', form, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const fetchPrefs = (advId: string) => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - fetchPrefs');
    return mockFetchPrefs(advId);
  }
  return api.get(`/preferences/${advId}`);
};

export const fetchSegments = () => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - fetchSegments');
    return mockFetchSegments();
  }
  return api.get<{ segments: Segment[] }>('/segments');
};

export const generatePlan = (spec: CampaignSpec) => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - generatePlan');
    return mockGeneratePlan(spec);
  }
  return api.post<CampaignPlan>('/plan', spec);
};

export const checkHealth = () => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - checkHealth');
    return mockCheckHealth();
  }
  return api.get('/health');
};

// Chat API interfaces
export interface ChatMessage {
  message: string;
}

export interface ChatResponse {
  response: string;
  status: string;
  type: string;
  workflow_triggered: boolean;
  workflow_result?: {
    step: string;
    action: string;
    data: any;
    progress: number;
    current_step: string;
  };
  campaign_params?: any;
  intent?: string;
  suggest_workflow?: boolean;
  error?: string;
}

// Mock chat responses for demo
const mockChatResponses = [
  "I'd be happy to help you create a campaign! I have access to historical data from thousands of advertisers in our database. What type of campaign are you looking to build?",
  "I can help you with audience targeting using our advanced segmentation tools. What demographics or behaviors are you looking to target?",
  "Let me help you plan that campaign. I'll analyze the requirements and create a comprehensive media plan with optimized targeting and budget allocation.",
  "I can provide detailed forecasting for your campaign including reach estimates, performance projections, and budget optimization recommendations."
];

const mockChatApi = async (message: string) => {
  await mockApiDelay(1000);
  
  // Simple intent detection for demo
  if (message.toLowerCase().includes('campaign') || message.toLowerCase().includes('plan')) {
    return {
      data: {
        response: "Perfect! I'll help you create that campaign. Let me analyze the requirements and start building your comprehensive media plan...",
        status: "success",
        type: "workflow_trigger",
        workflow_triggered: true,
        workflow_result: {
          step: "campaign_data",
          action: "Campaign parsing complete",
          data: { advertiser: "Sample Brand", budget: 250000 },
          progress: 20,
          current_step: "campaign_data"
        },
        campaign_params: { advertiser: "Sample Brand", budget: 250000, objective: "awareness" },
        intent: "setup_campaign"
      }
    };
  }
  
  const randomResponse = mockChatResponses[Math.floor(Math.random() * mockChatResponses.length)];
  return {
    data: {
      response: randomResponse,
      status: "success",
      type: "conversation",
      workflow_triggered: false,
      intent: "general_conversation"
    }
  };
};

// Chat API functions
export const sendChatMessage = (message: string) => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - sendChatMessage');
    return mockChatApi(message);
  }
  return api.post<ChatResponse>('/chat', { message });
};

export const resetChat = () => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - resetChat');
    return Promise.resolve({ data: { message: "Conversation reset successfully", status: "success" } });
  }
  return api.post('/chat/reset');
};

export const getChatSummary = () => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - getChatSummary');
    return Promise.resolve({
      data: {
        conversation_summary: "User: Hello | Peggy: Hi! I'm here to help with campaign planning",
        workflow_status: { current_step: "campaign_data", progress: 0 },
        status: "success"
      }
    });
  }
  return api.get('/chat/summary');
};

export const continueWorkflow = () => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - continueWorkflow');
    return Promise.resolve({
      data: {
        message: "Advanced to advertiser_preferences",
        workflow_result: {
          step: "advertiser_preferences",
          action: "Advertiser analysis complete",
          data: {},
          progress: 40,
          current_step: "advertiser_preferences"
        },
        status: "success"
      }
    });
  }
  return api.post('/chat/workflow-continue');
};

// Agent API functions
export const resetAgent = () => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - resetAgent');
    return Promise.resolve({
      data: {
        message: "Agent reset successfully",
        status: "success",
        current_step: "campaign_data",
        progress: 0
      }
    });
  }
  return api.post('/agent/reset');
};

export const getAgentStatus = () => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - getAgentStatus');
    return Promise.resolve({
      data: {
        current_step: "campaign_data",
        progress: 0,
        avatar_state: "idle",
        status: "success"
      }
    });
  }
  return api.get('/agent/status');
};

export const getAdvertisers = (limit: number = 100) => {
  if (shouldUseMockData()) {
    console.log('🎭 Using mock data for demo - getAdvertisers');
    return Promise.resolve({
      data: {
        advertisers: [
          { advertiser_id: 'nike', brand: 'Nike', domain: 'nike.com' },
          { advertiser_id: 'adidas', brand: 'Adidas', domain: 'adidas.com' },
          { advertiser_id: 'coca_cola', brand: 'Coca Cola', domain: 'coca-cola.com' },
          { advertiser_id: 'pepsi', brand: 'Pepsi', domain: 'pepsi.com' },
          { advertiser_id: 'mcdonalds', brand: 'McDonalds', domain: 'mcdonalds.com' }
        ],
        total_count: 5
      }
    });
  }
  return api.get(`/vector/advertisers?limit=${limit}`);
};

export default api; 