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
    
    # Split content by question headers (handle any number of hashes)
    question_pattern = r'#+\s+Question #(\d+)'
    question_splits = re.split(question_pattern, content)
    
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
    Extract explanation - all text after community vote distribution section.
    
    Args:
        content: The question content
        
    Returns:
        The explanation text or empty string if not found
    """
    try:
        # Look for the pattern: **Community vote distribution** ... --- [explanation text]
        # The explanation starts after the first "---" following the community vote distribution
        vote_and_explanation_match = re.search(r'\*\*Community vote distribution\*\*.*?---\n+(.*)', content, re.DOTALL)
        
        if not vote_and_explanation_match:
            return ""
        
        explanation_text = vote_and_explanation_match.group(1).strip()
        
        # Clean up the explanation text
        # Remove common markdown artifacts
        explanation_text = re.sub(r'```markdown\n?', '', explanation_text)
        explanation_text = re.sub(r'```\n?', '', explanation_text)
        
        return explanation_text
        
    except Exception as e:
        return ""


def extract_correct_answer_from_votes(content: str) -> Optional[str]:
    """
    Extract correct answer from community vote distribution.
    
    Args:
        content: The question content
        
    Returns:
        The correct answer option(s) or None if not found
    """
    try:
        # First, try to find explicit correct answer patterns
        # Pattern 1: **Correct Answer:** AC
        correct_answer_match = re.search(r'\*\*Correct Answer:\*\*\s*([A-Z]+(?:,\s*[A-Z]+)*)', content)
        if correct_answer_match:
            # Clean up the answer (remove spaces and commas, normalize to single string)
            answer = correct_answer_match.group(1).replace(',', '').replace(' ', '')
            return answer
        
        # Pattern 2: **Correct Answer:** with colon inside
        correct_answer_match = re.search(r'\*\*Correct Answer:\s*([A-Z]+(?:,\s*[A-Z]+)*)\*\*', content)
        if correct_answer_match:
            # Clean up the answer (remove spaces and commas, normalize to single string)
            answer = correct_answer_match.group(1).replace(',', '').replace(' ', '')
            return answer
            
        # Pattern 3: **Correct Answer: B** (with space instead of colon)
        correct_answer_match = re.search(r'\*\*Correct Answer:\s+([A-Z]+(?:,?\s*[A-Z]+)*)\*\*', content)
        if correct_answer_match:
            # Clean up the answer (remove spaces and commas, normalize to single string)
            answer = correct_answer_match.group(1).replace(',', '').replace(' ', '')
            return answer
        
        # Fallback patterns when primary extraction fails
        
        # Fallback Pattern 1: ### Correct Answer: A (with community votes below)
        fallback_match1 = re.search(r'### Correct Answer:\s*([A-Z]+(?:\s+[A-Z]+)*)', content)
        if fallback_match1:
            answer = fallback_match1.group(1).replace(' ', '')
            return answer
        
        # Fallback Pattern 2: **Correct Answer: A C E** (without colon after "Answer")
        fallback_match2 = re.search(r'\*\*Correct Answer:\s*([A-Z]+(?:\s+[A-Z]+)*)\*\*', content)
        if fallback_match2:
            answer = fallback_match2.group(1).replace(' ', '')
            return answer
        
        # Only fall back to community votes if no explicit answer found
        vote_section_match = re.search(r'\*\*Community vote distribution\*\*(.*?)(?=---|$)', content, re.DOTALL)
        if not vote_section_match:
            return None
        
        vote_text = vote_section_match.group(1).strip()
        
        # Parse various voting patterns
        vote_matches = []
        
        # Pattern 1: - AC (100%)
        pattern1 = re.findall(r'-\s*([A-Z]+(?:\s+[A-Z])*)\s*\((\d+)%\)', vote_text)
        vote_matches.extend(pattern1)
        
        # Pattern 2: - **BCE (713)** 14% 14%
        pattern2 = re.findall(r'-\s*\*\*([A-Z]+(?:\s+[A-Z])*)\s*\(\d+\)\*\*\s*(\d+)%', vote_text)
        vote_matches.extend(pattern2)
        
        # Pattern 3: - ![8](url) 8 (89%)
        pattern3 = re.findall(r'-\s*!\[\d+\].*?\s*(\d+)\s*\((\d+)%\)', vote_text)
        # Convert numbers to letters for pattern3 (8 -> H, etc)
        for num_str, percent in pattern3:
            if num_str.isdigit():
                letter = chr(ord('A') + int(num_str) - 1) if int(num_str) <= 26 else None
                if letter:
                    vote_matches.append((letter, percent))
        
        # Pattern 4: - **ACE (100%)**
        pattern4 = re.findall(r'-\s*\*\*([A-Z]+(?:\s+[A-Z])*)\s*\((\d+)%\)\*\*', vote_text)
        vote_matches.extend(pattern4)
        
        # Pattern 5: A (0%), B (37%)
        pattern5 = re.findall(r'([A-Z]+(?:\s+[A-Z])*)\s*\((\d+)%\)', vote_text)
        vote_matches.extend(pattern5)
        
        # Pattern 6: ABC (88%), 4%
        pattern6 = re.findall(r'([A-Z]+)\s*\((\d+)%\)', vote_text)
        vote_matches.extend(pattern6)
        
        # Pattern 7: General fallback - any letters with percentages
        pattern7 = re.findall(r'\*?\*?([A-Z](?:\s+[A-Z])*)\s*\((\d+)%\)\*?\*?', vote_text)
        vote_matches.extend(pattern7)
        
        if not vote_matches:
            return None
        
        # Find the option with the highest percentage
        max_percentage = 0
        correct_answer = None
        
        for option, percentage_str in vote_matches:
            try:
                percentage = int(percentage_str)
                if percentage > max_percentage:
                    max_percentage = percentage
                    # Remove spaces between letters to normalize (C E -> CE)
                    correct_answer = option.replace(' ', '')
            except ValueError:
                continue
        
        return correct_answer
        
    except Exception as e:
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
        # Extract question text (everything after question number until first answer option)
        # Handle both formats: with Topic line and without Topic line
        # Support both "A." and "- A." answer formats, including bold formatting
        question_text_match = re.search(r'^\n+(?:\*\*Topic \d+\*\*\n\n)?(.*?)(?=\n-?\s*\*?\*?[A-D]\.)', content, re.DOTALL)
        
        if not question_text_match:
            return None
        
        question_text = question_text_match.group(1).strip()
        
        # Extract answer options - retain raw format as specified
        answers = ""
        
        # Find the section with answer options (before "**Correct Answer:" or "**Correct Answer:")
        # Support both "A." and "- A." formats, and handle various correct answer formats
        answer_section_match = re.search(r'((?:-?\s*\*?\*?[A-D]\.\*?\*?\s+.*?\n)+)(?=\*\*Correct Answer[:\s])', content, re.DOTALL)
        if answer_section_match:
            # Keep the raw answer text with formatting intact
            answers = answer_section_match.group(1).strip()
        
        # Extract correct answer from community vote distribution
        correct_answer = extract_correct_answer_from_votes(content)
        
        # Extract explanation - all text after community vote distribution until next question
        explanation = extract_explanation_after_votes(content)
        
        return {
            "question_number": int(question_number),
            "question_text": question_text,
            "answers": answers,
            "correct_answer": correct_answer,
            "explanation": explanation
        }
        
    except Exception as e:
        print(f"Error parsing question {question_number}: {e}")
        return None


def main():
    """Main function to handle command line arguments and process the file."""
    parser = argparse.ArgumentParser(description='Extract questions from markdown file to JSON')
    parser.add_argument('input_file', help='Input markdown file path')
    parser.add_argument('-o', '--output', help='Output JSON file path (default: questions.json)', 
                       default='questions.json')
    
    args = parser.parse_args()
    
    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"Error: Input file {input_path} does not exist")
        return 1
    
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