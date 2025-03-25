GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' 

print_header() {
    echo -e "\n${YELLOW}========================================"
    echo -e "  $1"
    echo -e "========================================${NC}\n"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

setup_backend() {
    print_header "Setting up backend"
    cd "$PROJECT_ROOT/backend" || exit

    if [ ! -d "venv" ]; then
        echo -e "${BLUE}Creating Python virtual environment...${NC}"
        python3 -m venv venv
        
        if [ ! -d "venv" ]; then
            echo -e "${RED}Failed to create virtual environment. Please install python3-venv:${NC}"
            echo -e "${YELLOW}  macOS: brew install python3-venv${NC}"
            exit 1
        fi
    fi

    VENV_PATH="$PROJECT_ROOT/backend/venv"
    
    echo -e "${BLUE}Activating virtual environment...${NC}"
    if [ -f "$VENV_PATH/bin/activate" ]; then
        source "$VENV_PATH/bin/activate"
        
        PYTHON_PATH=$(which python)
        if [[ "$PYTHON_PATH" != *"$VENV_PATH"* ]]; then
            echo -e "${RED}Virtual environment activation failed. Using venv pip directly.${NC}"
            PIP_CMD="$VENV_PATH/bin/pip"
        else
            PIP_CMD="pip"
        fi
    else
        echo -e "${RED}Virtual environment activation script not found.${NC}"
        exit 1
    fi

    echo -e "${BLUE}Installing Python dependencies...${NC}"
    $PIP_CMD install -r requirements.txt
    
    echo -e "${BLUE}Installing WebSocket dependencies...${NC}"
    $PIP_CMD install 'uvicorn[standard]' websockets
    
    touch experiment_db.sqlite

    echo -e "${GREEN}Starting backend server...${NC}"
    "$VENV_PATH/bin/python" run_server.py &
    BACKEND_PID=$!
    echo -e "${GREEN}Backend server running with PID: $BACKEND_PID${NC}"
    
    cd "$PROJECT_ROOT"
}

setup_frontend() {
    print_header "Setting up frontend"
    cd "$PROJECT_ROOT/experimenthub" || exit

    if [ ! -d "node_modules" ]; then
        echo -e "${BLUE}Installing npm dependencies...${NC}"
        npm install
    fi

    echo -e "${GREEN}Starting frontend server...${NC}"
    NODE_OPTIONS="--max-old-space-size=4096" ./node_modules/.bin/next dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}Frontend server running with PID: $FRONTEND_PID${NC}"
    
    cd "$PROJECT_ROOT"
}

trap cleanup SIGINT
cleanup() {
    print_header "Shutting down services"
    
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${BLUE}Stopping backend server (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID >/dev/null 2>&1
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "${BLUE}Stopping frontend server (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID >/dev/null 2>&1
    fi
    
    echo -e "${GREEN}All services stopped. Goodbye!${NC}"
    exit 0
}

print_header "Starting ExperimentHub"

setup_backend
setup_frontend

echo -e "\n${GREEN}==========================================="
echo -e " ExperimentHub is now running!"
echo -e " Access frontend at: ${BLUE}http://localhost:3000${GREEN}"
echo -e " Backend API at: ${BLUE}http://localhost:8000${GREEN}"
echo -e " API docs at: ${BLUE}http://localhost:8000/docs${GREEN}"
echo -e "==========================================="
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}\n"

wait 