import React, { useState } from 'react';

// Test step by step to find the issue
function App() {
  console.log('App component loaded');
  
  const [step, setStep] = useState(1);
  
  try {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            CTV Campaign Management - Debug Mode
          </h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <p className="text-green-600 font-medium">✅ React component is rendering</p>
            <p className="text-green-600 font-medium">✅ Tailwind CSS classes are working</p>
            <p className="text-green-600 font-medium">✅ State management is working</p>
            
            <div className="mt-4 space-y-2">
              <button 
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Test Button (Step: {step})
              </button>
              
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  If you can see this page with styled buttons and colors, 
                  the issue is likely with specific component imports.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-800">Next Steps:</h3>
            <ul className="mt-2 text-sm text-yellow-700 space-y-1">
              <li>• Check browser console (F12) for any red error messages</li>
              <li>• Look for component import issues</li>
              <li>• Test individual components one by one</li>
            </ul>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('App render error:', error);
    return (
      <div style={{ padding: '20px', backgroundColor: '#fee', color: 'red' }}>
        <h1>Error in App Component</h1>
        <p>Check browser console for details</p>
        <p>Error: {error.toString()}</p>
      </div>
    );
  }
}

export default App; 