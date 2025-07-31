#!/usr/bin/env python3
"""
Script to extract specific questions from SAP_C02_529_1.json based on question numbers in answer.txt
"""

import json
import os
import sys

def read_question_numbers(answer_file):
    """Read question numbers from answer.txt file"""
    question_numbers = []
    try:
        with open(answer_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and line.isdigit():
                    question_numbers.append(int(line))
        return question_numbers
    except FileNotFoundError:
        print(f"Error: {answer_file} not found")
        return []
    except Exception as e:
        print(f"Error reading {answer_file}: {e}")
        return []

def load_questions_json(json_file):
    """Load questions from JSON file"""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        print(f"Error: {json_file} not found")
        return []
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON from {json_file}: {e}")
        return []
    except Exception as e:
        print(f"Error loading {json_file}: {e}")
        return []

def find_question_by_number(questions_data, question_number):
    """Find a question by its number in the JSON data"""
    # Handle both list and dict formats
    if isinstance(questions_data, list):
        for question in questions_data:
            if question.get('question_number') == question_number:
                return question
    elif isinstance(questions_data, dict):
        # If it's a dict, check if it has questions as a list
        if 'questions' in questions_data:
            for question in questions_data['questions']:
                if question.get('question_number') == question_number:
                    return question
        # Or if the dict itself is a question
        elif questions_data.get('question_number') == question_number:
            return questions_data
    
    return None

def save_questions_to_file(questions, output_file="extracted_questions.json"):
    """Save all questions to a single JSON file"""
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        print(f"Saved {len(questions)} questions to {output_file}")
        return True
    except Exception as e:
        print(f"Error saving questions to {output_file}: {e}")
        return False

def main():
    # File paths
    answer_file = "questions.txt"
    json_file = "SAP_C02_529_1.json"
    
    # Check if files exist
    if not os.path.exists(answer_file):
        print(f"Error: {answer_file} not found in current directory")
        sys.exit(1)
    
    if not os.path.exists(json_file):
        print(f"Error: {json_file} not found in current directory")
        sys.exit(1)
    
    # Read question numbers from answer.txt
    print(f"Reading question numbers from {answer_file}...")
    question_numbers = read_question_numbers(answer_file)
    
    if not question_numbers:
        print("No valid question numbers found in answer.txt")
        sys.exit(1)
    
    print(f"Found {len(question_numbers)} question numbers: {question_numbers}")
    
    # Load questions JSON
    print(f"Loading questions from {json_file}...")
    questions_data = load_questions_json(json_file)
    
    if not questions_data:
        print("No questions data loaded")
        sys.exit(1)
    
    # Extract questions
    extracted_questions = []
    not_found = []
    
    for question_number in question_numbers:
        print(f"Looking for question {question_number}...")
        question = find_question_by_number(questions_data, question_number)
        
        if question:
            extracted_questions.append(question)
            print(f"Found question {question_number}")
        else:
            print(f"Question {question_number} not found in JSON data")
            not_found.append(question_number)
    
    # Save all questions to one file
    output_file = "extracted_questions.json"
    if extracted_questions:
        save_questions_to_file(extracted_questions, output_file)
    
    # Summary
    print(f"\n=== Summary ===")
    print(f"Total questions requested: {len(question_numbers)}")
    print(f"Successfully extracted: {len(extracted_questions)}")
    print(f"Not found: {len(not_found)}")
    
    if not_found:
        print(f"Questions not found: {not_found}")
    
    if extracted_questions:
        print(f"All extracted questions saved to '{output_file}'")

if __name__ == "__main__":
    main()