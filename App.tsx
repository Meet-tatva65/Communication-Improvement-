import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsCard } from './components/ResultsCard';
import { analyzeAudio } from './services/geminiService';
import { AnalysisResult } from './types';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setError(null);
  }, []);

  const handleAnalyzeClick = async () => {
    if (!file) {
      setError("Please select an audio file first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysisResult = await analyzeAudio(file);
      setResult(analysisResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400 mx-auto"></div>
            <h2 className="text-2xl font-semibold mt-4">Analyzing Audio...</h2>
            <p className="text-gray-400 mt-2">This may take a few moments. We're running a deep analysis.</p>
        </div>
      );
    }

    if (error) {
        return (
            <div className="text-center bg-red-900/20 border border-red-500 p-6 rounded-lg max-w-2xl">
                <h2 className="text-2xl font-semibold text-red-400">An Error Occurred</h2>
                <p className="text-gray-300 mt-2 mx-auto">{error}</p>
                <button
                  onClick={handleReset}
                  className="mt-6 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
                >
                  Try Again
                </button>
            </div>
        );
    }

    if (result) {
        return (
            <div className="w-full flex flex-col items-center">
              <ResultsCard result={result} />
              <button
                onClick={handleReset}
                className="mt-8 px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition-colors"
              >
                Analyze Another File
              </button>
            </div>
        )
    }

    return (
      <div className="w-full flex flex-col items-center gap-6">
        <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} />
        {file && (
            <div className="text-center animate-fade-in">
                <p className="text-gray-300">Selected file: <span className="font-semibold text-indigo-300">{file.name}</span></p>
                <button 
                  onClick={handleAnalyzeClick}
                  disabled={isLoading}
                  className="mt-4 px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  Analyze Performance
                </button>
            </div>
        )}
      </div>
    );
  };
  
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gray-900 text-white">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Rate<span className="text-indigo-400">My</span>Speak
        </h1>
        <p className="text-lg text-gray-400 mt-3 max-w-2xl mx-auto">
          Upload a conversation audio to get AI-powered feedback on your communication skills.
        </p>
      </div>

      <div className="w-full max-w-6xl flex flex-col items-center justify-center">
        {renderContent()}
      </div>
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </main>
  );
}