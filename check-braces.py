import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Stack to track opening braces and their line numbers
stack = []

for line_num, line in enumerate(lines, 1):
    # Skip comments
    if line.strip().startswith('//'):
        continue
    
    # Remove strings to avoid counting braces in strings
    clean_line = re.sub(r'"[^"]*"', '', line)
    clean_line = re.sub(r"'[^']*'", '', clean_line)
    clean_line = re.sub(r'`[^`]*`', '', clean_line)
    clean_line = re.sub(r'//.*$', '', clean_line)
    
    # Track each { and }
    for char_pos, char in enumerate(clean_line):
        if char == '{':
            stack.append((line_num, char_pos, line.rstrip()))
        elif char == '}':
            if stack:
                stack.pop()
            else:
                print(f'ERROR: Extra }} at line {line_num}')

# Show unclosed braces
if stack:
    print(f'\n{len(stack)} unclosed {{:')
    for line_num, char_pos, content in stack[-10:]:  # Show last 10
        print(f'  Line {line_num}: {content[:80]}...' if len(content) > 80 else f'  Line {line_num}: {content}')
else:
    print('\nAll braces are balanced!')
