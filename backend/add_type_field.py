#!/usr/bin/env python3
"""
Script to add 'type': 'steps' field to questions where answers is a JSON string
but the type field is missing.
"""

import json
import argparse
from pathlib import Path


def add_type_field_to_json(input_file: str, output_file: str = None) -> None:
    """
    Add type field to questions with JSON answers that are missing the type field.
    
    Args:
        input_file: Path to input JSON file
        output_file: Path to output JSON file (if None, overwrites input file)
    """
    # Read the JSON file
    with open(input_file, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    modified_count = 0
    
    # Process each question
    for question in questions:
        # Check if answers is a JSON string and type field is missing
        if (isinstance(question.get('answers'), str) and 
            question['answers'].strip().startswith('{') and 
            'type' not in question):
            
            question['type'] = 'steps'
            modified_count += 1
            print(f"Added type field to Question #{question['question_number']}")
    
    # Write the updated JSON
    output_path = output_file if output_file else input_file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    
    print(f"\nModified {modified_count} questions")
    print(f"Updated file saved to: {output_path}")


def main():
    """Main function to handle command line arguments."""
    parser = argparse.ArgumentParser(description='Add type field to step-based questions')
    parser.add_argument('input_file', help='Input JSON file path')
    parser.add_argument('-o', '--output', help='Output JSON file path (default: overwrite input)', 
                       default=None)
    
    args = parser.parse_args()
    
    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"Error: Input file {input_path} does not exist")
        return 1
    
    add_type_field_to_json(str(input_path), args.output)
    return 0


if __name__ == '__main__':
    exit(main())
