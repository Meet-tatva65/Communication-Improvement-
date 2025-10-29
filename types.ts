export interface Dimension {
  name: string;
  score: number;
}

export interface Mistake {
    incorrectPhrase: string;
    correction: string;
    explanation: string;
}

export interface ConversationTurn {
  speaker: 'User' | 'AI';
  text: string;
  mistakes?: Mistake[];
}

export interface FillerWordUsage {
  word: string;
  count: number;
}

export interface AnalysisResult {
  overallScore: number;
  dimensionAnalysis: Dimension[];
  feedback: string[];
  fillerWords: FillerWordUsage[];
  conversation: ConversationTurn[];
}
