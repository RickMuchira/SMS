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
import { cn } from '@/lib/utils';

type Bus = {
    id: number;
    registration_number: string;
    capacity: number;
    status: 'active' | 'inactive' | 'maintenance';
    notes?: string | null;
    driver_id?: number | null;
    assistant_id?: number | null;
    driver?: { id: number; name: string } | null;
    assistant?: { id: number; name: string } | null;
};

type StaffPreset = {
    id?: number;
    type: 'morning' | 'evening';
    trip_number: number;
    driver_id: number | null;
    assistant_id: number | null;
};

type PageProps = {
    busId: number;
};

const breadcrumbs = (bus?: Bus): BreadcrumbItem[] => [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Transport', href: '/admin/transport/buses' },
    {
        title: bus ? `Bus ${bus.registration_number}` : 'Manage Bus',
        href: '#',
    },
];

export default function ManageBusPage({ busId }: PageProps) {
    const [bus, setBus] = useState<Bus | null>(null);
    const [loading, setLoading] = useState(true);
    const [savingDetails, setSavingDetails] = useState(false);
    const [savingPresets, setSavingPresets] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [registrationNumber, setRegistrationNumber] = useState('');
    const [capacity, setCapacity] = useState(30);
    const [status, setStatus] = useState<'active' | 'inactive' | 'maintenance'>('active');
    const [notes, setNotes] = useState('');
    const [driverId, setDriverId] = useState<number | ''>('');
    const [assistantId, setAssistantId] = useState<number | ''>('');

    const [driverOptions, setDriverOptions] = useState<StaffOption[]>([]);
    const [assistantOptions, setAssistantOptions] = useState<StaffOption[]>([]);
    const [morningPresets, setMorningPresets] = useState<StaffPreset[]>([]);
    const [eveningPresets, setEveningPresets] = useState<StaffPreset[]>([]);
    const [activePresetTab, setActivePresetTab] = useState<'morning' | 'evening'>('morning');

    useEffect(() => {
        Promise.all([
            fetch(`/admin/api/transport/buses/${busId}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            }).then((r) => r.json()),
            fetch(`/admin/api/transport/buses/${busId}/staff-presets`, {
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
            .then(([busData, presetsData, driversData, assistantsData]) => {
                const loadedBus = (busData.bus ?? null) as Bus | null;
                setBus(loadedBus);
                if (loadedBus) {
                    setRegistrationNumber(loadedBus.registration_number);
                    setCapacity(loadedBus.capacity);
                    setStatus(loadedBus.status);
                    setNotes(loadedBus.notes ?? '');
                    setDriverId(loadedBus.driver_id ?? '');
                    setAssistantId(loadedBus.assistant_id ?? '');
                }

                const list = (presetsData.data ?? []) as StaffPreset[];
                setMorningPresets(list.filter((p) => p.type === 'morning'));
                setEveningPresets(list.filter((p) => p.type === 'evening'));

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
            .catch(() => {
                setError('Unable to load bus details.');
            })
            .finally(() => setLoading(false));
    }, [busId]);

    async function handleSaveDetails(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!bus) return;

        setSavingDetails(true);
        setError(null);

        try {
            const csrf = getCsrfToken();
            const response = await fetch(`/admin/api/transport/buses/${bus.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    registration_number: registrationNumber,
                    capacity,
                    status,
                    notes: notes || null,
                    driver_id: driverId || null,
                    assistant_id: assistantId || null,
                }),
            });

            if (!response.ok) {
                const body = (await response.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message ?? 'Failed to save bus details');
            }

            const result = (await response.json()) as { bus: Bus };
            setBus(result.bus);
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'An unexpected error occurred while saving details.',
            );
        } finally {
            setSavingDetails(false);
        }
    }

    function addPreset(type: 'morning' | 'evening') {
        const list = type === 'morning' ? morningPresets : eveningPresets;
        const nextNumber = (list[list.length - 1]?.trip_number ?? 0) + 1;
        const updater = type === 'morning' ? setMorningPresets : setEveningPresets;

        updater([
            ...list,
            {
                type,
                trip_number: nextNumber,
                driver_id: null,
                assistant_id: null,
            },
        ]);
    }

    function updatePreset(
        type: 'morning' | 'evening',
        tripNumber: number,
        patch: Partial<StaffPreset>,
    ) {
        const list = type === 'morning' ? morningPresets : eveningPresets;
        const updater = type === 'morning' ? setMorningPresets : setEveningPresets;

        updater(
            list.map((row) =>
                row.trip_number === tripNumber ? { ...row, ...patch } : row,
            ),
        );
    }

    function removePreset(type: 'morning' | 'evening', tripNumber: number) {
        const list = type === 'morning' ? morningPresets : eveningPresets;
        const updater = type === 'morning' ? setMorningPresets : setEveningPresets;

        updater(list.filter((row) => row.trip_number !== tripNumber));
    }

    async function handleSavePresets() {
        if (!bus) return;
        setSavingPresets(true);
        setError(null);
        const csrf = getCsrfToken();
        const presets = [...morningPresets, ...eveningPresets]
            .sort((a, b) => {
                if (a.type === b.type) {
                    return a.trip_number - b.trip_number;
                }
                return a.type === 'morning' ? -1 : 1;
            })
            .map((p) => ({
                type: p.type,
                trip_number: p.trip_number,
                driver_id: p.driver_id,
                assistant_id: p.assistant_id,
            }));

        try {
            const response = await fetch(`/admin/api/transport/buses/${bus.id}/staff-presets`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ presets }),
            });

            if (!response.ok) {
                const body = (await response.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message ?? 'Failed to save trip staff presets');
            }
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'An unexpected error occurred while saving presets.',
            );
        } finally {
            setSavingPresets(false);
        }
    }

    if (loading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs()}>
                <Head title="Manage Bus" />
                <p className="p-4 text-sm text-muted-foreground">Loading bus…</p>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs(bus ?? undefined)}>
            <Head title={bus ? `Manage Bus - ${bus.registration_number}` : 'Manage Bus'} />

            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {bus ? `Manage Bus – ${bus.registration_number}` : 'Manage Bus'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Edit this bus and assign drivers and assistants to morning and evening trips.
                    </p>
                    {error && (
                        <p className="text-sm text-red-500 max-w-xl">
                            {error}
                        </p>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1.5fr)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bus details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveDetails} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="registration">Registration Number</Label>
                                    <Input
                                        id="registration"
                                        value={registrationNumber}
                                        onChange={(e) => setRegistrationNumber(e.target.value)}
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
                                                e.target.value as
                                                    | 'active'
                                                    | 'inactive'
                                                    | 'maintenance',
                                            )
                                        }
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <Button type="submit" disabled={savingDetails}>
                                        {savingDetails ? 'Saving…' : 'Save bus details'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Trip staff presets</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="inline-flex rounded-md border bg-muted p-1 text-xs">
                                <button
                                    type="button"
                                    className={cn(
                                        'px-3 py-1 rounded-sm',
                                        activePresetTab === 'morning' &&
                                            'bg-background font-semibold shadow-sm',
                                    )}
                                    onClick={() => setActivePresetTab('morning')}
                                >
                                    Morning
                                </button>
                                <button
                                    type="button"
                                    className={cn(
                                        'px-3 py-1 rounded-sm',
                                        activePresetTab === 'evening' &&
                                            'bg-background font-semibold shadow-sm',
                                    )}
                                    onClick={() => setActivePresetTab('evening')}
                                >
                                    Evening
                                </button>
                            </div>

                            {(
                                activePresetTab === 'morning'
                                    ? morningPresets
                                    : eveningPresets
                            )
                                .slice()
                                .sort((a, b) => a.trip_number - b.trip_number)
                                .map((row) => (
                                    <div
                                        key={`${row.type}-${row.trip_number}`}
                                        className="grid gap-3 rounded-md border px-3 py-2 text-xs md:grid-cols-[auto,1fr,1fr]"
                                    >
                                        <div className="flex items-center">
                                            <span className="font-semibold">
                                                {row.type === 'morning'
                                                    ? 'Morning'
                                                    : 'Evening'}{' '}
                                                Trip {row.trip_number}
                                            </span>
                                        </div>
                                        <SearchableStaffSelect
                                            staff={driverOptions}
                                            value={row.driver_id ?? ''}
                                            onChange={(id) =>
                                                updatePreset(row.type, row.trip_number, {
                                                    driver_id: (id as number | '') || null,
                                                })
                                            }
                                            label="Driver"
                                            emptyOption="No driver"
                                        />
                                        <div className="flex items-end gap-2">
                                            <SearchableStaffSelect
                                                staff={assistantOptions}
                                                value={row.assistant_id ?? ''}
                                                onChange={(id) =>
                                                    updatePreset(row.type, row.trip_number, {
                                                        assistant_id:
                                                            (id as number | '') || null,
                                                    })
                                                }
                                                label="Assistant"
                                                emptyOption="No assistant"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="mb-1"
                                                onClick={() =>
                                                    removePreset(row.type, row.trip_number)
                                                }
                                            >
                                                <span aria-hidden="true">&times;</span>
                                                <span className="sr-only">
                                                    Remove trip preset
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                            <div className="flex items-center justify-between gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addPreset(activePresetTab)}
                                >
                                    Add {activePresetTab === 'morning' ? 'morning' : 'evening'} trip
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSavePresets}
                                    disabled={savingPresets}
                                >
                                    {savingPresets ? 'Saving…' : 'Save trip staff'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

