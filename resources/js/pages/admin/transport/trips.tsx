import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Trip = {
    id: number;
    name: string;
    type: 'morning' | 'evening';
    trip_number: number;
    driver_id: number;
    assistant_id?: number | null;
    departure_time?: string | null;
    status: 'active' | 'inactive';
    driver?: { id: number; name: string } | null;
    assistant?: { id: number; name: string } | null;
};

type PaginatedTrips = {
    data: Trip[];
};

type SimpleUser = {
    id: number;
    name: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Transport trips', href: '/admin/transport/trips' },
];

export default function AdminTransportTripsIndex() {
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [type, setType] = useState<'morning' | 'evening'>('morning');
    const [tripNumber, setTripNumber] = useState(1);
    const [driverId, setDriverId] = useState<number | ''>('');
    const [assistantId, setAssistantId] = useState<number | ''>('');
    const [departureTime, setDepartureTime] = useState('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [submitting, setSubmitting] = useState(false);

    const [editing, setEditing] = useState<Trip | null>(null);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState<'morning' | 'evening'>('morning');
    const [editTripNumber, setEditTripNumber] = useState(1);
    const [editDriverId, setEditDriverId] = useState<number | ''>('');
    const [editAssistantId, setEditAssistantId] = useState<number | ''>('');
    const [editDepartureTime, setEditDepartureTime] = useState('');
    const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const [drivers, setDrivers] = useState<SimpleUser[]>([]);
    const [assistants, setAssistants] = useState<SimpleUser[]>([]);

    const fetchTrips = useCallback(async () => {
        const response = await fetch('/admin/api/transport/trips', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Failed to load trips');
        const payload = (await response.json()) as PaginatedTrips;
        return payload.data ?? [];
    }, []);

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

    useEffect(() => {
        Promise.all([
            fetch('/admin/api/transport/drivers', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            }).then((r) => r.json()),
            fetch('/admin/api/transport/assistants', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            }).then((r) => r.json()),
        ])
            .then(([driversData, assistantsData]) => {
                setDrivers(driversData.data ?? []);
                setAssistants(assistantsData.data ?? []);
            })
            .catch(() => {});
    }, []);

    async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!driverId) {
            setError('Please select a driver.');
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const response = await fetch('/admin/api/transport/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name,
                    type,
                    trip_number: tripNumber,
                    driver_id: driverId,
                    assistant_id: assistantId || null,
                    departure_time: departureTime || null,
                    status,
                }),
            });

            if (!response.ok) {
                const body = (await response.json().catch(() => null)) as
                    | { message?: string }
                    | null;
                throw new Error(body?.message ?? 'Failed to create trip');
            }

            const created = (await response.json()) as { trip: Trip };
            setTrips((prev) => [...prev, created.trip]);
            setName('');
            setType('morning');
            setTripNumber(1);
            setDriverId('');
            setAssistantId('');
            setDepartureTime('');
            setStatus('active');
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : 'An unexpected error occurred. Please try again.',
            );
        } finally {
            setSubmitting(false);
        }
    }

    function openEdit(trip: Trip) {
        setEditing(trip);
        setEditName(trip.name);
        setEditType(trip.type);
        setEditTripNumber(trip.trip_number);
        setEditDriverId(trip.driver_id);
        setEditAssistantId(trip.assistant_id ?? '');
        setEditDepartureTime(trip.departure_time ?? '');
        setEditStatus(trip.status);
        setEditError(null);
    }

    async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editing) return;
        if (!editDriverId) {
            setEditError('Please select a driver.');
            return;
        }
        setEditSubmitting(true);
        setEditError(null);
        try {
            const response = await fetch(`/admin/api/transport/trips/${editing.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: editName,
                    type: editType,
                    trip_number: editTripNumber,
                    driver_id: editDriverId,
                    assistant_id: editAssistantId || null,
                    departure_time: editDepartureTime || null,
                    status: editStatus,
                }),
            });

            if (!response.ok) {
                const body = (await response.json().catch(() => null)) as
                    | { message?: string }
                    | null;
                throw new Error(body?.message ?? 'Failed to update trip');
            }

            const updated = (await response.json()) as { trip: Trip };
            setTrips((prev) =>
                prev.map((trip) => (trip.id === updated.trip.id ? updated.trip : trip)),
            );
            setEditing(null);
        } catch (e) {
            setEditError(
                e instanceof Error ? e.message : 'An unexpected error occurred.',
            );
        } finally {
            setEditSubmitting(false);
        }
    }

    async function handleDelete(trip: Trip) {
        if (
            !window.confirm(
                `Delete trip "${trip.name}"? Students assigned to this trip will need to be reassigned.`,
            )
        )
            return;
        try {
            const response = await fetch(`/admin/api/transport/trips/${trip.id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
            });
            if (response.ok) {
                setTrips((prev) => prev.filter((t) => t.id !== trip.id));
            }
        } catch {
            setError('Failed to delete trip.');
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transport trip management" />

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Create new trip</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Configure morning and evening transport trips and assign drivers and
                            assistants.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handleCreate}
                            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="name">Trip name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Morning Trip 1"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Type</Label>
                                <select
                                    id="type"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={type}
                                    onChange={(e) =>
                                        setType(e.target.value as 'morning' | 'evening')
                                    }
                                >
                                    <option value="morning">Morning</option>
                                    <option value="evening">Evening</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="trip_number">Trip number</Label>
                                <Input
                                    id="trip_number"
                                    type="number"
                                    min={1}
                                    value={tripNumber}
                                    onChange={(e) =>
                                        setTripNumber(Number(e.target.value) || 1)
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="driver">Driver</Label>
                                <select
                                    id="driver"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={driverId}
                                    onChange={(e) =>
                                        setDriverId(
                                            e.target.value ? Number(e.target.value) : '',
                                        )
                                    }
                                    required
                                >
                                    <option value="">Select driver</option>
                                    {drivers.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="assistant">Assistant (optional)</Label>
                                <select
                                    id="assistant"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={assistantId}
                                    onChange={(e) =>
                                        setAssistantId(
                                            e.target.value ? Number(e.target.value) : '',
                                        )
                                    }
                                >
                                    <option value="">No assistant</option>
                                    {assistants.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="departure_time">Departure time</Label>
                                <Input
                                    id="departure_time"
                                    type="time"
                                    value={departureTime}
                                    onChange={(e) => setDepartureTime(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <select
                                    id="status"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={status}
                                    onChange={(e) =>
                                        setStatus(e.target.value as 'active' | 'inactive')
                                    }
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="md:col-span-2 lg:col-span-3 flex items-center gap-4">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Creating trip...' : 'Create trip'}
                                </Button>
                                {error && <p className="text-sm text-red-500">{error}</p>}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>All trips</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading trips...</p>
                        ) : trips.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No trips configured yet.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="py-2 pr-4">Name</th>
                                            <th className="py-2 pr-4">Type</th>
                                            <th className="py-2 pr-4">Number</th>
                                            <th className="py-2 pr-4">Driver</th>
                                            <th className="py-2 pr-4">Assistant</th>
                                            <th className="py-2 pr-4">Departure</th>
                                            <th className="py-2 pr-4">Status</th>
                                            <th className="py-2 pr-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trips.map((trip) => (
                                            <tr
                                                key={trip.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="py-2 pr-4 font-medium">
                                                    {trip.name}
                                                </td>
                                                <td className="py-2 pr-4 capitalize">
                                                    {trip.type}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {trip.trip_number}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {trip.driver?.name ?? '—'}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {trip.assistant?.name ?? '—'}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {trip.departure_time ?? '—'}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {trip.status === 'active' ? (
                                                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 pr-4 flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEdit(trip)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() => handleDelete(trip)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit trip</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Trip name</Label>
                                <Input
                                    id="edit-name"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-type">Type</Label>
                                <select
                                    id="edit-type"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={editType}
                                    onChange={(e) =>
                                        setEditType(e.target.value as 'morning' | 'evening')
                                    }
                                >
                                    <option value="morning">Morning</option>
                                    <option value="evening">Evening</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-trip-number">Trip number</Label>
                                <Input
                                    id="edit-trip-number"
                                    type="number"
                                    min={1}
                                    value={editTripNumber}
                                    onChange={(e) =>
                                        setEditTripNumber(Number(e.target.value) || 1)
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-driver">Driver</Label>
                                <select
                                    id="edit-driver"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={editDriverId}
                                    onChange={(e) =>
                                        setEditDriverId(
                                            e.target.value ? Number(e.target.value) : '',
                                        )
                                    }
                                    required
                                >
                                    <option value="">Select driver</option>
                                    {drivers.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-assistant">Assistant (optional)</Label>
                                <select
                                    id="edit-assistant"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={editAssistantId}
                                    onChange={(e) =>
                                        setEditAssistantId(
                                            e.target.value ? Number(e.target.value) : '',
                                        )
                                    }
                                >
                                    <option value="">No assistant</option>
                                    {assistants.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-departure-time">Departure time</Label>
                                <Input
                                    id="edit-departure-time"
                                    type="time"
                                    value={editDepartureTime}
                                    onChange={(e) => setEditDepartureTime(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <select
                                    id="edit-status"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={editStatus}
                                    onChange={(e) =>
                                        setEditStatus(
                                            e.target.value as 'active' | 'inactive',
                                        )
                                    }
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                        {editError && (
                            <p className="text-sm text-red-500">{editError}</p>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditing(null)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editSubmitting}>
                                {editSubmitting ? 'Saving...' : 'Save changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

