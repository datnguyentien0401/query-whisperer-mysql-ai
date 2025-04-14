
# MySQL Query Whisperer - Backend

This is the Python backend for the MySQL Query Whisperer application, which uses OpenAI's API to analyze and optimize MySQL queries.

## Setup

1. Create a virtual environment (recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create an environment file:
   ```
   cp .env.example .env
   ```

4. Add your OpenAI API key to the `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Running the server

1. Start the Flask development server:
   ```
   python app.py
   ```

2. The server will be available at `http://localhost:5000`

## API Endpoints

### Optimize Query

**Endpoint:** `POST /api/optimize`

**Request Body:**
```json
{
  "sqlQuery": "SELECT * FROM users WHERE status = 'active'",
  "tableStructure": "users: id (INT), name (VARCHAR), email (VARCHAR), status (ENUM), created_at (TIMESTAMP) - ~1M records",
  "existingIndexes": "PRIMARY KEY (id), INDEX idx_status (status)",
  "performanceIssue": "Query takes over 10 seconds to execute",
  "explainResults": "id | select_type | table | type | possible_keys | key | key_len | ref | rows | Extra",
  "serverInfo": "MySQL 8.0, 16GB RAM, 8 CPU cores"
}
```

**Response:**
```json
{
  "originalQuery": "SELECT * FROM users WHERE status = 'active'",
  "optimizedQuery": "SELECT id, name, email FROM users WHERE status = 'active' LIMIT 100",
  "analysis": "Analysis of performance issues...",
  "performanceImprovement": "Up to 75% faster",
  "indexSuggestions": ["CREATE INDEX idx_status ON users (status)"],
  "structureSuggestions": ["Consider using ENUM for status field"],
  "serverSuggestions": ["Increase innodb_buffer_pool_size"]
}
```

## Deployment

For production deployment, you can use Gunicorn:

```
gunicorn app:app
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: The port to run the server on (default: 5000)
