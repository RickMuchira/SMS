import { useCallback, useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

type SchoolClass = {
    id: number;
    name: string;
    description?: string;
    students_count?: number;
    created_at: string;
    updated_at: string;
};

type PaginatedResponse = {
    data: SchoolClass[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Classes', href: '/admin/classes' },
];

export default function AdminClassesIndex() {
    const [list, setList] = useState<SchoolClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editing, setEditing] = useState<SchoolClass | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const fetchList = useCallback(async () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        const response = await fetch(`/api/classes?${params}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Failed to load classes');
        const payload = (await response.json()) as PaginatedResponse;
        return payload.data ?? [];
    }, [search]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchList()
            .then((data) => {
                if (!cancelled) setList(data);
            })
            .catch(() => {
                if (!cancelled) setError('Unable to load classes.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [fetchList]);

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ name, description }),
            });
            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message ?? 'Failed to create class');
            }
            const { class: created } = (await res.json()) as { class: SchoolClass };
            setList((prev) => [...prev, created]);
            setName('');
            setDescription('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setSubmitting(false);
        }
    }

    function openEdit(cls: SchoolClass) {
        setEditing(cls);
        setEditName(cls.name);
        setEditDescription(cls.description ?? '');
        setEditError(null);
    }

    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editing) return;
        setEditSubmitting(true);
        setEditError(null);
        try {
            const res = await fetch(`/api/classes/${editing.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ name: editName, description: editDescription }),
            });
            if (!res.ok) {
                const data = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(data?.message ?? 'Failed to update class');
            }
            const { class: updated } = (await res.json()) as { class: SchoolClass };
            setList((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setEditing(null);
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setEditSubmitting(false);
        }
    }

    async function handleDelete(cls: SchoolClass) {
        if (!window.confirm(`Delete class "${cls.name}"? Students in this class will no longer have a class assigned.`)) return;
        try {
            const res = await fetch(`/api/classes/${cls.id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
            });
            if (res.ok) setList((prev) => prev.filter((c) => c.id !== cls.id));
        } catch {
            setError('Failed to delete class.');
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Class management" />

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Create new class</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Classes are used to group students (e.g. Grade 1 A, Form 2 Blue).
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Class name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Grade 1 A"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (optional)</Label>
                                <Input
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Morning session"
                                />
                            </div>
                            <div className="md:col-span-2 flex items-center gap-4">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Create class'}
                                </Button>
                                {error && <p className="text-sm text-red-500">{error}</p>}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>All classes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search by name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="max-w-sm"
                            />
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => fetchList().then(setList)}
                            >
                                Search
                            </Button>
                        </div>
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : list.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No classes found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="py-2 pr-4">Name</th>
                                            <th className="py-2 pr-4">Description</th>
                                            <th className="py-2 pr-4">Students</th>
                                            <th className="py-2 pr-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map((cls) => (
                                            <tr key={cls.id} className="border-b last:border-0">
                                                <td className="py-2 pr-4 font-medium">{cls.name}</td>
                                                <td className="py-2 pr-4 text-muted-foreground">
                                                    {cls.description || '—'}
                                                </td>
                                                <td className="py-2 pr-4">{cls.students_count ?? 0}</td>
                                                <td className="py-2 pr-4 flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEdit(cls)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() => handleDelete(cls)}
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
                        <DialogTitle>Edit class</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Class name</Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Input
                                id="edit-description"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                            />
                        </div>
                        {editError && <p className="text-sm text-red-500">{editError}</p>}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditing(null)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editSubmitting}>
                                {editSubmitting ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
