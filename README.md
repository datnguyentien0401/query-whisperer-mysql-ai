
# MySQL Query Whisperer

An AI-powered MySQL query optimization tool that analyzes your queries and provides optimization suggestions.

## Features

- AI-powered query analysis and optimization using OpenAI
- Detailed performance analysis of SQL queries
- Suggestions for indexes, table structure improvements, and server optimizations
- Query history tracking
- Modern, responsive UI

## Project Structure

This project consists of:

1. **Frontend**: React application with a modern UI
2. **Backend**: Python Flask API that communicates with OpenAI

## Setup Instructions

### Frontend

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. The frontend will be available at `http://localhost:8080`

### Backend (Python)

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up your environment variables:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file to add your OpenAI API key.

5. Start the Flask server:
   ```
   python app.py
   ```

6. The backend API will be available at `http://localhost:5000`

## How to Use

1. Enter your MySQL query in the query input area
2. Provide additional information about your tables, indexes, and performance issues
3. Click "Optimize My Query"
4. Review the optimized query and recommendations
5. Implement the suggested changes in your database

## Technologies Used

- Frontend:
  - React
  - TypeScript
  - Tailwind CSS
  - shadcn/ui components

- Backend:
  - Python
  - Flask
  - OpenAI API

## License

[MIT License](LICENSE)
