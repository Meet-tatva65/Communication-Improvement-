import React from 'react';
import { AnalysisResult, Mistake } from '../types';
import { DownloadIcon } from './icons';

interface HighlightedTextProps {
  text: string;
  mistakes?: Mistake[];
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, mistakes }) => {
  if (!mistakes || mistakes.length === 0) {
    return <>{text}</>;
  }

  // Create a regex from all incorrect phrases, escaping special characters
  const regex = new RegExp(
    '(' + mistakes.map(m => m.incorrectPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
    'gi' // Use 'gi' for case-insensitive matching
  );

  const parts = text.split(regex).filter(part => part);

  return (
    <>
      {parts.map((part, index) => {
        const mistake = mistakes.find(m => m.incorrectPhrase.toLowerCase() === part.toLowerCase());
        if (mistake) {
          return (
            <span
              key={index}
              className="bg-red-500/30 px-1 rounded-sm relative group cursor-pointer"
            >
              {part}
              <span className="absolute bottom-full mb-2 w-72 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-gray-700">
                <strong className="text-red-400 block">Correction:</strong>
                <span className="text-green-400 block mb-1">"{mistake.correction}"</span>
                <strong className="text-red-400 block mt-2">Explanation:</strong>
                {mistake.explanation}
              </span>
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};

export const ResultsCard: React.FC<{ result: AnalysisResult }> = ({ result }) => {
  const handleExport = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = window.URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RateMySpeak_analysis.json';
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-6xl flex flex-col gap-8 animate-fade-in">
      {/* Header with Export Button */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-700">
        <h2 className="text-3xl font-bold text-gray-100">Analysis Report</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transition-colors"
        >
          <DownloadIcon className="w-5 h-5" />
          Export JSON
        </button>
      </div>

      {/* Top Section: Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column */}
        <div className="flex flex-col gap-8">
          <div className="bg-gray-800 p-8 rounded-xl flex flex-col items-center justify-center text-center shadow-lg">
            <h3 className="text-lg font-medium text-gray-300">Overall Score</h3>
            <p className="text-7xl font-bold text-white my-2">
              {result.overallScore.toFixed(2)}
              <span className="text-3xl text-gray-400">/5</span>
            </p>
            <p className="text-sm text-gray-500">Context-weighted score (avg. of 3 runs)</p>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">Dimension Analysis</h3>
            <div className="space-y-3">
                {result.dimensionAnalysis.map((dimension) => (
                    <div key={dimension.name} className="flex justify-between items-baseline">
                        <p className="text-gray-300">{dimension.name}</p>
                        <p className="font-bold text-lg text-white">
                            {dimension.score.toFixed(1)}<span className="text-sm text-gray-400">/5</span>
                        </p>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-8">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg flex-grow">
            <h3 className="text-xl font-semibold text-gray-200 mb-4">Actionable Feedback</h3>
            <ul className="list-disc list-inside space-y-3 text-gray-300 text-base">
              {result.feedback.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          {result.fillerWords.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-semibold text-gray-200 mb-4">Filler Word Usage</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {result.fillerWords.map((fw) => (
                  <div key={fw.word} className="bg-gray-700/50 py-1 px-3 rounded-full text-sm">
                    <span className="font-semibold text-indigo-300">{fw.word}</span>
                    <span className="text-gray-400 ml-2">{fw.count} times</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Conversation Transcript */}
      <div className="bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg flex flex-col w-full">
        <h3 className="text-xl font-semibold text-gray-200 mb-4">Conversation Transcript</h3>
        <div className="mt-2 space-y-4 max-h-[600px] overflow-y-auto pr-4 -mr-4">
          {result.conversation.map((turn, index) => (
            <div key={index} className={`flex flex-col ${turn.speaker === 'User' ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-lg px-4 py-2 max-w-[90%] shadow ${turn.speaker === 'User' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                <p className="text-xs font-bold mb-1 opacity-80">{turn.speaker}</p>
                <p className="text-base leading-relaxed">
                  {turn.speaker === 'User' ? <HighlightedText text={turn.text} mistakes={turn.mistakes} /> : turn.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};