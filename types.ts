export interface Mistake {
  incorrectPhrase: string;
  suggestion: string;
  explanation: string;
}

export interface ConversationTurn {
  speaker: 'User' | 'AI';
  text: string;
  mistake?: Mistake;
}

export interface Dimension {
  name: string;
  score: number;
}

export interface FillerWord {
  word: string;
  count: number;
}

export interface AnalysisResult {
  overallScore: number;
  dimensions: Dimension[];
  feedback: string[];
  fillerWords: FillerWord[];
  conversation: ConversationTurn[];
}

// Types for improvement tracking
export interface DimensionChange {
  name: string;
  oldScore: number;
  newScore: number;
}

export interface ComparisonResult {
  dimensionChanges: DimensionChange[];
  improvementSummary: string[];
  areasForNextFocus: string[];
}
