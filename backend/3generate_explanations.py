#!/usr/bin/env python3
"""
Script to generate AI explanations for quiz questions using OpenAI API.
Reads JSON file with questions, gets explanations from OpenAI, and saves to explanations JSON file.
Appends new explanations and overwrites existing ones.
"""

import json
import os
import sys
from typing import Dict, List, Any
import openai
from openai import OpenAI
from dotenv import load_dotenv


def load_questions(file_path: str) -> List[Dict[str, Any]]:
    """Load questions from JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading JSON file: {e}")
        sys.exit(1)


def load_existing_explanations(explanations_file: str) -> Dict[str, str]:
    """Load existing explanations from JSON file."""
    if not os.path.exists(explanations_file):
        return {}
    
    try:
        with open(explanations_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Handle different formats
        if isinstance(data, list):
            # Convert array format to dictionary format
            explanations = {}
            for item in data:
                if isinstance(item, dict) and 'question_number' in item and 'explanation' in item:
                    question_num = str(item['question_number'])
                    explanations[question_num] = item['explanation']
            return explanations
        elif isinstance(data, dict):
            # Already in the correct format
            return data
        else:
            print(f"Warning: Unexpected data format in {explanations_file}")
            return {}
            
    except Exception as e:
        print(f"Warning: Could not load existing explanations: {e}")
        return {}


def save_explanations_structured(questions: List[Dict[str, Any]], explanations: Dict[str, str], file_path: str) -> None:
    """Save explanations in structured format with full question data."""
    try:
        structured_output = []
        
        for question in questions:
            question_num = str(question.get('question_number', ''))
            if question_num in explanations:
                structured_question = {
                    "question_number": question.get('question_number'),
                    "question_text": question.get('question_text', ''),
                    "answers": question.get('answers', {}),
                    "correct_answer": question.get('correct_answer', ''),
                    "explanation": explanations[question_num]
                }
                structured_output.append(structured_question)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(structured_output, f, indent=2, ensure_ascii=False)
        print(f"Structured explanations saved to {file_path}")
    except Exception as e:
        print(f"Error saving explanations file: {e}")
        sys.exit(1)


def save_explanations(explanations: Dict[str, str], file_path: str) -> None:
    """Save explanations to JSON file (legacy format)."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(explanations, f, indent=2, ensure_ascii=False)
        print(f"Explanations saved to {file_path}")
    except Exception as e:
        print(f"Error saving explanations file: {e}")
        sys.exit(1)


def format_question_for_ai(question_data: Dict[str, Any]) -> str:
    """Format question data for AI prompt."""
    question_text = question_data.get('question_text', '')
    answers = question_data.get('answers', {})
    correct_answer = question_data.get('correct_answer', '')
    
    formatted_answers = []
    
    # Handle different answer formats
    if isinstance(answers, dict):
        # Dictionary format: {"A": "Option A", "B": "Option B"}
        for key, value in answers.items():
            marker = " ✓" if key == correct_answer else ""
            formatted_answers.append(f"{key}. {value}{marker}")
    elif isinstance(answers, str):
        # String format: "- A. Option A\n- B. Option B"
        lines = answers.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line and (line.startswith('- ') or line.startswith('A.') or line.startswith('B.') or line.startswith('C.') or line.startswith('D.')):
                # Extract option letter and text
                if line.startswith('- '):
                    line = line[2:]  # Remove "- " prefix
                
                # Find the option letter
                option_letter = ''
                if line and line[0].upper() in 'ABCD' and len(line) > 1 and line[1] == '.':
                    option_letter = line[0].upper()
                    option_text = line[2:].strip()
                    
                    # Remove "**Most Voted**" if present
                    option_text = option_text.replace('**Most Voted**', '').strip()
                    
                    marker = " ✓" if option_letter == correct_answer else ""
                    formatted_answers.append(f"{option_letter}. {option_text}{marker}")
                else:
                    # Fallback: use the line as-is
                    marker = " ✓" if correct_answer and correct_answer in line else ""
                    formatted_answers.append(f"{line}{marker}")
    else:
        # Fallback for other formats
        formatted_answers.append(f"Answers: {str(answers)}")
    
    return f"""Question: {question_text}

Answer Options:
{chr(10).join(formatted_answers)}

Correct Answer: {correct_answer}

Please provide a clear, concise explanation for why option {correct_answer} is correct and why the other options are incorrect. Focus on AWS concepts and best practices."""


def get_ai_explanation(client: OpenAI, question_data: Dict[str, Any]) -> str:
    """Get explanation from OpenAI API."""
    try:
        # Validate question_data structure
        if not isinstance(question_data, dict):
            raise ValueError(f"question_data must be a dictionary, got {type(question_data)}")
        
        prompt = format_question_for_ai(question_data)
        
        if not prompt or len(prompt.strip()) == 0:
            raise ValueError("Generated prompt is empty")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are an AWS certification expert. Provide clear, accurate explanations for AWS certification questions. Be concise but thorough."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=500,
            temperature=0.3
        )
        
        if not response or not response.choices or len(response.choices) == 0:
            raise ValueError("Empty response from OpenAI API")
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty content in OpenAI response")
            
        return content.strip()
    
    except openai.RateLimitError as e:
        print(f"Rate limit error: {e}")
        return f"Rate limit exceeded. Please try again later."
    except openai.APIError as e:
        print(f"OpenAI API error: {e}")
        return f"API error: {str(e)}"
    except Exception as e:
        print(f"Error getting AI explanation: {e}")
        print(f"Question data type: {type(question_data)}")
        if isinstance(question_data, dict):
            print(f"Question data keys: {list(question_data.keys())}")
        return f"Error generating explanation: {str(e)}"


def process_questions(file_path: str, api_key: str, force_overwrite: bool = False) -> None:
    """Main function to process questions and generate explanations."""
    # Initialize OpenAI client
    client = OpenAI(api_key=api_key)
    
    # Load questions
    questions = load_questions(file_path)
    print(f"Loaded {len(questions)} questions from {file_path}")
    
    # Create explanations file paths
    base_name = os.path.splitext(file_path)[0]
    explanations_file = f"{base_name}_explanations.json"
    structured_file = f"{base_name}_structured.json"
    
    # Load existing explanations
    existing_explanations = load_existing_explanations(explanations_file)
    print(f"Loaded {len(existing_explanations)} existing explanations from {explanations_file}")
    
    # Process each question
    new_explanations_count = 0
    overwritten_count = 0
    
    for i, question in enumerate(questions, 1):
        question_num = str(question.get('question_number', i))
        
        # Always generate explanation (no skipping)
        has_existing = question_num in existing_explanations
        
        print(f"Processing question {question_num} ({i}/{len(questions)})...")
        
        # Get AI explanation
        explanation = get_ai_explanation(client, question)
        
        # Update explanations dictionary
        existing_explanations[question_num] = explanation
        
        if has_existing:
            overwritten_count += 1
            print(f"Question {question_num}: Overwritten explanation ({len(explanation)} chars)")
        else:
            new_explanations_count += 1
            print(f"Question {question_num}: Added new explanation ({len(explanation)} chars)")
    
    # Save explanations in both formats
    save_explanations(existing_explanations, explanations_file)
    save_explanations_structured(questions, existing_explanations, structured_file)
    print(f"Processing complete! New: {new_explanations_count}, Overwritten: {overwritten_count}, Total: {len(existing_explanations)}")
    print(f"Files saved: {explanations_file}, {structured_file}")


def main():
    """Main entry point."""
    # Load environment variables from .env file
    load_dotenv()
    
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        print("Usage: python generate_explanations.py <json_file_path> [--force]")
        print("  --force: Overwrite existing explanations")
        sys.exit(1)
    
    json_file = sys.argv[1]
    force_overwrite = len(sys.argv) == 3 and sys.argv[2] == '--force'
    
    # Check if file exists
    if not os.path.exists(json_file):
        print(f"Error: File {json_file} not found")
        sys.exit(1)
    
    # Get OpenAI API key from environment
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("Error: OPENAI_API_KEY not found in environment variables or .env file")
        print("Please add OPENAI_API_KEY='your-api-key' to your .env file")
        sys.exit(1)
    
    if force_overwrite:
        print("Force overwrite mode enabled - will overwrite existing explanations")
    
    # Process questions
    process_questions(json_file, api_key, force_overwrite)


if __name__ == '__main__':
    main()