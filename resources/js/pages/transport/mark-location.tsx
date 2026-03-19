import { Head, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map, Marker, NavigationControl } from '@/components/ui/map';
import { getCsrfToken } from '@/lib/csrf';

type StudentOption = {
    id: number;
    name: string;
};

type BusOption = {
    id: number;
    registration_number: string;
};

type TransportMarkLocationPageProps = {
    students: StudentOption[];
    buses: BusOption[];
    schoolLocation: {
        latitude: number | null;
        longitude: number | null;
        address: string | null;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Mark locations', href: '/transport/mark-location' },
];

type LocationType = 'pickup' | 'dropoff' | 'both';

export default function TransportMarkLocation() {
    const pageProps = usePage<TransportMarkLocationPageProps>().props as TransportMarkLocationPageProps;
    const students = pageProps.students ?? [];
    const buses = pageProps.buses ?? [];
    const schoolLocation = pageProps.schoolLocation ?? { latitude: null, longitude: null, address: null };

    const [studentId, setStudentId] = useState<number | ''>('');
    const [busId, setBusId] = useState<number | ''>('');
    const [locationType, setLocationType] = useState<LocationType>('pickup');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [address, setAddress] = useState('');
    const [saving, setSaving] = useState(false);
    const [locating, setLocating] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const hasPosition = latitude !== null && longitude !== null;
    const hasSchoolLocation =
        schoolLocation.latitude !== null &&
        schoolLocation.latitude !== undefined &&
        schoolLocation.longitude !== null &&
        schoolLocation.longitude !== undefined;

    function handleLocate(coords: { latitude: number; longitude: number }) {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        setStatus('Location set. Drag the marker to fine-tune it, then save.');
        setError(null);
    }

    function goToSchoolLocation() {
        if (!hasSchoolLocation) {
            setError('School location is not configured yet. Set it in System Settings.');
            return;
        }
        handleLocate({
            latitude: schoolLocation.latitude as number,
            longitude: schoolLocation.longitude as number,
        });
        if (!address && schoolLocation.address) {
            setAddress(schoolLocation.address);
        }
    }

    function goToCurrentPosition() {
        if (!navigator.geolocation) {
            setError('Your browser does not support location detection.');
            return;
        }
        setLocating(true);
        setError(null);
        setStatus(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                handleLocate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                setLocating(false);
            },
            () => {
                setLocating(false);
                setError('Could not get your position. Please allow location access and try again.');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        );
    }

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!studentId) {
            setError('Please select a student.');
            return;
        }
        if (!hasPosition) {
            setError('Please pin a location on the map first.');
            return;
        }
        setSaving(true);
        setError(null);
        setStatus(null);
        try {
            const csrf = getCsrfToken();
            const res = await fetch('/transport/locations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    student_id: studentId,
                    bus_id: busId || null,
                    latitude,
                    longitude,
                    location_type: locationType,
                    address: address || null,
                }),
            });

            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message ?? 'Failed to save location.');
            }

            setStatus('Location saved! You can now mark another student.');
            setStudentId('');
            setLatitude(null);
            setLongitude(null);
            setAddress('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setSaving(false);
        }
    }

    const center = useMemo<[number, number]>(() => {
        if (longitude !== null && latitude !== null) {
            return [longitude, latitude];
        }
        if (hasSchoolLocation) {
            return [schoolLocation.longitude as number, schoolLocation.latitude as number];
        }
        return [36.8219, -1.2921];
    }, [hasSchoolLocation, latitude, longitude, schoolLocation]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mark transport locations" />

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Mark student locations</h1>
                    <p className="text-muted-foreground">
                        Select a student, pin their pickup or dropoff location on the map, then save.
                        Drivers see these locations on the mobile app when running their route.
                    </p>
                </div>

                <Card>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Row 1 – Bus + Student */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="bus">Bus</Label>
                                    <select
                                        id="bus"
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={busId}
                                        onChange={(e) =>
                                            setBusId(e.target.value ? Number(e.target.value) : '')
                                        }
                                    >
                                        <option value="">No specific bus</option>
                                        {buses.map((bus: BusOption) => (
                                            <option key={bus.id} value={bus.id}>
                                                {bus.registration_number}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-muted-foreground">
                                        Optionally link this location to a specific bus.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="student">Student *</Label>
                                    <select
                                        id="student"
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={studentId}
                                        onChange={(e) =>
                                            setStudentId(e.target.value ? Number(e.target.value) : '')
                                        }
                                        required
                                    >
                                        <option value="">Select student…</option>
                                        {students.map((student: StudentOption) => (
                                            <option key={student.id} value={student.id}>
                                                {student.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 2 – Location type + Address */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Location type</Label>
                                    <div className="flex flex-wrap gap-4 pt-1">
                                        {(['pickup', 'dropoff', 'both'] as LocationType[]).map((t) => (
                                            <label key={t} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="radio"
                                                    name="location_type"
                                                    value={t}
                                                    checked={locationType === t}
                                                    onChange={() => setLocationType(t)}
                                                />
                                                {t === 'pickup' ? 'Pickup only' : t === 'dropoff' ? 'Dropoff only' : 'Pickup & dropoff'}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Address / landmark</Label>
                                    <Input
                                        id="address"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="e.g. Karen Estate, gate 45"
                                    />
                                </div>
                            </div>

                            {/* Map section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Map pin *</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={goToSchoolLocation}
                                            disabled={!hasSchoolLocation}
                                        >
                                            School location
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={goToCurrentPosition}
                                            disabled={locating}
                                        >
                                            {locating ? 'Detecting…' : 'My current position'}
                                        </Button>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Click a button above to centre the map, then drag the pin to the exact location.
                                </p>

                                <div className="h-96 w-full overflow-hidden rounded-md border bg-muted">
                                    <Map center={center} zoom={hasPosition ? 16 : 13} className="h-full w-full">
                                        <NavigationControl />
                                        {hasPosition && (
                                            <Marker
                                                longitude={longitude}
                                                latitude={latitude}
                                                options={{ draggable: true }}
                                                onDragEnd={({ latitude: lat, longitude: lng }) =>
                                                    handleLocate({ latitude: lat, longitude: lng })
                                                }
                                            >
                                                <div className="flex h-10 w-10 cursor-grab items-center justify-center rounded-full border-2 border-white bg-primary text-xs font-semibold text-primary-foreground shadow-lg active:cursor-grabbing">
                                                    {studentId
                                                        ? (students.find((s) => s.id === studentId)?.name.charAt(0) ?? '📍')
                                                        : '📍'}
                                                </div>
                                            </Marker>
                                        )}
                                    </Map>
                                </div>

                                {hasPosition && (
                                    <p className="text-xs text-muted-foreground">
                                        Pinned at: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                                    </p>
                                )}
                                {!hasPosition && (
                                    <p className="text-xs text-muted-foreground">
                                        No pin set yet. Use one of the buttons above to start.
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap items-center gap-4 border-t pt-4">
                                <Button type="submit" disabled={saving || !studentId || !hasPosition}>
                                    {saving ? 'Saving…' : 'Save location'}
                                </Button>
                                {status && (
                                    <p className="text-sm font-medium text-green-600">{status}</p>
                                )}
                                {error && (
                                    <p className="text-sm text-red-500">{error}</p>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

