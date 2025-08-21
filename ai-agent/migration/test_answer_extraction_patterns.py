#!/usr/bin/env python3
"""
Test script for various correct answer extraction patterns.
"""

import re
from typing import Optional

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


def test_patterns():
    """Test all the different patterns"""
    
    test_cases = [
        # Pattern 1: **Correct Answer:** AC
        {
            "content": """**Correct Answer:** AC

### Community vote distribution

- AC (100%)

---

### Comments""",
            "expected": "AC"
        },
        
        # Pattern 2: **Correct Answer:** BDF with complex distribution
        {
            "content": """**Correct Answer:** BDF

**Community vote distribution**

- **BCE (713)** 14% 14%

---

### Comments""",
            "expected": "BDF"
        },
        
        # Pattern 3: Community votes with image placeholders
        {
            "content": """**Community vote distribution**

- ![8](https://via.placeholder.com/15/0000FF/000000?text=+) 8 (89%)
- ![1](https://via.placeholder.com/15/FF0000/000000?text=+) 6%

---

### Comments""",
            "expected": "H"  # 8 -> H
        },
        
        # Pattern 4: **ACE (100%)**
        {
            "content": """**Community vote distribution**

- **ACE (100%)**

---

### Comments""",
            "expected": "ACE"
        },
        
        # Pattern 5: Simple A (0%), B (37%)
        {
            "content": """**Community vote distribution**

- A (0%)
- B (37%)

---

### Comments""",
            "expected": "B"
        },
        
        # Pattern 6: ABC (88%), 4%
        {
            "content": """**Community vote distribution**

- ABC (88%)
- 4%

---

### Comments""",
            "expected": "ABC"
        },
        
        # Pattern 7: **Correct Answer:** C (should prioritize explicit answer)
        {
            "content": """**Correct Answer:** C

---

### Community vote distribution

- A (0%)
- B (37%)

---

### Comments""",
            "expected": "C"
        }
    ]
    
    print("Testing correct answer extraction patterns...\n")
    
    for i, test_case in enumerate(test_cases, 1):
        result = extract_correct_answer_from_votes(test_case["content"])
        expected = test_case["expected"]
        status = "PASS" if result == expected else "FAIL"
        
        print(f"Test {i}: {status}")
        print(f"  Expected: {expected}")
        print(f"  Got:      {result}")
        if result != expected:
            print(f"  Content preview: {test_case['content'][:100]}...")
        print()


if __name__ == "__main__":
    test_patterns()