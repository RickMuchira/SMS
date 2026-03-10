# Transport Module - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Run Migrations (30 seconds)
```bash
php artisan migrate
```

### Step 2: Seed Data (30 seconds)
```bash
php artisan db:seed --class=TransportPermissionsSeeder
php artisan db:seed --class=BusSeeder
```

### Step 3: Assign Roles to Users (1 minute)
```bash
php artisan tinker
```

Then in Tinker:
```php
// Create or assign driver role
$driver = User::find(2); // Change ID as needed
$driver->assignRole('driver');

// Create or assign assistant role
$assistant = User::find(3); // Change ID as needed
$assistant->assignRole('assistant');

exit
```

### Step 4: Add Student Home Locations (2 minutes)

Option A - Via Database:
```sql
UPDATE users 
SET home_latitude = -1.2921, 
    home_longitude = 36.8219, 
    home_address = '123 Nairobi Street, Karen',
    pickup_notes = 'Green gate on the left'
WHERE id IN (4, 5, 6, 7, 8);
```

Option B - Via Tinker:
```php
User::whereIn('id', [4,5,6,7,8])->update([
    'home_latitude' => -1.2921,
    'home_longitude' => 36.8219,
    'home_address' => '123 Nairobi Street, Karen',
    'pickup_notes' => 'Green gate'
]);
```

### Step 5: Access the System (1 minute)

**Web (Admin)**:
1. Login as admin
2. Navigate to: `/admin/transport/buses`
3. View the seeded buses
4. Go to: `/admin/transport/route-planner`
5. Plan your first route!

**Mobile (Driver)**:
1. Login as driver user
2. Tap "Transport" tab
3. View today's trips (if any exist)

---

## 📱 First Route Creation

### Create Your First Trip (Web)

1. **Go to Route Planner**: `/admin/transport/route-planner`

2. **Fill Trip Details**:
   - Bus: Select "KDG 116G"
   - Type: Morning Pickup
   - Date: Today's date
   - Driver: Select a driver
   - Start Time: 07:00

3. **Add Stops**:
   - Click student markers on the map
   - They'll be added to the stops list
   - Reorder using up/down arrows

4. **Create Trip**:
   - Click "Create Trip" button
   - Trip is now saved and assigned to driver

### Execute the Trip (Mobile)

1. **Open Mobile App** as the assigned driver

2. **Tap "Transport" Tab**

3. **View Your Trip**:
   - See map with all stops
   - Your GPS location shown

4. **Navigate to First Stop**:
   - Tap "Navigate" button
   - Opens Google Maps/Apple Maps

5. **Mark Student Status**:
   - Tap "Picked Up" when student boards
   - Or tap "Absent" if student is not present

6. **Continue to Next Stop**:
   - Repeat until all stops complete

---

## 🎯 Common Tasks

### Add a New Bus
```bash
# Via Web UI: /admin/transport/buses
# Or via Tinker:
php artisan tinker
```
```php
Bus::create([
    'registration_number' => 'KDE 999X',
    'capacity' => 45,
    'status' => 'active'
]);
```

### Bulk Add Student Locations
```php
// In Tinker
$students = User::whereHas('roles', fn($q) => $q->where('name', 'student'))
    ->take(20)
    ->get();

foreach($students as $student) {
    $student->update([
        'home_latitude' => fake()->latitude(-1.4, -1.2),
        'home_longitude' => fake()->longitude(36.7, 36.9),
        'home_address' => fake()->address(),
    ]);
}
```

### View Today's Trips (API)
```bash
# Get trips for logged-in driver
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://your-domain.com/api/mobile/transport/trips/today
```

---

## 🧪 Verify Everything Works

### Run Tests
```bash
php artisan test --filter=TransportModuleTest
```
Expected: ✅ All 9 tests passing

### Check Routes
```bash
php artisan route:list --path=transport
```
Expected: See all transport routes listed

### Check Permissions
```bash
php artisan tinker
```
```php
// Verify transport permissions exist
\Spatie\Permission\Models\Permission::where('name', 'like', '%transport%')->get();

// Should show: view transport, manage transport, execute trips
```

---

## 🔧 Troubleshooting

### "No students available"
**Fix**: Add home coordinates to students (see Step 4)

### "Permission denied"
**Fix**: Make sure user has correct role:
```php
$user->assignRole('driver'); // or 'admin', 'assistant'
```

### "Map not loading"
**Fix**: Check browser console for errors. MapLibre doesn't need API keys, so it should work immediately.

### Mobile app can't see trips
**Fix**: 
1. Check user is logged in
2. Verify user has driver/assistant role
3. Ensure trip's `trip_date` is today
4. Check trip's `driver_id` or `assistant_id` matches user

---

## 🎉 You're Ready!

The Transport Module is now fully configured and ready to use.

**Next Actions**:
1. Create a trip for tomorrow
2. Test the mobile app as a driver
3. Monitor trips from the admin dashboard

For full documentation, see: `TRANSPORT_MODULE.md`
