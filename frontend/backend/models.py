def calculate_match_score(user1, user2):
    score = 0

    # city
    if user1[4] == user2[4]:
        score += 40

    # budget (FIXED)
    budget_diff = abs(int(user1[5]) - int(user2[5]))
    if budget_diff < 500:
        score += 20
    elif budget_diff < 1000:
        score += 10

    # sleep_time (FIXED)
    if int(user1[6]) == int(user2[6]):
        score += 15

    # cleanliness
    if user1[7] == user2[7]:
        score += 10

    # pets
    if user1[8] == user2[8]:
        score += 10

    # gender
    if user1[9] == user2[9]:
        score += 10

    # interests (FIXED index + safe)
    interests1 = set((user1[10] or "").split(","))
    interests2 = set((user2[10] or "").split(","))
    score += len(interests1.intersection(interests2)) * 5

    return score / 100