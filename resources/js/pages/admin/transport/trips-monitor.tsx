import { Head, Link } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Map, Marker, Route as MapRoute, NavigationControl } from '@/components/ui/map';
import { MapPin, Navigation, Calendar, Clock } from 'lucide-react';

type Trip = {
    id: number;
    name: string;
    type: 'morning' | 'evening';
    trip_date: string;
    start_time?: string;
    end_time?: string;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    bus?: { id: number; registration_number: string };
    driver?: { id: number; name: string };
    assistant?: { id: number; name: string };
    stops_count?: number;
    stops?: TripStop[];
};

type TripStop = {
    id: number;
    student_id: number;
    order_sequence: number;
    latitude: number;
    longitude: number;
    address?: string;
    pickup_notes?: string;
    status: 'pending' | 'picked_up' | 'dropped_off' | 'absent';
    student: {
        id: number;
        name: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Transport', href: '/admin/transport/trips' },
    { title: 'Trip Monitor', href: '/admin/transport/trips' },
];

export default function TripsMonitor() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterStatus, setFilterStatus] = useState<string>('');

    const fetchTrips = useCallback(async () => {
        const params = new URLSearchParams();
        if (filterDate) params.append('date', filterDate);
        if (filterStatus) params.append('status', filterStatus);

        const response = await fetch(`/admin/api/transport/trips?${params}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Failed to load trips');
        const payload = await response.json();
        return payload.data ?? [];
    }, [filterDate, filterStatus]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchTrips()
            .then((data) => {
                if (!cancelled) setTrips(data);
            })
            .catch(() => {
                if (!cancelled) setError('Unable to load trips.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [fetchTrips]);

    async function viewTripDetails(tripId: number) {
        try {
            const response = await fetch(`/admin/api/transport/trips/${tripId}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok) throw new Error('Failed to load trip details');
            const data = await response.json();
            setSelectedTrip(data.trip);
        } catch {
            setError('Failed to load trip details');
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'planned':
                return <Badge className="bg-blue-100 text-blue-800">Planned</Badge>;
            case 'in_progress':
                return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
            case 'completed':
                return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    }

    function getStopStatusBadge(status: string) {
        switch (status) {
            case 'pending':
                return <Badge variant="outline">Pending</Badge>;
            case 'picked_up':
                return <Badge className="bg-green-100 text-green-800">Picked Up</Badge>;
            case 'dropped_off':
                return <Badge className="bg-blue-100 text-blue-800">Dropped Off</Badge>;
            case 'absent':
                return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    }

    const routeCoordinates =
        selectedTrip?.stops?.map((stop) => [stop.longitude, stop.latitude]) ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Trip Monitor" />

            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Trip Monitor</h1>
                        <p className="text-muted-foreground">Monitor all transport trips in real-time</p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild>
                            <Link href="/admin/transport/buses">Manage Buses</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/admin/transport/route-planner">Plan Route</Link>
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Filter Trips</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date</label>
                                <input
                                    type="date"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Status</label>
                                <select
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="planned">Planned</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Trips ({trips.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <p className="text-sm text-muted-foreground">Loading trips...</p>
                            ) : trips.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No trips found for selected filters.
                                </p>
                            ) : (
                                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                    {trips.map((trip) => (
                                        <div
                                            key={trip.id}
                                            className="p-4 border rounded hover:bg-gray-50 cursor-pointer"
                                            onClick={() => viewTripDetails(trip.id)}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-semibold">
                                                        {trip.bus?.registration_number} -{' '}
                                                        {trip.type === 'morning'
                                                            ? 'Morning'
                                                            : 'Afternoon'}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Driver: {trip.driver?.name}
                                                    </p>
                                                </div>
                                                {getStatusBadge(trip.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    {trip.trip_date}
                                                </span>
                                                {trip.start_time && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        {trip.start_time}
                                                    </span>
                                                )}
                                                <span>{trip.stops_count || 0} stops</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {selectedTrip
                                    ? `Trip Details - ${selectedTrip.bus?.registration_number}`
                                    : 'Select a trip to view details'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!selectedTrip ? (
                                <p className="text-sm text-muted-foreground">
                                    Click on a trip from the list to view its route and stops on the
                                    map.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="h-[400px] w-full">
                                        <Map
                                            center={[
                                                selectedTrip.stops?.[0]?.longitude ?? 36.8219,
                                                selectedTrip.stops?.[0]?.latitude ?? -1.2921,
                                            ]}
                                            zoom={13}
                                        >
                                            <NavigationControl />

                                            {selectedTrip.stops?.map((stop, index) => (
                                                <Marker
                                                    key={stop.id}
                                                    longitude={stop.longitude}
                                                    latitude={stop.latitude}
                                                >
                                                    <div
                                                        className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${
                                                            stop.status === 'picked_up' ||
                                                            stop.status === 'dropped_off'
                                                                ? 'bg-green-600'
                                                                : stop.status === 'absent'
                                                                  ? 'bg-red-600'
                                                                  : 'bg-blue-600'
                                                        }`}
                                                        title={`${index + 1}. ${stop.student.name} - ${stop.status}`}
                                                    >
                                                        {index + 1}
                                                    </div>
                                                </Marker>
                                            ))}

                                            {(routeCoordinates.length ?? 0) > 1 && (
                                                <MapRoute
                                                    coordinates={
                                                        routeCoordinates as [number, number][]
                                                    }
                                                    color="#3b82f6"
                                                    width={4}
                                                />
                                            )}
                                        </Map>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-2">Stops Progress</h4>
                                        <div className="space-y-2">
                                            {selectedTrip.stops?.map((stop, index) => (
                                                <div
                                                    key={stop.id}
                                                    className="flex items-center gap-3 p-2 border rounded"
                                                >
                                                    <span className="font-semibold w-6">
                                                        {index + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">
                                                            {stop.student.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {stop.address || 'No address'}
                                                        </p>
                                                    </div>
                                                    {getStopStatusBadge(stop.status)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
