import sqlite3


def create_tables():
    conn = sqlite3.connect("fittrack.db")
    cursor = conn.cursor()

    # טבלת משתמש
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY,
            name TEXT,
            age INTEGER,
            weight REAL,
            height REAL
        )
    """)

    # טבלת פעילות
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity (
            id INTEGER PRIMARY KEY,
            type TEXT,
            duration INTEGER,
            distance REAL,
            calories REAL,
            date TEXT
        )
    """)

    conn.commit()
    conn.close()


create_tables()