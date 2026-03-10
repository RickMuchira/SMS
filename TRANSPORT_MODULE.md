# Transport Module - Setup & Usage Guide

## Overview

The Transport Module is a comprehensive student transportation management system for schools. It enables:

- **Route Planning**: Interactive map-based route planning with drag-and-drop stop ordering
- **Live Trip Execution**: Mobile app for drivers/assistants to execute routes with real-time GPS tracking
- **Admin Monitoring**: Web dashboard to monitor all trips in real-time
- **Bus Fleet Management**: Manage buses, capacity, and maintenance schedules

---

## Installation & Setup

### 1. Run Migrations

```bash
php artisan migrate
```

This creates the following tables:
- `buses` - Bus fleet management
- `trip_stops` - Route stops with student locations
- Adds `bus_id`, `trip_date`, `start_time`, `end_time` to `trips` table
- Adds `home_latitude`, `home_longitude`, `home_address`, `pickup_notes` to `users` table

### 2. Seed Permissions & Sample Data

```bash
php artisan db:seed --class=TransportPermissionsSeeder
php artisan db:seed --class=BusSeeder
```

This creates:
- Three permissions: `view transport`, `manage transport`, `execute trips`
- Assigns permissions to roles (super-admin, admin, driver, assistant)
- Seeds sample buses (KDG 116G, KDA 220A, KDB 550B, KDC 880C)

### 3. Assign Driver/Assistant Roles

Create or update users with driver/assistant roles:

```bash
php artisan tinker
```

```php
$user = User::find(1);
$user->assignRole('driver');
```

### 4. Add Student Home Locations

For transport to work, students need home coordinates:

1. Go to **Admin → Students** (web interface)
2. Edit a student
3. Set `home_latitude`, `home_longitude`, `home_address`, and optional `pickup_notes`

---

## Web Interface (Admin)

### Bus Management

**URL**: `/admin/transport/buses`

- View all buses in the fleet
- Add new buses with registration number, capacity, and status
- Edit or delete existing buses
- See trip count for each bus

### Route Planning

**URL**: `/admin/transport/route-planner`

**Features**:
- Select bus, trip type (morning/afternoon), date, driver, and assistant
- Interactive map showing all eligible students as markers
- Click students to add them to the route
- Reorder stops using up/down arrows
- See route line connecting all stops in sequence
- Click "Create Trip" to save the planned route

**Workflow**:
1. Select a bus from the dropdown
2. Choose trip type (Morning Pickup / Afternoon Dropoff)
3. Set the trip date and start time
4. Assign a driver (required) and optional assistant
5. Click student markers on the map to add them as stops
6. Reorder stops using the arrows in the stops list
7. Review the route line on the map
8. Click "Create Trip"

### Trip Monitoring

**URL**: `/admin/transport/trips-monitor`

**Features**:
- View all trips filtered by date and status
- Click a trip to see its route on the map
- See real-time stop status updates from drivers
- Color-coded markers: Blue (pending), Green (completed), Red (absent)
- View progress: "5 of 12 stops completed"

---

## Mobile App (Drivers & Assistants)

### Trip Execution Screen

**File**: `mobile/app/(tabs)/transport.tsx`

**Features**:
- Automatically loads today's assigned trips
- Shows trip details: bus registration, trip type, progress
- Interactive map with:
  - Current location (blue pulsing marker)
  - Route line connecting all stops
  - Stop markers color-coded by status
- Bottom sheet with scrollable stop list
- For each pending stop:
  - **Navigate**: Opens device's native maps app (Google Maps/Apple Maps)
  - **Picked Up / Dropped Off**: Mark student as completed
  - **Absent**: Mark student as absent

**Workflow**:
1. Driver opens the mobile app
2. Tap on "Transport" tab
3. See today's assigned trips
4. Tap "Navigate" to open GPS directions to the next stop
5. Arrive at stop, mark as "Picked Up" (morning) or "Dropped Off" (afternoon)
6. If student is absent, tap "Absent"
7. Move to next stop
8. Trip auto-completes when all stops are processed

---

## API Endpoints

### Bus Management

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/admin/api/transport/buses` | `manage transport` | List all buses |
| POST | `/admin/api/transport/buses` | `manage transport` | Create a new bus |
| GET | `/admin/api/transport/buses/{id}` | `manage transport` | Get bus details |
| PATCH | `/admin/api/transport/buses/{id}` | `manage transport` | Update bus |
| DELETE | `/admin/api/transport/buses/{id}` | `manage transport` | Delete bus |

### Trip Management

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/admin/api/transport/trips` | `view transport` | List all trips (filterable) |
| POST | `/admin/api/transport/trips` | `manage transport` | Create trip with stops |
| GET | `/admin/api/transport/trips/{id}` | `view transport` | Get trip details |
| PATCH | `/admin/api/transport/trips/{id}` | `manage transport` | Update trip |
| DELETE | `/admin/api/transport/trips/{id}` | `manage transport` | Delete trip |

### Stop Management

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| PATCH | `/admin/api/transport/trips/{tripId}/stops/{stopId}` | `execute trips` | Update stop status |

### Mobile API (Drivers/Assistants)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/mobile/transport/trips/today` | Sanctum | Get today's assigned trips |
| PATCH | `/api/mobile/transport/trips/{tripId}/stops/{stopId}` | Sanctum | Update stop status |

---

## Database Schema

### `buses`

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| registration_number | string | Unique bus registration (e.g., KDG 116G) |
| capacity | integer | Number of students the bus can hold |
| status | enum | active, inactive, maintenance |
| notes | text | Optional notes |

### `trips` (updated)

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| bus_id | bigint | Foreign key to buses |
| type | enum | morning, evening |
| trip_date | date | Date of the trip |
| driver_id | bigint | Foreign key to users |
| assistant_id | bigint | Optional FK to users |
| start_time | time | Trip start time |
| end_time | time | Trip end time |
| status | enum | planned, in_progress, completed, cancelled |

### `trip_stops`

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| trip_id | bigint | Foreign key to trips |
| student_id | bigint | Foreign key to users |
| order_sequence | integer | Stop order (1, 2, 3...) |
| latitude | decimal(10,7) | GPS latitude |
| longitude | decimal(10,7) | GPS longitude |
| address | text | Student's home address |
| pickup_notes | text | Special instructions |
| status | enum | pending, picked_up, dropped_off, absent |
| status_updated_at | timestamp | When status was last updated |

### `users` (added fields)

| Column | Type | Description |
|--------|------|-------------|
| home_latitude | decimal(10,7) | Student's home GPS latitude |
| home_longitude | decimal(10,7) | Student's home GPS longitude |
| home_address | text | Full home address |
| pickup_notes | text | Pickup instructions (e.g., "Green gate") |

---

## Permissions & Roles

### Permissions

- **view transport**: View transport module (trips, buses)
- **manage transport**: Full admin access (create/edit trips, buses)
- **execute trips**: Update stop statuses (drivers/assistants)

### Role Assignments

| Role | Permissions |
|------|-------------|
| super-admin | All transport permissions |
| admin | view transport, manage transport |
| driver | view transport, execute trips |
| assistant | view transport, execute trips |

---

## Testing

Run the transport module tests:

```bash
php artisan test --filter=TransportModuleTest
```

Tests cover:
- Bus CRUD operations
- Trip creation with stops
- Driver access to assigned trips
- Stop status updates
- Permission enforcement
- Timestamp tracking

---

## Frontend Components

### Web (React)

- **Map Component**: `resources/js/components/ui/map.tsx`
  - Built on MapLibre GL
  - Components: `<Map>`, `<Marker>`, `<Popup>`, `<Route>`, `<NavigationControl>`
  - Uses CARTO basemaps (no API key needed)

- **Bus Management**: `resources/js/pages/admin/transport/buses.tsx`
- **Route Planner**: `resources/js/pages/admin/transport/route-planner.tsx`
- **Trip Monitor**: `resources/js/pages/admin/transport/trips-monitor.tsx`

### Mobile (React Native)

- **Trip Execution**: `mobile/app/(tabs)/transport.tsx`
  - Uses `@rnmapbox/maps` (MapLibre for React Native)
  - Includes GPS tracking with `expo-location`
  - Native maps integration for turn-by-turn navigation

---

## Troubleshooting

### "No students available for bus"
- Make sure students have `home_latitude` and `home_longitude` set
- Students must have the "student" role assigned

### "Map not loading"
- Check browser console for errors
- Ensure MapLibre GL CSS is loaded
- Verify no conflicting map libraries

### "Driver can't see trips"
- Ensure user has "driver" or "assistant" role
- Check that trip's `driver_id` or `assistant_id` matches the user
- Verify trip date is today

### Mobile map not working
- Ensure `@rnmapbox/maps` is installed
- Check that location permissions are granted
- Verify EXPO_PUBLIC_API_URL is set correctly

---

## Next Steps

1. **Student Assignment**: Bulk assign students to buses
2. **Route Optimization**: Auto-generate optimal stop order
3. **Parent Notifications**: SMS/push notifications when student is picked up
4. **Historical Reports**: Export trip history and analytics
5. **Geofencing**: Alert when bus arrives at stop
6. **ETA Tracking**: Show estimated arrival time to parents

---

## Support

For issues or questions, refer to:
- Laravel Documentation: https://laravel.com/docs
- MapLibre GL JS: https://maplibre.org/
- React Native Mapbox: https://github.com/rnmapbox/maps
