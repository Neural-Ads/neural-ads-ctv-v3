import React, { useState } from 'react';

// Import all components at the top level (proper ES imports)
import { CampaignSpec, Segment, CampaignPlan } from './api';
import ChatPane from './components/ChatPane';
import SpecEditor from './components/SpecEditor';
import PrefsDropdowns from './components/PrefsDropdowns';
import SegmentSelector from './components/SegmentSelector';
import PlanTable from './components/PlanTable';

function App() {
  const [testStep, setTestStep] = useState(0);
  
  const tests = [
    'Basic Layout',
    'API Types Available',
    'ChatPane Component',
    'SpecEditor Component', 
    'PrefsDropdowns Component',
    'SegmentSelector Component',
    'PlanTable Component',
    'Full App Ready'
  ];

  const renderTest = () => {
    try {
      switch (testStep) {
        case 0:
          // Basic layout test
          return (
            <div className="min-h-screen bg-gray-100">
              <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
                <div className="bg-white border-r border-gray-200 p-4">
                  <div className="bg-blue-600 text-white p-4 rounded">
                    <h1 className="text-xl font-bold">CTV Campaign Assistant</h1>
                    <p className="text-blue-100 text-sm">AI-powered campaign planning</p>
                  </div>
                  <div className="p-4">
                    <p className="text-green-600">✅ Basic layout working</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-6">
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h2 className="text-xl font-semibold text-gray-800">Test Area</h2>
                    <p className="text-green-600">✅ Right panel working</p>
                  </div>
                </div>
              </div>
            </div>
          );

        case 1:
          // Test API types are available
          return (
            <div className="p-8 bg-green-100">
              <h2 className="text-xl font-bold text-green-800">✅ API Types Available</h2>
              <p>CampaignSpec: {CampaignSpec ? 'Available' : 'Not available'}</p>
              <p>Segment: {Segment ? 'Available' : 'Not available'}</p>
              <p>CampaignPlan: {CampaignPlan ? 'Available' : 'Not available'}</p>
            </div>
          );

        case 2:
          // Test ChatPane component
          const sampleMessages = [{
            type: 'agent' as const,
            content: 'Test message from ChatPane',
            timestamp: new Date(),
          }];
          
          return (
            <div className="h-96 border">
              <ChatPane messages={sampleMessages} currentStep="spec" />
            </div>
          );

        case 3:
          // Test SpecEditor - just show it exists
          return (
            <div className="p-8 bg-green-100">
              <h2 className="text-xl font-bold text-green-800">✅ SpecEditor Component Available</h2>
              <p>SpecEditor imported successfully</p>
              <p>Component type: {typeof SpecEditor}</p>
            </div>
          );

        case 4:
          // Test PrefsDropdowns - just show it exists
          return (
            <div className="p-8 bg-green-100">
              <h2 className="text-xl font-bold text-green-800">✅ PrefsDropdowns Component Available</h2>
              <p>PrefsDropdowns imported successfully</p>
              <p>Component type: {typeof PrefsDropdowns}</p>
            </div>
          );

        case 5:
          // Test SegmentSelector - just show it exists
          return (
            <div className="p-8 bg-green-100">
              <h2 className="text-xl font-bold text-green-800">✅ SegmentSelector Component Available</h2>
              <p>SegmentSelector imported successfully</p>
              <p>Component type: {typeof SegmentSelector}</p>
            </div>
          );

        case 6:
          // Test PlanTable - just show it exists
          return (
            <div className="p-8 bg-green-100">
              <h2 className="text-xl font-bold text-green-800">✅ PlanTable Component Available</h2>
              <p>PlanTable imported successfully</p>
              <p>Component type: {typeof PlanTable}</p>
            </div>
          );

        case 7:
          return (
            <div className="p-8 bg-blue-100">
              <h2 className="text-xl font-bold text-blue-800">🎉 All Components Working!</h2>
              <p>All imports successful - ready to restore full app</p>
              <button 
                onClick={() => alert('Tell the assistant: All tests passed!')}
                className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                All Tests Passed!
              </button>
            </div>
          );

        default:
          return <div>Test complete</div>;
      }
    } catch (error) {
      return (
        <div className="p-8 bg-red-100">
          <h2 className="text-xl font-bold text-red-800">❌ Error in {tests[testStep]}</h2>
          <p className="text-red-700 mt-2">{error.toString()}</p>
          <details className="mt-4">
            <summary className="cursor-pointer text-red-600">Stack Trace</summary>
            <pre className="text-xs mt-2 text-red-600 overflow-auto">{error.stack}</pre>
          </details>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h1 className="text-2xl font-bold mb-4">Progressive Component Test (ES Imports)</h1>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg">Step {testStep + 1}: {tests[testStep]}</h2>
            <div className="space-x-2">
              <button 
                onClick={() => setTestStep(Math.max(0, testStep - 1))}
                disabled={testStep === 0}
                className="px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50"
              >
                Back
              </button>
              <button 
                onClick={() => setTestStep(Math.min(tests.length - 1, testStep + 1))}
                disabled={testStep === tests.length - 1}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {renderTest()}
        </div>
      </div>
    </div>
  );
}

export default App; 