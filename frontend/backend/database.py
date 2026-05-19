import os
import psycopg2

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def createtables():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS "user"(
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        age INTEGER,
        city TEXT NOT NULL,
        budget INTEGER,
        sleep_time INTEGER,
        is_clean INTEGER,
        has_pets INTEGER,
        gender TEXT,
        interests TEXT
    )""")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS matches(
        id SERIAL PRIMARY KEY,
        user1_id INTEGER,
        user2_id INTEGER,
        score REAL,
        FOREIGN KEY (user1_id) REFERENCES "user"(id),
        FOREIGN KEY (user2_id) REFERENCES "user"(id)
    )""")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admins(
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )""")
    cursor.execute("""
        INSERT INTO admins (username, password)
        VALUES ('admin', 'admin123')
        ON CONFLICT (username) DO NOTHING
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages(
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_read INTEGER DEFAULT 0,
        FOREIGN KEY (sender_id) REFERENCES "user"(id),
        FOREIGN KEY (receiver_id) REFERENCES "user"(id)
    )""")
    conn.commit()
    conn.close()

createtables()