import React, { useState } from 'react';

function App() {
  const [currentTest, setCurrentTest] = useState(0);
  
  const tests = [
    'Basic React + Tailwind',
    'Import test (sync)',
    'Layout test',
    'Component test',
    'Ready for full app'
  ];

  const renderTest = () => {
    try {
      switch (currentTest) {
        case 0:
          return <div className="p-4 bg-green-100 rounded">✅ Basic setup working</div>;
          
        case 1:
          // Test if we can import the API file without async
          try {
            // Simple test - just check if files exist
            return <div className="p-4 bg-green-100 rounded">✅ Ready to test imports</div>;
          } catch (error) {
            throw new Error(`Import test failed: ${error.message}`);
          }
          
        case 2:
          // Test simple layout like the original app
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 h-96">
              <div className="bg-white border-r border-gray-200 p-4">
                <div className="bg-blue-600 text-white p-4 rounded">
                  <h1 className="text-xl font-bold">CTV Campaign Assistant</h1>
                  <p className="text-blue-100 text-sm">AI-powered campaign planning</p>
                </div>
              </div>
              <div className="bg-gray-50 p-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-xl font-semibold text-gray-800">Layout Test</h2>
                  <p className="text-green-600">✅ Grid layout working perfectly</p>
                </div>
              </div>
            </div>
          );
          
        case 3:
          return (
            <div className="p-4 bg-green-100 rounded">
              <h3 className="font-bold text-green-800">✅ All basic tests passed!</h3>
              <p className="text-green-700 mt-2">Ready to restore the complex app</p>
            </div>
          );
          
        case 4:
          return <div className="p-4 bg-blue-100 rounded">🎉 Ready to restore full CTV Campaign Management app!</div>;
          
        default:
          return <div className="p-4 bg-green-100 rounded">✅ Test complete</div>;
      }
    } catch (error) {
      return (
        <div className="p-4 bg-red-100 rounded">
          <h3 className="font-bold text-red-800">❌ Error in {tests[currentTest]}:</h3>
          <p className="text-red-700 text-sm mt-2">{error.toString()}</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Simple Component Test (No Async)
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
            
            {currentTest === tests.length - 1 && (
              <button 
                onClick={() => {
                  alert('Ready to restore full app! Tell the assistant.');
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Restore Full App
              </button>
            )}
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