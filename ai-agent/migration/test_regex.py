#!/usr/bin/env python3
import re

test_text = '''# Page 267

```markdown
## Question #93
'''

pattern = r'## Question #(\d+)'
matches = re.findall(pattern, test_text)
print('Found question numbers:', matches)

# Test the split logic too
splits = re.split(pattern, test_text)
print('Split results:')
for i, split in enumerate(splits):
    print(f'  {i}: {repr(split)}')