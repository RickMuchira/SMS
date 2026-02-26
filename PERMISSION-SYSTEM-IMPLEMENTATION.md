# Custom Permission System - Implementation Summary

## Date: February 26, 2026

---

## Overview

Implemented a flexible, granular permission system that allows super-admins to create custom admin accounts by selecting specific permissions. The system automatically generates role names based on selected permissions and ensures admins can only assign permissions they themselves possess.

---

## What a Student-Admin Sees

When a user with `student-admin` role logs in (via `/admin/login` or `/login`), they will see:

### Sidebar Navigation:
1. **Dashboard** ✅ (Always visible)
2. **Students** ✅ (Has `manage students` permission)

### Cannot Access:
- ❌ User management (requires `manage roles`)
- ❌ Classes (requires `manage classes`)
- ❌ Staff & Teachers (requires `manage staff`)
- ❌ Drivers (requires `view/manage drivers`)
- ❌ Fees (requires `view/manage fees`)
- ❌ Transport (requires `view/manage transport`)
- ❌ System Settings (only `super@gmail.com`)

---

## Implemented Features

### 1. **Backend API: Permission Endpoint**
**File**: `app/Http/Controllers/Api/PermissionController.php`

- Returns all permissions grouped by module (Students, Classes, Drivers, etc.)
- **Filters permissions based on current user** - users only see permissions they can assign
- Example response:
  ```json
  {
    "modules": {
      "students": {
        "label": "Students Module",
        "permissions": ["view students", "manage students"]
      },
      "classes": {
        "label": "Classes Module",
        "permissions": ["view classes", "manage classes"]
      }
    },
    "userPermissions": ["view students", "manage students", "manage roles"]
  }
  ```

**Route**: `GET /admin/api/permissions`

---

### 2. **Auto Role Name Generation Service**
**File**: `app/Services/RoleNameGeneratorService.php`

Automatically creates descriptive role names based on selected permissions:

| Selected Permissions | Generated Role Name |
|----------------------|---------------------|
| `manage students` | "Students Admin" |
| `manage students`, `manage classes` | "Students & Classes Admin" |
| `manage students`, `manage drivers`, `manage fees` | "Students, Drivers & Fees Admin" |

---

### 3. **Updated AdminUserController**
**File**: `app/Http/Controllers/Api/AdminUserController.php`

#### Changes:
- **`store()` method**: Accepts `permissions` array instead of single `role`
- **Permission validation**: Checks if requester has all permissions they're trying to assign
- **Auto role assignment**: Creates/assigns a role based on selected permissions
- **`update()` method**: Updated to handle permission arrays when editing users

#### Security Features:
✅ Users can **only assign permissions they have**  
✅ If an admin with only "Students" permissions tries to assign "Drivers" permissions → **403 Forbidden**  
✅ `super@gmail.com` account remains protected

---

### 4. **Frontend: Permission Checkboxes UI**
**File**: `resources/js/pages/admin/users/index.tsx`

#### Features:
- **Grouped permission checkboxes** by module
- **"Select All" toggle** for each module
- **Permission counter**: Shows "X permissions selected"
- **Responsive grid layout**: 2 columns on desktop, 1 on mobile
- **Edit dialog**: Update user permissions with the same UI
- **Real-time fetching**: Loads available permissions from API

#### User Experience:
```
┌─ Permissions ──────────────────────────────┐
│                                            │
│ Students Module          [Select All]     │
│ ☑ view students                           │
│ ☑ manage students                         │
│                                            │
│ Classes Module           [Select All]     │
│ ☐ view classes                            │
│ ☐ manage classes                          │
│                                            │
│ ... (other modules)                       │
│                                            │
│ 2 permissions selected                    │
└────────────────────────────────────────────┘
```

---

### 5. **Comprehensive Tests**
**File**: `tests/Feature/Api/AdminUserControllerTest.php`

#### Test Coverage:
1. ✅ Super admin can create users with custom permissions
2. ✅ Admin **cannot** assign permissions they don't have (403 error)
3. ✅ Admin **can** create users with permissions they have
4. ✅ Multiple module permissions generate correct role names
5. ✅ Super admin can update user permissions
6. ✅ `super@gmail.com` account cannot be deleted

**All 6 tests passing** with 26 assertions ✅

---

## How It Works

### Creating a New Admin User:

1. **Super admin** (`super@gmail.com`) logs in → has all permissions
2. Goes to `/admin/users`
3. Fills out form:
   - Name: "John Doe"
   - Email: "john@school.com"
   - Password: "password123"
   - Selects permissions:
     - ☑ view students
     - ☑ manage students
     - ☑ view classes
     - ☑ manage classes

4. **Backend processing**:
   - Validates that super admin has all selected permissions ✅
   - Creates user account
   - Assigns permissions directly to user
   - Generates role name: "Students & Classes Admin"
   - Creates/updates the role with these permissions
   - Assigns role to user

5. **Result**: John can now:
   - Log in via `/login` or `/admin/login`
   - See "Students" and "Classes" in sidebar
   - Manage students and classes
   - **Cannot** create other admins (no `manage roles` permission)

---

### Editing an Existing Admin:

1. Super admin clicks "Edit" on John's account
2. Dialog opens with:
   - Current permissions **pre-checked**
   - All available permissions grouped by module
3. Can toggle permissions on/off
4. Saves → backend updates permissions and regenerates role name

---

## Permission Hierarchy

| Permission Level | Can Do | Cannot Do |
|------------------|--------|-----------|
| **`super@gmail.com`** | Everything, including assigning `manage roles` | N/A |
| **User with `manage roles`** | Create/edit admins, assign any permissions *they have* | Assign permissions they don't have |
| **Module admins** (e.g., Students Admin) | Manage their modules | Create/edit other admins |

---

## Database Structure

### Permissions Table:
- `id`, `name`, `guard_name`
- Example: `name: "manage students", guard_name: "web"`

### Roles Table:
- `id`, `name`, `guard_name`
- Example: `name: "Students & Classes Admin", guard_name: "web"`

### Role-Permission Relationship:
- Many-to-many (via `role_has_permissions`)

### User-Permission Relationship:
- **Direct permissions**: `model_has_permissions` table
- **Role-based permissions**: Via `model_has_roles` → `role_has_permissions`

---

## API Endpoints

### Fetch Available Permissions
```
GET /admin/api/permissions
```
**Response**:
```json
{
  "modules": { "students": { "label": "...", "permissions": [...] } },
  "userPermissions": [...]
}
```

### Create User with Permissions
```
POST /admin/api/users
```
**Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "permissions": ["view students", "manage students"]
}
```

### Update User Permissions
```
PATCH /admin/api/users/{id}
```
**Body**:
```json
{
  "name": "John Doe",
  "permissions": ["view students", "manage students", "view classes"]
}
```

---

## Security Features

1. **Permission Filtering**: Users only see permissions they can assign
2. **Assignment Validation**: Backend checks if requester has all permissions being assigned
3. **`super@gmail.com` Protection**: Cannot be modified/deleted by others
4. **CSRF Protection**: All POST/PATCH/DELETE requests include CSRF token
5. **Session-based Auth**: Uses web guard (not Sanctum) for proper session management

---

## Files Modified/Created

### Backend:
- ✅ `app/Http/Controllers/Api/PermissionController.php` (NEW)
- ✅ `app/Http/Controllers/Api/AdminUserController.php` (UPDATED)
- ✅ `app/Services/RoleNameGeneratorService.php` (NEW)
- ✅ `routes/web.php` (UPDATED - added permissions endpoint)

### Frontend:
- ✅ `resources/js/pages/admin/users/index.tsx` (COMPLETELY REBUILT)

### Tests:
- ✅ `tests/Feature/Api/AdminUserControllerTest.php` (UPDATED)

### Config:
- ✅ Uses existing Spatie Laravel Permission package (no config changes needed)

---

## Next Steps (Optional Enhancements)

1. **Quick Templates**: Add preset permission bundles
   - "Student Admin" button → auto-checks student permissions
   - "Full Admin" button → checks all permissions

2. **Permission Descriptions**: Add tooltips explaining what each permission does

3. **Audit Log**: Track who assigned which permissions to whom

4. **Bulk Edit**: Select multiple users and update permissions at once

5. **Permission Dependencies**: Auto-check "view X" when "manage X" is selected

---

## Testing Checklist

✅ Create admin with single module permissions → Role: "Students Admin"  
✅ Create admin with multiple modules → Role: "Students & Drivers Admin"  
✅ Try to assign permissions you don't have → 403 error  
✅ Edit user and change permissions → Role name updates  
✅ Delete `super@gmail.com` → 403 error  
✅ All 6 automated tests pass  
✅ Code formatted with Laravel Pint  

---

## Summary

The custom permission system is **fully implemented and tested**. Admins can now create granular, flexible admin accounts with exactly the permissions they need. The system is secure, with built-in validation to prevent privilege escalation.

**Key Benefit**: Instead of rigid roles (Student Admin, Driver Admin), you now have infinite flexibility to create custom combinations like "Students, Fees & Transport Admin" by simply checking the relevant boxes.

**To test it live**:
1. Run `npm run dev` (if not already running)
2. Visit `http://localhost:8000/admin/login`
3. Log in as `super@gmail.com`
4. Go to "User management"
5. Create a new admin and select custom permissions
6. Log out and log in with the new account to see the customized sidebar! 🎉
