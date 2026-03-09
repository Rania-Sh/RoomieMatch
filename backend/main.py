from fastapi import FastAPI#ספרייה שמאפשרת לנו לייצור  API שרת
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables

app = FastAPI()#ניצור אובייקט של השרת

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],#כל אתר יכול לשלוח בקשה
    allow_methods=["*"],#כל סוג בקשה מותר (GET POST)
    allow_headers=["*"],#כל סוג כתובת מותר
)

create_tables()
#אם נכנסים לכתובות http://127.0.0.1:8000/ השרת מחזיר"message": "FitTrack API is running!" כדי לבדוק שהשרת רץ כממו שצריך
@app.get("/")
def read_root():
    return {"message": "FitTrack API is running!"}
#מבצעים פעולת POST של המשתמש
@app.post("/user")
def save_user(name: str, age: int, weight: float, height: float):
    import sqlite3
    conn = sqlite3.connect("fittrack.db")# מתחברים לSQLITE
    conn.execute("INSERT INTO user (name, age, weight, height) VALUES (?, ?, ?, ?)",
                 (name, age, weight, height))
    conn.commit()
    conn.close()
    return {"message": "User saved!"}
#
@app.get("/user")
def get_user():
    import sqlite3
    conn = sqlite3.connect("fittrack.db")
    user = conn.execute("SELECT * FROM user LIMIT 1").fetchone()#תקח את המשתמש הראשון ברשימה
    conn.close()
    return {"user": user}
@app.post("/activity")
def save_activity(type: str, duration: int, distance: float, calories: float, date: str):
    import sqlite3
    conn = sqlite3.connect("fittrack.db")
    conn.execute("INSERT INTO activity (type, duration, distance, calories, date) VALUES (?, ?, ?, ?, ?)",
                 (type, duration, distance, calories, date))
    conn.commit()
    conn.close()
    return {"message": "Activity saved!"}

@app.get("/activities")
def get_activities():
    import sqlite3
    conn = sqlite3.connect("fittrack.db")
    activities = conn.execute("SELECT * FROM activity").fetchall()
    conn.close()
    return {"activities": activities}