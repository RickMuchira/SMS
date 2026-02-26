# UI Customization Plan for Module-Specific Admins

## Overview
Customize the dashboard and module pages to show relevant information and actions based on the admin's specific role (student-admin, driver-admin, etc.)

---

## Current State

### What Each Admin Sees in Sidebar:
- **Student-Admin**: Dashboard, Students
- **Driver-Admin**: Dashboard, Drivers, Transport  
- **Multi-Module Admin**: Dashboard + all modules they have permissions for

### Problem:
All admins currently see the **same generic dashboard** with placeholder content. Module pages show the same UI regardless of who's viewing.

---

## Goals

1. **Personalized Dashboards**: Show role-specific statistics and quick actions
2. **Context-Aware Module Pages**: Different features/actions based on permissions
3. **Quick Stats Cards**: At-a-glance metrics for their modules
4. **Recent Activity**: Show recent changes in their area of responsibility
5. **Quick Actions**: Shortcuts to common tasks for that role

---

## Plan: Role-Specific Dashboard Customization

### 1. **Student-Admin Dashboard** (`/admin/dashboard`)

#### Statistics Cards (Top Row):
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Total Students  │ Active Classes  │ New This Month  │ Pending Approval│
│      245        │       12        │       15        │        3        │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

#### Quick Actions Section:
- 🎓 **Add New Student**
- 📋 **View All Students**
- 📊 **Student Reports**
- 🏫 **Manage Classes**

#### Recent Activity Feed:
- "John Doe added to Class 5A" - 2 hours ago
- "Mary Smith's guardian info updated" - 5 hours ago
- "Class 3B added with 25 students" - Yesterday

#### Upcoming Tasks/Alerts:
- ⚠️ 3 students missing guardian phone numbers
- 📅 Class assignments pending for new students
- ℹ️ 5 students need email verification

---

### 2. **Driver-Admin Dashboard** (`/admin/dashboard`)

#### Statistics Cards:
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Total Drivers   │ Active Routes   │ On Duty Today   │ Pending Approval│
│       18        │       8         │       12        │        2        │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

#### Quick Actions:
- 🚌 **Add New Driver**
- 🗺️ **View All Routes**
- 📊 **Driver Reports**
- 🛣️ **Manage Transport**

#### Recent Activity:
- "Driver Michael assigned to Route 3" - 1 hour ago
- "Route 5 schedule updated" - 3 hours ago
- "New bus added to fleet" - Yesterday

#### Alerts:
- ⚠️ 2 drivers' licenses expiring this month
- 🔧 Bus maintenance due for Route 4
- ℹ️ Route 7 needs backup driver

---

### 3. **Multi-Module Admin Dashboard**

#### Tabbed Statistics:
```
┌─ Students ─┬─ Drivers ─┬─ Fees ──────────────────────────────┐
│            │           │                                     │
│  Combined stats from all their modules                      │
│  Show most important metrics from each                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Quick Actions: 
- Show actions from ALL modules they manage
- Grouped by module with icons

---

## Plan: Module Page Customization

### 1. **Students Page** (`/admin/students`)

#### For Student-Admin (Full Access):
✅ Create Student button  
✅ Edit student details  
✅ Delete students  
✅ View all student info (including guardian details)  
✅ Export student list  
✅ Bulk actions (assign to classes, etc.)  

#### For Multi-Module Admin with "view students" only:
❌ No Create button  
❌ No Edit/Delete buttons  
✅ View-only table  
✅ Export allowed  
❌ No bulk actions  

---

### 2. **Drivers Page** (`/drivers`)

#### For Driver-Admin (Full Access):
✅ Add Driver button  
✅ Edit driver info  
✅ Delete drivers  
✅ Assign to routes  
✅ View license expiry  
✅ Upload documents  

#### For View-Only:
❌ No Add button  
❌ No Edit/Delete  
✅ View driver list  
✅ See assignments  

---

### 3. **Classes Page** (`/admin/classes`)

#### For Admin with "manage classes":
✅ Create Class  
✅ Edit class details  
✅ Assign students  
✅ View class roster  
✅ Delete classes  

#### For View-Only:
✅ View class list  
✅ See student count  
❌ No modifications  

---

## Implementation Strategy

### Phase 1: Dashboard Statistics API

**Create API endpoints to fetch role-specific stats:**

#### `GET /admin/api/dashboard/stats`
Response based on user permissions:
```json
{
  "students": {
    "total": 245,
    "active_classes": 12,
    "new_this_month": 15,
    "pending_approval": 3
  },
  "drivers": {
    "total": 18,
    "active_routes": 8,
    "on_duty_today": 12,
    "pending_approval": 2
  },
  "recent_activity": [
    {
      "message": "John Doe added to Class 5A",
      "timestamp": "2 hours ago",
      "module": "students"
    }
  ],
  "alerts": [
    {
      "type": "warning",
      "message": "3 students missing guardian phone numbers",
      "module": "students"
    }
  ]
}
```

---

### Phase 2: Dashboard Frontend Components

#### Files to Create:
1. `resources/js/components/dashboard/stat-card.tsx` - Reusable stat card
2. `resources/js/components/dashboard/quick-actions.tsx` - Quick action buttons
3. `resources/js/components/dashboard/recent-activity.tsx` - Activity feed
4. `resources/js/components/dashboard/alerts-panel.tsx` - Alerts/notifications
5. `resources/js/components/dashboard/student-admin-dashboard.tsx` - Student admin view
6. `resources/js/components/dashboard/driver-admin-dashboard.tsx` - Driver admin view
7. `resources/js/components/dashboard/multi-module-dashboard.tsx` - Mixed roles view

#### Update:
- `resources/js/pages/dashboard.tsx` - Main dashboard that routes to correct component based on user permissions

---

### Phase 3: Module Page Permission-Based UI

#### Update Module Pages:
1. **Students Page** (`resources/js/pages/admin/students/index.tsx`):
   - Check `hasPermission('manage students')` vs `hasPermission('view students')`
   - Hide Create/Edit/Delete buttons if only view permission
   - Show read-only table for view-only users

2. **Drivers Page** (create if doesn't exist):
   - Similar permission-based UI

3. **Classes Page** (`resources/js/pages/admin/classes/index.tsx`):
   - Permission-based actions

---

### Phase 4: Activity Logging System

#### Create Activity Log System:
- Track user actions (create, update, delete)
- Store in `activity_log` table
- Display in dashboard recent activity feed

---

## Technical Implementation Details

### Backend Work:

#### 1. Create DashboardController
```php
// app/Http/Controllers/Admin/DashboardController.php
class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $user = $request->user();
        $stats = [];
        
        if ($user->can('view students')) {
            $stats['students'] = $this->getStudentStats();
        }
        
        if ($user->can('view drivers')) {
            $stats['drivers'] = $this->getDriverStats();
        }
        
        // ... other modules
        
        return response($stats);
    }
}
```

#### 2. Create Activity Log Migration
```sql
CREATE TABLE activity_logs (
    id BIGINT PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(255),
    module VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP
);
```

#### 3. Add Activity Logging Trait
```php
trait LogsActivity {
    public static function bootLogsActivity() {
        static::created(function ($model) {
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'created',
                'module' => class_basename($model),
                'description' => "Created {$model->name}"
            ]);
        });
    }
}
```

---

### Frontend Work:

#### 1. Create Reusable Components

**StatCard Component:**
```tsx
interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
}

export function StatCard({ title, value, icon, trend }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {trend && (
                    <p className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {trend.isPositive ? '↑' : '↓'} {trend.value}% from last month
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
```

#### 2. Update Dashboard Page

```tsx
export default function Dashboard() {
    const { hasPermission } = usePermissions();
    const [stats, setStats] = useState(null);
    
    useEffect(() => {
        fetch('/admin/api/dashboard/stats')
            .then(res => res.json())
            .then(setStats);
    }, []);
    
    // Render different dashboard based on permissions
    if (hasPermission('manage students') && !hasPermission('manage drivers')) {
        return <StudentAdminDashboard stats={stats} />;
    }
    
    if (hasPermission('manage drivers') && !hasPermission('manage students')) {
        return <DriverAdminDashboard stats={stats} />;
    }
    
    return <MultiModuleDashboard stats={stats} />;
}
```

---

## Priority Order

### High Priority (Do First):
1. ✅ Dashboard statistics API endpoint
2. ✅ StatCard reusable component
3. ✅ Student-Admin dashboard view
4. ✅ Driver-Admin dashboard view
5. ✅ Update main dashboard.tsx to route correctly

### Medium Priority:
6. ⏸️ Recent activity feed component
7. ⏸️ Alerts panel component
8. ⏸️ Quick actions component
9. ⏸️ Update module pages with permission-based UI

### Low Priority (Nice to Have):
10. ⏸️ Activity logging system
11. ⏸️ Trend indicators on stat cards
12. ⏸️ Charts/graphs for statistics
13. ⏸️ Export functionality per module

---

## Files to Create/Modify

### New Backend Files:
- `app/Http/Controllers/Admin/DashboardController.php`
- `app/Models/ActivityLog.php` (if adding activity tracking)
- `database/migrations/YYYY_MM_DD_create_activity_logs_table.php`

### New Frontend Components:
- `resources/js/components/dashboard/stat-card.tsx`
- `resources/js/components/dashboard/quick-actions.tsx`
- `resources/js/components/dashboard/recent-activity.tsx`
- `resources/js/components/dashboard/alerts-panel.tsx`
- `resources/js/components/dashboard/student-admin-dashboard.tsx`
- `resources/js/components/dashboard/driver-admin-dashboard.tsx`
- `resources/js/components/dashboard/multi-module-dashboard.tsx`

### Modified Files:
- `resources/js/pages/dashboard.tsx`
- `resources/js/pages/admin/students/index.tsx` (permission-based UI)
- `resources/js/pages/admin/classes/index.tsx` (permission-based UI)
- `routes/web.php` (add dashboard stats route)

---

## Testing Checklist

- [ ] Student-admin sees only student statistics
- [ ] Driver-admin sees only driver statistics
- [ ] Multi-module admin sees combined stats
- [ ] Stats update in real-time
- [ ] Quick actions navigate to correct pages
- [ ] Recent activity shows only relevant modules
- [ ] Permission-based buttons work correctly on module pages
- [ ] View-only users cannot modify data

---

## Estimated Work

- **Dashboard Statistics API**: 1-2 hours
- **Frontend Dashboard Components**: 2-3 hours
- **Module Page Updates**: 1-2 hours
- **Testing**: 1 hour
- **Total**: ~5-8 hours

---

## Summary

This plan will give each admin role a **personalized experience** with:
- ✅ Relevant statistics for their modules
- ✅ Quick access to common tasks
- ✅ Role-appropriate actions on module pages
- ✅ Clear visual hierarchy and organization
- ✅ Better UX and productivity

**Next Steps:**
1. Review this plan and confirm the approach
2. Start with dashboard statistics API
3. Build reusable dashboard components
4. Implement role-specific dashboard views
5. Update module pages with permission-based UI
6. Test with different admin roles
7. Commit and push changes

Ready to start implementing? 🚀
