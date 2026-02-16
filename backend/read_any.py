import sys

def read_file(filename):
    encodings = ['utf-8', 'utf-16', 'utf-16-le', 'cp1252']
    for enc in encodings:
        try:
            with open(filename, 'r', encoding=enc) as f:
                content = f.read()
                if content:
                    print(f"--- Content (encoding: {enc}) ---")
                    print(content)
                    return
        except Exception:
            continue
    print(f"Could not read {filename} with any common encoding.")

read_file('fix-out.txt')
read_file('check-out.txt')
