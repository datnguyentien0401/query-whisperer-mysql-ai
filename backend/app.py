
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import json
import openai
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import Json, DictCursor
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

# Database connection parameters
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'sql_optimizer')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')

def get_db_connection():
    """Create and return a PostgreSQL database connection"""
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    return conn

def init_db():
    """Initialize PostgreSQL database with tables from UML schema"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create tables based on UML schema
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS QueryRequests (
        request_id SERIAL PRIMARY KEY,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        original_query TEXT NOT NULL,
        table_structures JSONB,
        existing_indexes JSONB,
        explain_results JSONB,
        performance_issues TEXT,
        database_size INTEGER,
        database_engine VARCHAR(50),
        database_version VARCHAR(50),
        server_info JSONB
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS OptimizationResults (
        result_id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES QueryRequests(request_id),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        optimized_query TEXT NOT NULL,
        optimization_explanation TEXT NOT NULL,
        suggested_indexes JSONB,
        suggested_schema_changes JSONB,
        suggested_server_configs JSONB,
        estimated_improvement FLOAT,
        tokens_used INTEGER,
        model_used VARCHAR(50)
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS Feedbacks (
        feedback_id SERIAL PRIMARY KEY,
        result_id INTEGER NOT NULL REFERENCES OptimizationResults(result_id),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_useful BOOLEAN NOT NULL
    )
    ''')
    
    cursor.execute('''
    CREATE EXTENSION IF NOT EXISTS vector;
    
    CREATE TABLE IF NOT EXISTS QueryVectors (
        vector_id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES QueryRequests(request_id),
        embedding FLOAT[],
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS SimilarQueries (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES QueryRequests(request_id),
        similar_request_id INTEGER NOT NULL REFERENCES QueryRequests(request_id),
        similarity_score FLOAT NOT NULL,
        similarity_type VARCHAR(50) NOT NULL
    )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
try:
    init_db()
    print("Database initialized successfully")
except Exception as e:
    print(f"Error initializing database: {str(e)}")

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
        table_structure = data.get('tableStructure', {})
        existing_indexes = data.get('existingIndexes', {})
        performance_issue = data.get('performanceIssue', '')
        explain_results = data.get('explainResults', {})
        server_info = data.get('serverInfo', {})
        database_engine = data.get('databaseEngine', 'MySQL')
        database_version = data.get('databaseVersion', '')
        database_size = data.get('databaseSize', 0)
        
        # Store the query request
        request_id = save_query_request(
            sql_query,
            table_structure,
            existing_indexes,
            performance_issue,
            explain_results,
            server_info,
            database_engine,
            database_version,
            database_size
        )
        
        # Check if we have a similar query in history with positive feedback
        similar_optimization = find_similar_optimization(sql_query, request_id)
        
        if similar_optimization:
            # Return the similar optimization from history
            print(f"Found similar optimization in history: Request ID {similar_optimization['request_id']}")
            
            # Create the response from the similar optimization
            response = {
                "originalQuery": sql_query,
                "optimizedQuery": similar_optimization['optimized_query'],
                "analysis": similar_optimization['optimization_explanation'],
                "performanceImprovement": f"{similar_optimization['estimated_improvement']}%",
                "indexSuggestions": similar_optimization['suggested_indexes'],
                "structureSuggestions": similar_optimization['suggested_schema_changes'],
                "serverSuggestions": similar_optimization['suggested_server_configs'],
                "id": similar_optimization['result_id'],
                "source": "history"
            }
            
            # Save the similarity relationship
            save_similarity_relationship(
                request_id, 
                similar_optimization['request_id'], 
                similar_optimization['similarity_score'], 
                "vector_similarity"
            )
            
            return jsonify(response)
        
        # Create prompt for OpenAI
        prompt = create_optimization_prompt(
            sql_query, 
            table_structure, 
            existing_indexes, 
            performance_issue, 
            explain_results, 
            server_info,
            database_engine,
            database_version
        )
        
        # Call OpenAI API for optimization
        optimization_result = get_optimization_from_openai(prompt)
        
        # Save optimization to database
        result_id = save_optimization_result(
            request_id,
            optimization_result.get('optimizedQuery', ''),
            optimization_result.get('analysis', ''),
            optimization_result.get('indexSuggestions', []),
            optimization_result.get('structureSuggestions', []),
            optimization_result.get('serverSuggestions', []),
            optimization_result.get('performanceImprovement', ''),
            optimization_result.get('tokensUsed', 0),
            'gpt-4o'  # Model used
        )
        
        # Add the ID to the response
        optimization_result['id'] = result_id
        optimization_result['source'] = "openai"
        
        # Generate embedding for the query and save it
        save_query_embedding(request_id, sql_query)
        
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
        
        result_id = data.get('id')
        feedback = data.get('feedback')
        
        # Validate feedback value
        if feedback not in ['helpful', 'not_helpful']:
            return jsonify({"error": "Invalid feedback value. Must be 'helpful' or 'not_helpful'"}), 400
        
        # Convert feedback value to boolean
        is_useful = feedback == 'helpful'
        
        # Save feedback in database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "INSERT INTO Feedbacks (result_id, is_useful) VALUES (%s, %s) RETURNING feedback_id",
                (result_id, is_useful)
            )
            feedback_id = cursor.fetchone()[0]
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
        
        return jsonify({"success": True, "id": feedback_id})
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

def save_query_request(original_query, table_structure, existing_indexes, 
                      performance_issues, explain_results, server_info,
                      database_engine, database_version, database_size):
    """Save query request to database and return the request_id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """
            INSERT INTO QueryRequests 
            (original_query, table_structures, existing_indexes, performance_issues, 
             explain_results, server_info, database_engine, database_version, database_size) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING request_id
            """,
            (
                original_query,
                Json(table_structure) if table_structure else None,
                Json(existing_indexes) if existing_indexes else None,
                performance_issues,
                Json(explain_results) if explain_results else None,
                Json(server_info) if server_info else None,
                database_engine,
                database_version,
                database_size
            )
        )
        request_id = cursor.fetchone()[0]
        conn.commit()
        return request_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def save_optimization_result(request_id, optimized_query, optimization_explanation,
                           suggested_indexes, suggested_schema_changes, 
                           suggested_server_configs, estimated_improvement,
                           tokens_used, model_used):
    """Save optimization result and return the result_id."""
    # Convert estimated_improvement to float if it's a string percentage
    if isinstance(estimated_improvement, str):
        try:
            # Extract numeric part from string like "Up to 75% faster"
            estimated_improvement = float(estimated_improvement.split("%")[0].split()[-1])
        except:
            estimated_improvement = 0.0
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """
            INSERT INTO OptimizationResults 
            (request_id, optimized_query, optimization_explanation, suggested_indexes,
             suggested_schema_changes, suggested_server_configs, estimated_improvement,
             tokens_used, model_used) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING result_id
            """,
            (
                request_id,
                optimized_query,
                optimization_explanation,
                Json(suggested_indexes) if suggested_indexes else None,
                Json(suggested_schema_changes) if suggested_schema_changes else None,
                Json(suggested_server_configs) if suggested_server_configs else None,
                estimated_improvement,
                tokens_used,
                model_used
            )
        )
        result_id = cursor.fetchone()[0]
        conn.commit()
        return result_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def create_optimization_prompt(sql_query, table_structure, existing_indexes, 
                              performance_issue, explain_results, server_info,
                              database_engine, database_version):
    """Create a detailed prompt for OpenAI to optimize the query."""
    prompt = f"""I need to optimize the following {database_engine} query:

```sql
{sql_query}
```

"""

    # Add additional information if available
    if table_structure:
        prompt += f"\nTable structure and record counts:\n{json.dumps(table_structure, indent=2)}\n"
    
    if existing_indexes:
        prompt += f"\nExisting indexes:\n{json.dumps(existing_indexes, indent=2)}\n"
    
    if performance_issue:
        prompt += f"\nCurrent performance issues:\n{performance_issue}\n"
    
    if explain_results:
        prompt += f"\nEXPLAIN results:\n{json.dumps(explain_results, indent=2)}\n"
    
    if server_info:
        prompt += f"\nDatabase server information:\n{json.dumps(server_info, indent=2)}\n"
    
    if database_engine and database_version:
        prompt += f"\nDatabase engine: {database_engine} {database_version}\n"
    
    # Add requirements for the optimization
    prompt += """
Please provide a complete response in JSON format with the following fields:
1. "optimizedQuery": The optimized SQL query
2. "analysis": Detailed analysis of performance issues in the original query
3. "performanceImprovement": Estimated performance improvement percentage (e.g., "75")
4. "indexSuggestions": Array of suggested indexes to add
5. "structureSuggestions": Array of suggested table structure improvements
6. "serverSuggestions": Array of server configuration suggestions
7. "tokensUsed": Leave this as 0, it will be filled in by the system

Format your response as a valid JSON object."""

    return prompt

def get_optimization_from_openai(prompt):
    """Call OpenAI API to optimize the query."""
    try:
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o",  # Using the latest model
            messages=[
                {"role": "system", "content": "You are a database optimization expert with deep knowledge of SQL performance tuning. Respond only with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # Lower temperature for more deterministic responses
        )
        
        # Extract the content from the response
        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens

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
            result["tokensUsed"] = tokens_used
            
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
                "performanceImprovement": "0",
                "indexSuggestions": [],
                "structureSuggestions": [],
                "serverSuggestions": [],
                "tokensUsed": tokens_used
            }
            
    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        return {
            "error": str(e),
            "originalQuery": prompt.split("```sql")[1].split("```")[0].strip(),
            "optimizedQuery": "Error contacting optimization service",
            "analysis": "There was an error connecting to the optimization service. Please check your API key and try again.",
            "performanceImprovement": "0",
            "indexSuggestions": [],
            "structureSuggestions": [],
            "serverSuggestions": [],
            "tokensUsed": 0
        }

def save_query_embedding(request_id, query):
    """Generate and save embedding for a query."""
    try:
        # Generate embedding using OpenAI
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=query
        )
        embedding = response.data[0].embedding
        
        # Save embedding to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "INSERT INTO QueryVectors (request_id, embedding) VALUES (%s, %s) RETURNING vector_id",
                (request_id, embedding)
            )
            vector_id = cursor.fetchone()[0]
            conn.commit()
            return vector_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    except Exception as e:
        print(f"Error generating or saving embedding: {str(e)}")
        # Continue even if embedding fails
        return None

def find_similar_optimization(query, current_request_id, similarity_threshold=0.7):
    """Find a similar optimization in history with positive feedback."""
    try:
        # Generate embedding for the query
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=query
        )
        query_embedding = response.data[0].embedding
        
        # Search for similar queries with positive feedback
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=DictCursor)
        
        # First check if there's a direct string similarity match
        direct_matches = find_direct_string_matches(conn, query, similarity_threshold)
        if direct_matches:
            for match in direct_matches:
                # Check if this match has positive feedback
                if has_positive_feedback(conn, match['request_id']):
                    # Get the latest optimization result for this request
                    optimization = get_latest_optimization(conn, match['request_id'])
                    if optimization:
                        optimization['similarity_score'] = match['similarity_score']
                        conn.close()
                        return optimization
        
        # If no direct match, try vector similarity search
        try:
            # Using PostgreSQL vector extension to find similar query embeddings
            cursor.execute("""
                SELECT qv.request_id, qv.vector_id, qv.embedding <=> %s AS similarity_score
                FROM QueryVectors qv
                ORDER BY similarity_score
                LIMIT 5
            """, (query_embedding,))
            
            similar_vectors = cursor.fetchall()
            
            # Check each similar vector for positive feedback
            for vector in similar_vectors:
                similarity_score = 1.0 - float(vector['similarity_score'])  # Convert distance to similarity
                if similarity_score >= similarity_threshold:
                    # Check if this query has positive feedback
                    if has_positive_feedback(conn, vector['request_id']):
                        # Get the latest optimization result for this request
                        optimization = get_latest_optimization(conn, vector['request_id'])
                        if optimization:
                            optimization['similarity_score'] = similarity_score
                            conn.close()
                            return optimization
        except Exception as e:
            print(f"Vector similarity search error: {str(e)}")
            # Fall back to other methods if vector search fails
        
        conn.close()
        return None
    except Exception as e:
        print(f"Error finding similar optimization: {str(e)}")
        return None

def find_direct_string_matches(conn, query, similarity_threshold):
    """Find directly similar queries using string comparison."""
    cursor = conn.cursor(cursor_factory=DictCursor)
    cursor.execute("SELECT request_id, original_query FROM QueryRequests")
    all_queries = cursor.fetchall()
    
    matches = []
    for row in all_queries:
        similarity = calculate_similarity(query, row['original_query'])
        if similarity >= similarity_threshold:
            matches.append({
                'request_id': row['request_id'],
                'similarity_score': similarity
            })
    
    # Sort by similarity score descending
    matches.sort(key=lambda x: x['similarity_score'], reverse=True)
    return matches

def has_positive_feedback(conn, request_id):
    """Check if the request has any optimization results with positive feedback."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) 
        FROM OptimizationResults or2
        JOIN Feedbacks f ON or2.result_id = f.result_id
        WHERE or2.request_id = %s AND f.is_useful = TRUE
    """, (request_id,))
    
    count = cursor.fetchone()[0]
    return count > 0

def get_latest_optimization(conn, request_id):
    """Get the latest optimization result for a request."""
    cursor = conn.cursor(cursor_factory=DictCursor)
    cursor.execute("""
        SELECT 
            or2.result_id,
            or2.request_id,
            or2.optimized_query,
            or2.optimization_explanation,
            or2.suggested_indexes,
            or2.suggested_schema_changes,
            or2.suggested_server_configs,
            or2.estimated_improvement,
            qr.original_query
        FROM OptimizationResults or2
        JOIN QueryRequests qr ON or2.request_id = qr.request_id
        WHERE or2.request_id = %s
        ORDER BY or2.created_at DESC
        LIMIT 1
    """, (request_id,))
    
    result = cursor.fetchone()
    if result:
        return dict(result)
    return None

def save_similarity_relationship(request_id, similar_request_id, similarity_score, similarity_type):
    """Save the relationship between similar queries."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            """
            INSERT INTO SimilarQueries 
            (request_id, similar_request_id, similarity_score, similarity_type) 
            VALUES (%s, %s, %s, %s)
            RETURNING id
            """,
            (request_id, similar_request_id, similarity_score, similarity_type)
        )
        
        id = cursor.fetchone()[0]
        conn.commit()
        conn.close()
        return id
    except Exception as e:
        print(f"Error saving similarity relationship: {str(e)}")
        return None

def calculate_similarity(str1, str2):
    """Calculate string similarity between two SQL queries."""
    # Clean and normalize strings
    str1 = str1.lower().strip()
    str2 = str2.lower().strip()
    
    # Use difflib's SequenceMatcher to calculate similarity
    similarity = difflib.SequenceMatcher(None, str1, str2).ratio()
    return similarity

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
