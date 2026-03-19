<?php

use App\Models\Bus;
use App\Models\Location;
use App\Models\StudentTransport;
use App\Models\Trip;
use App\Models\TripStop;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->admin = User::factory()->create();
    $adminRole = Role::firstOrCreate(['name' => 'super-admin']);
    $this->admin->assignRole($adminRole);

    $manageTransportPermission = \Spatie\Permission\Models\Permission::firstOrCreate([
        'name' => 'manage transport',
        'guard_name' => 'web',
    ]);
    $viewTransportPermission = \Spatie\Permission\Models\Permission::firstOrCreate([
        'name' => 'view transport',
        'guard_name' => 'web',
    ]);
    $executeTripsPermission = \Spatie\Permission\Models\Permission::firstOrCreate([
        'name' => 'execute trips',
        'guard_name' => 'web',
    ]);

    $adminRole->givePermissionTo([$manageTransportPermission, $viewTransportPermission, $executeTripsPermission]);

    $this->driver = User::factory()->create();
    $driverRole = Role::firstOrCreate(['name' => 'driver']);
    $driverRole->givePermissionTo([$viewTransportPermission, $executeTripsPermission]);
    $this->driver->assignRole($driverRole);

    $this->student = User::factory()->create([
        'home_latitude' => -1.2921,
        'home_longitude' => 36.8219,
        'home_address' => '123 Test Street, Nairobi',
        'pickup_notes' => 'Green gate on the left',
    ]);
});

test('admin can create a bus', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/transport/buses', [
        'registration_number' => 'KDG 116G',
        'capacity' => 40,
        'status' => 'active',
        'notes' => 'Main school bus',
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'bus' => [
                'id',
                'registration_number',
                'capacity',
                'status',
            ],
        ]);

    $this->assertDatabaseHas('buses', [
        'registration_number' => 'KDG 116G',
        'capacity' => 40,
    ]);
});

test('admin can list all buses', function () {
    Bus::factory()->count(3)->create();

    $response = $this->actingAs($this->admin)->getJson('/api/transport/buses');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'registration_number', 'capacity', 'status'],
            ],
        ]);
});

test('admin can create a trip with stops', function () {
    $bus = Bus::factory()->create();
    $students = User::factory()->count(3)->create([
        'home_latitude' => -1.2921,
        'home_longitude' => 36.8219,
    ]);

    $response = $this->actingAs($this->admin)->postJson('/api/transport/trips', [
        'bus_id' => $bus->id,
        'type' => 'morning',
        'trip_date' => today()->format('Y-m-d'),
        'driver_id' => $this->driver->id,
        'start_time' => '07:00',
        'stops' => [
            [
                'student_id' => $students[0]->id,
                'order_sequence' => 1,
                'latitude' => -1.2921,
                'longitude' => 36.8219,
                'address' => 'Stop 1',
            ],
            [
                'student_id' => $students[1]->id,
                'order_sequence' => 2,
                'latitude' => -1.2922,
                'longitude' => 36.8220,
                'address' => 'Stop 2',
            ],
        ],
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'trip' => [
                'id',
                'bus_id',
                'type',
                'trip_date',
                'stops' => [
                    '*' => ['id', 'student_id', 'order_sequence', 'latitude', 'longitude', 'status'],
                ],
            ],
        ]);

    $this->assertDatabaseHas('trips', [
        'bus_id' => $bus->id,
        'type' => 'morning',
    ]);

    $this->assertDatabaseCount('trip_stops', 2);
});

test('driver can view their assigned trips', function () {
    $bus = Bus::factory()->create();
    $trip = Trip::create([
        'name' => 'Morning Trip',
        'type' => 'morning',
        'trip_number' => 1,
        'bus_id' => $bus->id,
        'trip_date' => today(),
        'driver_id' => $this->driver->id,
        'status' => 'planned',
    ]);

    TripStop::create([
        'trip_id' => $trip->id,
        'student_id' => $this->student->id,
        'order_sequence' => 1,
        'latitude' => -1.2921,
        'longitude' => 36.8219,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->driver, 'sanctum')->getJson(
        '/api/mobile/transport/trips/today',
    );

    $response->assertStatus(200)
        ->assertJsonStructure([
            'trips' => [
                '*' => [
                    'id',
                    'type',
                    'trip_date',
                    'stops' => [
                        '*' => ['id', 'student_id', 'status'],
                    ],
                ],
            ],
        ]);

    expect($response->json('trips'))->toHaveCount(1);
});

test('driver can update stop status', function () {
    $bus = Bus::factory()->create();
    $trip = Trip::create([
        'name' => 'Morning Trip',
        'type' => 'morning',
        'trip_number' => 1,
        'bus_id' => $bus->id,
        'trip_date' => today(),
        'driver_id' => $this->driver->id,
        'status' => 'planned',
    ]);

    $stop = TripStop::create([
        'trip_id' => $trip->id,
        'student_id' => $this->student->id,
        'order_sequence' => 1,
        'latitude' => -1.2921,
        'longitude' => 36.8219,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->driver, 'sanctum')->patchJson(
        "/api/mobile/transport/trips/{$trip->id}/stops/{$stop->id}",
        [
            'status' => 'picked_up',
        ],
    );

    $response->assertStatus(200)
        ->assertJsonPath('stop.status', 'picked_up');

    $this->assertDatabaseHas('trip_stops', [
        'id' => $stop->id,
        'status' => 'picked_up',
    ]);
});

test('driver can save and later update a student location from mobile', function () {
    $response = $this->actingAs($this->driver, 'sanctum')->postJson(
        '/api/mobile/transport/locations',
        [
            'student_id' => $this->student->id,
            'latitude' => -1.3001,
            'longitude' => 36.8001,
            'location_type' => 'pickup',
            'address' => 'Blue gate near the church',
        ],
    );

    $response->assertOk()
        ->assertJsonPath('location.address', 'Blue gate near the church');

    $location = Location::query()
        ->where('student_id', $this->student->id)
        ->where('location_type', 'pickup')
        ->first();

    expect($location)->not->toBeNull();
    expect((float) $location->latitude)->toBe(-1.3001);
    expect((float) $location->longitude)->toBe(36.8001);

    $transport = StudentTransport::where('student_id', $this->student->id)->first();

    expect($transport)->not->toBeNull();
    expect($transport->pickup_location_id)->toBe($location->id);

    $secondResponse = $this->actingAs($this->driver, 'sanctum')->postJson(
        '/api/mobile/transport/locations',
        [
            'student_id' => $this->student->id,
            'latitude' => -1.3005,
            'longitude' => 36.8005,
            'location_type' => 'pickup',
            'address' => 'Updated gate',
        ],
    );

    $secondResponse->assertOk()
        ->assertJsonPath('location.address', 'Updated gate');

    $updatedLocation = $location->fresh();

    expect((float) $updatedLocation->latitude)->toBe(-1.3005);
    expect((float) $updatedLocation->longitude)->toBe(36.8005);
    expect($updatedLocation->address)->toBe('Updated gate');
});

test('transport map page and location saving require transport permissions', function () {
    $student = User::factory()->create();
    $regularUser = User::factory()->create();
    $transportUser = User::factory()->create();

    Permission::firstOrCreate(['name' => 'view transport', 'guard_name' => 'web']);
    $transportUser->givePermissionTo('view transport');

    $response = $this->actingAs($transportUser)->get('/transport/mark-location');
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('transport/mark-location')
        ->has('students')
        ->has('buses')
        ->has('schoolLocation'));

    $bus = Bus::factory()->create();
    $this->actingAs($transportUser)
        ->postJson('/transport/locations', [
            'student_id' => $student->id,
            'bus_id' => $bus->id,
            'latitude' => -1.2922,
            'longitude' => 36.8220,
            'location_type' => 'pickup',
            'address' => 'Bus-specific pickup',
        ])
        ->assertOk();

    $busLocation = Location::query()
        ->where('student_id', $student->id)
        ->where('bus_id', $bus->id)
        ->where('location_type', 'pickup')
        ->first();
    expect($busLocation)->not->toBeNull();
    expect($busLocation->address)->toBe('Bus-specific pickup');

    $this->actingAs($regularUser)
        ->get('/transport/mark-location')
        ->assertForbidden();

    $this->actingAs($transportUser)
        ->get('/transport/mark-location')
        ->assertOk();

    $this->actingAs($regularUser)
        ->postJson('/transport/locations', [
            'student_id' => $student->id,
            'latitude' => -1.2921,
            'longitude' => 36.8219,
            'location_type' => 'pickup',
        ])
        ->assertForbidden();

    $this->actingAs($transportUser)
        ->postJson('/transport/locations', [
            'student_id' => $student->id,
            'latitude' => -1.2921,
            'longitude' => 36.8219,
            'location_type' => 'pickup',
            'address' => 'School gate',
        ])
        ->assertOk();
});

test('admin can view trip details with stops', function () {
    $bus = Bus::factory()->create();
    $trip = Trip::create([
        'name' => 'Morning Trip',
        'type' => 'morning',
        'trip_number' => 1,
        'bus_id' => $bus->id,
        'trip_date' => today(),
        'driver_id' => $this->driver->id,
        'status' => 'planned',
    ]);

    $student1 = User::factory()->create();
    $student2 = User::factory()->create();
    $student3 = User::factory()->create();

    TripStop::factory()->create([
        'trip_id' => $trip->id,
        'student_id' => $student1->id,
    ]);
    TripStop::factory()->create([
        'trip_id' => $trip->id,
        'student_id' => $student2->id,
    ]);
    TripStop::factory()->create([
        'trip_id' => $trip->id,
        'student_id' => $student3->id,
    ]);

    $response = $this->actingAs($this->admin)->getJson("/api/transport/trips/{$trip->id}");

    $response->assertStatus(200)
        ->assertJsonStructure([
            'trip' => [
                'id',
                'bus',
                'driver',
                'stops' => [
                    '*' => ['id', 'student', 'order_sequence', 'status'],
                ],
            ],
        ]);

    expect($response->json('trip.stops'))->toHaveCount(3);
});

test('mobile transport endpoints require transport permissions', function () {
    $bus = Bus::factory()->create();
    $trip = Trip::create([
        'name' => 'Morning Trip',
        'type' => 'morning',
        'trip_number' => 1,
        'bus_id' => $bus->id,
        'trip_date' => today(),
        'driver_id' => $this->driver->id,
        'status' => 'planned',
    ]);

    $stop = TripStop::create([
        'trip_id' => $trip->id,
        'student_id' => $this->student->id,
        'order_sequence' => 1,
        'latitude' => -1.2921,
        'longitude' => 36.8219,
        'status' => 'pending',
    ]);

    $unauthorizedMobileUser = User::factory()->create();

    $this->actingAs($unauthorizedMobileUser, 'sanctum')
        ->getJson('/api/mobile/transport/trips/today')
        ->assertForbidden();

    $this->actingAs($unauthorizedMobileUser, 'sanctum')
        ->patchJson("/api/mobile/transport/trips/{$trip->id}/stops/{$stop->id}", [
            'status' => 'picked_up',
        ])
        ->assertForbidden();
});

test('driver cannot update stops for a trip they are not assigned to', function () {
    $otherDriver = User::factory()->create();
    $driverRole = Role::firstOrCreate(['name' => 'driver']);
    $otherDriver->assignRole($driverRole);
    $otherDriver->givePermissionTo(['view transport', 'execute trips']);

    $bus = Bus::factory()->create();
    $trip = Trip::create([
        'name' => 'Other Driver Trip',
        'type' => 'morning',
        'trip_number' => 1,
        'bus_id' => $bus->id,
        'trip_date' => today(),
        'driver_id' => $otherDriver->id,
        'status' => 'planned',
    ]);

    $stop = TripStop::create([
        'trip_id' => $trip->id,
        'student_id' => $this->student->id,
        'order_sequence' => 1,
        'latitude' => -1.2921,
        'longitude' => 36.8219,
        'status' => 'pending',
    ]);

    $this->actingAs($this->driver, 'sanctum')
        ->patchJson("/api/mobile/transport/trips/{$trip->id}/stops/{$stop->id}", [
            'status' => 'picked_up',
        ])
        ->assertForbidden();

    $this->assertDatabaseHas('trip_stops', [
        'id' => $stop->id,
        'status' => 'pending',
    ]);
});

test('bus cannot be deleted if it has trips', function () {
    $bus = Bus::factory()->create();
    Trip::factory()->create(['bus_id' => $bus->id]);

    $response = $this->actingAs($this->admin)->deleteJson("/api/transport/buses/{$bus->id}");

    $response->assertStatus(200);
    $this->assertDatabaseMissing('buses', ['id' => $bus->id]);
});

test('unauthorized user cannot access transport endpoints', function () {
    $response = $this->getJson('/api/transport/buses');
    $response->assertStatus(401);
});

test('stop status timestamps are recorded', function () {
    $bus = Bus::factory()->create();
    $trip = Trip::create([
        'name' => 'Morning Trip',
        'type' => 'morning',
        'trip_number' => 1,
        'bus_id' => $bus->id,
        'trip_date' => today(),
        'driver_id' => $this->driver->id,
        'status' => 'planned',
    ]);

    $stop = TripStop::create([
        'trip_id' => $trip->id,
        'student_id' => $this->student->id,
        'order_sequence' => 1,
        'latitude' => -1.2921,
        'longitude' => 36.8219,
        'status' => 'pending',
    ]);

    $this->actingAs($this->driver, 'sanctum')->patchJson(
        "/api/mobile/transport/trips/{$trip->id}/stops/{$stop->id}",
        ['status' => 'picked_up'],
    );

    $stop->refresh();
    expect($stop->status_updated_at)->not->toBeNull();
});
