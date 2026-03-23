# 🏠 RoomieMatch

> An intelligent roommate-matching platform that connects people based on lifestyle, budget, and personality.

---

##  Overview

RoomieMatch is a full-stack web application that helps people find compatible roommates using a smart matching algorithm. Users create a profile with their preferences, and the system scores compatibility with other users in the same city.

---

##  Features

- **Smart Matching Algorithm** — scores compatibility based on city, budget, sleep schedule, cleanliness, pets, and interests
- **User Profiles** — create, edit, and delete your profile
- **In-App Chat** — message your matches directly without sharing your email
- **Say Hello** — quick email shortcut with a pre-written message
- **Admin Panel** — admins can view, edit, and delete all profiles
- **User Login** — log in with your email to access your profile
- **Email Validation** — unique emails enforced per account

---

##  Tech Stack

| Layer | Technology |

| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Backend | Python, FastAPI |
| Database | PostgreSQL (Railway) / SQLite (local) |
| Hosting | Railway (backend) |



##  Project Structure

```
PythonProject1/
│
├── backend/
│   ├── main.py          # FastAPI routes and endpoints
│   ├── database.py      # Database connection and table creation
│   └── models.py        # Match score calculation
│
└── frontend/
    └── index.html       # Full frontend (HTML + CSS + JS)
```

---

##  Getting Started

### Prerequisites
- Python 3.10+
- pip

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/roomiematch.git
cd roomiematch/backend

# 2. Install dependencies
pip install fastapi uvicorn psycopg2-binary pydantic[email]

# 3. Set environment variable (for PostgreSQL)
# Windows:
$env:DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Mac/Linux:
export DATABASE_URL="postgresql://user:password@host:5432/dbname"

# 4. Run the server
uvicorn main:app --reload
```

### Open the app
Open `frontend/index.html` in your browser.

Make sure the `API` variable in `index.html` points to your server:
```javascript
const API = 'http://127.0.0.1:8000'; // local
// or
const API = 'https://your-app.up.railway.app'; // production
```

---

##  API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/user` | Create new profile |
| `GET` | `/users` | Get all users |
| `PUT` | `/user/{id}` | Update profile |
| `DELETE` | `/user/{id}` | Delete profile |
| `POST` | `/login` | User login by email |
| `GET` | `/matches/{id}` | Get matches for user |
| `POST` | `/admin/login` | Admin login |
| `POST` | `/messages` | Send a message |
| `GET` | `/messages/{id1}/{id2}` | Get chat history |
| `GET` | `/conversations/{id}` | Get all conversations |

---

##  Matching Algorithm

The score is calculated out of 95 points:

| Criteria | Points |
|----------|--------|
| Budget difference < 500 ILS | 30 |
| Budget difference < 1000 ILS | 15 |
| Same sleep schedule | 20 |
| Same cleanliness style | 15 |
| Same pet preference | 15 |
| Same gender | 10 |
| Shared interests | 5 per interest |

The final score is normalized to a percentage (0–100%).

---

##  User Roles

### Regular User
- Create / edit / delete **their own** profile
- View their matches
- Chat with matches
- Log in with email

### Admin
- View **all** profiles
- Edit / delete **any** profile
- See all emails and details

**Default admin credentials:**
```
Username: admin
Password: admin123
```

---

##  Deployment (Railway)

1. Push your code to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Add a PostgreSQL database
4. Set the `DATABASE_URL` environment variable
5. Deploy — Railway will auto-detect FastAPI

Update `index.html`:
```javascript
const API = 'https://your-app.up.railway.app';
```

---

##  Authors

Built  as a student project.

Rania Shqerat

Hadeel Shehadeh

---

## License

This project is for educational purposes.
