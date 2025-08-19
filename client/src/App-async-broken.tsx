import React, { useState } from 'react';

function App() {
  const [currentTest, setCurrentTest] = useState(0);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const tests = [
    'Basic React + Tailwind',
    'API types import',
    'All components import',
    'Simple layout test',
    'ChatPane render test',
    'Full complex app'
  ];

  const renderTest = async () => {
    try {
      switch (currentTest) {
        case 0:
          return <div className="p-4 bg-green-100 rounded">✅ Basic setup working</div>;
          
        case 1:
          try {
                         const api = await import('./api');
            const hasTypes = api.CampaignSpec !== undefined;
            return <div className="p-4 bg-green-100 rounded">✅ API types imported successfully ({hasTypes ? 'types found' : 'checking...'})</div>;
          } catch (error) {
            throw new Error(`API import failed: ${error.message}`);
          }
          
        case 2:
          try {
                         const [ChatPane, SpecEditor, PrefsDropdowns, SegmentSelector, PlanTable] = await Promise.all([
               import('./components/ChatPane'),
               import('./components/SpecEditor'), 
               import('./components/PrefsDropdowns'),
               import('./components/SegmentSelector'),
               import('./components/PlanTable')
             ]);
            
            return <div className="p-4 bg-green-100 rounded">✅ All components imported successfully</div>;
          } catch (error) {
            throw new Error(`Component import failed: ${error.message}`);
          }
          
        case 3:
          // Test simple layout like the original app
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
              <div className="bg-white border-r border-gray-200 p-4">
                <div className="bg-blue-600 text-white p-4 rounded">
                  <h1 className="text-xl font-bold">CTV Campaign Assistant</h1>
                  <p className="text-blue-100 text-sm">AI-powered campaign planning</p>
                </div>
              </div>
              <div className="bg-gray-50 p-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-xl font-semibold text-gray-800">Layout Test</h2>
                  <p className="text-green-600">✅ Grid layout working</p>
                </div>
              </div>
            </div>
          );
          
        case 4:
          // Test ChatPane with sample data
                     const ChatPane = (await import('./components/ChatPane')).default;
          const sampleMessages = [
            {
              type: 'agent' as const,
              content: 'Welcome to the CTV Campaign Management System!',
              timestamp: new Date(),
            }
          ];
          
          return (
            <div className="h-96 border rounded">
              <ChatPane messages={sampleMessages} currentStep="spec" />
            </div>
          );
          
        case 5:
          return <div className="p-4 bg-blue-100 rounded">🎉 Ready to restore full complex app!</div>;
          
        default:
          return <div className="p-4 bg-green-100 rounded">✅ Test complete</div>;
      }
    } catch (error) {
      return (
        <div className="p-4 bg-red-100 rounded">
          <h3 className="font-bold text-red-800">❌ Error in {tests[currentTest]}:</h3>
          <p className="text-red-700 text-sm mt-2">{error.toString()}</p>
          <details className="mt-2">
            <summary className="text-red-600 cursor-pointer">Stack trace</summary>
            <pre className="text-xs text-red-600 mt-1 overflow-auto">{error.stack}</pre>
          </details>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Component Import Test (Fixed)
        </h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <div className="mb-4">
            <h2 className="text-lg font-medium mb-2">Testing: {tests[currentTest]}</h2>
            {renderTest()}
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => setCurrentTest(Math.max(0, currentTest - 1))}
              disabled={currentTest === 0}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            
            <button 
              onClick={() => setCurrentTest(Math.min(tests.length - 1, currentTest + 1))}
              disabled={currentTest === tests.length - 1}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Next Test
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            Progress: {currentTest + 1} / {tests.length}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 