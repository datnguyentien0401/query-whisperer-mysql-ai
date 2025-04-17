
export interface OptimizationHistoryItem {
  id: number;
  timestamp: string;
  query: string;
  optimizedQuery: string;
  analysis: string;
  feedback?: 'helpful' | 'not_helpful' | null;
  source?: 'openai' | 'history';
}

export interface QueryFeedback {
  id: number;
  feedback: 'helpful' | 'not_helpful';
}

export interface QueryRequest {
  sqlQuery: string;
  tableStructure?: any;
  existingIndexes?: any;
  performanceIssue?: string;
  explainResults?: any;
  serverInfo?: any;
  databaseEngine?: string;
  databaseVersion?: string;
  databaseSize?: number;
}

export interface OptimizationResult {
  result_id: number;
  request_id: number;
  created_at: string;
  optimized_query: string;
  optimization_explanation: string;
  suggested_indexes: any[];
  suggested_schema_changes: any[];
  suggested_server_configs: any[];
  estimated_improvement: number;
  tokens_used: number;
  model_used: string;
  original_query?: string;
  similarity_score?: number;
}

export interface QueryVector {
  vector_id: number;
  request_id: number;
  embedding: number[];
  created_at: string;
}

export interface SimilarQuery {
  id: number;
  request_id: number;
  similar_request_id: number;
  similarity_score: number;
  similarity_type: string;
}
