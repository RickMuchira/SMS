import { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, PageProps } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Temporarily disabled - map component needs to be completed
// import { Map, MapControls, MapMarker, MarkerContent } from '@/components/ui/map';
import { getCsrfToken } from '@/lib/csrf';

type StudentOption = {
    id: number;
    name: string;
};

type TransportMarkLocationProps = PageProps<{
    students: StudentOption[];
}>;

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Mark locations', href: '/transport/mark-location' },
];

type LocationType = 'pickup' | 'dropoff' | 'both';

export default function TransportMarkLocation() {
    const { props } = usePage<TransportMarkLocationProps>();
    const students = props.students ?? [];

    const [studentId, setStudentId] = useState<number | ''>('');
    const [locationType, setLocationType] = useState<LocationType>('pickup');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [address, setAddress] = useState('');
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const hasPosition = latitude !== null && longitude !== null;

    function handleLocate(coords: { latitude: number; longitude: number }) {
        setLatitude(coords.latitude);
        setLongitude(coords.longitude);
        setStatus('Location detected. You can drag the marker to adjust.');
        setError(null);
    }

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!studentId) {
            setError('Please select a student.');
            return;
        }
        if (!hasPosition) {
            setError('Please use the map to set a location first.');
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
                    latitude,
                    longitude,
                    location_type: locationType,
                    address: address || null,
                }),
            });

            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as
                    | { message?: string }
                    | null;
                throw new Error(body?.message ?? 'Failed to save location.');
            }

            setStatus('Location saved successfully. You can mark another student.');
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'An unexpected error occurred. Please try again.',
            );
        } finally {
            setSaving(false);
        }
    }

    const center: [number, number] =
        longitude !== null && latitude !== null ? [longitude, latitude] : [36.8219, -1.2921]; // Default: Nairobi

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mark transport locations" />

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Mark student pickup / dropoff locations</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Use this page on a phone or tablet while you are on the route. First
                            select a student, then use the map to mark the exact pickup or dropoff
                            location.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="student">Student</Label>
                                    <select
                                        id="student"
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                        value={studentId}
                                        onChange={(e) =>
                                            setStudentId(
                                                e.target.value ? Number(e.target.value) : '',
                                            )
                                        }
                                    >
                                        <option value="">Select student</option>
                                        {students.map((student) => (
                                            <option key={student.id} value={student.id}>
                                                {student.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Location type</Label>
                                    <div className="flex flex-wrap gap-4">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="location_type"
                                                value="pickup"
                                                checked={locationType === 'pickup'}
                                                onChange={() => setLocationType('pickup')}
                                            />
                                            Pickup only
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="location_type"
                                                value="dropoff"
                                                checked={locationType === 'dropoff'}
                                                onChange={() => setLocationType('dropoff')}
                                            />
                                            Dropoff only
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="radio"
                                                name="location_type"
                                                value="both"
                                                checked={locationType === 'both'}
                                                onChange={() => setLocationType('both')}
                                            />
                                            Pickup &amp; dropoff
                                        </label>
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="address">
                                        Address / landmark (optional but recommended)
                                    </Label>
                                    <Input
                                        id="address"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="e.g. Karen Estate, house 45, near the supermarket gate"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label>Map</Label>
                                <p className="text-xs text-muted-foreground">
                                    Tap the locate button to move the map to your current position,
                                    then drag the marker to the exact student location if needed.
                                </p>
                                <div className="h-80 w-full overflow-hidden rounded-md border flex items-center justify-center bg-muted">
                                    <p className="text-sm text-muted-foreground">
                                        Map component temporarily disabled - will be restored soon
                                    </p>
                                </div>
                                {hasPosition && (
                                    <p className="text-xs text-muted-foreground">
                                        Lat: {latitude?.toFixed(6)} | Lng:{' '}
                                        {longitude?.toFixed(6)}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                <Button type="submit" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save location'}
                                </Button>
                                {status && <p className="text-sm text-green-600">{status}</p>}
                                {error && <p className="text-sm text-red-500">{error}</p>}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

