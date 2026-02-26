import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { getCsrfToken } from '@/lib/csrf';

type ManagedUser = User & {
    roles?: { name: string }[];
};

type PaginatedResponse = {
    data: ManagedUser[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Staff', href: '/admin/staff' },
];

export default function AdminStaffIndex() {
    const [staff, setStaff] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'staff' | 'teacher'>('staff');
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [editUser, setEditUser] = useState<ManagedUser | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editRole, setEditRole] = useState<'staff' | 'teacher'>('staff');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const [deleteUser, setDeleteUser] = useState<ManagedUser | null>(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function fetchStaff() {
            try {
                const [staffRes, teacherRes] = await Promise.all([
                    fetch('/admin/api/users?role=staff', {
                        headers: { Accept: 'application/json' },
                        credentials: 'same-origin',
                    }),
                    fetch('/admin/api/users?role=teacher', {
                        headers: { Accept: 'application/json' },
                        credentials: 'same-origin',
                    }),
                ]);

                if (!staffRes.ok || !teacherRes.ok) throw new Error('Failed to load staff');

                const staffPayload = (await staffRes.json()) as PaginatedResponse;
                const teacherPayload = (await teacherRes.json()) as PaginatedResponse;

                const staffData = staffPayload.data ?? [];
                const teacherData = teacherPayload.data ?? [];
                const merged = [...staffData];
                const seen = new Set(staffData.map((u) => u.id));
                for (const u of teacherData) {
                    if (!seen.has(u.id)) {
                        merged.push(u);
                        seen.add(u.id);
                    }
                }
                merged.sort((a, b) => a.name.localeCompare(b.name));

                if (!cancelled) setStaff(merged);
            } catch (e) {
                if (!cancelled) setError('Unable to load staff. Please try again.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void fetchStaff();
        return () => { cancelled = true; };
    }, []);

    function openEditDialog(user: ManagedUser) {
        setEditUser(user);
        setEditName(user.name);
        setEditEmail(user.email);
        setEditPassword('');
        const primaryRole = user.roles?.find((r) =>
            ['staff', 'teacher'].includes(r.name),
        )?.name as 'staff' | 'teacher' | undefined;
        setEditRole(primaryRole ?? 'staff');
        setEditError(null);
    }

    function closeEditDialog() {
        setEditUser(null);
        setEditName('');
        setEditEmail('');
        setEditPassword('');
        setEditRole('staff');
        setEditError(null);
    }

    async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editUser) return;
        setEditSubmitting(true);
        setEditError(null);

        try {
            const body: { name: string; email: string; role: string; password?: string } = {
                name: editName,
                email: editEmail,
                role: editRole,
            };
            if (editPassword) body.password = editPassword;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            };
            const token = getCsrfToken();
            if (token) headers['X-XSRF-TOKEN'] = token;

            const response = await fetch(`/admin/api/users/${editUser.id}`, {
                method: 'PUT',
                headers,
                credentials: 'same-origin',
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const res = (await response.json().catch(() => null)) as { message?: string } | null;
                throw new Error(res?.message ?? 'Failed to update staff');
            }

            const { user } = (await response.json()) as { user: ManagedUser };
            setStaff((prev) => prev.map((u) => (u.id === user.id ? user : u)));
            closeEditDialog();
        } catch (e) {
            setEditError(e instanceof Error ? e.message : 'An unexpected error occurred.');
        } finally {
            setEditSubmitting(false);
        }
    }

    function openDeleteDialog(user: ManagedUser) {
        setDeleteUser(user);
    }

    async function handleDeleteConfirm() {
        if (!deleteUser) return;
        setDeleteSubmitting(true);

        try {
            const headers: Record<string, string> = { Accept: 'application/json' };
            const token = getCsrfToken();
            if (token) headers['X-XSRF-TOKEN'] = token;

            const response = await fetch(`/admin/api/users/${deleteUser.id}`, {
                method: 'DELETE',
                headers,
                credentials: 'same-origin',
            });

            if (!response.ok) throw new Error('Failed to delete staff');

            setStaff((prev) => prev.filter((u) => u.id !== deleteUser.id));
            setDeleteUser(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete staff.');
        } finally {
            setDeleteSubmitting(false);
        }
    }

    async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            };
            const token = getCsrfToken();
            if (token) headers['X-XSRF-TOKEN'] = token;

            const response = await fetch('/admin/api/users', {
                method: 'POST',
                headers,
                credentials: 'same-origin',
                body: JSON.stringify({ name, email, password, role }),
            });

            if (!response.ok) {
                const res = (await response.json().catch(() => null)) as { message?: string } | null;
                throw new Error(res?.message ?? 'Failed to create staff');
            }

            const { user } = (await response.json()) as { user: ManagedUser };
            setStaff((prev) => [...prev, user]);
            setName('');
            setEmail('');
            setPassword('');
            setRole('staff');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
        } finally {
            setSubmitting(false);
        }
    }

    const roleSelect = (
        <select
            id="role"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            value={role}
            onChange={(e) => setRole(e.target.value as 'staff' | 'teacher')}
        >
            <option value="staff">Staff</option>
            <option value="teacher">Teacher</option>
        </select>
    );

    const editRoleSelect = (
        <select
            id="edit-role"
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as 'staff' | 'teacher')}
        >
            <option value="staff">Staff</option>
            <option value="teacher">Teacher</option>
        </select>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Staff" />

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Create new staff or teacher</CardTitle>
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
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                {roleSelect}
                            </div>
                            <div className="md:col-span-2 flex items-center gap-4">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Creating...' : 'Create'}
                                </Button>
                                {error && <p className="text-sm text-red-500">{error}</p>}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Existing staff and teachers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading staff...</p>
                        ) : staff.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No staff found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="py-2 pr-4">Name</th>
                                            <th className="py-2 pr-4">Email</th>
                                            <th className="py-2 pr-4">Role</th>
                                            <th className="py-2 pr-4 w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staff.map((user) => (
                                            <tr key={user.id} className="border-b last:border-0">
                                                <td className="py-2 pr-4">{user.name}</td>
                                                <td className="py-2 pr-4">{user.email}</td>
                                                <td className="py-2 pr-4">
                                                    {user.roles
                                                        ?.map((r) => r.name)
                                                        .filter((n) =>
                                                            ['staff', 'teacher'].includes(n),
                                                        )
                                                        .join(', ') || '—'}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditDialog(user)}
                                                        >
                                                            <Pencil className="size-4" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => openDeleteDialog(user)}
                                                        >
                                                            <Trash2 className="size-4" />
                                                            Delete
                                                        </Button>
                                                    </div>
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

            <Dialog open={!!editUser} onOpenChange={(open) => !open && closeEditDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit staff</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
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
                            <Label htmlFor="edit-role">Role</Label>
                            {editRoleSelect}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-password">New password (optional)</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                placeholder="Leave blank to keep current"
                            />
                        </div>
                        {editError && <p className="text-sm text-red-500">{editError}</p>}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeEditDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editSubmitting}>
                                {editSubmitting ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete staff</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete {deleteUser?.name}? This action cannot be
                        undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteUser(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={deleteSubmitting}
                        >
                            {deleteSubmitting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
