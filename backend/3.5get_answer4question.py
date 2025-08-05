#!/usr/bin/env python3
"""
Script to determine correct answers and generate AI explanations for quiz questions using OpenAI API.
Reads JSON file with questions, uses GPT-4o to determine correct answers and explanations,
updates the original JSON file with correct answers, and saves explanations to separate files.
"""

import json
import os
import sys
from typing import Dict, List, Any, Tuple
import openai
from openai import OpenAI
import anthropic
from anthropic import Anthropic
from dotenv import load_dotenv


def load_questions(file_path: str) -> List[Dict[str, Any]]:
    """Load questions from JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading JSON file: {e}")
        sys.exit(1)


def load_test_questions(test_file_path: str) -> List[int]:
    """Load question numbers from test.txt file, skipping those marked with **."""
    try:
        with open(test_file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        question_numbers = []
        for line in lines:
            line = line.strip()
            if line and not line.endswith('**'):
                try:
                    question_num = int(line)
                    question_numbers.append(question_num)
                except ValueError:
                    continue
        
        print(f"Loaded {len(question_numbers)} question numbers from {test_file_path}")
        print(f"Question numbers to process: {question_numbers}")
        return question_numbers
    except Exception as e:
        print(f"Error loading test file: {e}")
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


def format_multistep_question_for_ai(question_data: Dict[str, Any]) -> str:
    """Format multi-step question data for AI prompt to determine correct answers for each step."""
    question_text = question_data.get('question_text', '')
    answers = question_data.get('answers', {})
    question_type = question_data.get('type', '')
    
    # Check if it's a multi-step question
    if question_type != 'steps':
        return format_regular_question_for_ai(question_data)
    
    formatted_content = []
    formatted_content.append(f"Question: {question_text}")
    formatted_content.append("")
    
    try:
        # Parse the answers JSON string
        if isinstance(answers, str):
            import json
            answers_data = json.loads(answers)
        else:
            answers_data = answers
        
        # Handle different multi-step formats
        if isinstance(answers_data, dict):
            # Check if it's step-based format (step1, step2, etc.)
            step_keys = [k for k in answers_data.keys() if k.startswith('step')]
            scenario_keys = [k for k in answers_data.keys() if k.startswith('scenario')]
            item_keys = [k for k in answers_data.keys() if k.startswith('item')]
            
            if step_keys:
                # Step-based format
                formatted_content.append("This is a multi-step ordering question. You need to select the correct option for each step from the dropdown menus.")
                formatted_content.append("")
                
                for step_key in sorted(step_keys):
                    step_options = answers_data[step_key]
                    step_num = step_key.replace('step', '')
                    formatted_content.append(f"Step {step_num} options:")
                    for i, option in enumerate(step_options):
                        formatted_content.append(f"  {chr(65+i)}. {option}")
                    formatted_content.append("")
                
                formatted_content.append("Determine the correct sequence/order for these steps based on AWS best practices.")
                
            elif scenario_keys or item_keys:
                # Scenario/item-based format
                formatted_content.append("This is a matching question. For each scenario/item, select the most appropriate option from the dropdown.")
                formatted_content.append("")
                
                keys_to_process = scenario_keys if scenario_keys else item_keys
                
                for key in sorted(keys_to_process):
                    scenario_data = answers_data[key]
                    if isinstance(scenario_data, dict):
                        description = scenario_data.get('description', '')
                        options = scenario_data.get('options', [])
                        
                        formatted_content.append(f"{key.capitalize()}: {description}")
                        formatted_content.append("Available options:")
                        for i, option in enumerate(options):
                            formatted_content.append(f"  {chr(65+i)}. {option}")
                        formatted_content.append("")
                
                formatted_content.append("For each scenario, determine the most appropriate option based on AWS best practices.")
        
        else:
            # Fallback to regular format if structure is unexpected
            return format_regular_question_for_ai(question_data)
            
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        print(f"Warning: Could not parse multi-step answers format: {e}")
        return format_regular_question_for_ai(question_data)
    
    formatted_content.append("")
    formatted_content.append("Based on AWS best practices and concepts, please:")
    formatted_content.append("1. For each step/scenario, identify the correct option (A, B, C, etc.)")
    formatted_content.append("2. Provide a clear explanation for your choices")
    formatted_content.append("")
    formatted_content.append("Format your response as:")
    formatted_content.append("CORRECT_ANSWER: [For each step/scenario, provide the letter (e.g., 'step1:A step2:B step3:C' or 'scenario1:A scenario2:B')]")
    formatted_content.append("EXPLANATION: [Your detailed explanation for each choice]")
    
    return '\n'.join(formatted_content)


def parse_ai_response(content: str, question_data: Dict[str, Any]) -> Tuple[str, str]:
    """Parse AI response to extract correct answer and explanation."""
    content = content.strip()
    correct_answer = ""
    explanation = ""
    question_type = question_data.get('type', '')
    
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('CORRECT_ANSWER:'):
            # Extract the answer(s) after the colon
            answer_part = line.split(':', 1)[1].strip()
            
            if question_type == 'steps':
                # Handle multi-step format like "step1:A step2:B step3:C"
                correct_answer = answer_part
            else:
                # Handle single/multiple choice format
                answer_letters = []
                for char in answer_part.split():
                    if char and char[0].upper() in 'ABCD':
                        answer_letters.append(char[0].upper())
                if answer_letters:
                    correct_answer = ' '.join(sorted(answer_letters))
        elif line.startswith('EXPLANATION:'):
            # Get explanation from this line and all following lines
            explanation_part = line.split(':', 1)[1].strip()
            remaining_lines = lines[i+1:]
            if remaining_lines:
                explanation = explanation_part + '\n' + '\n'.join(remaining_lines)
            else:
                explanation = explanation_part
            break
    
    # Fallback: if format not found, try to extract from the content
    if not correct_answer:
        if question_type == 'steps':
            # For multi-step questions, look for step patterns
            import re
            step_matches = re.findall(r'(step\d+|scenario\d+|item\d+):\s*([A-D])', content, re.IGNORECASE)
            if step_matches:
                step_answers = []
                for step, letter in step_matches:
                    step_answers.append(f"{step.lower()}:{letter.upper()}")
                correct_answer = ' '.join(step_answers)
        else:
            # Look for patterns like "The correct answer is A" or "Answer: B C"
            import re
            answer_match = re.search(r'(?:correct answer(?:s)? (?:is|are)|answer(?:s)?:|^)\s*([ABCD\s]+)', content, re.IGNORECASE | re.MULTILINE)
            if answer_match:
                answer_letters = []
                for char in answer_match.group(1).split():
                    if char and char[0].upper() in 'ABCD':
                        answer_letters.append(char[0].upper())
                if answer_letters:
                    correct_answer = ' '.join(sorted(answer_letters))
    
    if not explanation:
        explanation = content
    
    return correct_answer, explanation.strip()


def format_question_for_ai(question_data: Dict[str, Any]) -> str:
    """Format question data for AI prompt to determine correct answer."""
    question_type = question_data.get('type', '')
    
    # Check if this is a multi-step question
    if question_type == 'steps':
        return format_multistep_question_for_ai(question_data)
    else:
        return format_regular_question_for_ai(question_data)


def format_regular_question_for_ai(question_data: Dict[str, Any]) -> str:
    """Format regular (non-multi-step) question data for AI prompt to determine correct answer."""
    question_text = question_data.get('question_text', '')
    answers = question_data.get('answers', {})
    
    formatted_answers = []
    
    # Handle different answer formats
    if isinstance(answers, dict):
        # Dictionary format: {"A": "Option A", "B": "Option B"}
        for key, value in answers.items():
            formatted_answers.append(f"{key}. {value}")
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
                if line and line[0].upper() in 'ABCD' and len(line) > 1 and line[1] == '.':
                    option_letter = line[0].upper()
                    option_text = line[2:].strip()
                    
                    # Remove "**Most Voted**" if present
                    option_text = option_text.replace('**Most Voted**', '').strip()
                    
                    formatted_answers.append(f"{option_letter}. {option_text}")
                else:
                    # Fallback: use the line as-is
                    formatted_answers.append(f"{line}")
    else:
        # Fallback for other formats
        formatted_answers.append(f"Answers: {str(answers)}")
    
    return f"""Question: {question_text}

Answer Options:
{chr(10).join(formatted_answers)}

Based on AWS best practices and concepts, please:
1. Identify the correct answer(s). For single-answer questions, respond with just one letter (A, B, C, or D). For multiple-answer questions, respond with multiple letters separated by spaces (e.g., "B C" or "A D")
2. Provide a clear explanation for why these options are correct and why the other options are incorrect

Format your response as:
CORRECT_ANSWER: [Letter(s) separated by spaces]
EXPLANATION: [Your explanation]"""


def get_ai_answer_and_explanation_openai(client: OpenAI, question_data: Dict[str, Any], num_attempts: int = 3) -> List[Tuple[str, str]]:
    """Get multiple correct answers and explanations from OpenAI API for a single question."""
    results = []
    
    try:
        # Validate question_data structure
        if not isinstance(question_data, dict):
            raise ValueError(f"question_data must be a dictionary, got {type(question_data)}")
        
        prompt = format_question_for_ai(question_data)
        
        if not prompt or len(prompt.strip()) == 0:
            raise ValueError("Generated prompt is empty")
        
        # Make multiple API calls for the same question to get different perspectives
        for attempt in range(num_attempts):
            print(f"  Attempt {attempt + 1}/{num_attempts} for question {question_data.get('question_number', 'unknown')}")
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an AWS certification expert. Analyze each question carefully and determine the correct answer based on AWS best practices, documentation, and services. Always provide your response in the requested format."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=800,
                temperature=0.2 + (attempt * 0.1)  # Slightly vary temperature for different perspectives
            )
            
            if not response or not response.choices or len(response.choices) == 0:
                print(f"    Warning: Empty response for attempt {attempt + 1}")
                continue
            
            content = response.choices[0].message.content
            if not content:
                print(f"    Warning: Empty content for attempt {attempt + 1}")
                continue
            
            # Parse the response to extract correct answer and explanation
            correct_answer, explanation = parse_ai_response(content, question_data)
            
            if correct_answer and explanation:
                results.append((correct_answer, explanation.strip()))
                print(f"    Answer {attempt + 1}: {correct_answer}")
            else:
                print(f"    Warning: Could not parse answer/explanation for attempt {attempt + 1}")
        
        return results
    
    except openai.RateLimitError as e:
        print(f"Rate limit error: {e}")
        return [("", f"Rate limit exceeded. Please try again later.")]
    except openai.APIError as e:
        print(f"OpenAI API error: {e}")
        return [("", f"API error: {str(e)}")]
    except Exception as e:
        print(f"Error getting AI answer and explanation: {e}")
        print(f"Question data type: {type(question_data)}")
        if isinstance(question_data, dict):
            print(f"Question data keys: {list(question_data.keys())}")
        return [("", f"Error generating answer and explanation: {str(e)}")]


def get_ai_answer_and_explanation_claude(client: Anthropic, question_data: Dict[str, Any], num_attempts: int = 3) -> List[Tuple[str, str]]:
    """Get multiple correct answers and explanations from Claude API for a single question."""
    results = []
    
    try:
        # Validate question_data structure
        if not isinstance(question_data, dict):
            raise ValueError(f"question_data must be a dictionary, got {type(question_data)}")
        
        prompt = format_question_for_ai(question_data)
        
        if not prompt or len(prompt.strip()) == 0:
            raise ValueError("Generated prompt is empty")
        
        # Make multiple API calls for the same question to get different perspectives
        for attempt in range(num_attempts):
            print(f"  Claude attempt {attempt + 1}/{num_attempts} for question {question_data.get('question_number', 'unknown')}")
            
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=800,
                temperature=0.2 + (attempt * 0.1),  # Slightly vary temperature for different perspectives
                system="You are an AWS certification expert. Analyze each question carefully and determine the correct answer(s) based on AWS best practices, documentation, and services. Always provide your response in the requested format.",
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            if not response or not response.content:
                print(f"    Warning: Empty response for attempt {attempt + 1}")
                continue
            
            content = response.content[0].text if response.content else ""
            if not content:
                print(f"    Warning: Empty content for attempt {attempt + 1}")
                continue
            
            # Parse the response to extract correct answer and explanation
            correct_answer, explanation = parse_ai_response(content, question_data)
            
            if correct_answer and explanation:
                results.append((correct_answer, explanation.strip()))
                print(f"    Claude answer {attempt + 1}: {correct_answer}")
            else:
                print(f"    Warning: Could not parse answer/explanation for attempt {attempt + 1}")
        
        return results
    
    except anthropic.RateLimitError as e:
        print(f"Claude rate limit error: {e}")
        return [("", f"Rate limit exceeded. Please try again later.")]
    except anthropic.APIError as e:
        print(f"Claude API error: {e}")
        return [("", f"API error: {str(e)}")]
    except Exception as e:
        print(f"Error getting Claude answer and explanation: {e}")
        print(f"Question data type: {type(question_data)}")
        if isinstance(question_data, dict):
            print(f"Question data keys: {list(question_data.keys())}")
        return [("", f"Error generating answer and explanation: {str(e)}")]


def process_questions(file_path: str, openai_api_key: str = None, anthropic_api_key: str = None, test_file_path: str = "test.txt", force_overwrite: bool = False, use_claude: bool = True) -> None:
    """Main function to process questions and generate explanations."""
    # Initialize AI clients
    openai_client = None
    claude_client = None
    
    if openai_api_key:
        openai_client = OpenAI(api_key=openai_api_key)
        print("OpenAI client initialized")
    
    if anthropic_api_key and use_claude:
        claude_client = Anthropic(api_key=anthropic_api_key)
        print("Claude client initialized")
    
    if not openai_client and not claude_client:
        raise ValueError("At least one API key (OpenAI or Anthropic) must be provided")
    
    # Load questions
    questions = load_questions(file_path)
    print(f"Loaded {len(questions)} questions from {file_path}")
    
    # Load test question numbers (if test file exists)
    target_question_numbers = None
    if os.path.exists(test_file_path):
        target_question_numbers = load_test_questions(test_file_path)
        print(f"Will process only questions: {target_question_numbers}")
    else:
        print(f"Test file {test_file_path} not found, processing all questions")
    
    # Create explanations file paths
    base_name = os.path.splitext(file_path)[0]
    explanations_file = f"{base_name}_explanations.json"
    structured_file = f"{base_name}_structured.json"
    multiple_answers_file = f"{base_name}_multiple_answers.json"
    
    # Load existing explanations
    existing_explanations = load_existing_explanations(explanations_file)
    print(f"Loaded {len(existing_explanations)} existing explanations from {explanations_file}")
    
    # Process each question
    new_explanations_count = 0
    overwritten_count = 0
    correct_answers_updated = 0
    multiple_answers_data = []
    
    for i, question in enumerate(questions, 1):
        question_num = question.get('question_number', i)
        question_num_str = str(question_num)
        
        # Skip questions not in test file (if test file is provided)
        if target_question_numbers is not None and question_num not in target_question_numbers:
            continue
        
        # Always generate explanation (no skipping)
        has_existing = question_num_str in existing_explanations
        
        print(f"Processing question {question_num} ({i}/{len(questions)})...")
        
        # Get multiple AI answers and explanations
        answer_results = []
        
        # Use Claude if available (preferred)
        if claude_client:
            claude_results = get_ai_answer_and_explanation_claude(claude_client, question, num_attempts=2)
            answer_results.extend(claude_results)
        
        # Use OpenAI as backup or primary if Claude not available
        if openai_client and (not claude_client or len(answer_results) == 0):
            openai_results = get_ai_answer_and_explanation_openai(openai_client, question, num_attempts=2)
            answer_results.extend(openai_results)
        
        if not answer_results:
            print(f"Question {question_num}: No valid answers received")
            continue
        
        # Store multiple answers for analysis
        question_multiple_answers = {
            "question_number": question_num,
            "question_text": question.get('question_text', ''),
            "answers": question.get('answers', {}),
            "ai_responses": []
        }
        
        # Process each answer result
        answer_counts = {}
        best_answer = ""
        best_explanation = ""
        
        for idx, (correct_answer, explanation) in enumerate(answer_results):
            if correct_answer:
                answer_counts[correct_answer] = answer_counts.get(correct_answer, 0) + 1
                question_multiple_answers["ai_responses"].append({
                    "attempt": idx + 1,
                    "answer": correct_answer,
                    "explanation": explanation
                })
        
        # Determine the most common answer
        if answer_counts:
            best_answer = max(answer_counts, key=answer_counts.get)
            # Use the explanation from the first occurrence of the best answer
            for correct_answer, explanation in answer_results:
                if correct_answer == best_answer:
                    best_explanation = explanation
                    break
        
        # Update the question's correct_answer field if AI provided one
        if best_answer:
            old_answer = question.get('correct_answer', '')
            question['correct_answer'] = best_answer
            question_multiple_answers["consensus_answer"] = best_answer
            question_multiple_answers["answer_distribution"] = answer_counts
            
            if old_answer != best_answer:
                correct_answers_updated += 1
                print(f"Question {question_num}: Updated correct answer from '{old_answer}' to '{best_answer}' (consensus from {answer_counts})")
        
        # Update explanations dictionary with best explanation
        if best_explanation:
            existing_explanations[question_num_str] = best_explanation
            
            if has_existing:
                overwritten_count += 1
                print(f"Question {question_num}: Overwritten explanation ({len(best_explanation)} chars)")
            else:
                new_explanations_count += 1
                print(f"Question {question_num}: Added new explanation ({len(best_explanation)} chars)")
        
        multiple_answers_data.append(question_multiple_answers)
    
    # Save updated questions back to original file
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        print(f"Updated questions saved to {file_path}")
    except Exception as e:
        print(f"Error saving updated questions: {e}")
    
    # Save multiple answers data
    try:
        with open(multiple_answers_file, 'w', encoding='utf-8') as f:
            json.dump(multiple_answers_data, f, indent=2, ensure_ascii=False)
        print(f"Multiple answers data saved to {multiple_answers_file}")
    except Exception as e:
        print(f"Error saving multiple answers file: {e}")
    
    # Save explanations in both formats
    save_explanations(existing_explanations, explanations_file)
    save_explanations_structured(questions, existing_explanations, structured_file)
    print(f"Processing complete! New: {new_explanations_count}, Overwritten: {overwritten_count}, Correct answers updated: {correct_answers_updated}, Total: {len(existing_explanations)}")
    print(f"Files saved: {file_path}, {explanations_file}, {structured_file}, {multiple_answers_file}")


def main():
    """Main entry point."""
    # Load environment variables from .env file
    load_dotenv()
    
    if len(sys.argv) < 2 or len(sys.argv) > 4:
        print("Usage: python 3.5get_answer4question.py <json_file_path> [test_file_path] [--force]")
        print("  json_file_path: Path to the questions JSON file")
        print("  test_file_path: Optional path to test.txt file (default: test.txt)")
        print("  --force: Overwrite existing explanations")
        sys.exit(1)
    
    json_file = sys.argv[1]
    test_file = "test.txt"  # default
    force_overwrite = False
    
    # Parse additional arguments
    for arg in sys.argv[2:]:
        if arg == '--force':
            force_overwrite = True
        elif not arg.startswith('--'):
            test_file = arg
    
    # Check if JSON file exists
    if not os.path.exists(json_file):
        print(f"Error: File {json_file} not found")
        sys.exit(1)
    
    # Get API keys from environment
    openai_api_key = os.getenv('OPENAI_API_KEY')
    anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
    
    if not openai_api_key and not anthropic_api_key:
        print("Error: Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY found in environment variables or .env file")
        print("Please add at least one of these API keys to your .env file:")
        print("  OPENAI_API_KEY='your-openai-api-key'")
        print("  ANTHROPIC_API_KEY='your-anthropic-api-key'")
        sys.exit(1)
    
    # Determine which AI to use
    use_claude = anthropic_api_key is not None
    if anthropic_api_key and openai_api_key:
        print("Both API keys found. Using Claude as primary with OpenAI as backup.")
    elif anthropic_api_key:
        print("Using Claude API")
    else:
        print("Using OpenAI API")
        use_claude = False
    
    if force_overwrite:
        print("Force overwrite mode enabled - will overwrite existing explanations")
    
    # Process questions
    process_questions(json_file, openai_api_key, anthropic_api_key, test_file, force_overwrite, use_claude)


if __name__ == '__main__':
    main()