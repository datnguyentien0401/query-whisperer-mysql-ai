
// Frontend API client for the Python backend

import { OptimizationHistoryItem, QueryFeedback, QueryRequest } from "./types";

export interface OptimizationRequest {
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

export interface OptimizationResponse {
  originalQuery: string;
  optimizedQuery: string;
  analysis: string;
  performanceImprovement: string;
  indexSuggestions: string[];
  structureSuggestions: string[];
  serverSuggestions: string[];
  id: number;
  source?: 'openai' | 'history';
  tokensUsed?: number;
  modelUsed?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Call the backend API to optimize a query
 */
export async function optimizeQuery(data: OptimizationRequest): Promise<OptimizationResponse> {
  try {
    console.log("Sending optimization request to backend:", data);
    
    // Make the actual API call
    const response = await fetch(`${API_BASE_URL}/api/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error optimizing query:", error);
    throw new Error("Failed to optimize query");
  }
}

/**
 * Submit feedback for an optimization result
 */
export async function submitFeedback(id: number, feedback: 'helpful' | 'not_helpful'): Promise<void> {
  try {
    console.log(`Submitting feedback for optimization #${id}:`, feedback);
    
    // Make the actual API call
    const response = await fetch(`${API_BASE_URL}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, feedback }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }
    
    // Update the local history if we're using local storage in dev mode
    updateLocalHistory(id, feedback);
  } catch (error) {
    console.error("Error submitting feedback:", error);
    throw new Error("Failed to submit feedback");
  }
}

/**
 * Update the local history in localStorage (for development mode)
 */
function updateLocalHistory(id: number, feedback: 'helpful' | 'not_helpful'): void {
  try {
    const historyStr = localStorage.getItem("queryHistory");
    if (historyStr) {
      const history = JSON.parse(historyStr);
      
      const updatedHistory = history.map((item: any) => {
        if (item.id === id) {
          return { ...item, feedback };
        }
        return item;
      });
      
      localStorage.setItem("queryHistory", JSON.stringify(updatedHistory));
    }
  } catch (error) {
    console.warn("Error updating local history:", error);
    // Non-critical error, we can ignore it
  }
}

// Add other API functions as needed
