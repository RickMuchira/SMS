import { Head, Link } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { SearchableStaffSelect, type StaffOption } from '@/components/searchable-staff-select';
import { getCsrfToken } from '@/lib/csrf';
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
    driver_id?: number | null;
    assistant_id?: number | null;
    driver?: { id: number; name: string } | null;
    assistant?: { id: number; name: string } | null;
};

type PaginatedBuses = {
    data: Bus[];
};

type StaffPresetSummary = {
    type: 'morning' | 'evening';
    trip_number: number;
    driver?: { id: number; name: string } | null;
    assistant?: { id: number; name: string } | null;
};

type BusStaffSummary = {
    id: number;
    registration_number: string;
    staff_presets: StaffPresetSummary[];
};

type StaffSummaryResponse = {
    buses: BusStaffSummary[];
    max_morning_trip: number;
    max_evening_trip: number;
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
    const [submitting, setSubmitting] = useState(false);
    const [driverOptions, setDriverOptions] = useState<StaffOption[]>([]);
    const [assistantOptions, setAssistantOptions] = useState<StaffOption[]>([]);
    const [staffSummary, setStaffSummary] = useState<BusStaffSummary[]>([]);
    const [maxMorningTrip, setMaxMorningTrip] = useState(0);
    const [maxEveningTrip, setMaxEveningTrip] = useState(0);
    const [summaryLoading, setSummaryLoading] = useState(false);

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
            .catch(() => {});
    }, []);

    const fetchBuses = useCallback(async () => {
        const response = await fetch('/admin/api/transport/buses', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Failed to load buses');
        const payload = (await response.json()) as PaginatedBuses;
        return payload.data ?? [];
    }, []);

    async function fetchStaffSummary() {
        setSummaryLoading(true);
        try {
            const response = await fetch('/admin/api/transport/bus-staff-summary', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok) return;
            const payload = (await response.json()) as StaffSummaryResponse;
            setStaffSummary(payload.buses ?? []);
            setMaxMorningTrip(payload.max_morning_trip ?? 0);
            setMaxEveningTrip(payload.max_evening_trip ?? 0);
        } catch {
            // ignore summary errors; core buses list still works
        } finally {
            setSummaryLoading(false);
        }
    }

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

        void fetchStaffSummary();

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

            const csrf = getCsrfToken();
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    registration_number: registrationNumber,
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
    }

    function openCreateDialog() {
        resetForm();
        setIsDialogOpen(true);
    }

    function openEditDialog(bus: Bus) {
        setEditingBus(bus);
        setRegistrationNumber(bus.registration_number);
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
            const csrf = getCsrfToken();
            const response = await fetch(`/admin/api/transport/buses/${bus.id}`, {
                method: 'DELETE',
                headers: { ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}) },
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
                                            <th className="py-2 pr-4 font-semibold">Manage</th>
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
                                                <td className="py-3 pr-4">
                                                    <Link
                                                        href={`/admin/transport/buses/${bus.id}`}
                                                        className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                                                    >
                                                        Manage
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {(maxMorningTrip > 0 || maxEveningTrip > 0) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Trip staff overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {summaryLoading ? (
                                <p className="text-sm text-muted-foreground">
                                    Loading trip staff summary...
                                </p>
                            ) : staffSummary.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No trip staff presets configured yet.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-xs md:text-sm">
                                        <thead>
                                            <tr className="border-b text-left align-bottom">
                                                <th className="py-2 pr-4 font-semibold">Bus</th>
                                                {Array.from(
                                                    { length: maxMorningTrip },
                                                    (_, i) => i + 1,
                                                ).map((n) => (
                                                    <th
                                                        key={`m-head-${n}`}
                                                        className="py-2 pr-4 font-semibold"
                                                    >
                                                        Morning {n}
                                                    </th>
                                                ))}
                                                {Array.from(
                                                    { length: maxEveningTrip },
                                                    (_, i) => i + 1,
                                                ).map((n) => (
                                                    <th
                                                        key={`e-head-${n}`}
                                                        className="py-2 pr-4 font-semibold"
                                                    >
                                                        Evening {n}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {staffSummary.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    className="border-b last:border-0 align-top"
                                                >
                                                    <td className="py-2 pr-4 font-medium">
                                                        {row.registration_number}
                                                    </td>
                                                    {Array.from(
                                                        { length: maxMorningTrip },
                                                        (_, i) => i + 1,
                                                    ).map((n) => {
                                                        const preset = row.staff_presets.find(
                                                            (p) =>
                                                                p.type === 'morning' &&
                                                                p.trip_number === n,
                                                        );
                                                        const label = preset
                                                            ? `${preset.driver?.name ?? '—'} / ${
                                                                  preset.assistant?.name ?? '—'
                                                              }`
                                                            : '—';
                                                        return (
                                                            <td
                                                                key={`m-${row.id}-${n}`}
                                                                className="py-2 pr-4 whitespace-nowrap"
                                                            >
                                                                {label}
                                                            </td>
                                                        );
                                                    })}
                                                    {Array.from(
                                                        { length: maxEveningTrip },
                                                        (_, i) => i + 1,
                                                    ).map((n) => {
                                                        const preset = row.staff_presets.find(
                                                            (p) =>
                                                                p.type === 'evening' &&
                                                                p.trip_number === n,
                                                        );
                                                        const label = preset
                                                            ? `${preset.driver?.name ?? '—'} / ${
                                                                  preset.assistant?.name ?? '—'
                                                              }`
                                                            : '—';
                                                        return (
                                                            <td
                                                                key={`e-${row.id}-${n}`}
                                                                className="py-2 pr-4 whitespace-nowrap"
                                                            >
                                                                {label}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && setIsDialogOpen(false)}>
                <DialogContent aria-describedby="bus-dialog-description">
                    <DialogHeader>
                        <DialogTitle>{editingBus ? 'Edit Bus' : 'Add New Bus'}</DialogTitle>
                        <DialogDescription id="bus-dialog-description">
                            {editingBus
                                ? 'Update the bus registration, capacity, status, or notes.'
                                : 'Add a new bus to the fleet with registration number and capacity.'}
                        </DialogDescription>
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
                        {/* For this dialog we only ask for the registration number. */}
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
