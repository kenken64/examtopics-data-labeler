#!/usr/bin/env python3

import re

def parse_question_content(question_number: str, content: str):
    """Parse individual question content to extract structured data."""
    try:
        # Check if this is a HOTSPOT question with step-based format
        if "**HOTSPOT**" in content and "**Step" in content:
            print(f"Question {question_number}: Detected as hotspot with steps")
            return parse_hotspot_question(question_number, content)
        
        # Extract question text (everything from start until first answer option)
        case_study_match = re.search(r'^\s*\*\*Case Study\*\*\s*\n\n(.*?)(?=\n[A-D]\.)', content, re.DOTALL)
        
        if case_study_match:
            question_text = case_study_match.group(1).strip()
            print(f"Question {question_number}: Found case study")
        else:
            question_text_match = re.search(r'^\s*(.*?)(?=\n[A-D]\.)', content, re.DOTALL)
            if not question_text_match:
                print(f"Question {question_number}: No question text found")
                return None
            question_text = question_text_match.group(1).strip()
            print(f"Question {question_number}: Found regular question text")
        
        # Look for answer options
        answer_matches = re.findall(r'([A-D]\.\s+.*?)(?=\n[A-D]\.|$|\*\*Correct Answer)', content, re.DOTALL)
        answers = '\n'.join([match.strip() for match in answer_matches])
        
        if not answers:
            print(f"Question {question_number}: No answer options found")
            return None
        
        print(f"Question {question_number}: Found {len(answer_matches)} answer options")
        return {"question_number": int(question_number), "status": "success"}
        
    except Exception as e:
        print(f"Error parsing question {question_number}: {e}")
        return None

def parse_hotspot_question(question_number: str, content: str):
    """Parse HOTSPOT question content."""
    try:
        question_text_match = re.search(r'^\s*(.*?)(?=\*\*Hot Area:\*\*)', content, re.DOTALL)
        
        if not question_text_match:
            print(f"Question {question_number}: HOTSPOT - No question text found before Hot Area")
            return None
        
        print(f"Question {question_number}: HOTSPOT - Found question text")
        return {"question_number": int(question_number), "status": "hotspot_success"}
        
    except Exception as e:
        print(f"Error parsing hotspot question {question_number}: {e}")
        return None

# Load content and test problematic questions
with open('MLA_C01_114.md', 'r', encoding='utf-8') as f:
    content = f.read()

question_pattern = r'(?:^|\n)(?:#{2,3}\s+|\*\*)?QUESTION\s+(\d+)(?:\*\*)?'
question_splits = re.split(question_pattern, content, flags=re.MULTILINE)

print(f"Total splits: {len(question_splits)}")
print(f"Expected questions: {(len(question_splits) - 1) // 2}")

# Test parsing of specific questions 6, 8, 9, 94
target_questions = [6, 8, 9, 94]
found_questions = []

for i in range(1, len(question_splits), 2):
    question_number = question_splits[i]
    question_content = question_splits[i + 1] if i + 1 < len(question_splits) else ""
    
    if int(question_number) in target_questions:
        print(f"\n=== TESTING QUESTION {question_number} ===")
        print(f"Content length: {len(question_content)}")
        print(f"Content preview (first 300 chars): {repr(question_content[:300])}")
        print("Contains **HOTSPOT**:", "**HOTSPOT**" in question_content)
        print("Contains **Hot Area:**:", "**Hot Area:**" in question_content)
        print("Contains A.:", "\nA." in question_content)
        
        question_data = parse_question_content(question_number, question_content)
        if question_data:
            print(f"✓ Successfully parsed question {question_number}")
            found_questions.append(int(question_number))
        else:
            print(f"✗ Failed to parse question {question_number}")

print(f"\n=== SUMMARY ===")
print(f"Successfully parsed: {found_questions}")
print(f"Failed to parse: {[q for q in target_questions if q not in found_questions]}")