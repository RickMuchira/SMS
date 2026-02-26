# Enhanced UI Plan: Transport Management & Student Bulk Import

## New Requirements Analysis

### **Transport System Requirements:**

1. **Driver + Assistant System**
   - Each driver has an assistant
   - Both need login credentials
   - Both see transport route

2. **Trip Management**
   - Morning trips (Trip 1, Trip 2, etc.)
   - Evening trips (Trip 1, Trip 2, etc.)
   - Each trip assigned to specific driver+assistant pair

3. **Student Transport Assignment**
   - Mark which students use transport
   - Assign students to specific trips (Morning 1, Evening 2, etc.)
   - Sort students by pickup/dropoff location

4. **Location Management**
   - Create pickup/dropoff locations
   - Assign students to locations
   - Plan routes based on locations

5. **Trip Summary**
   - View: Driver, Assistant, Students for specific trip
   - Print/export trip manifests

### **Student Management Requirements:**

1. **Excel Import**
   - Bulk import students from Excel
   - Auto-format phone numbers (0745... → +254745...)
   - Auto-generate email addresses

2. **Grade/Class Management**
   - Dynamic grade creation (grows with school)
   - Auto-detect unique grades from imports
   - Assign students to grades

3. **Parent/Guardian Management**
   - Multiple guardians per student
   - Guardian phone numbers
   - Automatic account creation for students

---

## Revised Database Schema

### **1. Transport Tables**

#### `trips` table:
```sql
CREATE TABLE trips (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255),              -- "Morning Trip 1", "Evening Trip 2"
    type ENUM('morning', 'evening'),
    trip_number INT,                 -- 1, 2, 3...
    driver_id BIGINT,               -- Foreign key to users
    assistant_id BIGINT,            -- Foreign key to users
    status ENUM('active', 'inactive'),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `locations` table:
```sql
CREATE TABLE locations (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255),              -- "Karen Estate", "Kilimani Junction"
    description TEXT,
    latitude DECIMAL(10, 8),        -- For future GPS features
    longitude DECIMAL(11, 8),
    order INT,                      -- Route sequence
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `student_transport` table:
```sql
CREATE TABLE student_transport (
    id BIGINT PRIMARY KEY,
    student_id BIGINT,              -- Foreign key to users
    uses_transport BOOLEAN DEFAULT true,
    morning_trip_id BIGINT,         -- Which morning trip
    evening_trip_id BIGINT,         -- Which evening trip
    pickup_location_id BIGINT,
    dropoff_location_id BIGINT,
    notes TEXT,                      -- Special instructions
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `guardians` table:
```sql
CREATE TABLE guardians (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    relationship VARCHAR(50),       -- "Father", "Mother", "Uncle"
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `student_guardian` pivot table:
```sql
CREATE TABLE student_guardian (
    id BIGINT PRIMARY KEY,
    student_id BIGINT,
    guardian_id BIGINT,
    is_primary BOOLEAN DEFAULT false
);
```

#### Update `users` table:
```sql
ALTER TABLE users ADD COLUMN role_type VARCHAR(50);  -- "driver", "assistant"
ALTER TABLE users ADD COLUMN associated_driver_id BIGINT;  -- For assistant to link to driver
```

---

## Feature Implementation Plan

---

## PHASE 1: Transport Management System

### **1.1 Database Setup**

**Files to Create:**
- `database/migrations/2026_02_26_100000_create_trips_table.php`
- `database/migrations/2026_02_26_100001_create_locations_table.php`
- `database/migrations/2026_02_26_100002_create_student_transport_table.php`
- `database/migrations/2026_02_26_100003_create_guardians_table.php`
- `database/migrations/2026_02_26_100004_create_student_guardian_table.php`
- `database/migrations/2026_02_26_100005_add_transport_fields_to_users.php`

**Models to Create:**
- `app/Models/Trip.php`
- `app/Models/Location.php`
- `app/Models/StudentTransport.php`
- `app/Models/Guardian.php`

---

### **1.2 Driver-Admin Dashboard**

**Location:** `/admin/dashboard` (for driver-admin role)

#### Dashboard Sections:

**A. Today's Trips Overview:**
```
┌─────────────────────────────────────────────────────────┐
│ Today's Schedule - Thursday, Feb 26, 2026              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Morning Trips                                           │
│ ┌───────────────┬─────────────────┬──────────────┐    │
│ │ Trip 1        │ Driver: John M. │ 25 Students  │    │
│ │ 6:30 AM       │ Asst: Mary K.   │ 5 Stops      │    │
│ │ [View Route] [Mark Complete]                    │    │
│ └───────────────┴─────────────────┴──────────────┘    │
│                                                         │
│ ┌───────────────┬─────────────────┬──────────────┐    │
│ │ Trip 2        │ Driver: Paul O. │ 18 Students  │    │
│ │ 7:00 AM       │ Asst: Jane D.   │ 4 Stops      │    │
│ │ [View Route] [Mark Complete]                    │    │
│ └───────────────┴─────────────────┴──────────────┘    │
│                                                         │
│ Evening Trips                                           │
│ ┌───────────────┬─────────────────┬──────────────┐    │
│ │ Trip 1        │ Driver: John M. │ 25 Students  │    │
│ │ 4:00 PM       │ Asst: Mary K.   │ 5 Stops      │    │
│ │ [View Route] [Start Trip]                       │    │
│ └───────────────┴─────────────────┴──────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**B. Quick Actions:**
- 🚌 Create New Trip
- 👤 Add Driver/Assistant Account
- 📍 Manage Locations
- 👨‍👩‍👧‍👦 Assign Students to Transport
- 📊 View Transport Reports

---

### **1.3 Trip Management Page**

**Location:** `/admin/transport/trips`

#### Features:

**Create Trip Form:**
```
┌─────────────────────────────────────────────┐
│ Create New Trip                             │
├─────────────────────────────────────────────┤
│                                             │
│ Trip Name: [Morning Trip 1        ]        │
│                                             │
│ Type: ◉ Morning  ○ Evening                 │
│                                             │
│ Trip Number: [1]                            │
│                                             │
│ Driver: [Select Driver ▼]                  │
│   - John Mwangi                             │
│   - Paul Ochieng                            │
│                                             │
│ Assistant: [Select Assistant ▼]            │
│   - Mary Kamau                              │
│   - Jane Dulo                               │
│                                             │
│ Departure Time: [06:30 AM]                 │
│                                             │
│ Status: ☑ Active                           │
│                                             │
│ [Cancel]              [Create Trip]        │
└─────────────────────────────────────────────┘
```

**Trip List:**
```
┌────────────────────────────────────────────────────────────┐
│ All Trips                                      [+ New Trip]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Morning Trips                                              │
│ ┌──────────┬──────────┬────────────┬─────────┬──────────┐│
│ │ Name     │ Driver   │ Assistant  │ Students│ Actions  ││
│ ├──────────┼──────────┼────────────┼─────────┼──────────┤│
│ │ Trip 1   │ John M.  │ Mary K.    │ 25      │ Edit Del ││
│ │ 6:30 AM  │          │            │         │          ││
│ ├──────────┼──────────┼────────────┼─────────┼──────────┤│
│ │ Trip 2   │ Paul O.  │ Jane D.    │ 18      │ Edit Del ││
│ │ 7:00 AM  │          │            │         │          ││
│ └──────────┴──────────┴────────────┴─────────┴──────────┘│
│                                                            │
│ Evening Trips                                              │
│ (Similar table...)                                         │
└────────────────────────────────────────────────────────────┘
```

---

### **1.4 Location Management Page**

**Location:** `/admin/transport/locations`

```
┌─────────────────────────────────────────────┐
│ Pickup/Dropoff Locations      [+ Add Location]│
├─────────────────────────────────────────────┤
│                                             │
│ ┌─────┬──────────────────┬─────┬─────────┐│
│ │Order│ Location Name    │ Students │ Actions││
│ ├─────┼──────────────────┼──────┼─────────┤│
│ │ 1   │ Karen Estate     │  12  │ Edit Del││
│ │ 2   │ Kilimani Junc.   │   8  │ Edit Del││
│ │ 3   │ Westlands Mall   │  15  │ Edit Del││
│ │ 4   │ Lavington Gate   │   5  │ Edit Del││
│ └─────┴──────────────────┴──────┴─────────┘│
│                                             │
│ ℹ️ Drag to reorder route sequence          │
└─────────────────────────────────────────────┘
```

---

### **1.5 Student Transport Assignment**

**Location:** `/admin/transport/assign-students`

#### Interface:

```
┌────────────────────────────────────────────────────────────┐
│ Assign Students to Transport                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Filter: ☑ Show only students in transport                 │
│        ☐ Show all students                                 │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ Student Name    │ Transport │ Morning │ Evening │ Loc. ││
│ ├────────────────────────────────────────────────────────┤│
│ │ John Doe       │ ☑ Yes     │ Trip 1▼ │ Trip 1▼ │ [📍] ││
│ │ Class 5A       │           │ 6:30AM  │ 4:00PM  │      ││
│ ├────────────────────────────────────────────────────────┤│
│ │ Mary Smith     │ ☑ Yes     │ Trip 1▼ │ Trip 2▼ │ [📍] ││
│ │ Class 3B       │           │ 6:30AM  │ 4:30PM  │      ││
│ ├────────────────────────────────────────────────────────┤│
│ │ Peter Kamau    │ ☐ No      │   --    │   --    │  --  ││
│ │ Class 2A       │           │         │         │      ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ [Save All Changes]                                         │
└────────────────────────────────────────────────────────────┘
```

**Location Assignment Dialog (📍 button):**
```
┌────────────────────────────────┐
│ Assign Locations - John Doe   │
├────────────────────────────────┤
│                                │
│ Pickup Location:               │
│ [Select Location ▼]            │
│  - Karen Estate                │
│  - Kilimani Junction           │
│  - Westlands Mall              │
│                                │
│ Dropoff Location:              │
│ [Select Location ▼]            │
│  - Karen Estate                │
│                                │
│ Special Instructions:          │
│ [_________________________]    │
│                                │
│ [Cancel]        [Save]         │
└────────────────────────────────┘
```

---

### **1.6 Trip Route View (Driver/Assistant View)**

**Location:** `/transport/route` (accessible by driver/assistant)

```
┌────────────────────────────────────────────────────────────┐
│ Morning Trip 1 - Thursday, Feb 26, 2026                    │
│ Driver: John Mwangi  |  Assistant: Mary Kamau              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Route Stops (In Order):                                    │
│                                                            │
│ ✓ 1. Karen Estate                                         │
│   └─ John Doe (Class 5A)                                  │
│   └─ Mary Smith (Class 3B)                                │
│   └─ Peter Omondi (Class 4A)                              │
│   [3 students] [Mark All Picked Up]                       │
│                                                            │
│ ○ 2. Kilimani Junction                                    │
│   └─ Jane Wanjiku (Class 2A)                              │
│   └─ Tom Otieno (Class 5B)                                │
│   [2 students] [Mark All Picked Up]                       │
│                                                            │
│ ○ 3. Westlands Mall                                       │
│   └─ Sarah Muthoni (Class 1A)                             │
│   └─ David Kimani (Class 3A)                              │
│   └─ Alice Njeri (Class 4B)                               │
│   [3 students] [Mark All Picked Up]                       │
│                                                            │
│ Total: 8 students                                          │
│                                                            │
│ [🖨️ Print Manifest] [✓ Complete Trip]                    │
└────────────────────────────────────────────────────────────┘
```

---

### **1.7 Driver/Assistant Account Creation**

**Location:** `/admin/drivers` (enhanced existing page)

```
┌─────────────────────────────────────────────┐
│ Create Driver/Assistant Account             │
├─────────────────────────────────────────────┤
│                                             │
│ Account Type: ◉ Driver  ○ Assistant        │
│                                             │
│ Full Name: [_____________________]         │
│                                             │
│ Email: [_____________________]             │
│                                             │
│ Phone: [_____________________]             │
│                                             │
│ Password: [_____________________] [👁]     │
│                                             │
│ License Number: [_______________]          │
│ (for drivers)                               │
│                                             │
│ Associated Driver: [Select ▼]             │
│ (for assistants)                            │
│                                             │
│ ☑ Send login credentials via SMS          │
│                                             │
│ [Cancel]              [Create Account]     │
└─────────────────────────────────────────────┘
```

---

## PHASE 2: Student Bulk Import & Grade Management

### **2.1 Excel Import Feature**

**Location:** `/admin/students/import`

#### Excel Template Format:
```
| Student Name | Grade/Class | Parent 1 Name | Parent 1 Phone | Parent 1 Relation | Parent 2 Name | Parent 2 Phone | Parent 2 Relation | Uses Transport |
|--------------|-------------|---------------|----------------|-------------------|---------------|----------------|-------------------|----------------|
| John Doe     | Grade 5A    | Mary Doe      | 0745752274     | Mother            | John Doe Sr   | 0722123456     | Father            | Yes            |
| Jane Smith   | Grade 3B    | Alice Smith   | 0712345678     | Mother            |               |                |                   | No             |
```

#### Import Interface:

```
┌────────────────────────────────────────────────────────────┐
│ Bulk Import Students                                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Step 1: Download Template                                 │
│ [📥 Download Excel Template]                              │
│                                                            │
│ Step 2: Upload Filled Template                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Drag & drop Excel file here                       │   │
│ │ or                                                 │   │
│ │ [Browse Files]                                     │   │
│ └────────────────────────────────────────────────────┘   │
│                                                            │
│ File: students_import.xlsx ✓                              │
│                                                            │
│ Options:                                                   │
│ ☑ Auto-format phone numbers (+254...)                    │
│ ☑ Auto-generate student emails                           │
│ ☑ Create parent/guardian accounts                        │
│ ☑ Auto-create new grades if not exist                    │
│                                                            │
│ Default Password for Students: [guardian_phone]           │
│                                                            │
│ [Preview Import]                                           │
└────────────────────────────────────────────────────────────┘
```

#### Preview Before Import:

```
┌────────────────────────────────────────────────────────────┐
│ Import Preview - 50 students found                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ✓ 50 valid students                                       │
│ ⚠️ 2 warnings                                              │
│ ❌ 0 errors                                                 │
│                                                            │
│ New Grades to Create: Grade 1A, Grade 2B                  │
│ New Guardians: 75                                          │
│                                                            │
│ Warnings:                                                  │
│ • Row 15: Phone number already exists (will merge)        │
│ • Row 23: Parent 2 phone missing                          │
│                                                            │
│ Preview (first 5):                                         │
│ ┌──────────┬────────┬──────────────┬───────────────┐     │
│ │ Student  │ Grade  │ Email        │ Password      │     │
│ ├──────────┼────────┼──────────────┼───────────────┤     │
│ │ John Doe │ 5A     │ john.d@...   │ +254745...    │     │
│ │ Jane S.  │ 3B     │ jane.s@...   │ +254712...    │     │
│ └──────────┴────────┴──────────────┴───────────────┘     │
│                                                            │
│ [Cancel]  [Download Error Report]  [✓ Confirm Import]    │
└────────────────────────────────────────────────────────────┘
```

---

### **2.2 Grade/Class Management**

**Location:** `/admin/classes`

#### Enhanced Class Management:

```
┌────────────────────────────────────────────────────────────┐
│ Grades & Classes                         [+ Add Grade]     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Academic Year: [2026 ▼]                                   │
│                                                            │
│ Grade 1                                                    │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ Class 1A - 25 students  [View] [Edit]               │  │
│ │ Class 1B - 28 students  [View] [Edit]               │  │
│ │ Class 1C - 22 students  [View] [Edit]               │  │
│ └─────────────────────────────────────────────────────┘  │
│ [+ Add Class to Grade 1]                                  │
│                                                            │
│ Grade 2                                                    │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ Class 2A - 30 students  [View] [Edit]               │  │
│ │ Class 2B - 26 students  [View] [Edit]               │  │
│ └─────────────────────────────────────────────────────┘  │
│ [+ Add Class to Grade 2]                                  │
│                                                            │
│ ... (more grades)                                          │
│                                                            │
│ ℹ️ Note: New grades auto-created during student import   │
└────────────────────────────────────────────────────────────┘
```

**Add Grade Dialog:**
```
┌────────────────────────────────┐
│ Add New Grade                  │
├────────────────────────────────┤
│                                │
│ Grade Name: [Grade 6]          │
│                                │
│ Initial Classes:               │
│ [Class 6A        ] [×]         │
│ [Class 6B        ] [×]         │
│ [+ Add Another Class]          │
│                                │
│ [Cancel]        [Create]       │
└────────────────────────────────┘
```

---

### **2.3 Guardian Management**

**Location:** `/admin/students/{id}/guardians`

```
┌────────────────────────────────────────────────────────────┐
│ John Doe - Guardians                                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Primary Guardian                                           │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ Mary Doe (Mother)                                   │  │
│ │ 📞 +254745752274                                    │  │
│ │ ✉️ mary.doe@example.com                             │  │
│ │ [Edit] [Remove]                                     │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                            │
│ Additional Guardians                                       │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ John Doe Sr (Father)                                │  │
│ │ 📞 +254722123456                                    │  │
│ │ ✉️ john.doe.sr@example.com                          │  │
│ │ [Edit] [Remove] [Set as Primary]                   │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                            │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ Alice Kamau (Aunt)                                  │  │
│ │ 📞 +254700111222                                    │  │
│ │ ✉️ alice.kamau@example.com                          │  │
│ │ [Edit] [Remove] [Set as Primary]                   │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                            │
│ [+ Add Guardian]                                           │
└────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### **Sprint 1: Transport Core (Week 1)**
1. ✅ Create database migrations (trips, locations, student_transport)
2. ✅ Create models (Trip, Location, StudentTransport)
3. ✅ Build Trip management page
4. ✅ Build Location management page
5. ✅ Create driver/assistant account creation

### **Sprint 2: Transport Assignment (Week 2)**
6. ✅ Build student transport assignment interface
7. ✅ Create trip route view for drivers/assistants
8. ✅ Implement driver-admin dashboard
9. ✅ Add transport statistics to dashboard API

### **Sprint 3: Student Import (Week 3)**
10. ✅ Create guardians table migration
11. ✅ Build Excel import backend logic
12. ✅ Create import UI with preview
13. ✅ Implement phone number formatter (+254)
14. ✅ Auto-create grades from import

### **Sprint 4: Grade & Guardian Management (Week 4)**
15. ✅ Enhanced grade/class management UI
16. ✅ Guardian management interface
17. ✅ Multi-guardian support
18. ✅ Testing and refinement

---

## Technical Implementation Details

### **Backend API Endpoints:**

```php
// Transport
POST   /admin/api/transport/trips          // Create trip
GET    /admin/api/transport/trips          // List trips
PATCH  /admin/api/transport/trips/{id}     // Update trip
DELETE /admin/api/transport/trips/{id}     // Delete trip

POST   /admin/api/transport/locations      // Create location
GET    /admin/api/transport/locations      // List locations
PATCH  /admin/api/transport/locations/{id} // Update location
DELETE /admin/api/transport/locations/{id} // Delete location

POST   /admin/api/transport/assign         // Assign student to transport
GET    /admin/api/transport/route/{trip}   // Get trip route
POST   /admin/api/transport/complete       // Mark trip complete

// Students
POST   /admin/api/students/import          // Import from Excel
GET    /admin/api/students/import/template // Download template
GET    /admin/api/students/{id}/guardians  // List guardians
POST   /admin/api/students/{id}/guardians  // Add guardian
DELETE /admin/api/guardians/{id}           // Remove guardian

// Grades
POST   /admin/api/grades                   // Create grade
GET    /admin/api/grades                   // List grades
```

---

## Files to Create

### Backend:
- `app/Models/Trip.php`
- `app/Models/Location.php`
- `app/Models/StudentTransport.php`
- `app/Models/Guardian.php`
- `app/Http/Controllers/Admin/TransportController.php`
- `app/Http/Controllers/Admin/LocationController.php`
- `app/Http/Controllers/Admin/StudentImportController.php`
- `app/Services/ExcelImportService.php`
- `app/Services/PhoneNumberFormatter.php`
- Database migrations (10+ files)

### Frontend:
- `resources/js/pages/admin/transport/trips.tsx`
- `resources/js/pages/admin/transport/locations.tsx`
- `resources/js/pages/admin/transport/assign-students.tsx`
- `resources/js/pages/admin/students/import.tsx`
- `resources/js/pages/admin/students/guardians.tsx`
- `resources/js/pages/transport/route.tsx` (driver view)
- `resources/js/components/transport/trip-card.tsx`
- `resources/js/components/transport/route-stop.tsx`
- `resources/js/components/students/guardian-card.tsx`

---

## Summary

This comprehensive plan covers:

✅ **Transport System:**
- Driver + Assistant accounts
- Morning/Evening trips with customization
- Student assignment to specific trips
- Location-based routing
- Driver/Assistant route view
- Trip manifests

✅ **Student Management:**
- Excel bulk import
- Auto phone formatting (0745... → +254745...)
- Auto-generate emails
- Auto-create grades
- Multiple guardians per student
- Parent account creation

✅ **Multi-Module Dashboard:**
- Combined stats from all modules
- Transport overview
- Student overview
- Quick actions

---

**Ready to start implementing?** We can begin with Sprint 1 (Transport Core) or any specific feature you'd like prioritized! 🚀
