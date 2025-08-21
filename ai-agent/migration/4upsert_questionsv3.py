#!/usr/bin/env python3

import sys
import json
import os
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI')
if not MONGODB_URI:
    print("Error: MONGODB_URI not found in environment variables")
    sys.exit(1)

def connect_to_mongodb():
    """Establish MongoDB connection"""
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=60000, socketTimeoutMS=60000)
        db_name = os.getenv('MONGO_DBNAME', 'awscert')
        db = client[db_name]
        # Test connection
        client.admin.command('ping')
        return client, db
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        sys.exit(1)

def load_questions_from_file(json_file_path):
    """Load questions from JSON file"""
    try:
        with open(json_file_path, 'r', encoding='utf-8') as file:
            questions = json.load(file)
        
        if not isinstance(questions, list):
            print("Error: JSON file should contain an array of questions")
            return None
        
        print(f"Successfully loaded {len(questions)} questions from {json_file_path}")
        return questions
    except FileNotFoundError:
        print(f"Error: File '{json_file_path}' not found")
        return None
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON file: {e}")
        return None
    except Exception as e:
        print(f"Error loading questions: {e}")
        return None

def parse_answers_from_string(answers_string):
    """Parse answers from markdown-style string format to dictionary or handle JSON format"""
    if isinstance(answers_string, dict):
        return answers_string
    
    if not isinstance(answers_string, str):
        return {}
    
    # Check if it's a JSON string (for HOTSPOT questions)
    if answers_string.strip().startswith('{'):
        try:
            json_data = json.loads(answers_string)
            # For HOTSPOT questions with step-based structure, convert to simple format
            if isinstance(json_data, dict) and 'step1' in json_data:
                # Extract unique options from all steps
                all_options = set()
                for step_key, options in json_data.items():
                    if isinstance(options, list):
                        all_options.update(options)
                
                # Convert to simple A, B, C, D format
                answers = {}
                for i, option in enumerate(sorted(all_options), 1):
                    if i <= 4:  # Limit to A, B, C, D
                        letter = chr(ord('A') + i - 1)
                        answers[letter] = option
                
                return answers
            else:
                return json_data
        except json.JSONDecodeError:
            # If JSON parsing fails, treat as regular string
            pass
    
    answers = {}
    lines = answers_string.strip().split('\n')
    current_option = None
    current_text = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Look for pattern like "- A. answer text" or "A. answer text"
        if line.startswith('- '):
            line = line[2:]
        
        # Find the option letter (A, B, C, D) - handle multiple formats
        option_key = None
        option_text = None
        
        # Check for **A.** format
        if line.startswith('**') and len(line) > 5 and line[3:6] == '.**':
            option_key = line[2].upper()
            option_text = line[6:].strip()
        # Check for A. format
        elif len(line) > 1 and line[1] == '.' and line[0].upper() in 'ABCDEF':
            option_key = line[0].upper()
            if len(line) > 2:
                option_text = line[2:].strip()
            else:
                option_text = ""  # Will be filled by subsequent lines
        
        # If we found a new option, save the previous one and start collecting the new one
        if option_key:
            # Save previous option if exists
            if current_option and current_text:
                text_content = '\n'.join(current_text).strip()
                text_content = text_content.replace('**Most Voted**', '').strip()
                answers[current_option] = text_content
            
            # Start new option
            current_option = option_key
            current_text = [option_text] if option_text else []
        elif current_option:
            # Continue collecting text for current option
            current_text.append(line)
    
    # Don't forget the last option
    if current_option and current_text:
        text_content = '\n'.join(current_text).strip()
        text_content = text_content.replace('**Most Voted**', '').strip()
        answers[current_option] = text_content
    
    return answers

def validate_question_structure(question, index):
    """Validate question structure"""
    required_fields = ['question_number', 'question_text', 'answers', 'correct_answer', 'explanation']
    
    for field in required_fields:
        if field not in question:
            print(f"Warning: Question {index + 1} missing required field '{field}'")
            return False
    
    # For HOTSPOT questions, allow special formats
    is_hotspot = question.get('type') == 'steps' or 'HOTSPOT' in question.get('question_text', '')
    
    # Validate answers structure without modifying original
    answers = question['answers']
    if isinstance(answers, str):
        # Try to parse for validation but don't modify original
        if answers.strip().startswith('{'):
            # JSON format - validate it's valid JSON
            try:
                json.loads(answers)
                parsed_answers = {"A": "Step-based question", "B": "Step-based question"}  # Dummy for validation
            except json.JSONDecodeError:
                print(f"Warning: Question {index + 1} answers field contains invalid JSON")
                return False
        else:
            # Regular string format
            parsed_answers = parse_answers_from_string(answers)
    elif isinstance(answers, dict):
        parsed_answers = answers
    elif isinstance(answers, list):
        # Handle array format - convert to dictionary for validation
        parsed_answers = {}
        for i, answer in enumerate(answers):
            if isinstance(answer, str):
                # Extract letter and text from formats like "A. text" or just "text"
                answer_text = answer.strip()
                if len(answer_text) > 2 and answer_text[1] == '.' and answer_text[0].upper() in 'ABCDEF':
                    letter = answer_text[0].upper()
                    text = answer_text[2:].strip()
                else:
                    # If no letter format, assign sequential letters
                    letter = chr(ord('A') + i)
                    text = answer_text
                parsed_answers[letter] = text
            else:
                print(f"Warning: Question {index + 1} answer item {i + 1} should be a string")
                return False
    else:
        print(f"Warning: Question {index + 1} 'answers' field should be a string, object, or array, got {type(answers).__name__}: {repr(answers)}")
        return False
    
    # For non-HOTSPOT questions, ensure we have valid answer options
    if not is_hotspot and not parsed_answers:
        print(f"Warning: Question {index + 1} has no valid answer options")
        return False
    
    # Check correct_answer format
    correct_answer = question['correct_answer']
    
    # Handle JSON format correct answers (for HOTSPOT questions)
    if isinstance(correct_answer, str) and correct_answer.strip().startswith('{'):
        # For JSON format correct answers, just validate it's valid JSON
        try:
            json.loads(correct_answer)
            # Don't validate against answers for JSON format
        except json.JSONDecodeError:
            print(f"Warning: Question {index + 1} correct_answer is invalid JSON format")
            return False
    elif not is_hotspot and isinstance(parsed_answers, dict) and correct_answer not in parsed_answers:
        print(f"Warning: Question {index + 1} correct_answer '{correct_answer}' not found in answers")
        # Don't return False - allow insertion with warning
    
    return True

def transform_question_for_db(question, certificate_id):
    """Transform question from JSON format to database format"""
    # Convert answers to string format - always store as string
    answers_data = question['answers']
    answers_string = ""
    
    if isinstance(answers_data, dict):
        # Convert dictionary to string format
        answer_lines = []
        for key, value in answers_data.items():
            answer_lines.append(f"{key}. {str(value)}")
        answers_string = "\n".join(answer_lines)
    elif isinstance(answers_data, list):
        # Convert array to string format
        answer_lines = []
        for i, answer in enumerate(answers_data):
            if isinstance(answer, str):
                answer_text = answer.strip()
                if len(answer_text) > 2 and answer_text[1] == '.' and answer_text[0].upper() in 'ABCDEF':
                    # Already has letter format like "A. text"
                    answer_lines.append(answer_text)
                else:
                    # Add letter format
                    letter = chr(ord('A') + i)
                    answer_lines.append(f"{letter}. {answer_text}")
            else:
                # Convert non-string items
                letter = chr(ord('A') + i)
                answer_lines.append(f"{letter}. {str(answer)}")
        answers_string = "\n".join(answer_lines)
    elif isinstance(answers_data, str):
        # Already a string - preserve as is
        answers_string = answers_data
    else:
        # Convert other types to string
        answers_string = str(answers_data)
    
    # Convert correct_answer to string format - always store as string
    correct_answer = question['correct_answer']
    if isinstance(correct_answer, str):
        correct_answer_string = correct_answer
    else:
        # Convert other types (dict, list, etc.) to JSON string
        correct_answer_string = json.dumps(correct_answer) if correct_answer is not None else ""
    
    # Base question structure
    db_question = {
        "certificateId": certificate_id,
        "question_no": question['question_number'],
        "question": question['question_text'],
        "answers": answers_string,  # Always string
        "correctAnswer": correct_answer_string,  # Always string
        "explanation": question['explanation'],
        "difficulty": question.get('difficulty', 'medium'),
        "tags": question.get('tags', []),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }
    
    # Always preserve type field if it exists (especially for HOTSPOT questions)
    if 'type' in question:
        db_question['type'] = question['type']
    
    return db_question

def upsert_questions(db, certificate_id, questions):
    """Upsert questions into the database"""
    collection = db.quizzes
    
    upserted_count = 0
    updated_count = 0
    errors = []
    
    print(f"\nStarting upsert for certificate ID: {certificate_id}")
    print(f"Processing {len(questions)} questions...")
    
    for i, question in enumerate(questions):
        try:
            # Validate question structure
            if not validate_question_structure(question, i):
                errors.append(f"Question {i + 1}: Invalid structure")
                continue
            
            # Transform question for database
            db_question = transform_question_for_db(question, certificate_id)
            
            # Upsert based on certificateId and question_no
            filter_query = {
                "certificateId": certificate_id,
                "question_no": question['question_number']
            }
            
            # Check if question already exists
            existing = collection.find_one(filter_query)
            
            if existing:
                # Update existing question
                db_question["createdAt"] = existing.get("createdAt", datetime.now(timezone.utc))
                result = collection.replace_one(filter_query, db_question)
                if result.modified_count > 0:
                    updated_count += 1
                    print(f"✓ Updated question {question['question_number']}")
                else:
                    print(f"- Question {question['question_number']} unchanged")
            else:
                # Insert new question
                result = collection.insert_one(db_question)
                if result.inserted_id:
                    upserted_count += 1
                    print(f"✓ Inserted question {question['question_number']}")
                else:
                    errors.append(f"Question {question['question_number']}: Failed to insert")
            
        except Exception as e:
            errors.append(f"Question {question.get('question_number', i + 1)}: {str(e)}")
            print(f"✗ Error processing question {question.get('question_number', i + 1)}: {e}")
    
    return upserted_count, updated_count, errors

def get_collection_stats(db, certificate_id):
    """Get statistics about questions for a certificate"""
    collection = db.quizzes
    
    total_count = collection.count_documents({"certificateId": certificate_id})
    
    if total_count > 0:
        # Get question number range
        min_q_result = list(collection.find({"certificateId": certificate_id}).sort("question_no", 1).limit(1))
        max_q_result = list(collection.find({"certificateId": certificate_id}).sort("question_no", -1).limit(1))
        
        min_q_no = min_q_result[0]["question_no"] if min_q_result and "question_no" in min_q_result[0] else 0
        max_q_no = max_q_result[0]["question_no"] if max_q_result and "question_no" in max_q_result[0] else 0
        
        return total_count, min_q_no, max_q_no
    
    return 0, 0, 0

def main():
    if len(sys.argv) != 3:
        print("Usage: python upsert_questions.py <certificate_id> <json_file_path>")
        print("Example: python upsert_questions.py 688aea22950222205877d0d8 questions.json")
        sys.exit(1)
    
    certificate_id = sys.argv[1]
    json_file_path = sys.argv[2]
    
    print(f"Certificate ID: {certificate_id}")
    print(f"JSON file: {json_file_path}")
    
    # Validate certificate ID format (should be MongoDB ObjectId format)
    try:
        ObjectId(certificate_id)
    except Exception:
        print("Warning: Certificate ID doesn't appear to be a valid MongoDB ObjectId format")
    
    # Load questions from file
    questions = load_questions_from_file(json_file_path)
    if not questions:
        sys.exit(1)
    
    # Connect to MongoDB
    client, db = connect_to_mongodb()
    
    try:
        # Get current stats
        print("\n=== Current Statistics ===")
        total_before, min_q, max_q = get_collection_stats(db, certificate_id)
        print(f"Existing questions: {total_before}")
        if total_before > 0:
            print(f"Question number range: {min_q} - {max_q}")
        
        # Perform upsert
        print("\n=== Processing Questions ===")
        upserted, updated, errors = upsert_questions(db, certificate_id, questions)
        
        # Get final stats
        print("\n=== Final Statistics ===")
        total_after, min_q_after, max_q_after = get_collection_stats(db, certificate_id)
        print(f"Total questions: {total_after}")
        if total_after > 0:
            print(f"Question number range: {min_q_after} - {max_q_after}")
        
        # Summary
        print("\n=== Summary ===")
        print(f"New questions inserted: {upserted}")
        print(f"Existing questions updated: {updated}")
        print(f"Total processed: {upserted + updated}")
        print(f"Errors: {len(errors)}")
        
        if errors:
            print("\n=== Errors ===")
            for error in errors:
                print(f"- {error}")
        
        print(f"\n✓ Upsert completed successfully!")
        
    except Exception as e:
        print(f"Error during upsert process: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()
