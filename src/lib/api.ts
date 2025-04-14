
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
}

/**
 * Call the backend API to optimize a query
 */
export async function optimizeQuery(data: OptimizationRequest): Promise<OptimizationResponse> {
  try {
    // For demo purposes, we'll simulate the API call with a mock response
    // In a real implementation, this would make a fetch call to the backend
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

// This function simulates responses for the demo
// In production, this would be replaced with real API calls
function generateMockResponse(data: OptimizationRequest): OptimizationResponse {
  const { sqlQuery } = data;
  
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
  };
}

// Utility function to extract table name from query
function getTableName(query: string): string {
  const fromMatch = query.match(/from\s+(\w+)/i);
  return fromMatch ? fromMatch[1] : "table_name";
}
