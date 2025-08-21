#!/bin/bash

# Backend Test Runner Script
# This script runs the same tests as the GitHub Actions workflow locally

set -e

echo "🧪 Backend Test Suite Runner"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the backend directory
if [ ! -f "app.py" ]; then
    echo "Error: Please run this script from the backend directory"
    echo "Usage: cd backend && ./run-tests.sh"
    exit 1
fi

# Set environment variables
export OPENAI_API_KEY=test-key-for-testing
export FLASK_ENV=testing
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

print_status "Setting up test environment..."

# Install dependencies if not present
if [ ! -d "venv" ] && [ ! -n "$VIRTUAL_ENV" ]; then
    print_warning "No virtual environment detected. Installing dependencies globally."
fi

print_status "Installing test dependencies..."
pip install -r requirements-test.txt > /dev/null 2>&1
pip install reportlab > /dev/null 2>&1

# Clean previous test artifacts
print_status "Cleaning previous test artifacts..."
rm -rf htmlcov/
rm -rf .pytest_cache/
rm -f coverage.xml
rm -f .coverage
rm -f junit-*.xml
rm -f test-report.html

# Run linting
print_status "Running code linting with flake8..."
if command -v flake8 >/dev/null 2>&1; then
    flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
    flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
    print_success "Linting completed"
else
    print_warning "flake8 not installed, skipping linting"
fi

# Run type checking
print_status "Running type checking with mypy..."
if command -v mypy >/dev/null 2>&1; then
    mypy app.py --ignore-missing-imports || true
    print_success "Type checking completed"
else
    print_warning "mypy not installed, skipping type checking"
fi

# Run unit tests
print_status "Running unit tests..."
pytest tests/ -v -m "not slow and not external" \
    --cov=app \
    --cov-report=xml \
    --cov-report=html \
    --cov-report=term-missing \
    --junitxml=junit-unit.xml

if [ $? -eq 0 ]; then
    print_success "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi

# Run integration tests
print_status "Running integration tests..."
pytest tests/test_integration.py -v \
    --cov=app \
    --cov-append \
    --cov-report=xml \
    --junitxml=junit-integration.xml

if [ $? -eq 0 ]; then
    print_success "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

# Run performance tests (optional)
read -p "$(echo -e ${YELLOW}[OPTIONAL]${NC}) Run performance tests? (y/N): " run_perf
if [[ $run_perf =~ ^[Yy]$ ]]; then
    print_status "Running performance tests..."
    pytest tests/ -v -m "slow" --junitxml=junit-performance.xml || true
    print_success "Performance tests completed"
fi

# Generate HTML test report
print_status "Generating HTML test report..."
if command -v pytest >/dev/null 2>&1; then
    pytest tests/ --html=test-report.html --self-contained-html --tb=no -q || true
    print_success "HTML report generated: test-report.html"
fi

# Run security scans (optional)
read -p "$(echo -e ${YELLOW}[OPTIONAL]${NC}) Run security scans? (y/N): " run_security
if [[ $run_security =~ ^[Yy]$ ]]; then
    print_status "Running security scans..."
    
    # Safety check
    if command -v safety >/dev/null 2>&1; then
        safety check -r requirements.txt || true
    else
        print_warning "safety not installed, skipping dependency security check"
    fi
    
    # Bandit check
    if command -v bandit >/dev/null 2>&1; then
        bandit -r . -f json -o bandit-report.json || true
        bandit -r . || true
    else
        print_warning "bandit not installed, skipping code security check"
    fi
    
    print_success "Security scans completed"
fi

# Display results summary
echo ""
echo "=============================="
print_success "Test Suite Execution Complete!"
echo "=============================="
echo ""
echo "📊 Generated Reports:"
if [ -f "coverage.xml" ]; then
    echo "  ✅ Coverage XML: coverage.xml"
fi
if [ -d "htmlcov" ]; then
    echo "  ✅ Coverage HTML: htmlcov/index.html"
fi
if [ -f "test-report.html" ]; then
    echo "  ✅ Test Report: test-report.html"
fi
if [ -f "junit-unit.xml" ]; then
    echo "  ✅ Unit Test Results: junit-unit.xml"
fi
if [ -f "junit-integration.xml" ]; then
    echo "  ✅ Integration Test Results: junit-integration.xml"
fi
if [ -f "bandit-report.json" ]; then
    echo "  ✅ Security Report: bandit-report.json"
fi

echo ""
echo "💡 Open htmlcov/index.html in your browser to view detailed coverage report"
echo "💡 Open test-report.html in your browser to view detailed test results"
echo ""
print_success "All tests completed successfully! 🎉"