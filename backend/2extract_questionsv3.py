#!/usr/bin/env python3
"""
Extract question data from markdown file and convert to JSON format.
Extracts: question number, question text, answers, correct answer, and explanations.
"""

import re
import json
import argparse
from pathlib import Path
from typing import Dict, List, Optional


def extract_questions_from_markdown(file_path: str) -> List[Dict]:
    """
    Extract questions from markdown file.
    
    Args:
        file_path: Path to the markdown file
        
    Returns:
        List of dictionaries containing question data
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    questions = []
    
    # Split content by question headers - handle multiple formats
    # Patterns: ## Question #1, ### Question #6, **Question #5**, **QUESTION 5**, **QUESTION 94**, QUESTION 3
    # Updated pattern to handle inline occurrences and various formatting
    question_pattern = r'(?:^|\n)(?:#{2,3}\s+|\*\*)?(?:QUESTION|Question)\s+#?(\d+)(?:\*\*)?'
    question_splits = re.split(question_pattern, content, flags=re.MULTILINE)
    
    # Skip the first split (content before first question)
    for i in range(1, len(question_splits), 2):
        question_number = question_splits[i]
        question_content = question_splits[i + 1] if i + 1 < len(question_splits) else ""
        
        question_data = parse_question_content(question_number, question_content)
        if question_data:
            questions.append(question_data)
    
    return questions


def extract_explanation_after_votes(content: str) -> str:
    """
    Extract explanation from the new format.
    
    Args:
        content: The question content
        
    Returns:
        The explanation text or empty string if not found
    """
    try:
        # Look for the pattern: **Explanation/Reference:**  **Explanation:**  [explanation text]
        explanation_match = re.search(r'\*\*Explanation/Reference:\*\*\s*\*\*Explanation:\*\*(.*)', content, re.DOTALL)
        
        if explanation_match:
            explanation_text = explanation_match.group(1).strip()
        else:
            # Fallback: look for just **Explanation:** pattern
            explanation_match = re.search(r'\*\*Explanation:\*\*(.*)', content, re.DOTALL)
            if explanation_match:
                explanation_text = explanation_match.group(1).strip()
            else:
                return ""
        
        # Clean up the explanation text
        # Remove common markdown artifacts
        explanation_text = re.sub(r'```markdown\n?', '', explanation_text)
        explanation_text = re.sub(r'```\n?', '', explanation_text)
        
        return explanation_text
        
    except Exception as e:
        return ""


def extract_correct_answer_from_votes(content: str) -> Optional[str]:
    """
    Extract correct answer from the new format.
    
    Args:
        content: The question content
        
    Returns:
        The correct answer option(s) or None if not found
    """
    try:
        # Look for the pattern: **Correct Answer:** C (or AB, etc.) - updated to handle both formats
        correct_answer_match = re.search(r'\*\*Correct Answer:\*\*\s*([A-Z]+(?:,\s*[A-Z]+)*)', content)
        if not correct_answer_match:
            # Try the alternative format: **Correct Answer: C**
            correct_answer_match = re.search(r'\*\*Correct Answer:\s*([A-Z]+(?:,\s*[A-Z]+)*)\*\*', content)
        if not correct_answer_match:
            # Try the plain format: Correct Answer: C (without asterisks)
            correct_answer_match = re.search(r'Correct Answer:\s*([A-Z]+(?:,\s*[A-Z]+)*)', content)
        
        if correct_answer_match:
            # Clean up the answer (remove spaces and commas, normalize to single string)
            answer = correct_answer_match.group(1).replace(',', '').replace(' ', '')
            return answer
        
        # For HOTSPOT questions, look for **Correct Answer:** or ### Correct Answer: followed by steps
        if ("**Correct Answer:**" in content or "### Correct Answer:" in content) and ("### Step" in content or "**Step" in content or "City (name)" in content):
            # Extract the correct answer section - handle both ** and ### formats
            correct_answer_section = re.search(r'(?:\*\*Correct Answer:\*\*|### Correct Answer:)(.*?)(?=\*\*Section:|\*\*Explanation|### Section)', content, re.DOTALL)
            
            if correct_answer_section:
                correct_content = correct_answer_section.group(1).strip()
                
                # Look for content within ```markdown blocks first
                markdown_block = re.search(r'```markdown(.*?)```', correct_content, re.DOTALL)
                if markdown_block:
                    search_content = markdown_block.group(1)
                else:
                    search_content = correct_content
                
                # Extract the selected options from each step (marked with **)
                correct_steps = {}
                
                # First try to find Step-based format (Questions 5, 7)
                step_sections = re.findall(r'### (Step \d+):(.*?)(?=### Step \d+:|---|\Z)', search_content, re.DOTALL)
                
                if step_sections:
                    # Handle step-based questions
                    for step_name, step_content in step_sections:
                        # Find text marked with ** within this step
                        bold_matches = re.findall(r'\*\*([^*]+)\*\*', step_content)
                        
                        # Filter out common markdown artifacts and find the actual selected option
                        for bold_text in bold_matches:
                            bold_text = bold_text.strip()
                            # Skip if it's just formatting text like "Step 1:" or "Select..."
                            if bold_text not in ["Step 1", "Step 2", "Step 3", "Select...", "Select", ""]:
                                correct_steps[step_name] = bold_text
                                break  # Take the first valid option found
                else:
                    # Try feature-based format (Question 9) - line by line approach
                    lines = search_content.split('\n')
                    current_feature = None
                    
                    for line in lines:
                        line = line.strip()
                        
                        # Check if this is a feature header line (must have colon inside the **)
                        feature_match = re.match(r'- \*\*([^*]+):\*\*', line)
                        if feature_match:
                            current_feature = feature_match.group(1).strip()
                            continue
                        
                        # Check if this line has a bold answer (no colon)
                        if current_feature and '**' in line and not line.startswith('- Select'):
                            bold_match = re.search(r'- \*\*([^*]+)\*\*', line)
                            if bold_match:
                                answer = bold_match.group(1).strip()
                                # Make sure this is not a feature header (no colon)
                                if ':' not in answer:
                                    if answer not in ["Select...", "Select", ""] and len(answer) > 3:
                                        correct_steps[current_feature] = answer
                
                # Convert to JSON string if we found steps/features
                if correct_steps:
                    return json.dumps(correct_steps)
                else:
                    # Fallback to the old method if the new method doesn't work
                    step_matches = re.findall(r'(?:###|^\*\*)\s*Step \d+:.*?\*\*([^*]+)\*\*', correct_content, re.DOTALL | re.MULTILINE)
                    correct_steps_list = []
                    for match in step_matches:
                        step_answer = match.strip().replace('\n', ' ')
                        if step_answer and step_answer not in correct_steps_list:
                            correct_steps_list.append(step_answer)
                    return ' | '.join(correct_steps_list) if correct_steps_list else None
        
        return None
        
    except Exception as e:
        return None


def parse_hotspot_question(question_number: str, content: str) -> Optional[Dict]:
    """
    Parse HOTSPOT question content (both step-based and simple formats).
    
    Args:
        question_number: The question number
        content: The content for this question
        
    Returns:
        Dictionary with question data or None if parsing fails
    """
    try:
        # Handle step-based HOTSPOT questions with **Step pattern
        if "**Step" in content:
            # Extract question text (everything from start until "**Hot Area:**")
            question_text_match = re.search(r'^\s*(.*?)(?=\*\*Hot Area:\*\*)', content, re.DOTALL)
            
            if not question_text_match:
                return None
            
            question_text = question_text_match.group(1).strip()
            
            # Extract the dropdown options (items between "Hot Area:" and "**Correct Answer:**")
            hot_area_match = re.search(r'\*\*Hot Area:\*\*(.*?)(?=\*\*Correct Answer:\*\*)', content, re.DOTALL)
            
            if hot_area_match:
                hot_area_content = hot_area_match.group(1).strip()
                
                # Find all steps and their options
                step_pattern = r'\*\*Step (\d+):\*\*(.*?)(?=\*\*Step \d+:|\*\*Correct Answer:|\Z)'
                step_matches = re.findall(step_pattern, hot_area_content, re.DOTALL)
                
                # Create step-based structure
                steps_data = {}
                unique_options = set()
                
                for step_num, step_content in step_matches:
                    # Extract all options for this step
                    option_matches = re.findall(r'-\s+([^-\n]+)', step_content)
                    
                    # Clean and filter options
                    step_options = []
                    for option in option_matches:
                        option = option.strip()
                        if option != "Select..." and option:
                            step_options.append(option)
                            unique_options.add(option)
                    
                    steps_data[f"step{step_num}"] = step_options
                
                # Convert to JSON string for the answers field
                answers = json.dumps(steps_data, indent=2)
            else:
                answers = ""
        
        # Handle step-based HOTSPOT questions with ### Step pattern (Question 6)
        elif "### Step" in content:
            # Extract question text (everything from start until "**Hot Area:**")
            question_text_match = re.search(r'^\s*(.*?)(?=\*\*Hot Area:\*\*)', content, re.DOTALL)
            
            if not question_text_match:
                return None
            
            question_text = question_text_match.group(1).strip()
            
            # Extract all available options from the initial list
            initial_options_match = re.search(r'^((?:^-\s+.*?$\n?)+)', content, re.MULTILINE)
            available_options = []
            if initial_options_match:
                options_text = initial_options_match.group(1)
                for line in options_text.split('\n'):
                    if line.strip().startswith('-'):
                        option = line.strip()[1:].strip()
                        if option:
                            available_options.append(option)
            
            # Create step-based structure with all available options for each step
            steps_data = {}
            for i in range(1, 4):  # Assuming 3 steps for step-based questions
                steps_data[f"step{i}"] = available_options.copy()
            
            # Convert to JSON string for the answers field
            answers = json.dumps(steps_data, indent=2)
        
        # Handle feature-mapping HOTSPOT questions (Question 9)
        elif "### Hot Area:" in content or "**Hot Area:**" in content:
            # Extract question text (everything from start until "### Hot Area:" or "**Hot Area:**")
            question_text_match = re.search(r'^\s*(.*?)(?=###\s*Hot Area:|### Hot Area:|\*\*Hot Area:\*\*)', content, re.DOTALL)
            
            if not question_text_match:
                return None
            
            question_text = question_text_match.group(1).strip()
            
            # Extract all available options from the initial list
            initial_options_match = re.search(r'^((?:^-\s+.*?$\n?)+)', content, re.MULTILINE)
            available_options = []
            if initial_options_match:
                options_text = initial_options_match.group(1)
                for line in options_text.split('\n'):
                    if line.strip().startswith('-'):
                        option = line.strip()[1:].strip()
                        if option:
                            available_options.append(option)
            
            # Create step-based structure with all available options for each step
            steps_data = {}
            for i in range(1, 4):  # Assuming 3 steps for step-based questions
                steps_data[f"step{i}"] = available_options.copy()
            
            # Convert to JSON string for the answers field
            answers = json.dumps(steps_data, indent=2)
        
        else:
            # Handle simple HOTSPOT questions - fallback for other formats
            # Extract question text (everything from start until option list)
            question_text_match = re.search(r'^\s*(.*?)(?=\n-\s+)', content, re.DOTALL)
            
            if not question_text_match:
                return None
            
            question_text = question_text_match.group(1).strip()
            
            # Extract option list (everything from first "- " until "**Hot Area:**" or end)
            if "**Hot Area:**" in content:
                options_match = re.search(r'(-\s+.*?)(?=\*\*Hot Area:\*\*)', content, re.DOTALL)
            else:
                # If no Hot Area, extract all options from first dash to end
                options_match = re.search(r'(-\s+.*)', content, re.DOTALL)
            
            if options_match:
                options_text = options_match.group(1).strip()
                # Extract individual options
                option_lines = [line.strip() for line in options_text.split('\n') if line.strip().startswith('-')]
                answers = '\n'.join(option_lines)
            else:
                answers = ""
        
        # Extract correct answer from the correct answer section
        correct_answer = extract_correct_answer_from_votes(content)
        
        # Extract explanation
        explanation = extract_explanation_after_votes(content)
        
        # Create the result dictionary
        result = {
            "question_number": int(question_number),
            "question_text": question_text,
            "answers": answers,
            "correct_answer": correct_answer,
            "explanation": explanation
        }
        
        # Add type field if answers or correct_answer is a JSON string (step-based questions)
        if (isinstance(answers, str) and answers.strip().startswith('{')) or \
           (isinstance(correct_answer, str) and correct_answer and correct_answer.strip().startswith('{')):
            result["type"] = "steps"
        
        return result
        
    except Exception as e:
        print(f"Error parsing hotspot question {question_number}: {e}")
        return None


def parse_question_content(question_number: str, content: str) -> Optional[Dict]:
    """
    Parse individual question content to extract structured data.
    
    Args:
        question_number: The question number
        content: The content for this question
        
    Returns:
        Dictionary with question data or None if parsing fails
    """
    try:
        # Check if this is a HOTSPOT question (either step-based or simple)
        if "**HOTSPOT**" in content or "HOTSPOT" in content:
            return parse_hotspot_question(question_number, content)
        
        # Extract question text (everything from start until first answer option)
        # First, check if there's a **Case Study** line
        case_study_match = re.search(r'^\s*\*\*Case Study\*\*\s*\n\n(.*?)(?=\n[A-D]\.)', content, re.DOTALL)
        
        if case_study_match:
            # If there's a case study, the question text includes it
            question_text = case_study_match.group(1).strip()
        else:
            # No case study, extract question text directly - handle various patterns
            # Look for text until first A. B. C. or D. option at start of line
            question_text_match = re.search(r'^\s*(.*?)(?=\n\s*[A-D]\.\s)', content, re.DOTALL)
            if not question_text_match:
                # Fallback: try without requiring line start
                question_text_match = re.search(r'^\s*(.*?)(?=[A-D]\.\s)', content, re.DOTALL)
            if not question_text_match:
                return None
            question_text = question_text_match.group(1).strip()
        
        # Extract answer options as a list structure
        answer_options = []
        
        # Find all answer options (A. B. C. D. pattern) and end markers
        # Look for lines that start with A. B. C. or D. followed by space
        answer_matches = re.findall(r'\n\s*([A-D]\.\s+.*?)(?=\n\s*[A-D]\.|$|---|\*\*Correct Answer|\n\n|\Z)', content, re.DOTALL)
        
        # If no matches with newline prefix, try without it (for first option)
        if not answer_matches:
            answer_matches = re.findall(r'([A-D]\.\s+.*?)(?=\n\s*[A-D]\.|$|---|\*\*Correct Answer|\n\n|\Z)', content, re.DOTALL)
        
        for match in answer_matches:
            option_text = match.strip()
            # Clean up markdown artifacts
            option_text = re.sub(r'```\w*\n?', '', option_text)
            option_text = re.sub(r'\n```$', '', option_text)
            option_text = option_text.strip()
            if option_text:
                answer_options.append(option_text)
        
        # Convert to structured format: both as list and as string for compatibility
        answers_list = answer_options
        answers_string = '\n'.join(answer_options)
        
        # Extract correct answer (may be None if not present)
        correct_answer = extract_correct_answer_from_votes(content)
        
        # Extract explanation (may be empty if not present)
        explanation = extract_explanation_after_votes(content)
        
        # Create the result dictionary
        result = {
            "question_number": int(question_number),
            "question_text": question_text,
            "answers": answers_list,  # List format for better structure
            "answers_string": answers_string,  # String format for compatibility
            "correct_answer": correct_answer,
            "explanation": explanation
        }
        
        # Add type field if answers or correct_answer is a JSON string (step-based questions)
        if (isinstance(correct_answer, str) and correct_answer and correct_answer.strip().startswith('{')):
            result["type"] = "steps"
        
        return result
        
    except Exception as e:
        print(f"Error parsing question {question_number}: {e}")
        return None


def extract_answers_list_from_markdown(file_path: str) -> List[str]:
    """
    Extract just the answer options from markdown file, returning a simple list.
    
    Args:
        file_path: Path to the markdown file
        
    Returns:
        List of answer options (A. text, B. text, etc.)
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    answers_list = []
    
    # Find all answer options using pattern A. B. C. D. format
    answer_pattern = r'^([A-D]\.\s+.+)$'
    
    for line in content.split('\n'):
        line = line.strip()
        if re.match(answer_pattern, line):
            answers_list.append(line)
    
    return answers_list


def main():
    """Main function to handle command line arguments and process the file."""
    parser = argparse.ArgumentParser(description='Extract questions from markdown file to JSON')
    parser.add_argument('input_file', help='Input markdown file path')
    parser.add_argument('-o', '--output', help='Output JSON file path (default: questions.json)', 
                       default='questions.json')
    parser.add_argument('--answers-only', action='store_true', 
                       help='Extract only answer options as a simple list')
    
    args = parser.parse_args()
    
    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"Error: Input file {input_path} does not exist")
        return 1
    
    if args.answers_only:
        print(f"Extracting answers list from {input_path}...")
        answers_list = extract_answers_list_from_markdown(str(input_path))
        
        if not answers_list:
            print("No answers were extracted")
            return 1
        
        # Change output file extension to .txt for answers list
        output_path = Path(args.output).with_suffix('.txt')
        with open(output_path, 'w', encoding='utf-8') as f:
            for answer in answers_list:
                f.write(answer + '\n')
        
        print(f"Successfully extracted {len(answers_list)} answers to {output_path}")
        
        # Print first few answers as preview
        print("\nFirst 5 answers:")
        for answer in answers_list[:5]:
            print(f"  {answer}")
        
        if len(answers_list) > 5:
            print(f"... and {len(answers_list) - 5} more answers")
        
        return 0
    else:
        print(f"Extracting questions from {input_path}...")
        questions = extract_questions_from_markdown(str(input_path))
        
        if not questions:
            print("No questions were extracted")
            return 1
        
        output_path = Path(args.output)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        
        print(f"Successfully extracted {len(questions)} questions to {output_path}")
        
        # Print summary
        print("\nSummary:")
        for q in questions[:3]:  # Show first 3 questions as preview
            explanation_length = len(q['explanation']) if q['explanation'] else 0
            print(f"Question #{q['question_number']}: {len(q['answers'])} answers, "
                  f"correct: {q['correct_answer']}, explanation: {explanation_length} chars")
        
        if len(questions) > 3:
            print(f"... and {len(questions) - 3} more questions")
        
        return 0


if __name__ == "__main__":
    exit(main())