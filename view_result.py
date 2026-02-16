import os

path = r'd:\website@Antigravity\taxi\backend\query_test_result.txt'
if os.path.exists(path):
    with open(path, 'rb') as f:
        content = f.read()
        try:
            # Try to decode from UTF-16 LE
            print(content.decode('utf-16-le'))
        except:
            print(content.decode('utf-8', errors='ignore'))
else:
    print("File not found")
