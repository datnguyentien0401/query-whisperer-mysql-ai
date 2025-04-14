
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import json
import openai
from dotenv import load_dotenv

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

@app.route('/api/optimize', methods=['POST'])
def optimize_query():
    """Endpoint to optimize MySQL queries using OpenAI."""
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
        
        # Return the optimized query and analysis
        return jsonify(optimization_result)
        
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

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
