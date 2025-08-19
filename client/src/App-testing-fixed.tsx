import React, { useState } from 'react';
import SpecEditor from './components/SpecEditor';

function App() {
  const [step, setStep] = useState(1);
  
  const handleComplete = (spec: any) => {
    console.log('Spec completed:', spec);
  };
  
  const handleMessage = (type: 'user' | 'agent', content: string) => {
    console.log(`${type}: ${content}`);
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#333' }}>✅ Testing Fixed SpecEditor</h1>
      <p>Step {step}: Testing SpecEditor with fixed TypeScript imports</p>
      <button 
        onClick={() => setStep(step + 1)}
        style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '20px' }}
      >
        Test Button (Step: {step})
      </button>
      
      <div style={{ border: '2px solid #ddd', borderRadius: '8px', backgroundColor: 'white' }}>
        <SpecEditor onComplete={handleComplete} onMessage={handleMessage} />
      </div>
    </div>
  );
}

export default App; 