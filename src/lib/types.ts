
export interface OptimizationHistoryItem {
  id: number;
  timestamp: string;
  query: string;
  optimizedQuery: string;
  analysis: string;
  feedback?: 'helpful' | 'not_helpful' | null;
}

export interface QueryFeedback {
  id: number;
  feedback: 'helpful' | 'not_helpful';
}
