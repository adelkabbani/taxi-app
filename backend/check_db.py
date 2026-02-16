import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def check():
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD'),
            dbname=os.getenv('DB_NAME', 'taxi_dispatch')
        )
        cur = conn.cursor()
        
        print("--- DB DUMP (Python) ---")
        
        cur.execute("SELECT current_database()")
        print(f"Database: {cur.fetchone()[0]}")
        
        cur.execute("SELECT id, email, role FROM users")
        users = cur.fetchall()
        print(f"Users Count: {len(users)}")
        for u in users:
            print(f"  {u[0]}: {u[1]} ({u[2]})")
            
        cur.execute("SELECT id, user_id, availability FROM drivers")
        drivers = cur.fetchall()
        print(f"Drivers Count: {len(drivers)}")
        for d in drivers:
            print(f"  Driver {d[0]} (User {d[1]}): {d[2]}")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check()
