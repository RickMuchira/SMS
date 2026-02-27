import { Head } from '@inertiajs/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCsrfToken } from '@/lib/csrf';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Activity = {
    id: number;
    name: string;
    price: number | null;
    is_active: boolean;
};

type Props = {
    activities: Activity[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Fees', href: '/admin/fees' },
    { title: 'Activities', href: '/admin/fees/activities' },
];

export default function FeeActivitiesIndex({ activities: initialActivities }: Props) {
    const [activities, setActivities] = useState(initialActivities);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editPrice, setEditPrice] = useState('');

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const csrf = getCsrfToken();
            const res = await fetch('/admin/api/fees/activities', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ name, price: parseFloat(price), is_active: true }),
            });
            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message ?? 'Failed to create activity.');
            }
            const created = (await res.json()) as Activity;
            setActivities((prev) => [...prev, created]);
            setName('');
            setPrice('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create activity.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleUpdate(id: number, newPrice: string) {
        setError(null);
        try {
            const csrf = getCsrfToken();
            const res = await fetch(`/admin/api/fees/activities/${id}`, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ price: parseFloat(newPrice) }),
            });
            if (!res.ok) throw new Error('Failed to update.');
            const updated = (await res.json()) as Activity;
            setActivities((prev) => prev.map((a) => (a.id === id ? updated : a)));
            setEditingId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update.');
        }
    }

    async function handleDelete(id: number) {
        if (!window.confirm('Delete this activity?')) return;
        setError(null);
        try {
            const csrf = getCsrfToken();
            const res = await fetch(`/admin/api/fees/activities/${id}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
            });
            if (!res.ok) throw new Error('Failed to delete.');
            setActivities((prev) => prev.filter((a) => a.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete.');
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Activities" />

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Add extracurricular activity</CardTitle>
                        <CardDescription>
                            Create activities to assign to students. Prices can be updated later.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="flex flex-col gap-4 md:flex-row md:items-end">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="name">Activity name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    placeholder="e.g. Skating, Chess, Football"
                                />
                            </div>
                            <div className="w-full space-y-2 md:w-40">
                                <Label htmlFor="price">Price</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Creating…' : 'Add activity'}
                            </Button>
                        </form>
                        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Activities list</CardTitle>
                        <CardDescription>
                            Manage extracurricular activities and their prices.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activities.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No activities yet. Create one above.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-2 font-medium">Name</th>
                                        <th className="pb-2 font-medium">Price</th>
                                        <th className="pb-2 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activities.map((activity) => (
                                        <tr key={activity.id} className="border-b">
                                            <td className="py-2">{activity.name}</td>
                                            <td className="py-2">
                                                {editingId === activity.id ? (
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={editPrice}
                                                        onChange={(e) => setEditPrice(e.target.value)}
                                                        className="w-32"
                                                    />
                                                ) : (
                                                    activity.price ?? 'N/A'
                                                )}
                                            </td>
                                            <td className="py-2 text-right">
                                                {editingId === activity.id ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleUpdate(activity.id, editPrice)
                                                            }
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditingId(null)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setEditingId(activity.id);
                                                                setEditPrice(String(activity.price ?? ''));
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDelete(activity.id)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
