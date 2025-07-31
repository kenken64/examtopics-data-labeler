#!/usr/bin/env python3
import re

test_content = """
A. Order several AWS Snowball Edge Storage Optimized devices by using the AWS Management Console. Configure the devices with a destination S3 bucket. Copy the data to the devices. Ship the devices back to AWS.

B. Set up a 10 Gbps AWS Direct Connect connection between the company location and the nearest AWS Region. Transfer the data over a VPN connection into the Region to store the data in Amazon S3.

C. Create a VPN connection between the on-premises network attached storage and the nearest AWS Region. Transfer the data over the VPN connection.

D. Deploy an AWS Storage Gateway file gateway on premises. Configure the file gateway with a destination S3 bucket. Copy the data to the file gateway.

**Correct Answer: A**
"""

# Test the current extraction logic
answers = {}

# Find the section with answer options (before "**Correct Answer:")
answer_section_match = re.search(r'((?:[A-D]\.\s+.*?\n)+)(?=\*\*Correct Answer:)', test_content, re.DOTALL)
if answer_section_match:
    answer_text = answer_section_match.group(1)
    print("Found answer section:")
    print(repr(answer_text))
    print()
    
    # Split into individual options
    answer_pattern = r'([A-D])\.\s+(.*?)(?=\n[A-D]\.|$)'
    answer_matches = re.findall(answer_pattern, answer_text, re.DOTALL)
    
    print("Individual answers:")
    for option, text in answer_matches:
        clean_text = text.strip()
        answers[option] = clean_text
        print(f"{option}: {clean_text}")
        print()

# Test correct answer extraction
correct_answer_match = re.search(r'\*\*Correct Answer:\s*([A-D])\*\*', test_content)
correct_answer = correct_answer_match.group(1) if correct_answer_match else None
print(f"Correct Answer: {correct_answer}")