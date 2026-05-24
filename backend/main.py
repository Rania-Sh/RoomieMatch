from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List
from database import createtables, get_conn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

createtables()

# ─── MODELS ───
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    age: int
    city: str
    budget: int
    gender: str
    sleep_time: int
    cleanliness: str = "moderately_neat"
    pets: float = 0
    interests: List[str] = []
    preferred_gender: str = "any"
    bio: str = ""

class AdminLogin(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr

class MessageCreate(BaseModel):
    sender_id: int
    receiver_id: int
    message: str

# ─── ROOT ───
@app.get("/")
def read_root():
    return {"message": "RoomieMatch API is running!"}

# ─── USER LOGIN ───
@app.post("/login")
def user_login(data: UserLogin):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, name, email, city, age, budget FROM "user" WHERE email = %s',
        (data.email,)
    )
    user = cursor.fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email. Please create a profile first.")
    return {
        "message": "Login successful",
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "city": user[3],
        "age": user[4],
        "budget": user[5],
    }

# ─── ADMIN LOGIN ───
@app.post("/admin/login")
def admin_login(data: AdminLogin):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM admins WHERE username = %s AND password = %s",
        (data.username, data.password)
    )
    admin = cursor.fetchone()
    conn.close()
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "is_admin": True}

# ─── CREATE USER ───
@app.post("/user")
def save_user(user: UserCreate):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM "user" WHERE email = %s', (user.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in instead.")
    cursor.execute("""
        INSERT INTO "user"
        (name, age, city, budget, sleep_time, is_clean, has_pets, gender, interests, email, preferred_gender)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        user.name, user.age, user.city, user.budget,
        user.sleep_time,
        1 if user.cleanliness in ["very_neat", "moderately_neat"] else 0,
        1 if user.pets > 0 else 0,
        user.gender,
        ",".join(user.interests),
        user.email,
        user.preferred_gender
    ))
    new_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()
    return {"message": "User saved!", "id": new_id}

# ─── GET ALL USERS ───
@app.get("/users")
def get_users():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, age, city, budget, email FROM "user"')
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1], "age": r[2], "city": r[3], "budget": r[4], "email": r[5]} for r in rows]

# ─── GET MATCHES ───
@app.get("/matches/{user_id}")
def get_matches(user_id: int):
    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM "user" WHERE id = %s', (user_id,))
    current = cursor.fetchone()
    if not current:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    cursor.execute('SELECT * FROM "user" WHERE id != %s AND city = %s', (user_id, current[4]))
    all_users = cursor.fetchall()
    conn.close()

    """
    Actual column order from DB:
    0=id, 1=name, 2=email, 3=age, 4=city, 5=budget,
    6=sleep_time, 7=is_clean, 8=has_pets, 9=gender, 10=interests, 11=preferred_gender
    """

    current_gender = current[9] or 'any'
    current_preferred = current[11] or 'any'

    matches = []
    for user in all_users:
        other_gender = user[9] or 'any'
        other_preferred = user[11] or 'any'

        # Filter by gender preference — both directions must be compatible
        if current_preferred != 'any' and current_preferred != other_gender:
            continue
        if other_preferred != 'any' and other_preferred != current_gender:
            continue

        score = calculate_match_score(current, user)
        matches.append({
            "id": user[0],
            "name": user[1],
            "age": user[3],
            "city": user[4],
            "budget": user[5],
            "email": user[2],
            "score": score
        })

    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches


def calculate_match_score(user1, user2):
    """
    0=id, 1=name, 2=email, 3=age, 4=city, 5=budget,
    6=sleep_time, 7=is_clean, 8=has_pets, 9=gender, 10=interests, 11=preferred_gender
    """
    score = 0
    try:
        budget_diff = abs(int(user1[5]) - int(user2[5]))
        if budget_diff < 500:    score += 30
        elif budget_diff < 1000: score += 15
        elif budget_diff < 2000: score += 5
    except: pass
    try:
        if int(user1[6]) == int(user2[6]):             score += 20
        elif abs(int(user1[6]) - int(user2[6])) <= 1:  score += 10
    except: pass
    try:
        if user1[7] == user2[7]: score += 15
    except: pass
    try:
        if user1[8] == user2[8]: score += 15
    except: pass
    try:
        if user1[9] == user2[9]: score += 10
    except: pass
    try:
        i1 = set(filter(None, (user1[10] or "").split(",")))
        i2 = set(filter(None, (user2[10] or "").split(",")))
        score += len(i1.intersection(i2)) * 5
    except: pass
    return round(min(score / 95, 1.0), 2)


# ─── UPDATE USER ───
@app.put("/user/{user_id}")
def update_user(user_id: int, user: UserCreate):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM "user" WHERE id = %s', (user_id,))
    if not cursor.fetchone():
        conn.close()
        return {"error": "User not found"}
    cursor.execute("""
        UPDATE "user" SET name=%s, age=%s, city=%s, budget=%s, sleep_time=%s,
        is_clean=%s, has_pets=%s, gender=%s, interests=%s, preferred_gender=%s
        WHERE id=%s
    """, (
        user.name, user.age, user.city, user.budget, user.sleep_time,
        1 if user.cleanliness in ["very_neat", "moderately_neat"] else 0,
        1 if user.pets > 0 else 0,
        user.gender, ",".join(user.interests), user.preferred_gender, user_id
    ))
    conn.commit()
    conn.close()
    return {"message": "Profile updated!"}


# ─── DELETE USER ───
@app.delete("/user/{user_id}")
def delete_user(user_id: int):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM "user" WHERE id = %s', (user_id,))
    if not cursor.fetchone():
        conn.close()
        return {"error": "User not found"}
    # Delete messages first to avoid foreign key violation
    cursor.execute('DELETE FROM messages WHERE sender_id = %s OR receiver_id = %s', (user_id, user_id))
    cursor.execute('DELETE FROM "user" WHERE id = %s', (user_id,))
    conn.commit()
    conn.close()
    return {"message": "User deleted successfully"}


# ─── SEND MESSAGE ───
@app.post("/messages")
def send_message(msg: MessageCreate):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO messages (sender_id, receiver_id, message)
        VALUES (%s, %s, %s)
    """, (msg.sender_id, msg.receiver_id, msg.message))
    conn.commit()
    conn.close()
    return {"message": "Sent!"}


# ─── GET MESSAGES ───
@app.get("/messages/{user1_id}/{user2_id}")
def get_messages(user1_id: int, user2_id: int):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, sender_id, receiver_id, message, timestamp
        FROM messages
        WHERE (sender_id=%s AND receiver_id=%s)
           OR (sender_id=%s AND receiver_id=%s)
        ORDER BY timestamp ASC
    """, (user1_id, user2_id, user2_id, user1_id))
    msgs = cursor.fetchall()
    conn.close()
    return [{"id": m[0], "sender_id": m[1], "receiver_id": m[2],
             "message": m[3], "timestamp": str(m[4])} for m in msgs]


# ─── GET CONVERSATIONS ───
@app.get("/conversations/{user_id}")
def get_conversations(user_id: int):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT
            CASE WHEN sender_id=%s THEN receiver_id ELSE sender_id END as other_id
        FROM messages
        WHERE sender_id=%s OR receiver_id=%s
    """, (user_id, user_id, user_id))
    other_ids = [m[0] for m in cursor.fetchall()]
    if not other_ids:
        conn.close()
        return []
    result = []
    for oid in other_ids:
        cursor.execute('SELECT id, name, age, city FROM "user" WHERE id=%s', (oid,))
        user = cursor.fetchone()
        if user:
            result.append({"id": user[0], "name": user[1], "age": user[2], "city": user[3]})
    conn.close()
    return result
