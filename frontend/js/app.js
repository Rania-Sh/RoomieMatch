const API = "http://127.0.0.1:8000";
let selectedActivity = "";

// בחירת פעילות מהכרטיסיות
function selectActivity(type) {
    selectedActivity = type;

    // עדכון UI
    document.getElementById("selected-activity").textContent = "נבחר: " + type;

    // הדגשת הכרטיסייה הנבחרת
    document.querySelectorAll(".activity-type-card").forEach(card => {
        card.classList.remove("selected");
    });
    event.currentTarget.classList.add("selected");
}

// שמירת משתמש
async function saveUser() {
    const name = document.getElementById("name").value.trim();
    const age = parseInt(document.getElementById("age").value);
    const weight = parseFloat(document.getElementById("weight").value);
    const height = parseFloat(document.getElementById("height").value);
    const msg = document.getElementById("user-msg");

    // validation
    if (!name) {
        showMsg(msg, "אנא הכנסי שם!", "error");
        return;
    }
    if (age < 1 || age > 120) {
        showMsg(msg, "גיל לא תקין!", "error");
        return;
    }
    if (weight < 1 || weight > 300) {
        showMsg(msg, "משקל לא תקין!", "error");
        return;
    }
    if (height < 1 || height > 250) {
        showMsg(msg, "גובה לא תקין!", "error");
        return;
    }

    try {
        const res = await fetch(`${API}/user?name=${name}&age=${age}&weight=${weight}&height=${height}`, {
            method: "POST"
        });
        const data = await res.json();
        showMsg(msg, "✅ הפרטים נשמרו בהצלחה!", "success");
    } catch (err) {
        showMsg(msg, "שגיאה בשמירה!", "error");
    }
}

// שמירת פעילות
async function saveActivity() {
    const duration = parseInt(document.getElementById("duration").value);
    const distance = parseFloat(document.getElementById("distance").value);
    const date = document.getElementById("date").value;
    const msg = document.getElementById("activity-msg");

    // validation
    if (!selectedActivity) {
        showMsg(msg, "אנא בחרי פעילות!", "error");
        return;
    }
    if (duration < 1 || duration > 600) {
        showMsg(msg, "משך זמן לא תקין!", "error");
        return;
    }
    if (distance < 0 || distance > 1000) {
        showMsg(msg, "מרחק לא תקין!", "error");
        return;
    }
    if (!date) {
        showMsg(msg, "אנא בחרי תאריך!", "error");
        return;
    }

    // חישוב קלוריות אוטומטי
    const calories = calculateCalories(selectedActivity, duration, distance);

    try {
        const res = await fetch(`${API}/activity?type=${selectedActivity}&duration=${duration}&distance=${distance}&calories=${calories}&date=${date}`, {
            method: "POST"
        });
        const data = await res.json();
        showMsg(msg, `✅ פעילות נשמרה! שרפת ${calories} קלוריות 🔥`, "success");
    } catch (err) {
        showMsg(msg, "שגיאה בשמירה!", "error");
    }
}

// חישוב קלוריות
function calculateCalories(type, duration, distance) {
    const rates = {
        "ריצה": 10,
        "הליכה": 5,
        "אופניים": 7,
        "שחייה": 8
    };
    const rate = rates[type] || 6;
    return Math.round(rate * duration);
}

// טעינת היסטוריה
async function loadActivities() {
    try {
        const res = await fetch(`${API}/activities`);
        const data = await res.json();
        const list = document.getElementById("activities-list");

        if (data.activities.length === 0) {
            list.innerHTML = "<p style='color:#666; text-align:center'>אין פעילויות עדיין</p>";
            return;
        }

        list.innerHTML = data.activities.map(a => `
            <div class="activity-card">
                <div>
                    <strong>${a[1]}</strong> — ${a[2]} דקות | ${a[3]} ק"מ
                    <br><small style="color:#666">${a[5]}</small>
                </div>
                <span>🔥 ${a[4]} קל'</span>
            </div>
        `).join("");
    } catch (err) {
        console.error("שגיאה בטעינה", err);
    }
}

// הצגת הודעות
function showMsg(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
    setTimeout(() => {
        el.className = "msg";
    }, 3000);
}