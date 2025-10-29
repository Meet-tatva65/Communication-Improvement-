import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsCard, ComparisonResultsCard } from './components/ResultsCard';
import { AnalysisResult, ComparisonResult } from './types';
import { analyzeAudio, generateComparisonReport } from './services/geminiService';

type AppState = 'idle' | 'loading' | 'success' | 'error';
type ActiveTab = 'analyze' | 'compare';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyze');
  const [appState, setAppState] = useState<AppState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('Analyzing... This may take a few moments.');

  // State for single analysis
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // State for comparison analysis
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [oldAnalysisResult, setOldAnalysisResult] = useState<AnalysisResult | null>(null);
  const [newAnalysisResult, setNewAnalysisResult] = useState<AnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  const handleSingleFile = async (file: File) => {
    setAppState('loading');
    setError(null);
    setAnalysisResult(null);
    setLoadingMessage('Analyzing... This may take a few moments.');
    try {
      const result = await analyzeAudio(file);
      setAnalysisResult(result);
      setAppState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
      setAppState('error');
    }
  };
  
  const handleComparisonFiles = async () => {
    if (!oldFile || !newFile) return;
    setAppState('loading');
    setError(null);
    setComparisonResult(null);
    setOldAnalysisResult(null);
    setNewAnalysisResult(null);

    try {
        setLoadingMessage('Analyzing older audio... (step 1 of 3)');
        const oldResult = await analyzeAudio(oldFile);
        setOldAnalysisResult(oldResult);

        setLoadingMessage('Analyzing newer audio... (step 2 of 3)');
        const newResult = await analyzeAudio(newFile);
        setNewAnalysisResult(newResult);

        setLoadingMessage('Comparing results... (step 3 of 3)');
        const comparison = await generateComparisonReport(oldResult, newResult);
        setComparisonResult(comparison);
        
        setAppState('success');
    } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
        setAppState('error');
    }
  };

  const handleReset = () => {
    setAppState('idle');
    setError(null);
    setAnalysisResult(null);
    setComparisonResult(null);
    setOldFile(null);
    setNewFile(null);
    setOldAnalysisResult(null);
    setNewAnalysisResult(null);
  };

  const renderContent = () => {
    // Fix: Hoist loading state check to a variable to avoid TypeScript control-flow analysis errors.
    const isLoading = appState === 'loading';

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-400"></div>
            <p className="text-lg text-gray-400">{loadingMessage}</p>
        </div>
      );
    }

    if (appState === 'error') {
      return (
        <div className="w-full max-w-lg p-6 bg-red-900/30 border border-red-700 rounded-lg text-center">
          <p className="text-xl font-semibold text-red-400">An Error Occurred</p>
          <p className="text-red-300 mt-2">{error}</p>
          <button 
            onClick={handleReset} 
            className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (appState === 'success') {
      if (activeTab === 'analyze' && analysisResult) {
        return <div className="flex flex-col items-center w-full">
            <ResultsCard result={analysisResult} />
            <button 
                onClick={handleReset} 
                className="mt-8 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
            >
                Analyze Another Audio
            </button>
        </div>;
      }
      if (activeTab === 'compare' && comparisonResult && oldAnalysisResult && newAnalysisResult) {
        return <ComparisonResultsCard 
            comparison={comparisonResult}
            oldResult={oldAnalysisResult}
            newResult={newAnalysisResult}
            onReset={handleReset} 
        />;
      }
    }
    
    // Idle state
    if (activeTab === 'analyze') {
      // Fix: Use the isLoading boolean constant.
      return <FileUpload onFileSelect={handleSingleFile} disabled={isLoading} />;
    }

    if (activeTab === 'compare') {
      return (
        <div className='w-full max-w-4xl space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                    <h3 className='text-center text-lg font-semibold mb-2 text-gray-400'>Older Audio</h3>
                    {/* Fix: Use the isLoading boolean constant. */}
                    <FileUpload onFileSelect={setOldFile} disabled={isLoading} />
                    {oldFile && <p className='text-center mt-2 text-indigo-400 truncate'>{oldFile.name}</p>}
                </div>
                <div>
                    <h3 className='text-center text-lg font-semibold mb-2 text-gray-400'>Newer Audio</h3>
                    {/* Fix: Use the isLoading boolean constant. */}
                    <FileUpload onFileSelect={setNewFile} disabled={isLoading} />
                    {newFile && <p className='text-center mt-2 text-indigo-400 truncate'>{newFile.name}</p>}
                </div>
            </div>
            <div className='text-center'>
                 <button 
                    onClick={handleComparisonFiles} 
                    // Fix: Use the isLoading boolean constant.
                    disabled={!oldFile || !newFile || isLoading}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    Compare Performance
                </button>
            </div>
        </div>
      );
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center p-4 sm:p-8">
      <header className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-white">Rate<span className="text-indigo-400">My</span>Speak</h1>
        <p className="text-base sm:text-lg text-gray-400">
          Get AI-powered feedback on your communication skills.
        </p>
      </header>
      
      {/* Tabs */}
       <div className="mb-8 flex justify-center p-1 bg-gray-800 rounded-lg">
        <button 
            onClick={() => { handleReset(); setActiveTab('analyze'); }} 
            disabled={appState === 'loading'}
            className={`px-4 sm:px-6 py-2 rounded-md transition-colors ${activeTab === 'analyze' ? 'bg-indigo-600' : 'hover:bg-gray-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Analyze Performance
        </button>
        <button 
            onClick={() => { handleReset(); setActiveTab('compare'); }} 
            disabled={appState === 'loading'}
            className={`px-4 sm:px-6 py-2 rounded-md transition-colors ${activeTab === 'compare' ? 'bg-indigo-600' : 'hover:bg-gray-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Track Improvement
        </button>
      </div>

      <main className="w-full flex-grow flex flex-col items-center justify-center">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
