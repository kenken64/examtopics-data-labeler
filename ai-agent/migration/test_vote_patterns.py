#!/usr/bin/env python3
import re

def extract_correct_answer_from_votes(content: str):
    """Test the vote extraction logic with various patterns."""
    try:
        vote_section_match = re.search(r'\*\*Community vote distribution\*\*(.*?)(?=---)', content, re.DOTALL)
        if not vote_section_match:
            return None
        
        vote_text = vote_section_match.group(1).strip()
        print(f"Vote text: {repr(vote_text)}")
        
        # Parse voting patterns like "A (90%)", "ABC(60%)", etc.
        vote_pattern = r'([A-Z]+)\s*\((\d+)%\)'
        vote_matches = re.findall(vote_pattern, vote_text)
        print(f"Vote matches: {vote_matches}")
        
        if not vote_matches:
            return None
        
        # Find the option with the highest percentage
        max_percentage = 0
        correct_answer = None
        
        for option, percentage_str in vote_matches:
            percentage = int(percentage_str)
            if percentage > max_percentage:
                max_percentage = percentage
                correct_answer = option
        
        return correct_answer
        
    except Exception as e:
        print(f"Error: {e}")
        return None

# Test different patterns
test_cases = [
    """**Community vote distribution**

- A (100%)

---""",
    
    """**Community vote distribution**

- A (90%)
- B (10%)

---""",
    
    """**Community vote distribution**

- ABC (60%)
- CDF (40%)

---""",
    
    """**Community vote distribution**

- C (92%)
- D (6%)

---"""
]

for i, test_case in enumerate(test_cases, 1):
    print(f"\nTest Case {i}:")
    result = extract_correct_answer_from_votes(test_case)
    print(f"Result: {result}")
    print("-" * 40)