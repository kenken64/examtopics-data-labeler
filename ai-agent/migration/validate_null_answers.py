#!/usr/bin/env python3

import json
import sys


def validate_null_answers(file_path):
    """
    Validate questions with null correct_answer and print their question numbers.
    
    Args:
        file_path (str): Path to the JSON file containing questions
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        # Handle both single question object and array of questions
        questions = data if isinstance(data, list) else [data]
        
        null_answer_questions = []
        
        for question in questions:
            if question.get('correct_answer') is None:
                question_num = question.get('question_number', 'Unknown')
                null_answer_questions.append(question_num)
                print(f"Question {question_num}: correct_answer is null")
        
        print(f"\nTotal questions with null correct_answer: {len(null_answer_questions)}")
        
        if null_answer_questions:
            print(f"Question numbers: {', '.join(map(str, null_answer_questions))}")
        
        return null_answer_questions
        
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return []
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON format - {e}")
        return []
    except Exception as e:
        print(f"Error: {e}")
        return []


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python validate_null_answers.py <json_file_path>")
        print("Example: python validate_null_answers.py questions.json")
        sys.exit(1)
    
    file_path = sys.argv[1]
    validate_null_answers(file_path)