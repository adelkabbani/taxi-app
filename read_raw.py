import sys

try:
    with open('backend-log.txt', 'rb') as f:
        data = f.read()
        print(f"File size: {len(data)}")
        print(f"Raw bytes (first 100): {data[:100]}")
except Exception as e:
    print(f"Error: {e}")
