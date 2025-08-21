# Backend Test Makefile

.PHONY: help install test test-unit test-integration test-slow test-all coverage lint security clean

help:  ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install:  ## Install dependencies
	pip install -r requirements.txt
	pip install -r requirements-test.txt
	pip install reportlab  # For test PDF generation

test-unit:  ## Run unit tests only
	pytest tests/ -v -m "not slow and not external" --cov=app --cov-report=term-missing

test-integration:  ## Run integration tests only
	pytest tests/test_integration.py -v --cov=app --cov-append

test-slow:  ## Run slow tests
	pytest tests/ -v -m "slow" --cov=app --cov-append

test-external:  ## Run tests that require external services
	pytest tests/ -v -m "external" --cov=app --cov-append

test:  ## Run all tests except slow and external
	pytest tests/ -v -m "not slow and not external" --cov=app --cov-report=html --cov-report=term-missing

test-all:  ## Run all tests including slow ones
	pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing

coverage:  ## Generate detailed coverage report
	pytest tests/ -v --cov=app --cov-report=html --cov-report=xml --cov-report=term-missing
	@echo "Coverage report generated in htmlcov/index.html"

lint:  ## Run code linting
	flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
	flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics

type-check:  ## Run type checking
	mypy app.py --ignore-missing-imports

security:  ## Run security scans
	safety check -r requirements.txt
	bandit -r . -f json -o bandit-report.json
	bandit -r .

clean:  ## Clean up generated files
	rm -rf htmlcov/
	rm -rf .pytest_cache/
	rm -rf __pycache__/
	rm -rf tests/__pycache__/
	rm -f coverage.xml
	rm -f .coverage
	rm -f bandit-report.json
	rm -f test-report.html

dev-setup:  ## Set up development environment
	pip install -r requirements.txt
	pip install -r requirements-test.txt
	pip install reportlab
	pip install flake8 mypy safety bandit
	@echo "Development environment setup complete!"

test-watch:  ## Run tests in watch mode
	pytest-watch tests/ -- -v -m "not slow and not external"

quick-test:  ## Run a quick subset of tests
	pytest tests/test_app.py::TestHealthEndpoints -v

performance-test:  ## Run performance tests
	pytest tests/ -v -m "slow" --durations=10

validate:  ## Validate test environment setup
	python3 validate-test-setup.py

run-all-tests:  ## Run complete test suite (same as CI)
	./run-tests.sh

github-simulation:  ## Simulate GitHub Actions locally
	@echo "🚀 Simulating GitHub Actions workflow..."
	@echo "Installing dependencies..."
	pip install -r requirements.txt -q
	pip install -r requirements-test.txt -q
	pip install reportlab -q
	@echo "Running linting..."
	flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics || true
	@echo "Running type checking..."
	mypy app.py --ignore-missing-imports || true
	@echo "Running unit tests..."
	OPENAI_API_KEY=test-key-for-testing FLASK_ENV=testing pytest tests/ -v -m "not slow and not external" --cov=app --cov-report=xml --junitxml=junit-unit.xml
	@echo "Running integration tests..."
	OPENAI_API_KEY=test-key-for-testing FLASK_ENV=testing pytest tests/test_integration.py -v --cov=app --cov-append --cov-report=xml --junitxml=junit-integration.xml
	@echo "✅ GitHub Actions simulation completed!"