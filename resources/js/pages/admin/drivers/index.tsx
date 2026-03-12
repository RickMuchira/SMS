import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/hooks/use-permissions';
import { getCsrfToken } from '@/lib/csrf';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type StaffDriverRow = {
    id: number;
    user_id: number;
    employee_id: string;
    user: { id: number; name: string; email: string };
    job_title: string | null;
    department: { id: number; name: string } | null;
    employment_status: string;
    is_driver: boolean;
    is_assistant: boolean;
};

type PaginatedResponse = {
    data: StaffDriverRow[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Staff Profiles', href: '/admin/staff/profiles' },
    { title: 'Drivers & Assistants', href: '/admin/drivers' },
];

export default function AdminDriversIndex() {
    const { hasPermission } = usePermissions();
    const canManage = hasPermission('manage drivers');

    const [staff, setStaff] = useState<StaffDriverRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const fetchStaff = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set('per_page', '100');
            if (search) params.set('search', search);
            if (statusFilter) params.set('employment_status', statusFilter);
            params.set('page', currentPage.toString());

            const res = await fetch(`/admin/api/drivers?${params}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!res.ok) throw new Error('Failed to load staff');
            const data = (await res.json()) as PaginatedResponse;
            setStaff(data.data ?? []);
            setTotalPages(data.meta?.last_page ?? 1);
            setTotal(data.meta?.total ?? 0);
        } catch {
            setError('Unable to load staff. Only accounts with a staff profile appear here.');
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, currentPage]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    async function updateDesignation(userId: number, isDriver: boolean, isAssistant: boolean) {
        if (!canManage) return;
        setUpdatingId(userId);
        try {
            const csrf = getCsrfToken();
            const res = await fetch(`/admin/api/drivers/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ is_driver: isDriver, is_assistant: isAssistant }),
            });
            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message ?? 'Failed to update');
            }
            setStaff((prev) =>
                prev.map((row) =>
                    row.user_id === userId
                        ? { ...row, is_driver: isDriver, is_assistant: isAssistant }
                        : row,
                ),
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to update designation');
        } finally {
            setUpdatingId(null);
        }
    }

    function handleDriverToggle(row: StaffDriverRow) {
        if (!canManage) return;
        updateDesignation(row.user_id, !row.is_driver, row.is_assistant);
    }

    function handleAssistantToggle(row: StaffDriverRow) {
        if (!canManage) return;
        updateDesignation(row.user_id, row.is_driver, !row.is_assistant);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Drivers & Assistants" />

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Drivers & Assistants</h1>
                    <p className="text-muted-foreground">
                        Choose which staff (from Staff Profiles) can act as drivers or assistants.
                        These lists are used when managing buses and assigning trips.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Staff designations</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Only staff with a profile at{' '}
                            <a
                                href="/admin/staff/profiles"
                                className="text-primary underline hover:no-underline"
                            >
                                Staff Profiles
                            </a>{' '}
                            appear here. Toggle Driver or Assistant to include them in bus and trip
                            dropdowns.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="search">Search</Label>
                                <Input
                                    id="search"
                                    placeholder="Name, employee ID, job title..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="max-w-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <select
                                    id="status"
                                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="">All</option>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="terminated">Terminated</option>
                                </select>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : staff.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No staff profiles found. Add staff at Staff Profiles first.
                            </p>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="py-2 pr-4 font-semibold">Name</th>
                                                <th className="py-2 pr-4 font-semibold">Email</th>
                                                <th className="py-2 pr-4 font-semibold">Job title</th>
                                                <th className="py-2 pr-4 font-semibold">Driver</th>
                                                <th className="py-2 pr-4 font-semibold">Assistant</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {staff.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    className="border-b last:border-0"
                                                >
                                                    <td className="py-3 pr-4 font-medium">
                                                        {row.user.name}
                                                    </td>
                                                    <td className="py-3 pr-4 text-muted-foreground">
                                                        {row.user.email}
                                                    </td>
                                                    <td className="py-3 pr-4">
                                                        {row.job_title ?? '—'}
                                                    </td>
                                                    <td className="py-3 pr-4">
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={row.is_driver}
                                                                disabled={!canManage || updatingId === row.user_id}
                                                                onChange={() => handleDriverToggle(row)}
                                                                className="h-4 w-4 rounded border-input"
                                                            />
                                                            {row.is_driver && (
                                                                <span className="text-xs text-green-600">
                                                                    Driver
                                                                </span>
                                                            )}
                                                        </label>
                                                    </td>
                                                    <td className="py-3 pr-4">
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={row.is_assistant}
                                                                disabled={!canManage || updatingId === row.user_id}
                                                                onChange={() => handleAssistantToggle(row)}
                                                                className="h-4 w-4 rounded border-input"
                                                            />
                                                            {row.is_assistant && (
                                                                <span className="text-xs text-blue-600">
                                                                    Assistant
                                                                </span>
                                                            )}
                                                        </label>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between border-t pt-4">
                                        <p className="text-sm text-muted-foreground">
                                            Page {currentPage} of {totalPages} ({total} total)
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={currentPage <= 1}
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={currentPage >= totalPages}
                                                onClick={() =>
                                                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                                                }
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
