# Wind Down Build Plan

## 1. Pitch

I’m building Wind Down because I want a calmer way to pause before opening Instagram at bedtime. I expect to use it most nights, about five to seven times a week, and use the session history to see whether my routine is helping.

## 2. Features

Build these in order. Each feature gets its own issue, branch, pull request, and prompt file in `prompts/`.

1. **Sign up and login:** As a user, I want to create an account, log in, and log out so that my Wind Down data stays private to me.
2. **Data model:** As a user, I want my routines, routine steps, and Wind Down sessions saved in related tables so that I can return to my data later.
3. **Session management (CRUD):** As a user, I want to add, view, open, edit, and delete a Wind Down session so that I can keep an accurate history.
4. **Validation:** As a user, I want a friendly message when I leave a required field blank so that I know how to fix the entry.
5. **Starred routines:** As a user, I want to star routines and view my starred routines so that I can quickly find the ones I use most.
6. **Find and sort:** As a user, I want to search or filter sessions and sort them by date or outcome so that I can find a particular night.
7. **Dashboard:** As a user, I want to see a chart of my sessions over time and summary stats so that I can understand my bedtime habits.
8. **iPhone Shortcut:** As a user, I want my iPhone Shortcut to start a Wind Down check when I open Instagram so that I get a pause before using it at bedtime.
9. **10-minute bypass:** As a user, I want the option to continue for 10 minutes so that I can make a deliberate choice without losing the rest of the routine.
10. **Three-step routine:** As a user, I want a short, three-step bedtime routine so that I have a simple alternative to continuing to scroll.

The data isolation test will be added with the sign-up and login feature. The dashboard calculation test will be added with the dashboard feature. Each test’s pull request will include the required plain-English explanation, failing and passing screenshots, and one sentence about what change would make the test fail.

## 3. Database

The app will use these tables. IDs are text values. Dates include date and time where needed.

- **users:** `id` (text, primary key), `email` (text, unique), `password_hash` (text), `created_at` (date).
- **routines:** `id` (text, primary key), `user_id` (text, foreign key to `users.id`), `name` (text), `is_active` (true/false), `created_at` (date).
- **routine_steps:** `id` (text, primary key), `routine_id` (text, foreign key to `routines.id`), `step_number` (number), `label` (text), `duration_minutes` (number).
- **wind_down_sessions:** `id` (text, primary key), `user_id` (text, foreign key to `users.id`), `routine_id` (text, optional foreign key to `routines.id`), `started_at` (date), `ended_at` (date, optional), `outcome` (text: pause, bypass, or routine completed), `minutes_delayed` (number), `note` (text).
- **stars:** `id` (text, primary key), `user_id` (text, foreign key to `users.id`), `routine_id` (text, foreign key to `routines.id`), `created_at` (date). A user can star a routine only once.

Relationships: one user can have many routines and sessions; one routine can have many steps and sessions; users and routines have a many-to-many relationship through `stars`.

```mermaid
erDiagram
    USERS ||--o{ ROUTINES : owns
    ROUTINES ||--o{ ROUTINE_STEPS : contains
    USERS ||--o{ WIND_DOWN_SESSIONS : logs
    ROUTINES ||--o{ WIND_DOWN_SESSIONS : uses
    USERS ||--o{ STARS : creates
    ROUTINES ||--o{ STARS : receives
