# Enhanced Transport System with GPS & Real-Time Tracking

## NEW FEATURES: GPS Tracking & Automated Notifications

### Overview
Replace static route planning with **real-time GPS tracking** where:
- Drivers/Assistants mark **precise student pickup/dropoff locations** on a map
- System saves GPS coordinates for each student's home
- Parents receive **automated notifications** when:
  - Bus is approaching their area (5-10 min warning)
  - Child has been picked up
  - Child has been dropped off at home
  - Child has arrived at school
- Admin can view **live bus locations** on map
- System generates **optimal routes** based on GPS coordinates

---

## Enhanced Architecture

### Technology Stack

#### **Mapping & GPS:**
- **Leaflet.js** - Open-source interactive maps (free, no API key needed)
- **OpenStreetMap** - Free map tiles
- **Google Maps API** (optional upgrade) - Better routing, traffic data
- **Geolocation API** - Browser-based GPS for mobile devices

#### **Real-Time Communication:**
- **Laravel Broadcasting** - Real-time events
- **Pusher** or **Laravel Reverb** - WebSocket connections
- **SMS Gateway** - Twilio, Africa's Talking for SMS notifications

#### **Mobile GPS Tracking:**
- **Progressive Web App (PWA)** - Works on any smartphone
- **React Native** (optional) - Native mobile app for drivers

---

## Database Schema Updates

### **Enhanced Tables:**

#### `locations` table (updated):
```sql
CREATE TABLE locations (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255),              -- "John Doe's Home"
    description TEXT,
    latitude DECIMAL(10, 8),        -- GPS coordinate
    longitude DECIMAL(11, 8),       -- GPS coordinate
    address TEXT,                   -- Human-readable address
    location_type ENUM('pickup', 'dropoff', 'both'),
    student_id BIGINT,              -- Link to specific student
    order_sequence INT,             -- Route order (auto-calculated)
    created_by BIGINT,              -- User who marked location
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `trip_tracking` table (NEW):
```sql
CREATE TABLE trip_tracking (
    id BIGINT PRIMARY KEY,
    trip_id BIGINT,
    driver_id BIGINT,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    status ENUM('not_started', 'in_progress', 'completed'),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `student_pickup_logs` table (NEW):
```sql
CREATE TABLE student_pickup_logs (
    id BIGINT PRIMARY KEY,
    trip_id BIGINT,
    student_id BIGINT,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    pickup_time TIMESTAMP,
    dropoff_latitude DECIMAL(10, 8),
    dropoff_longitude DECIMAL(11, 8),
    dropoff_time TIMESTAMP,
    status ENUM('waiting', 'picked_up', 'dropped_off'),
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### `parent_notifications` table (NEW):
```sql
CREATE TABLE parent_notifications (
    id BIGINT PRIMARY KEY,
    guardian_id BIGINT,
    student_id BIGINT,
    trip_id BIGINT,
    notification_type ENUM('bus_approaching', 'picked_up', 'dropped_off', 'arrived_school'),
    message TEXT,
    sent_via ENUM('sms', 'push', 'email'),
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP
);
```

#### Update `school_classes` for grade acronyms:
```sql
ALTER TABLE school_classes ADD COLUMN grade_code VARCHAR(10);  -- "PG", "PP1", "PP2", "G1"
ALTER TABLE school_classes ADD COLUMN grade_full_name VARCHAR(100);  -- "Play Group", "Grade 1"
```

---

## Feature Implementation

### **1. GPS Location Marking (Driver/Assistant App)**

**Location:** `/transport/mark-location` (Mobile-optimized)

#### Interface:

```
┌────────────────────────────────────────────────────────────┐
│ 📍 Mark Student Location                                   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Student: John Doe (Grade 5A)                              │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │                                                      │ │
│ │              [INTERACTIVE MAP]                       │ │
│ │                                                      │ │
│ │              📍 Your Current Location               │ │
│ │              🏠 Tap to Mark Student's Home          │ │
│ │                                                      │ │
│ │              Zoom: [+] [-]                          │ │
│ │              [📍 Use Current Location]              │ │
│ │                                                      │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                            │
│ Location Type: ◉ Pickup & Dropoff  ○ Pickup Only         │
│                                                            │
│ Address: Karen Estate, House No. 45                       │
│ Landmark: Near Tuskys Supermarket                         │
│                                                            │
│ Guardian Contact:                                          │
│ Mary Doe - +254745752274                                  │
│                                                            │
│ ☑ Send confirmation SMS to parent                        │
│                                                            │
│ [Cancel]              [✓ Save Location]                   │
└────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Auto-detect GPS** from driver's phone
- **Tap on map** to mark exact location
- **Add landmarks** for easier identification
- **Photo capture** (optional) - Take photo of gate/house
- **Offline mode** - Save locally, sync when online

---

### **2. Real-Time Trip Tracking Dashboard**

**Location:** `/admin/transport/live-tracking`

#### Interface:

```
┌────────────────────────────────────────────────────────────┐
│ 🚌 Live Trip Tracking - Thursday, Feb 26, 2026            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │                                                      │ │
│ │              [INTERACTIVE REAL-TIME MAP]            │ │
│ │                                                      │ │
│ │   🚌 Morning Trip 1 (Moving)                        │ │
│ │      └─ Driver: John M. | 8/10 students picked up  │ │
│ │                                                      │ │
│ │   🚌 Morning Trip 2 (In Progress)                   │ │
│ │      └─ Driver: Paul O. | 5/8 students picked up   │ │
│ │                                                      │ │
│ │   🏠 Pickup Locations (Green pins)                  │ │
│ │   ✓ Completed pickups (Gray pins)                   │ │
│ │   🏫 School destination (Red pin)                   │ │
│ │                                                      │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                            │
│ Active Trips:                                              │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 🚌 Morning Trip 1 - In Progress                    │   │
│ │    Driver: John M. | Assistant: Mary K.            │   │
│ │    Status: Picking up students                      │   │
│ │    Progress: 8/10 students                         │   │
│ │    ETA to school: 15 minutes                       │   │
│ │    Last update: 30 seconds ago                     │   │
│ │    [View Details] [Send Message]                   │   │
│ └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Real-Time Updates:**
- Bus location updates every 30 seconds
- Progress bar showing pickups completed
- ETA calculations
- Route optimization suggestions

---

### **3. Driver Mobile App Interface**

**Location:** `/transport/trip` (PWA - works on any phone)

#### Active Trip View:

```
┌────────────────────────────────────────────────────────────┐
│ Morning Trip 1 - In Progress                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [MAP showing your location + next pickup]           │ │
│ │                                                      │ │
│ │ You are here: 📍                                    │ │
│ │ Next stop: 🏠 500m away (2 min)                     │ │
│ │                                                      │ │
│ │ [Navigate with Google Maps]                         │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                            │
│ Next Pickup: John Doe                                     │
│ 🏠 Karen Estate, House 45                                 │
│ 📞 Call Guardian: +254745752274                           │
│                                                            │
│ Actions:                                                   │
│ [✓ Mark as Picked Up]                                     │
│ [📞 Call Guardian]                                        │
│ [❌ Student Not Available]                                │
│                                                            │
│ Remaining Stops: 2                                         │
│ ├─ Jane Smith (Karen, House 12)                          │
│ └─ Peter Kamau (Westlands Mall)                          │
│                                                            │
│ [Complete Trip]                                            │
└────────────────────────────────────────────────────────────┘
```

**Driver Actions:**
1. **Mark Picked Up** → Triggers SMS to parent
2. **Mark Dropped Off** → Triggers SMS to parent
3. **Call Guardian** → One-tap call
4. **Navigate** → Opens Google Maps with directions

---

### **4. Parent Mobile Notifications**

#### SMS Notifications:

**Example 1: Bus Approaching**
```
🚌 School Transport Alert
Your child John Doe's bus is 10 minutes away 
from your pickup location. Please be ready.
Trip: Morning Trip 1
Time: 6:45 AM
```

**Example 2: Picked Up**
```
✓ John Doe has been picked up at 6:50 AM
Driver: John Mwangi
Expected arrival at school: 7:30 AM
Track: [link]
```

**Example 3: Dropped Off at Home**
```
✓ John Doe has been safely dropped off at home
Time: 4:15 PM
Driver: John Mwangi
```

**Example 4: Arrived at School**
```
✓ John Doe has arrived at school safely
Time: 7:25 AM
Have a great day!
```

#### Parent Dashboard (Optional):

**Location:** `/parent/transport` (Parent login)

```
┌────────────────────────────────────────────────────────────┐
│ My Children's Transport                                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ John Doe (Grade 5A)                                       │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Current Status: ✓ At School                        │   │
│ │                                                     │   │
│ │ Morning Trip: Picked up at 6:50 AM                 │   │
│ │ Arrived at school: 7:25 AM                         │   │
│ │                                                     │   │
│ │ Evening Trip: Scheduled at 4:00 PM                 │   │
│ │ [Track Live Location]                              │   │
│ └────────────────────────────────────────────────────┘   │
│                                                            │
│ Recent Notifications:                                      │
│ • Arrived at school - 2 hours ago                         │
│ • Picked up - 2 hours ago                                 │
│ • Bus approaching - 2 hours ago                           │
└────────────────────────────────────────────────────────────┘
```

---

### **5. Route Optimization Algorithm**

**Automatic Route Planning Based on GPS:**

```php
class RouteOptimizerService
{
    /**
     * Optimize pickup route based on GPS coordinates
     * Uses Traveling Salesman Problem (TSP) algorithm
     */
    public function optimizeRoute(Trip $trip): array
    {
        $school = ['lat' => -1.2921, 'lng' => 36.8219]; // School location
        
        $students = $trip->students()->with('transport.pickupLocation')->get();
        
        $locations = $students->map(function ($student) {
            return [
                'student_id' => $student->id,
                'name' => $student->name,
                'lat' => $student->transport->pickupLocation->latitude,
                'lng' => $student->transport->pickupLocation->longitude,
            ];
        });
        
        // Calculate optimal route using nearest neighbor algorithm
        $optimizedRoute = $this->nearestNeighbor($school, $locations);
        
        // Update location order_sequence
        foreach ($optimizedRoute as $index => $location) {
            Location::where('student_id', $location['student_id'])
                ->update(['order_sequence' => $index + 1]);
        }
        
        return $optimizedRoute;
    }
    
    private function nearestNeighbor($start, $locations): array
    {
        // TSP nearest neighbor algorithm
        $route = [];
        $current = $start;
        $remaining = $locations->toArray();
        
        while (!empty($remaining)) {
            $nearest = null;
            $shortestDistance = PHP_FLOAT_MAX;
            $nearestIndex = -1;
            
            foreach ($remaining as $index => $location) {
                $distance = $this->calculateDistance(
                    $current['lat'], $current['lng'],
                    $location['lat'], $location['lng']
                );
                
                if ($distance < $shortestDistance) {
                    $shortestDistance = $distance;
                    $nearest = $location;
                    $nearestIndex = $index;
                }
            }
            
            $route[] = $nearest;
            $current = $nearest;
            unset($remaining[$nearestIndex]);
            $remaining = array_values($remaining);
        }
        
        return $route;
    }
    
    private function calculateDistance($lat1, $lng1, $lat2, $lng2): float
    {
        // Haversine formula for distance calculation
        $earthRadius = 6371; // km
        
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        
        $a = sin($dLat/2) * sin($dLat/2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLng/2) * sin($dLng/2);
        
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        
        return $earthRadius * $c;
    }
}
```

---

### **6. Automated Notification System**

```php
class TransportNotificationService
{
    /**
     * Send notifications when bus is approaching
     */
    public function notifyBusApproaching(Student $student, Trip $trip): void
    {
        $guardians = $student->guardians;
        
        foreach ($guardians as $guardian) {
            // Calculate if bus is within 5-10 minutes
            $distance = $this->calculateDistance(
                $trip->currentLocation,
                $student->transport->pickupLocation
            );
            
            if ($distance <= 2) { // 2km = ~10 min
                $message = "🚌 School Transport Alert\n"
                    . "Your child {$student->name}'s bus is 10 minutes away "
                    . "from your pickup location. Please be ready.\n"
                    . "Trip: {$trip->name}\n"
                    . "Time: " . now()->format('g:i A');
                
                $this->sendSMS($guardian->phone, $message);
                
                // Log notification
                ParentNotification::create([
                    'guardian_id' => $guardian->id,
                    'student_id' => $student->id,
                    'trip_id' => $trip->id,
                    'notification_type' => 'bus_approaching',
                    'message' => $message,
                    'sent_via' => 'sms',
                    'sent_at' => now(),
                ]);
            }
        }
    }
    
    /**
     * Send notification when student is picked up
     */
    public function notifyPickedUp(Student $student, Trip $trip): void
    {
        $message = "✓ {$student->name} has been picked up at " . now()->format('g:i A') . "\n"
            . "Driver: {$trip->driver->name}\n"
            . "Expected arrival at school: " . $trip->estimated_school_arrival;
        
        foreach ($student->guardians as $guardian) {
            $this->sendSMS($guardian->phone, $message);
        }
    }
    
    /**
     * Send notification when student is dropped off
     */
    public function notifyDroppedOff(Student $student, Trip $trip): void
    {
        $message = "✓ {$student->name} has been safely dropped off at home\n"
            . "Time: " . now()->format('g:i A') . "\n"
            . "Driver: {$trip->driver->name}";
        
        foreach ($student->guardians as $guardian) {
            $this->sendSMS($guardian->phone, $message);
        }
    }
    
    private function sendSMS(string $phone, string $message): void
    {
        // Integration with SMS gateway (Twilio, Africa's Talking, etc.)
        // AfricasTalking::send($phone, $message);
    }
}
```

---

## Excel Import Enhancement

### **Handle Grade Acronyms**

**Acronym Mapping:**
```php
class GradeAcronymService
{
    protected $acronymMap = [
        'PG' => 'Play Group',
        'PP1' => 'Pre-Primary 1',
        'PP2' => 'Pre-Primary 2',
        'G1' => 'Grade 1',
        'G2' => 'Grade 2',
        'G3' => 'Grade 3',
        'G4' => 'Grade 4',
        'G5' => 'Grade 5',
        'G6' => 'Grade 6',
        'G7' => 'Grade 7',
        'G8' => 'Grade 8',
        // Add more as needed
    ];
    
    public function parseGrade(string $input): array
    {
        // Extract grade code and class
        // Input: "PG", "PP1A", "G5B"
        
        preg_match('/^([A-Z0-9]+)([A-Z]?)$/', $input, $matches);
        
        $gradeCode = $matches[1] ?? $input;
        $className = $matches[2] ?? 'A';
        
        $gradeName = $this->acronymMap[$gradeCode] ?? $gradeCode;
        
        return [
            'code' => $gradeCode,
            'name' => $gradeName,
            'class' => $className,
            'full_name' => "{$gradeName} {$className}",
        ];
    }
}
```

**Enhanced Import Process:**
```php
// Import handles: PG, PP1, PP1A, G5B, etc.
$gradeInfo = $gradeService->parseGrade($row['grade']);

$class = SchoolClass::firstOrCreate([
    'grade_code' => $gradeInfo['code'],
    'name' => $gradeInfo['class'],
], [
    'grade_full_name' => $gradeInfo['name'],
    'full_display_name' => $gradeInfo['full_name'],
]);
```

---

### **Enhanced Excel Template**

```
| Student Name | Grade | Parent 1 Name | P1 Phone   | P1 Relation | Parent 2 Name | P2 Phone   | P2 Relation | Transport | Pickup Location |
|--------------|-------|---------------|------------|-------------|---------------|------------|-------------|-----------|-----------------|
| John Doe     | PG    | Mary Doe      | 0745752274 | Mother      | John Doe Sr   | 0722123456 | Father      | Yes       | Karen Estate    |
| Jane Smith   | PP1A  | Alice Smith   | 0712345678 | Mother      |               |            |             | No        |                 |
| Peter Kamau  | G5B   | Grace Kamau   | 0700111222 | Mother      | Paul Kamau    | 0733444555 | Father      | Yes       | Kilimani        |
```

**After Import Shows:**
- **Play Group** (1 student)
- **Pre-Primary 1 A** (1 student)
- **Grade 5 B** (1 student)

---

## Grade Management with Filtering

**Location:** `/admin/classes`

```
┌────────────────────────────────────────────────────────────┐
│ Grades & Classes                                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Filter by Grade: [All Grades ▼]                           │
│                  - Play Group (PG)                         │
│                  - Pre-Primary 1 (PP1)                     │
│                  - Pre-Primary 2 (PP2)                     │
│                  - Grade 1 (G1)                            │
│                  ...                                        │
│                                                            │
│ Search: [_______________________] 🔍                      │
│                                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Play Group (PG)                                    │   │
│ │ Total: 25 students                                 │   │
│ │ [View Students] [+ Add Student]                    │   │
│ └────────────────────────────────────────────────────┘   │
│                                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Pre-Primary 1 A (PP1A)                             │   │
│ │ Total: 28 students                                 │   │
│ │ [View Students] [+ Add Student] [Edit Class]       │   │
│ └────────────────────────────────────────────────────┘   │
│                                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Grade 5 B (G5B)                                    │   │
│ │ Total: 22 students                                 │   │
│ │ [View Students] [+ Add Student] [Edit Class]       │   │
│ └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

**View Students in Grade:**
```
┌────────────────────────────────────────────────────────────┐
│ Grade 5 B (G5B) - 22 Students                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Actions: [+ Add Student] [📤 Export List] [✉️ Email All] │
│                                                            │
│ ┌──────────────┬─────────────┬──────────────┬──────────┐│
│ │ Student Name │ Transport   │ Guardian     │ Actions  ││
│ ├──────────────┼─────────────┼──────────────┼──────────┤│
│ │ John Doe     │ ✓ Yes       │ Mary Doe     │ Edit Del ││
│ │              │ M:Trip1 E:1 │ 0745752274   │          ││
│ ├──────────────┼─────────────┼──────────────┼──────────┤│
│ │ Jane Smith   │ ✓ Yes       │ Alice Smith  │ Edit Del ││
│ │              │ M:Trip2 E:2 │ 0712345678   │          ││
│ └──────────────┴─────────────┴──────────────┴──────────┘│
└────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority (Updated)

### **Sprint 1: GPS & Mapping Foundation (Week 1)**
1. ✅ Install Leaflet.js and mapping libraries
2. ✅ Create location marking interface for drivers
3. ✅ Database migrations (locations with GPS, trip_tracking)
4. ✅ Basic map display with markers
5. ✅ GPS coordinate capture and storage

### **Sprint 2: Real-Time Tracking (Week 2)**
6. ✅ Setup Laravel Broadcasting (WebSockets)
7. ✅ Driver location tracking (updates every 30s)
8. ✅ Live tracking dashboard for admin
9. ✅ Trip status updates (in_progress, completed)
10. ✅ Student pickup/dropoff logging

### **Sprint 3: Automated Notifications (Week 2-3)**
11. ✅ SMS gateway integration (Africa's Talking)
12. ✅ Bus approaching notifications (10 min warning)
13. ✅ Picked up notifications
14. ✅ Dropped off notifications
15. ✅ Arrived at school notifications

### **Sprint 4: Route Optimization (Week 3)**
16. ✅ Route optimization algorithm (TSP)
17. ✅ Automatic route sequencing
18. ✅ Google Maps integration for navigation
19. ✅ Distance/time calculations

### **Sprint 5: Excel Import with Acronyms (Week 4)**
20. ✅ Grade acronym mapping (PG, PP1, G5B)
21. ✅ Phone number formatter (+254)
22. ✅ Bulk import with preview
23. ✅ Auto-create grades and guardians
24. ✅ Grade filtering and management

### **Sprint 6: Parent Portal (Week 4-5)**
25. ✅ Parent dashboard
26. ✅ Live tracking for parents
27. ✅ Notification history
28. ✅ Parent mobile app (PWA)

---

## Technical Requirements

### **APIs & Services:**

1. **SMS Gateway:**
   - **Africa's Talking** (Recommended for Kenya)
   - Cost: ~KES 0.80 per SMS
   - Signup: https://africastalking.com

2. **Maps:**
   - **Leaflet.js** (Free, open source)
   - **OpenStreetMap** (Free tiles)
   - **Google Maps API** (Optional, for better routing)

3. **Real-Time:**
   - **Laravel Reverb** (Built-in WebSocket)
   - or **Pusher** (Free tier: 100 connections)

---

## Files to Create

### Backend:
- `app/Services/RouteOptimizerService.php`
- `app/Services/TransportNotificationService.php`
- `app/Services/GradeAcronymService.php`
- `app/Services/GPSTrackingService.php`
- `app/Http/Controllers/Admin/GPSLocationController.php`
- `app/Http/Controllers/Transport/LiveTrackingController.php`
- `app/Models/TripTracking.php`
- `app/Models/StudentPickupLog.php`
- `app/Models/ParentNotification.php`
- `app/Events/BusLocationUpdated.php`
- `app/Events/StudentPickedUp.php`
- Migrations (5+ files)

### Frontend:
- `resources/js/components/maps/leaflet-map.tsx`
- `resources/js/components/maps/location-marker.tsx`
- `resources/js/components/transport/live-tracking.tsx`
- `resources/js/components/transport/driver-navigation.tsx`
- `resources/js/pages/transport/mark-location.tsx`
- `resources/js/pages/admin/transport/live-dashboard.tsx`
- `resources/js/pages/parent/transport-tracking.tsx`

### Mobile PWA:
- `public/manifest.json` (PWA config)
- `public/service-worker.js` (Offline support)

---

## Cost Estimate

**Monthly Operating Costs:**

- SMS Notifications: ~KES 10,000/month (assuming 200 students × 4 notifications/day × 22 days × KES 0.80)
- WebSocket (Pusher): Free tier or KES 2,000/month
- Google Maps API (Optional): Free tier (28,000 requests/month)
- Server: Existing
- **Total: ~KES 12,000/month (~$90 USD)**

---

## Summary

This enhanced plan includes:

✅ **Real-time GPS tracking** - Live bus locations on map  
✅ **Automated parent notifications** - Bus approaching, picked up, dropped off, arrived  
✅ **Precise location marking** - Drivers mark exact student pickup locations  
✅ **Route optimization** - Auto-calculate best route based on GPS  
✅ **Navigation integration** - Google Maps for turn-by-turn directions  
✅ **Grade acronym support** - PG, PP1, G5B automatically parsed  
✅ **Excel bulk import** - With phone formatting and auto-grade creation  
✅ **Grade filtering** - View students by specific grade  
✅ **Multiple guardians** - Each student can have multiple parents  

**This replaces static route planning with intelligent, GPS-based, real-time tracking! 🚀**

Ready to start implementation? I recommend starting with **Sprint 1 (GPS & Mapping)** as the foundation!
