# Transport & Drivers Module – Change Log & To-Do List

Step-by-step list of **what changed** and **how to address** each item (for you or your team).

---

## 1. New Page: Drivers & Assistants (`/admin/drivers`)

| What changed | Where | How to address |
|--------------|--------|----------------|
| New admin page to designate which staff are drivers/assistants | `GET /admin/drivers` → `resources/js/pages/admin/drivers/index.tsx` | **Step 1.1** Ensure your admin user has permission **view drivers** or **manage drivers** (e.g. super-admin or driver-admin role). **Step 1.2** Open `http://localhost:8000/admin/drivers`. **Step 1.3** Only staff who have a profile at `/admin/staff/profiles` appear; use the checkboxes to mark who is a **Driver** and/or **Assistant**. |

---

## 2. New API: Driver/Assistant Designation

| What changed | Where | How to address |
|--------------|--------|----------------|
| API to list staff with driver/assistant flags | `GET /admin/api/drivers` → `AdminDriverController::index()` | Used by the Drivers page. No action unless you build another client; ensure **view drivers** or **manage drivers** for callers. |
| API to update a user’s designation | `PATCH /admin/api/drivers/{user}` → `AdminDriverController::update()` | Body: `{ "is_driver": true, "is_assistant": false }`. Requires **manage drivers**. Only users with a staff profile can be designated. |

---

## 3. New APIs: Transport Dropdowns (Drivers & Assistants Lists)

| What changed | Where | How to address |
|--------------|--------|----------------|
| List of users designated as drivers | `GET /admin/api/transport/drivers` → `AdminDriverController::drivers()` | **Step 3.1** Requires **manage transport**. **Step 3.2** Used by Buses, Route planner, and Trips pages for the “Driver” dropdown. If the list is empty, go to `/admin/drivers` and check “Driver” for at least one staff. |
| List of users designated as assistants | `GET /admin/api/transport/assistants` → `AdminDriverController::assistants()` | Same as above for the “Assistant” dropdown. Mark staff as assistants on `/admin/drivers` if the list is empty. |

---

## 4. Buses Page: Driver/Assistant Dropdowns

| What changed | Where | How to address |
|--------------|--------|----------------|
| Bus form no longer uses “all staff” for driver/assistant | `resources/js/pages/admin/transport/buses.tsx` | **Step 4.1** Add/Edit Bus now loads **Default Driver** and **Default Assistant** from `/admin/api/transport/drivers` and `/admin/api/transport/assistants`. **Step 4.2** If dropdowns are empty, designate drivers and assistants at `/admin/drivers` first. |

---

## 5. Route Planner: Driver/Assistant Dropdowns

| What changed | Where | How to address |
|--------------|--------|----------------|
| Trip creation uses designated drivers/assistants only | `resources/js/pages/admin/transport/route-planner.tsx` | **Step 5.1** When creating a trip, Driver and Assistant dropdowns show only users marked on `/admin/drivers`. **Step 5.2** Ensure at least one driver (and optionally assistants) are designated before creating trips. |

---

## 6. Trips Page: Driver/Assistant Dropdowns

| What changed | Where | How to address |
|--------------|--------|----------------|
| Trips list/create/edit use designated drivers/assistants | `resources/js/pages/admin/transport/trips.tsx` | **Step 6.1** Driver and Assistant dropdowns now come from the new APIs instead of being derived from existing trips. **Step 6.2** Designate drivers/assistants at `/admin/drivers` so the dropdowns are populated. |

---

## 7. Trip Schedule Conflict Validation (Backend)

| What changed | Where | How to address |
|--------------|--------|----------------|
| Creating or updating a trip checks for double-booking | `app/Http/Controllers/Api/TransportTripController.php` (`store`, `update`, `checkScheduleConflict`) | **Step 7.1** When saving a trip (create or update), the server checks that the same driver/assistant is not already on another trip on the **same date** with **overlapping start/end time**. **Step 7.2** If there is a conflict, the API returns **422** with a message like: *"Schedule conflict: This driver is already assigned to another trip at the same time (overlap with: ...)."* **Step 7.3** Optional: when creating trips (e.g. in Route planner), send `end_time` if you want exact windows; otherwise the backend assumes 2 hours from `start_time`. |

---

## 8. Sidebar: Drivers & Assistants Link

| What changed | Where | How to address |
|--------------|--------|----------------|
| New sidebar item “Drivers & Assistants” | `resources/js/components/app-sidebar.tsx` | **Step 8.1** Visible only to users with **view drivers** or **manage drivers**. **Step 8.2** Click it to go to `/admin/drivers`. If you don’t see it, assign the driver-admin role (or give view/manage drivers permission) to your user. |

---

## 9. Routes & Permissions (Backend)

| What changed | Where | How to address |
|--------------|--------|----------------|
| New web route for Drivers page | `routes/web.php` | `GET /admin/drivers` → Inertia `admin/drivers/index`. Middleware: `view drivers|manage drivers`. |
| New admin API routes for drivers list & update | `routes/web.php` (under `admin/api`) | `GET /admin/api/drivers`, `PATCH /admin/api/drivers/{user}`. Same permission as above. |
| New admin API routes for transport dropdowns | `routes/web.php` (under `admin/api`) | `GET /admin/api/transport/drivers`, `GET /admin/api/transport/assistants`. Middleware: **manage transport**. |

**How to address:**  
- **Step 9.1** Run `php artisan route:list` and confirm these routes exist.  
- **Step 9.2** Ensure roles have the right permissions (e.g. `RolePermissionSeeder` or similar already defines **view drivers**, **manage drivers**; driver-admin has them).  

---

## 10. New Controller & Trip Validation Logic

| What changed | Where | How to address |
|--------------|--------|----------------|
| New controller for driver/assistant designation and lists | `app/Http/Controllers/Api/AdminDriverController.php` | Handles: staff list with `is_driver`/`is_assistant`, update designation, and `drivers()` / `assistants()` for dropdowns. No config needed. |
| Trip store accepts `end_time` | `TransportTripController::store()` | Optional. You can send `end_time` in the trip create payload for more accurate conflict checks. |
| Trip update validates schedule conflict | `TransportTripController::update()` | Same conflict rules as create. When editing a trip, changing driver/assistant or time can trigger a 422 if it creates overlap. |

---

## Quick “First Time” Checklist

1. **Permissions:** Ensure your admin has **view drivers**, **manage drivers**, and **manage transport** (e.g. super-admin or driver-admin).
2. **Staff:** Add staff and create profiles at **Staff Profiles** (`/admin/staff/profiles`).
3. **Designate:** Open **Drivers & Assistants** (`/admin/drivers`), search staff, and check **Driver** and/or **Assistant** for each person who can drive or assist.
4. **Buses:** In **Buses** (`/admin/transport/buses`), add/edit buses; Default Driver and Default Assistant dropdowns should now list only designated staff.
5. **Trips:** In **Route planner** or **Trips**, create trips and assign driver/assistant; avoid assigning the same person to two trips at the same time on the same day (backend will block with 422 if you do).

---

## Files Touched (Reference)

- **New:** `app/Http/Controllers/Api/AdminDriverController.php`, `resources/js/pages/admin/drivers/index.tsx`, `docs/TRANSPORT-DRIVERS-CHANGELOG-TODO.md`
- **Modified:** `routes/web.php`, `app/Http/Controllers/Api/TransportTripController.php`, `resources/js/pages/admin/transport/buses.tsx`, `resources/js/pages/admin/transport/route-planner.tsx`, `resources/js/pages/admin/transport/trips.tsx`, `resources/js/components/app-sidebar.tsx`

If you want this as a short “chart” (e.g. a one-page table or a Mermaid diagram), say how you’d like it (format and where to put it) and I’ll add it.
