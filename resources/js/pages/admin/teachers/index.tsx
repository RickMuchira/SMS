import { useCallback, useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, User } from '@/types';
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
import { usePermissions } from '@/hooks/use-permissions';

type ManagedUser = User & {
    roles?: { name: string }[];
};

type PaginatedResponse = {
    data: ManagedUser[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Teachers', href: '/admin/teachers' },
];

export default function AdminTeachersIndex() {
    const { hasPermission } = usePermissions();
    const canManage = hasPermission('manage teachers');

    const [list, setList] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editing, setEditing] = useState<ManagedUser | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const fetchList = useCallback(async () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        const response = await fetch(`/api/teachers?${params}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Failed to load teachers');
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
                if (!cancelled) setError('Unable to load teachers.');
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
            const res = await fetch('/api/teachers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ name, email, password }),
            });
            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message ?? 'Failed to create teacher');
            }
            const { user } = (await res.json()) as { user: ManagedUser };
            setList((prev) => [...prev, user]);
            setName('');
            setEmail('');
            setPassword('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setSubmitting(false);
        }
    }

    function openEdit(user: ManagedUser) {
        setEditing(user);
        setEditName(user.name);
        setEditEmail(user.email);
        setEditPassword('');
        setEditError(null);
    }

    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editing) return;
        setEditSubmitting(true);
        setEditError(null);
        try {
            const body: { name: string; email: string; password?: string } = {
                name: editName,
                email: editEmail,
            };
            if (editPassword) body.password = editPassword;
            const res = await fetch(`/api/teachers/${editing.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(data?.message ?? 'Failed to update teacher');
            }
            const { user: updated } = (await res.json()) as { user: ManagedUser };
            setList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            setEditing(null);
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setEditSubmitting(false);
        }
    }

    async function handleDelete(user: ManagedUser) {
        if (!canManage || !window.confirm(`Delete teacher account "${user.name}"?`)) return;
        try {
            const res = await fetch(`/api/teachers/${user.id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
            });
            if (res.ok) setList((prev) => prev.filter((u) => u.id !== user.id));
        } catch {
            setError('Failed to delete teacher.');
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teacher management" />

            <div className="space-y-8">
                {canManage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Create teacher account</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-center gap-4">
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? 'Creating...' : 'Create teacher'}
                                    </Button>
                                    {error && <p className="text-sm text-red-500">{error}</p>}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Teachers</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Teacher accounts can sign in via the web or mobile app.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search by name or email..."
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
                            <p className="text-sm text-muted-foreground">No teachers found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="py-2 pr-4">Name</th>
                                            <th className="py-2 pr-4">Email</th>
                                            {canManage && <th className="py-2 pr-4">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map((user) => (
                                            <tr key={user.id} className="border-b last:border-0">
                                                <td className="py-2 pr-4">{user.name}</td>
                                                <td className="py-2 pr-4">{user.email}</td>
                                                {canManage && (
                                                    <td className="py-2 pr-4 flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEdit(user)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700"
                                                            onClick={() => handleDelete(user)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </td>
                                                )}
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
                        <DialogTitle>Edit teacher</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-password">New password (leave blank to keep)</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
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
