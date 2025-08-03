# AI Agent - Long-Running Agent with Event Loop

A Spring Boot application that implements a long-running AI agent with event loop architecture, integrating Spring AI and LangChain4j for intelligent task processing.

## Architecture

This application implements a reactive event-driven architecture with the following components:

- **Event Loop Service**: Continuously polls for new events and tasks, processing them asynchronously
- **Agent Service**: Handles AI operations using both Spring AI and LangChain4j
- **Task Executor Service**: Manages task execution and scheduling
- **MongoDB Integration**: Reactive data persistence for events and tasks

## Features

- 🔄 **Event Loop Architecture**: Reactive processing of events and tasks
- 🤖 **Dual AI Integration**: Spring AI (OpenAI, Anthropic) + LangChain4j
- 📊 **Task Management**: Priority-based task queuing with retry logic
- 🚀 **Reactive Processing**: Non-blocking I/O with Project Reactor
- 📡 **REST API**: RESTful endpoints for event/task management
- 🌊 **Server-Sent Events**: Real-time event streaming
- 📈 **Monitoring**: Spring Boot Actuator integration
- 🔧 **DotEnv Support**: Easy environment variable management

## Quick Start

### Prerequisites

- Java 21+
- Maven 3.8+
- MongoDB 4.4+

### Environment Setup (using .env file)

1. **Copy the example environment file:**
```bash
cp .env.example .env
```

2. **Edit the `.env` file with your API keys:**
```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ai-agent

# OpenAI API Configuration (required)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Anthropic API Configuration (optional)
ANTHROPIC_API_KEY=ant-your-anthropic-api-key-here
```

3. **Alternative: Traditional Environment Variables**
```bash
export MONGODB_URI="mongodb://localhost:27017/ai-agent"
export OPENAI_API_KEY="your-openai-api-key"
export ANTHROPIC_API_KEY="your-anthropic-api-key"  # optional
```

### Running the Application

```bash
# Build the application
mvn clean compile

# Run the application (will automatically load .env file)
mvn spring-boot:run

# Or run with custom profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

The application will start on `http://localhost:8080`

## API Endpoints

### Event Management

```bash
# Publish an event
curl -X POST http://localhost:8080/api/agent/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "QUESTION_ANALYSIS",
    "source": "api",
    "payload": "What is AWS Lambda?",
    "metadata": {}
  }'

# Stream events (Server-Sent Events)
curl http://localhost:8080/api/agent/events/stream
```

### Task Management

```bash
# Enqueue a task
curl -X POST http://localhost:8080/api/agent/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "QUIZ_GENERATION",
    "description": "Generate AWS quiz",
    "input": "AWS Lambda functions",
    "priority": 5,
    "maxRetries": 3
  }'
```

### AI Operations

```bash
# Process a question
curl -X POST http://localhost:8080/api/agent/process-question \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain AWS EC2 instance types"
  }'

# Generate a quiz
curl -X POST http://localhost:8080/api/agent/generate-quiz \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "AWS S3",
    "difficulty": 3
  }'

# Analyze content
curl -X POST http://localhost:8080/api/agent/analyze-content \
  -H "Content-Type: application/json" \
  -d '{
    "content": "AWS provides various storage services..."
  }'
```

### System Status

```bash
# Check application status
curl http://localhost:8080/api/agent/status

# Health check
curl http://localhost:8080/actuator/health
```

## Event Types

The system supports the following event types:

- `QUESTION_ANALYSIS`: Analyze educational questions
- `TEXT_PROCESSING`: Process and transform text content
- `KNOWLEDGE_EXTRACTION`: Extract key knowledge points
- `CONTENT_GENERATION`: Generate new content using AI

## Task Types

The system supports the following task types:

- `QUIZ_GENERATION`: Generate quiz questions
- `CONTENT_ANALYSIS`: Analyze content for insights
- `KNOWLEDGE_SYNTHESIS`: Synthesize knowledge from multiple sources
- `LEARNING_PATH_CREATION`: Create personalized learning paths

## Configuration

Key configuration properties in `application.yml`:

```yaml
agent:
  event-loop:
    thread-pool-size: 10      # Event processing threads
    queue-capacity: 1000      # Maximum queue size
    polling-interval: 1000    # Polling interval in ms
  processing:
    batch-size: 10           # Events processed per batch
    timeout: 30000           # Processing timeout in ms
    retry-attempts: 3        # Maximum retry attempts
```

## Development

### Project Structure

```
src/main/java/com/examtopics/aiagent/
├── config/                 # Configuration classes
├── controller/             # REST controllers
├── model/                  # Data models
├── repository/             # Data repositories
└── service/                # Business logic services
```

### Building

```bash
# Compile
mvn compile

# Run tests
mvn test

# Package
mvn package

# Skip tests during package
mvn package -DskipTests
```

### Docker

```bash
# Build Docker image
docker build -t ai-agent .

# Run with Docker Compose
docker-compose up -d
```

## Monitoring

The application includes Spring Boot Actuator endpoints:

- `/actuator/health` - Health status
- `/actuator/info` - Application information
- `/actuator/metrics` - Application metrics
- `/actuator/prometheus` - Prometheus metrics

## Integration with ExamTopics Ecosystem

This AI agent is designed to integrate with the ExamTopics data labeler ecosystem:

- Process PDF content from the backend service
- Generate quiz questions for the Telegram bot
- Analyze exam questions for the frontend dashboard
- Support the overall AWS certification preparation workflow

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is part of the ExamTopics Data Labeler ecosystem.