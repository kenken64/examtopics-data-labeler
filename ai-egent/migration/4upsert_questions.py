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
    """Parse answers from markdown-style string format to dictionary"""
    if isinstance(answers_string, dict):
        return answers_string
    
    if not isinstance(answers_string, str):
        return {}
    
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
    
    # Parse answers if they're in string format
    if isinstance(question['answers'], str):
        parsed_answers = parse_answers_from_string(question['answers'])
        question['answers'] = parsed_answers
    
    # Validate answers structure
    if not isinstance(question['answers'], dict):
        print(f"Warning: Question {index + 1} 'answers' field should be an object")
        return False
    
    if not question['answers']:
        print(f"Warning: Question {index + 1} has no valid answer options")
        return False
    
    # Check if correct_answer exists in answers (warn but don't fail)
    if question['correct_answer'] not in question['answers']:
        print(f"Warning: Question {index + 1} correct_answer '{question['correct_answer']}' not found in answers")
        # Don't return False - allow insertion with warning
    
    return True

def transform_question_for_db(question, certificate_id):
    """Transform question from JSON format to database format"""
    # Convert answers to string format
    answers_dict = question['answers']
    answers_string = ""
    
    if isinstance(answers_dict, dict):
        # Convert dictionary to string format
        answer_lines = []
        for key, value in answers_dict.items():
            answer_lines.append(f"{key}. {str(value)}")
        answers_string = "\n".join(answer_lines)
    elif isinstance(answers_dict, str):
        # Already a string
        answers_string = answers_dict
    else:
        # Convert other types to string
        answers_string = str(answers_dict)
    
    return {
        "certificateId": certificate_id,
        "question_no": question['question_number'],
        "question": question['question_text'],
        "answers": answers_string,
        "correctAnswer": question['correct_answer'],
        "explanation": question['explanation'],
        "difficulty": question.get('difficulty', 'medium'),
        "tags": question.get('tags', []),
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc)
    }

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
