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
