import sys
import re

with open(sys.argv[1]) as file:
    raw = file.read()
    lines = raw.split('\n')
    macros = [line.strip() for line in lines if "#define" in line] 
    pairs = [tuple(macro.split(' ')[1:]) for macro in macros]
    for match, fill in pairs:
        raw = re.sub(r'\b' + match + r'\b', fill, raw)

    print(raw)