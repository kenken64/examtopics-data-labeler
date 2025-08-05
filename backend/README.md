# AWS Certification Quiz Backend

A Python Flask backend application for managing AWS certification quiz questions with AI-powered explanation generation, PDF processing, and MongoDB integration.

## 🚀 Features

- **PDF Processing**: Extract questions from PDF files using OCR and text processing
- **AI-Powered Explanations**: Generate explanations for quiz questions using OpenAI API
- **Question Management**: Complete CRUD operations for quiz questions
- **MongoDB Integration**: Store and manage questions in MongoDB
- **HOTSPOT Question Support**: Special handling for step-based/interactive questions
- **RESTful API**: Flask-based API for frontend integration
- **Docker Support**: Containerized deployment with Docker

## 📋 Prerequisites

- Python 3.12.4+
- MongoDB database
- OpenAI API key (for explanation generation)
- Docker (optional, for containerized deployment)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aws-cert-web/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   Create a `.env` file in the backend directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/awscert
   MONGO_DBNAME=awscert
   OPENAI_API_KEY=your-openai-api-key-here
   FLASK_ENV=development
   ```

5. **Install system dependencies** (for PDF processing)
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install poppler-utils tesseract-ocr tesseract-ocr-eng
   
   # macOS
   brew install poppler tesseract
   ```

### Docker Deployment

1. **Build the Docker image**
   ```bash
   docker build -t aws-cert-backend .
   ```

2. **Run the container**
   ```bash
   docker run -p 5000:5000 \
     -e MONGODB_URI=your-mongodb-uri \
     -e OPENAI_API_KEY=your-openai-key \
     aws-cert-backend
   ```

## 📁 Project Structure

```
backend/
├── app.py                          # Main Flask application
├── wsgi.py                         # WSGI entry point
├── Dockerfile                      # Docker configuration
├── requirements.txt                # Python dependencies
├── requirements-railway.txt        # Railway-specific dependencies
├── runtime.txt                     # Python version specification
├── 
├── # Question Processing Scripts
├── 1convert_pdf_standalone.py      # PDF to markdown conversion
├── 2extract_questionsv2.py         # Extract questions from markdown
├── 3generate_explanationsv2.py     # Generate AI explanations
├── 4upsert_questionsv2.py         # Upload questions to MongoDB
├── 
├── # Testing and Utility Scripts
├── extract_questions_by_numbers.py # Extract specific questions
├── validate_null_answers.py        # Validate question data
├── remove_odd_rows.py              # Data cleaning utility
├── quick_test.py                   # Quick testing script
├── 
├── # Data Files
├── data/                           # Sample data and test files
├── MLA_C01_114.md                 # Extracted markdown questions
├── MLA_C01_114.json               # Processed JSON questions
└── server.log                     # Application logs
```

## 🔧 Usage

### Starting the Application

**Development Mode:**
```bash
python app.py
```

**Production Mode:**
```bash
gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 app:app
```

### Processing Questions Workflow

1. **Convert PDF to Markdown**
   ```bash
   python 1convert_pdf_standalone.py input.pdf
   ```

2. **Extract Questions from Markdown**
   ```bash
   python 2extract_questionsv2.py questions.md
   ```

3. **Generate AI Explanations** (optional)
   ```bash
   python 3generate_explanationsv2.py questions.json
   # Use --force to overwrite existing explanations
   python 3generate_explanationsv2.py questions.json --force
   ```

4. **Upload to MongoDB**
   ```bash
   python 4upsert_questionsv2.py <certificate_id> questions.json
   ```

### API Endpoints

The Flask application provides RESTful endpoints for question management:

- `GET /health` - Health check endpoint
- `GET /questions` - Retrieve all questions
- `POST /questions` - Create new question
- `PUT /questions/<id>` - Update question
- `DELETE /questions/<id>` - Delete question

## 📊 Question Types

### Regular Questions
Standard multiple-choice questions with A, B, C, D options.

```json
{
  "question_number": 1,
  "question_text": "Which AWS service...?",
  "answers": "A. Option A\nB. Option B\nC. Option C\nD. Option D",
  "correct_answer": "C",
  "explanation": "The correct answer is C because..."
}
```

### HOTSPOT Questions
Interactive step-based questions with special JSON structure.

```json
{
  "question_number": 5,
  "question_text": "**HOTSPOT** Select and order the steps...",
  "answers": {
    "step1": ["Option 1", "Option 2", "Option 3"],
    "step2": ["Option 1", "Option 2", "Option 3"],
    "step3": ["Option 1", "Option 2", "Option 3"]
  },
  "correct_answer": "{\"Step 1\": \"Option 1\", \"Step 2\": \"Option 2\", \"Step 3\": \"Option 3\"}",
  "explanation": "The correct steps are...",
  "type": "steps"
}
```

## 🤖 AI Explanation Generation

The system uses OpenAI's GPT-3.5-turbo to generate explanations for questions:

- **Smart Processing**: Only generates explanations for questions with empty explanation fields
- **Context Aware**: Includes question text, answer options, and correct answer in prompts
- **AWS Focused**: Specialized prompts for AWS certification content
- **Batch Processing**: Handles multiple questions efficiently
- **Error Handling**: Robust error handling for API failures

## 🗄️ Database Schema

### MongoDB Collection: `quizzes`

```javascript
{
  _id: ObjectId,
  certificateId: String,        // Certificate identifier
  question_no: Number,          // Question number
  question: String,             // Question text
  answers: String,              // Answer options (string format)
  correctAnswer: String,        // Correct answer
  explanation: String,          // Explanation text
  difficulty: String,           // Question difficulty level
  tags: Array,                 // Question tags
  type: String,                // Question type ("steps" for HOTSPOT)
  createdAt: Date,             // Creation timestamp
  updatedAt: Date              // Last update timestamp
}
```

## 🧪 Testing

Run various test scripts to validate functionality:

```bash
# Test PDF conversion
python test_pdf_conversion.py

# Test OCR functionality
python test_ocr_working.py

# Test answer extraction
python test_answer_extraction.py

# Validate question data
python validate_null_answers.py
```

## 📝 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `MONGO_DBNAME` | MongoDB database name | No | `awscert` |
| `OPENAI_API_KEY` | OpenAI API key for explanations | Yes* | - |
| `FLASK_ENV` | Flask environment | No | `production` |
| `PORT` | Application port | No | `5000` |

*Required only for explanation generation

## 🚨 Error Handling

The application includes comprehensive error handling:

- **PDF Processing**: Handles corrupted files, OCR failures
- **Question Extraction**: Validates markdown format, handles missing fields
- **AI Generation**: Rate limiting, API failures, timeout handling
- **Database Operations**: Connection failures, duplicate handling
- **API Responses**: Proper HTTP status codes and error messages

## 📈 Performance Considerations

- **Batch Processing**: Questions are processed in batches for efficiency
- **Caching**: OCR results and processed data are cached when possible
- **Connection Pooling**: MongoDB connections are pooled
- **Timeout Handling**: Appropriate timeouts for external API calls
- **Memory Management**: Large files are processed in chunks

## 🔐 Security

- **Environment Variables**: Sensitive data stored in environment variables
- **Input Validation**: All inputs are validated and sanitized
- **API Rate Limiting**: OpenAI API calls are rate-limited
- **Database Security**: MongoDB connections use authentication

## 🐛 Troubleshooting

### Common Issues

1. **PDF Conversion Fails**
   - Ensure poppler-utils is installed
   - Check file permissions and disk space

2. **OCR Not Working**
   - Install tesseract-ocr and language packs
   - Verify image quality and format

3. **MongoDB Connection Failed**
   - Check MONGODB_URI format
   - Verify database server is running

4. **OpenAI API Errors**
   - Verify API key is valid
   - Check rate limits and billing

### Logs

Application logs are written to `server.log`:
```bash
tail -f server.log
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check existing issues and documentation
- Review error logs for troubleshooting
