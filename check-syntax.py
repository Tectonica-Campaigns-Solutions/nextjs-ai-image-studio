import re

with open('app/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Track balance of different brackets/braces
curly = 0  # {}
square = 0  # []
paren = 0  # ()

for i, line in enumerate(lines, 1):
    # Remove strings to avoid counting braces in strings
    clean_line = re.sub(r'"[^"]*"', '', line)
    clean_line = re.sub(r"'[^']*'", '', clean_line)
    clean_line = re.sub(r'`[^`]*`', '', clean_line)
    clean_line = re.sub(r'//.*$', '', clean_line)  # Remove comments
    
    curly += clean_line.count('{') - clean_line.count('}')
    square += clean_line.count('[') - clean_line.count(']')
    paren += clean_line.count('(') - clean_line.count(')')

print(f'Total lines: {len(lines)}')
print(f'Final balance: curly={curly}, square={square}, paren={paren}')

# If unbalanced, find the problematic area
if curly != 0 or square != 0 or paren != 0:
    print('\nFinding unbalanced sections...')
    
    # Reset and check in chunks
    for chunk_start in range(0, len(lines), 500):
        chunk_end = min(chunk_start + 500, len(lines))
        curly_chunk = 0
        square_chunk = 0
        paren_chunk = 0
        
        for i in range(chunk_start, chunk_end):
            line = lines[i]
            clean_line = re.sub(r'"[^"]*"', '', line)
            clean_line = re.sub(r"'[^']*'", '', clean_line)
            clean_line = re.sub(r'`[^`]*`', '', clean_line)
            clean_line = re.sub(r'//.*$', '', clean_line)
            
            curly_chunk += clean_line.count('{') - clean_line.count('}')
            square_chunk += clean_line.count('[') - clean_line.count(']')
            paren_chunk += clean_line.count('(') - clean_line.count(')')
        
        print(f'Lines {chunk_start+1}-{chunk_end}: curly={curly_chunk}, square={square_chunk}, paren={paren_chunk}')


