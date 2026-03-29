# FireOps HQ — Database Schema

> Last updated: 2026-03-29

## Relationship Diagram

```
incidents
    │
    └── incident_trucks ──── trucks
            │
            ├── incident_truck_crew ──── crew_members
            │
            ├── shifts
            │     └── shift_crew ──────── crew_members
            │
            └── expenses
```

---

## Tables

### 1. `incidents`

Core table for fire incidents.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| name | text | No | — | e.g. "Eagle Creek Fire" |
| type | text | No | — | wildfire, prescribed, structure, other |
| status | text | No | 'active' | active, contained, controlled, out |
| location | text | No | — | |
| start_date | date | No | — | |
| acres | numeric | Yes | — | |
| containment | integer | Yes | — | 0–100 |
| notes | text | Yes | — | |
| created_at | timestamptz | No | now() | |

---

### 2. `trucks`

Fleet inventory — exists independently of incidents.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| name | text | No | — | e.g. "DL31" |
| status | text | No | 'available' | available, deployed, maintenance |
| notes | text | Yes | — | |
| created_at | timestamptz | No | now() | |

---

### 3. `crew_members`

Personnel roster.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| name | text | No | — | |
| role | text | No | — | crew boss, sawyer, EMT, etc. |
| phone | text | Yes | — | |
| active | boolean | No | true | |
| created_at | timestamptz | No | now() | |

---

### 4. `incident_trucks`

Central assignment: a truck deployed to an incident. This is the operational unit.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| incident_id | uuid FK → incidents | No | — | |
| truck_id | uuid FK → trucks | No | — | |
| status | text | No | 'assigned' | assigned, active, demobed, completed |
| assigned_at | timestamptz | No | now() | |

Unique constraint: (incident_id, truck_id)

---

### 5. `incident_truck_crew`

Crew assigned to a specific truck on a specific incident.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| incident_truck_id | uuid FK → incident_trucks | No | — | |
| crew_member_id | uuid FK → crew_members | No | — | |
| role_on_assignment | text | Yes | — | Override role for this assignment |
| assigned_at | timestamptz | No | now() | |
| released_at | timestamptz | Yes | — | When crew member was released |
| is_active | boolean | No | true | Whether currently assigned |
| notes | text | Yes | — | |

Unique constraint: (incident_truck_id, crew_member_id)

---

### 6. `shifts`

Time tracking: an operational shift for a truck assignment.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| incident_truck_id | uuid FK → incident_trucks | No | — | |
| date | date | No | — | |
| type | text | No | 'day' | day, night |
| start_time | timestamptz | Yes | — | |
| end_time | timestamptz | Yes | — | |
| notes | text | Yes | — | |
| created_at | timestamptz | No | now() | |

---

### 7. `shift_crew`

Historical snapshot: who actually worked a shift and their hours.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| shift_id | uuid FK → shifts | No | — | |
| crew_member_id | uuid FK → crew_members | No | — | |
| hours | numeric | No | — | |
| role_on_shift | text | Yes | — | |
| notes | text | Yes | — | |

Unique constraint: (shift_id, crew_member_id)

---

### 8. `expenses`

Costs linked to a truck assignment on an incident.

| Field | Type | Nullable | Default | Notes |
|-------|------|----------|---------|-------|
| id | uuid | No | gen_random_uuid() | PK |
| incident_id | uuid FK → incidents | No | — | Required — every expense belongs to an incident |
| incident_truck_id | uuid FK → incident_trucks | Yes | — | Optional — link to specific truck assignment |
| category | text | No | — | fuel, ppe, food, lodging, equipment, other |
| amount | numeric | No | — | |
| description | text | Yes | — | |
| receipt_url | text | Yes | — | |
| date | date | No | — | |
| created_at | timestamptz | No | now() | |

---

## Indexes

| Index | Table | Column(s) |
|-------|-------|-----------|
| idx_incident_trucks_incident | incident_trucks | incident_id |
| idx_incident_trucks_truck | incident_trucks | truck_id |
| idx_incident_truck_crew_itid | incident_truck_crew | incident_truck_id |
| idx_incident_truck_crew_crew | incident_truck_crew | crew_member_id |
| idx_shifts_itid | shifts | incident_truck_id |
| idx_shifts_date | shifts | date |
| idx_shift_crew_shift | shift_crew | shift_id |
| idx_shift_crew_crew | shift_crew | crew_member_id |
| idx_expenses_itid | expenses | incident_truck_id |
| idx_expenses_incident | expenses | incident_id |
| idx_expenses_date | expenses | date |

---

## RLS Status

All tables have RLS enabled with permissive (allow-all) policies. These will be tightened when authentication is added.

---

## Assumptions

1. No auth system yet — RLS policies are wide open.
2. `incident_trucks` is the central operational unit; all downstream data (crew, shifts, expenses) flows through it.
3. A crew member can only be assigned once per truck-on-incident (unique constraint).
4. Shift hours are logged per person, not derived from start/end times.
5. Expenses always belong to a truck assignment — no "incident-only" expenses without a truck context.

## Known Limitations & Future Improvements

1. **No `updated_at` columns** — should add with auto-update triggers when needed.
2. **No soft deletes** — CASCADE deletes propagate; may want soft delete for audit trails.
3. **No file storage bucket** — `receipt_url` exists but no storage bucket is configured yet.
4. **Expense assumption** — requiring `incident_truck_id` means you can't log an expense for an incident without a truck. May need to make this nullable if overhead expenses arise.
5. **No auth integration** — `user_id` fields are absent; will need to tie records to authenticated users.
6. **No audit log** — for compliance, may want to track who created/modified records.
