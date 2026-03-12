import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableStaffSelect, type StaffOption } from '@/components/searchable-staff-select';
import { getCsrfToken } from '@/lib/csrf';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Map, Marker, Popup, Route, NavigationControl } from '@/components/ui/map';
import { MapPin, X } from 'lucide-react';

type Bus = {
    id: number;
    registration_number: string;
    capacity: number;
    status: string;
    driver_id?: number | null;
    assistant_id?: number | null;
    driver?: { id: number; name: string } | null;
    assistant?: { id: number; name: string } | null;
};

type Student = {
    id: number;
    name: string;
    home_latitude: number;
    home_longitude: number;
    home_address?: string;
    pickup_notes?: string;
};

type TripStop = {
    student_id: number;
    order_sequence: number;
    student: Student;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Transport', href: '/admin/transport/buses' },
    { title: 'Plan Route', href: '/admin/transport/route-planner' },
];

export default function RoutePlanner() {
    const [buses, setBuses] = useState<Bus[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedBusId, setSelectedBusId] = useState<number | ''>('');
    const [tripType, setTripType] = useState<'morning' | 'evening'>('morning');
    const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
    const [driverId, setDriverId] = useState<number | ''>('');
    const [assistantId, setAssistantId] = useState<number | ''>('');
    const [startTime, setStartTime] = useState('07:00');

    const [stops, setStops] = useState<TripStop[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [hoveredStop, setHoveredStop] = useState<number | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [driverOptions, setDriverOptions] = useState<StaffOption[]>([]);
    const [assistantOptions, setAssistantOptions] = useState<StaffOption[]>([]);

    useEffect(() => {
        Promise.all([
            fetch('/admin/api/transport/buses', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            }).then((r) => r.json()),
            fetch('/admin/api/transport/drivers', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            }).then((r) => r.json()),
            fetch('/admin/api/transport/assistants', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            }).then((r) => r.json()),
        ])
            .then(([busesData, driversData, assistantsData]) => {
                setBuses(busesData.data || []);
                const drivers = (driversData.data || []).map((u: { id: number; name: string }) => ({
                    id: u.id,
                    name: u.name,
                })) as StaffOption[];
                const assistants = (assistantsData.data || []).map(
                    (u: { id: number; name: string }) => ({ id: u.id, name: u.name }),
                ) as StaffOption[];
                setDriverOptions(drivers);
                setAssistantOptions(assistants);
            })
            .catch(() => setError('Failed to load initial data'));
    }, []);

    useEffect(() => {
        if (selectedBusId) {
            fetch(`/admin/api/transport/buses/${selectedBusId}/students`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            })
                .then((r) => r.json())
                .then((data) => setStudents(data.students || []))
                .catch(() => setError('Failed to load students'));
        }
    }, [selectedBusId]);

    function addStop(student: Student) {
        if (stops.find((s) => s.student_id === student.id)) {
            return;
        }
        setStops((prev) => [
            ...prev,
            {
                student_id: student.id,
                order_sequence: prev.length + 1,
                student,
            },
        ]);
    }

    function removeStop(studentId: number) {
        setStops((prev) =>
            prev
                .filter((s) => s.student_id !== studentId)
                .map((s, idx) => ({ ...s, order_sequence: idx + 1 })),
        );
    }

    function moveStop(index: number, direction: 'up' | 'down') {
        const newStops = [...stops];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newStops.length) return;

        [newStops[index], newStops[targetIndex]] = [newStops[targetIndex], newStops[index]];
        newStops.forEach((stop, idx) => {
            stop.order_sequence = idx + 1;
        });
        setStops(newStops);
    }

    async function handleCreateTrip() {
        if (!selectedBusId || !driverId || stops.length === 0) {
            setError('Please select a bus, driver, and add at least one stop');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const csrf = getCsrfToken();
            const response = await fetch('/admin/api/transport/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    bus_id: selectedBusId,
                    type: tripType,
                    trip_date: tripDate,
                    driver_id: driverId,
                    assistant_id: assistantId || null,
                    start_time: startTime,
                    stops: stops.map((stop) => ({
                        student_id: stop.student_id,
                        order_sequence: stop.order_sequence,
                        latitude: stop.student.home_latitude,
                        longitude: stop.student.home_longitude,
                        address: stop.student.home_address,
                        pickup_notes: stop.student.pickup_notes,
                    })),
                }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.message ?? 'Failed to create trip');
            }

            alert('Trip created successfully!');
            setStops([]);
            setSelectedStudent(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    }

    const routeCoordinates = stops.map((stop) => [
        stop.student.home_longitude,
        stop.student.home_latitude,
    ]) as [number, number][];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Route Planner" />

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Route Planner</h1>
                    <p className="text-muted-foreground">
                        Plan student pickup/dropoff routes on an interactive map
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Trip Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bus">Bus</Label>
                                    <select
                                        id="bus"
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={selectedBusId}
                                        onChange={(e) => {
                                            const id = e.target.value ? Number(e.target.value) : '';
                                            setSelectedBusId(id);
                                            if (id) {
                                                const bus = buses.find((b) => b.id === id);
                                                if (bus?.driver_id) setDriverId(bus.driver_id);
                                                if (bus?.assistant_id)
                                                    setAssistantId(bus.assistant_id);
                                            }
                                        }}
                                    >
                                        <option value="">Select bus</option>
                                        {buses.map((bus) => (
                                            <option key={bus.id} value={bus.id}>
                                                {bus.registration_number} ({bus.capacity} seats)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="type">Type</Label>
                                    <select
                                        id="type"
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={tripType}
                                        onChange={(e) =>
                                            setTripType(e.target.value as 'morning' | 'evening')
                                        }
                                    >
                                        <option value="morning">Morning Pickup</option>
                                        <option value="evening">Afternoon Dropoff</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date">Date</Label>
                                    <Input
                                        id="date"
                                        type="date"
                                        value={tripDate}
                                        onChange={(e) => setTripDate(e.target.value)}
                                    />
                                </div>

                                <SearchableStaffSelect
                                    staff={driverOptions}
                                    value={driverId}
                                    onChange={(id) => setDriverId(id)}
                                    label="Driver"
                                    placeholder="Search by name..."
                                    emptyOption="Select driver"
                                    required
                                />

                                <SearchableStaffSelect
                                    staff={assistantOptions}
                                    value={assistantId}
                                    onChange={(id) => setAssistantId(id)}
                                    label="Assistant (Optional)"
                                    placeholder="Search by name..."
                                    emptyOption="No assistant"
                                />

                                <div className="space-y-2">
                                    <Label htmlFor="start-time">Start Time</Label>
                                    <Input
                                        id="start-time"
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Route Stops ({stops.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {stops.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Click students on the map to add stops
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {stops.map((stop, index) => (
                                            <div
                                                key={stop.student_id}
                                                className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50"
                                                onMouseEnter={() => setHoveredStop(stop.student_id)}
                                                onMouseLeave={() => setHoveredStop(null)}
                                            >
                                                <span className="text-sm font-semibold w-6">
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {stop.student.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {stop.student.home_address || 'No address'}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => moveStop(index, 'up')}
                                                        disabled={index === 0}
                                                    >
                                                        ↑
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => moveStop(index, 'down')}
                                                        disabled={index === stops.length - 1}
                                                    >
                                                        ↓
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeStop(stop.student_id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {stops.length > 0 && (
                                    <Button
                                        className="w-full mt-4"
                                        onClick={handleCreateTrip}
                                        disabled={loading}
                                    >
                                        {loading ? 'Creating Trip...' : 'Create Trip'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                        <Card>
                            <CardContent className="p-0">
                                <div className="h-[700px] w-full">
                                    <Map center={[36.8219, -1.2921]} zoom={12}>
                                        <NavigationControl />

                                        {students
                                            .filter((s) => !stops.find((st) => st.student_id === s.id))
                                            .map((student) => (
                                                <Marker
                                                    key={student.id}
                                                    longitude={student.home_longitude}
                                                    latitude={student.home_latitude}
                                                    onClick={() => addStop(student)}
                                                >
                                                    <div className="cursor-pointer">
                                                        <MapPin className="h-6 w-6 text-gray-500 hover:text-blue-600" />
                                                    </div>
                                                </Marker>
                                            ))}

                                        {stops.map((stop, index) => (
                                            <Marker
                                                key={stop.student_id}
                                                longitude={stop.student.home_longitude}
                                                latitude={stop.student.home_latitude}
                                                onClick={() => removeStop(stop.student_id)}
                                            >
                                                <div
                                                    className={`cursor-pointer flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${
                                                        hoveredStop === stop.student_id
                                                            ? 'bg-red-600'
                                                            : 'bg-blue-600'
                                                    }`}
                                                >
                                                    {index + 1}
                                                </div>
                                            </Marker>
                                        ))}

                                        {routeCoordinates.length > 1 && (
                                            <Route
                                                coordinates={routeCoordinates}
                                                color="#3b82f6"
                                                width={4}
                                            />
                                        )}

                                        {selectedStudent && (
                                            <Popup
                                                longitude={selectedStudent.home_longitude}
                                                latitude={selectedStudent.home_latitude}
                                                onClose={() => setSelectedStudent(null)}
                                            >
                                                <div className="p-2">
                                                    <h3 className="font-semibold">
                                                        {selectedStudent.name}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {selectedStudent.home_address}
                                                    </p>
                                                    {selectedStudent.pickup_notes && (
                                                        <p className="text-xs mt-1">
                                                            {selectedStudent.pickup_notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </Popup>
                                        )}
                                    </Map>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
