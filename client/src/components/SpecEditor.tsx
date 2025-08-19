import React, { useState } from 'react';
import { parseCampaign } from '../api';
import type { CampaignSpec } from '../api';

interface SpecEditorProps {
  onComplete: (spec: CampaignSpec) => void;
  onMessage: (type: 'user' | 'agent', content: string) => void;
}

const SpecEditor: React.FC<SpecEditorProps> = ({ onComplete, onMessage }) => {
  const [, setFile] = useState<File | null>(null);
  const [parsedSpec, setParsedSpec] = useState<CampaignSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    onMessage('user', `Uploaded file: ${uploadedFile.name}`);

    try {
      const response = await parseCampaign(uploadedFile);
      setParsedSpec(response.data);
      onMessage('agent', 'File parsed successfully! Review the campaign specification below.');
    } catch (error) {
      onMessage('agent', 'Error parsing file. Please check the format and try again.');
      console.error('Parse error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextParse = async () => {
    if (!textInput.trim()) return;

    setLoading(true);
    onMessage('user', 'Submitted campaign brief text');

    // Create a blob from text for parsing
    const blob = new Blob([textInput], { type: 'text/plain' });
    const file = new File([blob], 'campaign-brief.txt', { type: 'text/plain' });

    try {
      const response = await parseCampaign(file);
      setParsedSpec(response.data);
      onMessage('agent', 'Text parsed successfully! Review the campaign specification below.');
    } catch (error) {
      onMessage('agent', 'Error parsing text. Please try again.');
      console.error('Parse error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpecUpdate = (field: keyof CampaignSpec, value: any) => {
    if (!parsedSpec) return;
    setParsedSpec({ ...parsedSpec, [field]: value });
  };

  const handleContinue = () => {
    if (parsedSpec) {
      onComplete(parsedSpec);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Campaign Specification</h2>
        
        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Campaign Brief
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span>Upload a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileUpload} accept=".txt,.doc,.docx,.pdf" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">TXT, DOC, PDF up to 10MB</p>
            </div>
          </div>
        </div>

        {/* Text Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Or paste campaign brief text
          </label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="Paste your campaign brief here..."
          />
          <button
            onClick={handleTextParse}
            disabled={!textInput.trim() || loading}
            className="neural-btn neural-btn-primary mt-2"
          >
            {loading ? 'Parsing...' : 'Parse Text'}
          </button>
        </div>

        {/* Parsed Specification */}
        {parsedSpec && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Review Campaign Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                <input
                  type="text"
                  value={parsedSpec.name}
                  onChange={(e) => handleSpecUpdate('name', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget</label>
                <input
                  type="number"
                  value={parsedSpec.total_budget}
                  onChange={(e) => handleSpecUpdate('total_budget', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={parsedSpec.start_date.split('T')[0]}
                  onChange={(e) => handleSpecUpdate('start_date', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={parsedSpec.end_date.split('T')[0]}
                  onChange={(e) => handleSpecUpdate('end_date', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Objective</label>
              <select
                value={parsedSpec.objective}
                onChange={(e) => handleSpecUpdate('objective', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Awareness">Awareness</option>
                <option value="Consideration">Consideration</option>
                <option value="Conversion">Conversion</option>
                <option value="Retention">Retention</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={parsedSpec.description || ''}
                onChange={(e) => handleSpecUpdate('description', e.target.value)}
                className="w-full h-20 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Campaign description..."
              />
            </div>
            
            <button
              onClick={handleContinue}
              className="neural-btn neural-btn-success w-full font-medium"
            >
              Continue to Preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpecEditor; 