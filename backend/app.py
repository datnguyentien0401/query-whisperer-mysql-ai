
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import json
import openai
from dotenv import load_dotenv
import sqlite3
from datetime import datetime
import difflib

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Get OpenAI API key from environment variables
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    print("Warning: OPENAI_API_KEY not found in environment variables.")

# Configure OpenAI API
client = openai.OpenAI(api_key=openai_api_key)

# Initialize SQLite database
def init_db():
    """Initialize SQLite database for storing optimization history and feedback."""
    conn = sqlite3.connect('optimizations.db')
    cursor = conn.cursor()
    
    # Create optimizations table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS optimizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        original_query TEXT NOT NULL,
        optimization_prompt TEXT NOT NULL,
        optimized_query TEXT NOT NULL,
        analysis TEXT NOT NULL,
        performance_improvement TEXT NOT NULL,
        index_suggestions TEXT,
        structure_suggestions TEXT,
        server_suggestions TEXT,
        feedback TEXT
    )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

@app.route('/api/optimize', methods=['POST'])
def optimize_query():
    """Endpoint to optimize MySQL queries using OpenAI or retrieval from history."""
    try:
        # Get request data
        data = request.json
        
        if not data or 'sqlQuery' not in data:
            return jsonify({"error": "Missing required field: sqlQuery"}), 400
        
        # Extract data fields
        sql_query = data.get('sqlQuery', '')
        table_structure = data.get('tableStructure', '')
        existing_indexes = data.get('existingIndexes', '')
        performance_issue = data.get('performanceIssue', '')
        explain_results = data.get('explainResults', '')
        server_info = data.get('serverInfo', '')
        
        # Check if we have a similar query in history with positive feedback
        similar_optimization = find_similar_optimization(sql_query)
        
        if similar_optimization:
            # Return the similar optimization from history
            print(f"Found similar optimization in history: ID {similar_optimization['id']}")
            response = {
                "originalQuery": sql_query,
                "optimizedQuery": similar_optimization['optimized_query'],
                "analysis": similar_optimization['analysis'],
                "performanceImprovement": similar_optimization['performance_improvement'],
                "indexSuggestions": json.loads(similar_optimization['index_suggestions'] or '[]'),
                "structureSuggestions": json.loads(similar_optimization['structure_suggestions'] or '[]'),
                "serverSuggestions": json.loads(similar_optimization['server_suggestions'] or '[]'),
                "id": similar_optimization['id'],
                "source": "history"
            }
            return jsonify(response)
        
        # Create prompt for OpenAI
        prompt = create_optimization_prompt(
            sql_query, 
            table_structure, 
            existing_indexes, 
            performance_issue, 
            explain_results, 
            server_info
        )
        
        # Call OpenAI API for optimization
        optimization_result = get_optimization_from_openai(prompt)
        
        # Save optimization to database
        optimization_id = save_optimization(
            sql_query,
            prompt,
            optimization_result.get('optimizedQuery', ''),
            optimization_result.get('analysis', ''),
            optimization_result.get('performanceImprovement', ''),
            optimization_result.get('indexSuggestions', []),
            optimization_result.get('structureSuggestions', []),
            optimization_result.get('serverSuggestions', [])
        )
        
        # Add the ID to the response
        optimization_result['id'] = optimization_id
        optimization_result['source'] = "openai"
        
        # Return the optimized query and analysis
        return jsonify(optimization_result)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    """Endpoint to submit feedback for an optimization."""
    try:
        data = request.json
        
        if not data or 'id' not in data or 'feedback' not in data:
            return jsonify({"error": "Missing required fields: id, feedback"}), 400
        
        optimization_id = data.get('id')
        feedback = data.get('feedback')
        
        # Validate feedback value
        if feedback not in ['helpful', 'not_helpful']:
            return jsonify({"error": "Invalid feedback value. Must be 'helpful' or 'not_helpful'"}), 400
        
        # Update feedback in database
        conn = sqlite3.connect('optimizations.db')
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE optimizations SET feedback = ? WHERE id = ?",
            (feedback, optimization_id)
        )
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({"error": f"Optimization with ID {optimization_id} not found"}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

def create_optimization_prompt(sql_query, table_structure, existing_indexes, 
                              performance_issue, explain_results, server_info):
    """Create a detailed prompt for OpenAI to optimize the query."""
    prompt = """I need to optimize the following MySQL query:

```sql
{sql_query}
```

""".format(sql_query=sql_query)

    # Add additional information if available
    if table_structure:
        prompt += f"\nTable structure and record counts:\n{table_structure}\n"
    
    if existing_indexes:
        prompt += f"\nExisting indexes:\n{existing_indexes}\n"
    
    if performance_issue:
        prompt += f"\nCurrent performance issues:\n{performance_issue}\n"
    
    if explain_results:
        prompt += f"\nEXPLAIN results:\n{explain_results}\n"
    
    if server_info:
        prompt += f"\nDatabase server information:\n{server_info}\n"
    
    # Add requirements for the optimization
    prompt += """
Please provide a complete response in JSON format with the following fields:
1. "optimizedQuery": The optimized SQL query
2. "analysis": Detailed analysis of performance issues in the original query
3. "performanceImprovement": Estimated performance improvement (e.g., "Up to 75% faster")
4. "indexSuggestions": Array of suggested indexes to add
5. "structureSuggestions": Array of suggested table structure improvements
6. "serverSuggestions": Array of server configuration suggestions

Format your response as a valid JSON object."""

    return prompt

def get_optimization_from_openai(prompt):
    """Call OpenAI API to optimize the query."""
    try:
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o",  # Using the latest model
            messages=[
                {"role": "system", "content": "You are a database optimization expert with deep knowledge of MySQL performance tuning. Respond only with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Lower temperature for more deterministic responses
        )
        
        # Extract the content from the response
        content = response.choices[0].message.content

        # Try to parse the JSON response
        try:
            # Extract JSON if it's wrapped in markdown code blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            result = json.loads(content)
            
            # Add the original query to the result
            result["originalQuery"] = prompt.split("```sql")[1].split("```")[0].strip()
            
            # Ensure all expected fields exist
            expected_fields = ["optimizedQuery", "analysis", "performanceImprovement", 
                              "indexSuggestions", "structureSuggestions", "serverSuggestions"]
            
            for field in expected_fields:
                if field not in result:
                    if field in ["indexSuggestions", "structureSuggestions", "serverSuggestions"]:
                        result[field] = []
                    else:
                        result[field] = ""
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {str(e)}")
            print(f"Raw response: {content}")
            
            # Fallback response if JSON parsing fails
            return {
                "originalQuery": prompt.split("```sql")[1].split("```")[0].strip(),
                "optimizedQuery": "Error parsing optimization response",
                "analysis": "The AI response could not be parsed. Please try again with more specific details.",
                "performanceImprovement": "Unknown",
                "indexSuggestions": [],
                "structureSuggestions": [],
                "serverSuggestions": []
            }
            
    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        return {
            "error": str(e),
            "originalQuery": prompt.split("```sql")[1].split("```")[0].strip(),
            "optimizedQuery": "Error contacting optimization service",
            "analysis": "There was an error connecting to the optimization service. Please check your API key and try again.",
            "performanceImprovement": "Unknown",
            "indexSuggestions": [],
            "structureSuggestions": [],
            "serverSuggestions": []
        }

def save_optimization(original_query, prompt, optimized_query, analysis, 
                     performance_improvement, index_suggestions, structure_suggestions, server_suggestions):
    """Save an optimization to the database."""
    conn = sqlite3.connect('optimizations.db')
    cursor = conn.cursor()
    
    cursor.execute(
        """
        INSERT INTO optimizations 
        (timestamp, original_query, optimization_prompt, optimized_query, 
         analysis, performance_improvement, index_suggestions, structure_suggestions, server_suggestions) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.now().isoformat(),
            original_query,
            prompt,
            optimized_query,
            analysis,
            performance_improvement,
            json.dumps(index_suggestions),
            json.dumps(structure_suggestions),
            json.dumps(server_suggestions)
        )
    )
    
    optimization_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return optimization_id

def find_similar_optimization(query, similarity_threshold=0.7):
    """Find a similar optimization in the database with positive feedback."""
    conn = sqlite3.connect('optimizations.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all optimizations with positive feedback
    cursor.execute(
        "SELECT * FROM optimizations WHERE feedback = 'helpful'"
    )
    
    optimizations = cursor.fetchall()
    conn.close()
    
    if not optimizations:
        return None
    
    # Check for similar queries using difflib
    for opt in optimizations:
        similarity = calculate_similarity(query, opt['original_query'])
        if similarity >= similarity_threshold:
            return dict(opt)
    
    return None

def calculate_similarity(str1, str2):
    """Calculate similarity between two SQL queries."""
    # Clean and normalize strings
    str1 = str1.lower().strip()
    str2 = str2.lower().strip()
    
    # Use difflib's SequenceMatcher to calculate similarity
    similarity = difflib.SequenceMatcher(None, str1, str2).ratio()
    return similarity

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
