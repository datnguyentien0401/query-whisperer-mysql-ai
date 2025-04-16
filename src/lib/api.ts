
// Frontend API client for the Python backend

export interface OptimizationRequest {
  sqlQuery: string;
  tableStructure?: string;
  existingIndexes?: string;
  performanceIssue?: string;
  explainResults?: string;
  serverInfo?: string;
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
}

/**
 * Call the backend API to optimize a query
 */
export async function optimizeQuery(data: OptimizationRequest): Promise<OptimizationResponse> {
  try {
    console.log("Sending optimization request to backend:", data);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // This is where you would normally call your Python backend:
    // const response = await fetch('/api/optimize', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data),
    // });
    // return await response.json();
    
    return generateMockResponse(data);
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
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // This is where you would normally call your Python backend:
    // await fetch('/api/feedback', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ id, feedback }),
    // });
    
    // For demo, we'll store the feedback in localStorage
    const historyStr = localStorage.getItem("queryHistory") || "[]";
    const history = JSON.parse(historyStr);
    
    const updatedHistory = history.map((item: any) => {
      if (item.id === id) {
        return { ...item, feedback };
      }
      return item;
    });
    
    localStorage.setItem("queryHistory", JSON.stringify(updatedHistory));
  } catch (error) {
    console.error("Error submitting feedback:", error);
    throw new Error("Failed to submit feedback");
  }
}

// This function simulates responses for the demo
// In production, this would be replaced with real API calls
function generateMockResponse(data: OptimizationRequest): OptimizationResponse {
  const { sqlQuery } = data;
  
  // Check if we have a similar query in history with positive feedback
  const historyStr = localStorage.getItem("queryHistory") || "[]";
  const history = JSON.parse(historyStr);
  
  // Find a similar query with positive feedback
  const similarQuery = history.find((item: any) => {
    return (
      item.feedback === 'helpful' && 
      calculateSimilarity(item.query, sqlQuery) > 0.7 // Threshold for similarity
    );
  });
  
  // If we found a similar query with positive feedback, return it
  if (similarQuery) {
    console.log("Found similar query with positive feedback:", similarQuery);
    
    return {
      originalQuery: sqlQuery,
      optimizedQuery: similarQuery.optimizedQuery,
      analysis: similarQuery.analysis,
      performanceImprovement: "Estimated 70% faster based on similar queries",
      indexSuggestions: extractSuggestions(similarQuery.analysis, "index"),
      structureSuggestions: extractSuggestions(similarQuery.analysis, "structure"),
      serverSuggestions: extractSuggestions(similarQuery.analysis, "server"),
      id: Date.now(),
      source: 'history'
    };
  }
  
  let optimizedQuery = sqlQuery;
  let analysis = "Analysis of your query:\n\n";
  let performanceImprovement = "Up to 75% faster";
  let indexSuggestions: string[] = [];
  let structureSuggestions: string[] = [];
  let serverSuggestions: string[] = [];
  
  // Add sample indexes
  if (sqlQuery.toLowerCase().includes("where")) {
    const whereClause = sqlQuery.toLowerCase().split("where")[1].split(/order by|group by|limit|$/i)[0].trim();
    const potentialColumns = whereClause.match(/\w+\s*(?:[=<>]|like|in)/gi);
    
    if (potentialColumns) {
      const columnNames = potentialColumns.map(col => 
        col.replace(/\s*(?:[=<>]|like|in)$/i, '').trim()
      );
      
      columnNames.forEach(column => {
        indexSuggestions.push(`CREATE INDEX idx_${column} ON ${getTableName(sqlQuery)} (${column});`);
      });
      
      analysis += `• Found potential filtering on columns: ${columnNames.join(', ')}.\n`;
      analysis += `• Adding indexes on these columns can significantly improve query performance.\n\n`;
    }
  }
  
  // Check for SELECT *
  if (sqlQuery.toLowerCase().includes("select *")) {
    optimizedQuery = sqlQuery.replace(/SELECT \*/i, "SELECT id, name, created_at");
    analysis += "• Using SELECT * is inefficient as it retrieves all columns, even those you don't need.\n";
    analysis += "• Specified only necessary columns to reduce data transfer and processing time.\n\n";
  }
  
  // Check for missing LIMIT
  if (!sqlQuery.toLowerCase().includes("limit")) {
    optimizedQuery = optimizedQuery + " LIMIT 100";
    analysis += "• Added LIMIT clause to prevent returning too many rows.\n";
    analysis += "• This protects against accidental large result sets.\n\n";
  }
  
  // Suggest table structure improvements
  structureSuggestions.push("Consider using ENUM instead of VARCHAR for status fields with a limited set of values.");
  structureSuggestions.push("Add appropriate NOT NULL constraints to columns that should never be null.");
  
  // Suggest server optimizations
  serverSuggestions.push("Increase innodb_buffer_pool_size to at least 70% of available RAM for better caching.");
  serverSuggestions.push("Enable query cache if using MySQL 5.7 or earlier (disabled by default in MySQL 8.0+).");
  
  return {
    originalQuery: sqlQuery,
    optimizedQuery,
    analysis,
    performanceImprovement,
    indexSuggestions,
    structureSuggestions,
    serverSuggestions,
    id: Date.now(),
    source: 'openai'
  };
}

// Utility function to extract table name from query
function getTableName(query: string): string {
  const fromMatch = query.match(/from\s+(\w+)/i);
  return fromMatch ? fromMatch[1] : "table_name";
}

// Utility function to calculate similarity between two strings (mock implementation)
function calculateSimilarity(str1: string, str2: string): number {
  // This is a very simple implementation just for demo
  // In production, you'd use a more sophisticated algorithm
  const cleanStr1 = str1.toLowerCase().replace(/\s+/g, ' ').trim();
  const cleanStr2 = str2.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // If they're exactly the same, return 1
  if (cleanStr1 === cleanStr2) return 1;
  
  // Check if one is a substring of the other
  if (cleanStr1.includes(cleanStr2) || cleanStr2.includes(cleanStr1)) {
    return 0.8;
  }
  
  // Count common words
  const words1 = new Set(cleanStr1.split(' '));
  const words2 = new Set(cleanStr2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  
  const jaccard = intersection.size / (words1.size + words2.size - intersection.size);
  return jaccard;
}

// Extract suggestions from analysis text (mock implementation)
function extractSuggestions(analysis: string, type: 'index' | 'structure' | 'server'): string[] {
  // In a real implementation, you would parse the analysis text to extract the suggestions
  // This is just a mock implementation for the demo
  
  if (type === 'index') {
    return [
      "CREATE INDEX idx_status ON users (status);",
      "CREATE INDEX idx_created_at ON users (created_at);"
    ];
  } else if (type === 'structure') {
    return [
      "Consider using ENUM instead of VARCHAR for status fields with a limited set of values.",
      "Add appropriate NOT NULL constraints to columns that should never be null."
    ];
  } else {
    return [
      "Increase innodb_buffer_pool_size to at least 70% of available RAM.",
      "Enable query cache if using MySQL 5.7 or earlier."
    ];
  }
}
