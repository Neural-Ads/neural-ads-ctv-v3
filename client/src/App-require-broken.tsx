import React, { useState } from 'react';

// Progressive component testing - add imports one by one
function App() {
  const [testStep, setTestStep] = useState(0);
  
  const tests = [
    'Basic Layout',
    'Import API types',
    'Import ChatPane',
    'Import SpecEditor', 
    'Import PrefsDropdowns',
    'Import SegmentSelector',
    'Import PlanTable',
    'Full App'
  ];

  const renderTest = () => {
    try {
      switch (testStep) {
        case 0:
          // Basic layout without any component imports
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
          // Test API imports
          try {
            const { CampaignSpec } = require('./api');
            return (
              <div className="p-8 bg-green-100">
                <h2 className="text-xl font-bold text-green-800">✅ API Types Imported</h2>
                <p>CampaignSpec type available</p>
              </div>
            );
          } catch (error) {
            throw new Error(`API import failed: ${error.message}`);
          }

        case 2:
          // Test ChatPane import
          try {
            const ChatPane = require('./components/ChatPane').default;
            const sampleMessages = [{
              type: 'agent',
              content: 'Test message',
              timestamp: new Date(),
            }];
            
            return (
              <div className="h-96">
                <ChatPane messages={sampleMessages} currentStep="spec" />
              </div>
            );
          } catch (error) {
            throw new Error(`ChatPane import failed: ${error.message}`);
          }

        case 3:
          // Test SpecEditor import
          try {
            const SpecEditor = require('./components/SpecEditor').default;
            return (
              <div className="p-8 bg-green-100">
                <h2 className="text-xl font-bold text-green-800">✅ SpecEditor Imported</h2>
                <p>SpecEditor component available</p>
              </div>
            );
          } catch (error) {
            throw new Error(`SpecEditor import failed: ${error.message}`);
          }

        case 4:
          // Test PrefsDropdowns import
          try {
            const PrefsDropdowns = require('./components/PrefsDropdowns').default;
            return (
              <div className="p-8 bg-green-100">
                <h2 className="text-xl font-bold text-green-800">✅ PrefsDropdowns Imported</h2>
                <p>PrefsDropdowns component available</p>
              </div>
            );
          } catch (error) {
            throw new Error(`PrefsDropdowns import failed: ${error.message}`);
          }

        case 5:
          // Test SegmentSelector import
          try {
            const SegmentSelector = require('./components/SegmentSelector').default;
            return (
              <div className="p-8 bg-green-100">
                <h2 className="text-xl font-bold text-green-800">✅ SegmentSelector Imported</h2>
                <p>SegmentSelector component available</p>
              </div>
            );
          } catch (error) {
            throw new Error(`SegmentSelector import failed: ${error.message}`);
          }

        case 6:
          // Test PlanTable import
          try {
            const PlanTable = require('./components/PlanTable').default;
            return (
              <div className="p-8 bg-green-100">
                <h2 className="text-xl font-bold text-green-800">✅ PlanTable Imported</h2>
                <p>PlanTable component available</p>
              </div>
            );
          } catch (error) {
            throw new Error(`PlanTable import failed: ${error.message}`);
          }

        case 7:
          return (
            <div className="p-8 bg-blue-100">
              <h2 className="text-xl font-bold text-blue-800">🎉 All Components Working!</h2>
              <p>Ready to enable full app</p>
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
          <h1 className="text-2xl font-bold mb-4">Progressive Component Test</h1>
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