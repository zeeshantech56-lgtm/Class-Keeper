
# Attendance Management Web App — Plan

Responsive web app for taking student attendance, managing classes/batches, and giving admin a full analytical picture through a rich dashboard.

## Roles

- **Admin**: full access. Creates teachers, classes, batches; assigns teachers to classes; manages all students; marks/edits any attendance; sees every dashboard view; exports all data; views audit log.
- **Teacher**: scoped to assigned classes only. Add/edit/delete students in those classes, mark & edit attendance, class-scoped dashboards, export their class data.

## Core Modules

### 1. Auth (Lovable Cloud)
- Email + password login.
- First signup becomes admin (bootstrap). After that, admin creates teachers with a temp password.
- Public `/auth`; app under `_authenticated/`.

### 2. Classes & Batches
- Admin creates classes (e.g., "Grade 10") and batches inside them ("Morning", "Evening").
- Admin assigns one or more teachers to each class.

### 3. Students (with parent contact)
- Fields: name, roll number, optional email/phone, **parent name**, **parent phone**, **parent email**.
- Admin manages all; teacher manages students in assigned classes.

### 4. Attendance Marking
- Flow: pick class → batch → date → student list with Present/Absent toggle.
- **Mark all present** shortcut, then flip absentees.
- Re-editable for the same date; every change writes to the audit log.

### 5. Admin Dashboard

**A. Today's Pulse**
- KPI cards: total students, present today, absent today, overall attendance %, classes not-yet-marked.
- "Not yet marked" list: which class+batch+teacher haven't submitted attendance today.
- Attendance rate vs. yesterday and vs. 7-day average with trend arrows.

**B. Trends Over Time**
- Line chart: daily / weekly / monthly attendance % (toggle range).
- Month-over-month bar chart (Jan / Feb / Mar…).
- Day-of-week heatmap: which weekdays see highest absence.
- Calendar heatmap (GitHub-style) of attendance intensity across the year.

**C. Class & Batch Health**
- Leaderboard: classes ranked by attendance %.
- Batch comparison inside a class.
- Underperforming classes flagged red when below the at-risk threshold.
- Teacher activity: consistency of marking, last active day.

**D. Student-Level Insights**
- **At-risk students** below **75%** attendance (threshold editable in settings).
- Chronic absentees: 3+ consecutive absences, or absent > N days this month.
- Perfect attendance list.
- Longest present / absent streaks.
- Newly declining: students whose attendance dropped >10% vs last month.

**E. Patterns & Anomalies**
- Absence-spike detection: days with unusually high absence badged (mean + 2·stdev of last 30 days).
- Per-student patterns: e.g. "usually absent on Fridays".
- Batch churn: students added/removed this month.

**F. Global Filters & Drill-Down**
- Top-bar filters: date range (Today, This Week, This Month, month picker Jan/Feb/…, Custom), class, batch, teacher.
- Click any chart segment → drills into the matching student list.
- Compare two date ranges toggle.

**G. Admin Operations Overview**
- Teacher roster health (classes covered, last active).
- Data completeness: % of school days with attendance recorded per class.
- **Audit log**: who marked/edited attendance and when.

### 6. Reports & Export
- Custom date range + filters (class, batch, student).
- **CSV export** from any dashboard widget's filtered view.
- **Auto-generated monthly PDF report** per class (attendance %, present/absent counts, at-risk students).
- **Absentee contact list** for today: student + parent name + parent phone/email, ready to copy/export.

### 7. Individual Student View
- Full attendance timeline.
- Monthly calendar (green = present, red = absent).
- Streaks, attendance %, at-risk badge if applicable.
- Parent contact block.

## Data Model (Lovable Cloud / Postgres)

```text
profiles            (id → auth.users, full_name, email)
user_roles          (user_id, role: 'admin' | 'teacher')  -- separate table; has_role() security definer
classes             (id, name, created_by)
batches             (id, class_id, name)
teacher_assignments (teacher_id, class_id)
students            (id, class_id, batch_id, name, roll_no,
                     email, phone,
                     parent_name, parent_phone, parent_email)
attendance          (id, student_id, date, status, marked_by, marked_at)
                    unique (student_id, date)
attendance_audit    (id, attendance_id, student_id, date,
                     old_status, new_status, changed_by, changed_at)
app_settings        (key, value)   -- e.g. at_risk_threshold = 75
```

- RLS on all tables. Admin via `has_role(auth.uid(), 'admin')`. Teachers scoped through `teacher_assignments`.

## Routes

Public:
- `/auth`

Protected (`_authenticated/`):
- `/dashboard`
- `/classes`, `/classes/$classId`
- `/students`, `/students/$studentId`
- `/attendance`
- `/teachers` (admin only)
- `/reports`
- `/audit` (admin only)
- `/settings` (admin only)

## Tech

- TanStack Start + React + Tailwind + shadcn/ui.
- Lovable Cloud for auth, DB, RLS.
- `createServerFn` + `requireSupabaseAuth` for reads/writes; TanStack Query for caching.
- Recharts for charts; Tailwind grid for calendar/day-of-week heatmaps.
- CSV built client-side; PDF via `jspdf` + `jspdf-autotable`.
- Design: warm neutrals + one strong accent — avoid generic purple SaaS.

## Build Order

1. Enable Lovable Cloud; schema, RLS, `has_role()`, seed settings.
2. Auth + first-admin bootstrap.
3. Classes, batches, teacher assignments.
4. Students CRUD (with parent fields).
5. Attendance marking + bulk actions + audit log writes.
6. Dashboard — Today's Pulse + Trends.
7. Dashboard — Class Health + Student Insights + At-risk logic.
8. Dashboard — Heatmaps + Anomaly detection + Compare ranges.
9. Individual student view.
10. Reports: CSV export, monthly PDF, absentee contact list.
11. Audit log + Settings page.
12. Polish: mobile layout, empty states, toasts, loading skeletons.

Approve and I'll start with step 1.
