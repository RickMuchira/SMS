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
import { Badge } from '@/components/ui/badge';

type Bus = {
    id: number;
    registration_number: string;
    capacity: number;
    status: 'active' | 'inactive' | 'maintenance';
    notes?: string | null;
    trips_count?: number;
};

type PaginatedBuses = {
    data: Bus[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Transport', href: '/admin/transport/buses' },
    { title: 'Buses', href: '/admin/transport/buses' },
];

export default function BusesIndex() {
    const [buses, setBuses] = useState<Bus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBus, setEditingBus] = useState<Bus | null>(null);
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [capacity, setCapacity] = useState(30);
    const [status, setStatus] = useState<'active' | 'inactive' | 'maintenance'>('active');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchBuses = useCallback(async () => {
        const response = await fetch('/admin/api/transport/buses', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Failed to load buses');
        const payload = (await response.json()) as PaginatedBuses;
        return payload.data ?? [];
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchBuses()
            .then((data) => {
                if (!cancelled) setBuses(data);
            })
            .catch(() => {
                if (!cancelled) setError('Unable to load buses.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [fetchBuses]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const url = editingBus
                ? `/admin/api/transport/buses/${editingBus.id}`
                : '/admin/api/transport/buses';
            const method = editingBus ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    registration_number: registrationNumber,
                    capacity,
                    status,
                    notes: notes || null,
                }),
            });

            if (!response.ok) {
                const body = (await response.json().catch(() => null)) as
                    | { message?: string }
                    | null;
                throw new Error(body?.message ?? 'Failed to save bus');
            }

            const result = (await response.json()) as { bus: Bus };
            if (editingBus) {
                setBuses((prev) =>
                    prev.map((bus) => (bus.id === result.bus.id ? result.bus : bus)),
                );
            } else {
                setBuses((prev) => [...prev, result.bus]);
            }
            setIsDialogOpen(false);
            resetForm();
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

    function resetForm() {
        setEditingBus(null);
        setRegistrationNumber('');
        setCapacity(30);
        setStatus('active');
        setNotes('');
    }

    function openCreateDialog() {
        resetForm();
        setIsDialogOpen(true);
    }

    function openEditDialog(bus: Bus) {
        setEditingBus(bus);
        setRegistrationNumber(bus.registration_number);
        setCapacity(bus.capacity);
        setStatus(bus.status);
        setNotes(bus.notes || '');
        setIsDialogOpen(true);
    }

    async function handleDelete(bus: Bus) {
        if (
            !window.confirm(
                `Delete bus "${bus.registration_number}"? This action cannot be undone.`,
            )
        )
            return;
        try {
            const response = await fetch(`/admin/api/transport/buses/${bus.id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
            });
            if (response.ok) {
                setBuses((prev) => prev.filter((b) => b.id !== bus.id));
            }
        } catch {
            setError('Failed to delete bus.');
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-100 text-green-800">Active</Badge>;
            case 'maintenance':
                return <Badge className="bg-yellow-100 text-yellow-800">Maintenance</Badge>;
            case 'inactive':
                return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Bus Management" />

            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Bus Fleet</h1>
                        <p className="text-muted-foreground">
                            Manage school buses and their capacity
                        </p>
                    </div>
                    <Button onClick={openCreateDialog}>Add New Bus</Button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>All Buses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading buses...</p>
                        ) : buses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No buses configured yet.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="py-2 pr-4 font-semibold">
                                                Registration
                                            </th>
                                            <th className="py-2 pr-4 font-semibold">Capacity</th>
                                            <th className="py-2 pr-4 font-semibold">Status</th>
                                            <th className="py-2 pr-4 font-semibold">Trips</th>
                                            <th className="py-2 pr-4 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {buses.map((bus) => (
                                            <tr key={bus.id} className="border-b last:border-0">
                                                <td className="py-3 pr-4 font-medium">
                                                    {bus.registration_number}
                                                </td>
                                                <td className="py-3 pr-4">{bus.capacity}</td>
                                                <td className="py-3 pr-4">
                                                    {getStatusBadge(bus.status)}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    {bus.trips_count || 0}
                                                </td>
                                                <td className="py-3 pr-4 flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditDialog(bus)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() => handleDelete(bus)}
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

            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && setIsDialogOpen(false)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBus ? 'Edit Bus' : 'Add New Bus'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="registration">Registration Number</Label>
                            <Input
                                id="registration"
                                value={registrationNumber}
                                onChange={(e) => setRegistrationNumber(e.target.value)}
                                placeholder="e.g. KDG 116G"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="capacity">Capacity</Label>
                            <Input
                                id="capacity"
                                type="number"
                                min={1}
                                max={100}
                                value={capacity}
                                onChange={(e) => setCapacity(Number(e.target.value) || 30)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <select
                                id="status"
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                value={status}
                                onChange={(e) =>
                                    setStatus(
                                        e.target.value as 'active' | 'inactive' | 'maintenance',
                                    )
                                }
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any additional notes about this bus"
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Saving...' : editingBus ? 'Save Changes' : 'Add Bus'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
