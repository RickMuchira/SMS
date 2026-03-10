<?php

use App\Models\Bus;
use App\Models\Trip;
use App\Models\TripStop;
use App\Models\User;
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
