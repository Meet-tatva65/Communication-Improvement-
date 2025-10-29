import React from 'react';
import { AnalysisResult, ComparisonResult, ConversationTurn, Mistake } from '../types';
import { RatingDisplay } from './RatingDisplay';
import { DownloadIcon, RobotIcon, UserIcon } from './icons';

// Helper to generate the HTML report for export
const generateHtmlReport = (result: AnalysisResult): string => {
  const { overallScore, dimensions, feedback } = result;
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RateMySpeak Analysis Report</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-900 text-white font-sans p-8">
      <div class="max-w-4xl mx-auto">
        <header class="text-center mb-10">
          <h1 class="text-4xl font-bold text-indigo-400">RateMySpeak</h1>
          <p class="text-xl text-gray-400">Analysis Report</p>
        </header>
        <main>
          <div class="bg-gray-800 rounded-lg p-8 mb-8 text-center">
            <h2 class="text-lg font-semibold text-gray-400 mb-2">Overall Score</h2>
            <p class="text-7xl font-bold text-white">${overallScore.toFixed(2)}<span class="text-3xl text-gray-500">/5</span></p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="bg-gray-800 rounded-lg p-6">
              <h3 class="text-xl font-bold text-indigo-400 mb-4">Dimension Analysis</h3>
              <table class="w-full text-left">
                <tbody>
                  ${dimensions.map(d => `
                    <tr class="border-b border-gray-700">
                      <td class="py-2 text-gray-300">${d.name}</td>
                      <td class="py-2 text-right font-semibold text-white">${d.score.toFixed(1)}/5</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div class="bg-gray-800 rounded-lg p-6">
              <h3 class="text-xl font-bold text-indigo-400 mb-4">Areas for Improvement</h3>
              <ul class="list-disc list-inside space-y-2 text-gray-300">
                ${feedback.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
          </div>
        </main>
      </div>
    </body>
    </html>
  `;
};


const MistakeHighlighter: React.FC<{ turn: ConversationTurn }> = ({ turn }) => {
    if (!turn.mistake) return <span>{turn.text}</span>;

    const { text, mistake } = turn;
    const { incorrectPhrase, suggestion, explanation } = mistake;
    const parts = text.split(incorrectPhrase);
    
    return (
        <span>
            {parts[0]}
            <span className="relative group bg-red-900/50 text-red-300 rounded px-1 py-0.5 cursor-pointer">
                {incorrectPhrase}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-72 mb-2 p-3 bg-gray-900 border border-gray-700 rounded-lg text-sm text-left opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <p className="font-bold text-white">Suggestion:</p>
                    <p className="text-green-400 mb-2">"{suggestion}"</p>
                    <p className="font-bold text-white">Explanation:</p>
                    <p className="text-gray-400">{explanation}</p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-gray-700"></div>
                </div>
            </span>
            {parts[1]}
        </span>
    );
};


export const ResultsCard: React.FC<{ result: AnalysisResult, title?: string }> = ({ result, title = "Analysis Report" }) => {
  const handleExport = () => {
    const htmlContent = generateHtmlReport(result);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RateMySpeak-Report.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-indigo-400">{title}</h2>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors text-sm sm:text-base self-start sm:self-center">
          <DownloadIcon className="w-5 h-5" />
          Export Report
        </button>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dimensions */}
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
                <h3 className="text-xl font-bold text-indigo-400 mb-4">Dimension Analysis</h3>
                <div className="space-y-3">
                    {result.dimensions.map(dim => (
                        <div key={dim.name} className="flex justify-between items-center gap-2">
                            <span className="text-gray-300 text-sm sm:text-base">{dim.name}</span>
                            <div className='flex items-center gap-2 sm:gap-3'>
                                <span className="font-semibold text-base sm:text-lg">{dim.score.toFixed(1)}</span>
                                <RatingDisplay score={dim.score} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Feedback & Fillers */}
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-indigo-400 mb-4">Areas for Improvement</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm sm:text-base">
                        {result.feedback.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-indigo-400 mb-2">Filler Word Usage</h3>
                    <div className="flex flex-wrap gap-2">
                        {result.fillerWords.length > 0 ? result.fillerWords.map(fw => (
                            <span key={fw.word} className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs sm:text-sm">
                                {fw.word}: <span className="font-bold text-white">{fw.count}</span>
                            </span>
                        )) : <p className="text-gray-400 text-sm sm:text-base">No significant filler words detected.</p>}
                    </div>
                </div>
            </div>
        </div>
        {/* Overall Score */}
        <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center justify-center text-center">
            <h3 className="text-xl sm:text-2xl font-bold text-indigo-400 mb-2">Overall Score</h3>
            <p className="text-6xl sm:text-8xl font-bold text-white">{result.overallScore.toFixed(2)}<span className="text-3xl sm:text-4xl text-gray-500">/5</span></p>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">Context-weighted score</p>
        </div>
      </div>

      {/* Transcript */}
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
        <h3 className="text-xl font-bold text-indigo-400 mb-4">Conversation Transcript</h3>
        <div className="max-h-[500px] overflow-y-auto pr-2 sm:pr-4 space-y-6">
            {result.conversation.map((turn, i) => (
                <div key={i} className={`flex items-end gap-2 sm:gap-3 ${turn.speaker === 'User' ? 'justify-end' : ''}`}>
                    {turn.speaker === 'AI' && <RobotIcon className="w-8 h-8 flex-shrink-0 bg-gray-700 text-indigo-400 p-1.5 rounded-full"/>}
                    <div className={`w-fit max-w-[85%] sm:max-w-xl rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${turn.speaker === 'User' ? 'bg-indigo-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
                        <p className="text-white leading-relaxed text-sm sm:text-base"><MistakeHighlighter turn={turn} /></p>
                    </div>
                     {turn.speaker === 'User' && <UserIcon className="w-8 h-8 flex-shrink-0 bg-gray-700 text-gray-300 p-1.5 rounded-full"/>}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

interface ComparisonResultsCardProps {
    oldResult: AnalysisResult;
    newResult: AnalysisResult;
    comparison: ComparisonResult;
    onReset: () => void;
}

export const ComparisonResultsCard: React.FC<ComparisonResultsCardProps> = ({ oldResult, newResult, comparison, onReset }) => {
    const getScoreChangeClass = (oldScore: number, newScore: number) => {
        if (newScore > oldScore) return 'text-green-400';
        if (newScore < oldScore) return 'text-red-400';
        return 'text-gray-400';
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 text-white">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-indigo-400">Improvement Report</h2>
                <button onClick={onReset} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors text-sm sm:text-base self-start sm:self-center">
                    Analyze Again
                </button>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                <h3 className="text-xl font-bold text-indigo-400 mb-4">Dimension Progress</h3>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-left text-sm sm:text-base">
                        <thead>
                            <tr className="border-b border-gray-600">
                                <th className="p-2">Dimension</th>
                                <th className="p-2 text-center">Old Score</th>
                                <th className="p-2 text-center">New Score</th>
                                <th className="p-2 text-center">Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comparison.dimensionChanges.map(change => (
                                <tr key={change.name} className="border-b border-gray-700">
                                    <td className="p-2 font-semibold">{change.name}</td>
                                    <td className="p-2 text-center text-gray-400">{change.oldScore.toFixed(1)}</td>
                                    <td className="p-2 text-center font-bold">{change.newScore.toFixed(1)}</td>
                                    <td className={`p-2 text-center font-bold ${getScoreChangeClass(change.oldScore, change.newScore)}`}>
                                        {(change.newScore - change.oldScore).toFixed(1)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                    <h3 className="text-xl font-bold text-indigo-400 mb-4">Improvement Summary</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm sm:text-base">
                        {comparison.improvementSummary.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
                    <h3 className="text-xl font-bold text-indigo-400 mb-4">Areas for Next Focus</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm sm:text-base">
                        {comparison.areasForNextFocus.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-700">
                <h2 className="text-2xl sm:text-3xl font-bold text-center text-indigo-400 mb-8">Detailed Analysis Breakdown</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <ResultsCard result={oldResult} title="Older Recording" />
                    <ResultsCard result={newResult} title="Newer Recording" />
                </div>
            </div>
        </div>
    );
};