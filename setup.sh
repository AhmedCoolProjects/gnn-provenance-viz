#!/bin/bash

echo "Setting up GNN-Provenance-Viz..."
echo "================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Setup Backend
echo ""
echo "Setting up Backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "Backend setup complete!"
echo "To start the backend server, run:"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  uvicorn app.main:app --reload --port 8000"

# Setup Frontend
echo ""
echo "Setting up Frontend..."
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

echo ""
echo "Frontend setup complete!"
echo "To start the frontend server, run:"
echo "  cd frontend"
echo "  npm run dev"

echo ""
echo "================================"
echo "Setup complete!"
echo ""
echo "Quick start:"
echo "  Terminal 1: cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"
