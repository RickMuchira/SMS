import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
import { usePermissions } from '@/hooks/use-permissions';
import { getCsrfToken } from '@/lib/csrf';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, User } from '@/types';

type ManagedUser = User & {
    roles?: { name: string }[];
};

type SchoolClass = {
    id: number;
    name: string;
    grade_code?: string | null;
};

type Assignment = {
    id: number;
    user_id: number;
    school_class_id: number;
    role: string;
    subject_id?: number | null;
    user?: ManagedUser;
    school_class?: SchoolClass;
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
    const canManageAcademics = hasPermission('manage results') || hasPermission('manage academics');

    const [list, setList] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [assignmentsByTeacher, setAssignmentsByTeacher] = useState<Record<number, Assignment[]>>({});
    const [assigningTeacher, setAssigningTeacher] = useState<ManagedUser | null>(null);
    const [assignClassId, setAssignClassId] = useState('');
    const [assignRole, setAssignRole] = useState<'class_teacher' | 'full_teacher'>('class_teacher');
    const [assignSubmitting, setAssignSubmitting] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);

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
        if (!canManageAcademics) return;
        fetch('/admin/api/classes-for-assignment', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((r) => r.ok ? r.json() : [])
            .then((data) => setClasses(Array.isArray(data) ? data : []))
            .catch(() => {});
    }, [canManageAcademics]);

    const fetchAssignments = useCallback(async (teacherId: number) => {
        const res = await fetch(`/admin/api/teacher-class-assignments?teacher_id=${teacherId}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.data ?? [];
    }, []);

    useEffect(() => {
        if (!canManageAcademics) return;
        list.forEach((t) => {
            fetchAssignments(t.id).then((assignments) => {
                setAssignmentsByTeacher((prev) => ({ ...prev, [t.id]: assignments }));
            });
        });
    }, [canManageAcademics, list, fetchAssignments]);

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

    function openAssign(user: ManagedUser) {
        setAssigningTeacher(user);
        setAssignClassId('');
        setAssignRole('class_teacher');
        setAssignError(null);
    }

    async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!assigningTeacher || !assignClassId) return;
        setAssignSubmitting(true);
        setAssignError(null);
        try {
            const res = await fetch('/admin/api/teacher-class-assignments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(getCsrfToken() ? { 'X-CSRF-TOKEN': getCsrfToken()! } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    user_id: assigningTeacher.id,
                    school_class_id: Number(assignClassId),
                    role: assignRole,
                }),
            });
            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message ?? 'Failed to assign');
            }
            const assignment = (await res.json()) as Assignment;
            setAssignmentsByTeacher((prev) => ({
                ...prev,
                [assigningTeacher.id]: [...(prev[assigningTeacher.id] ?? []), assignment],
            }));
            setAssigningTeacher(null);
        } catch (err) {
            setAssignError(err instanceof Error ? err.message : 'Failed to assign');
        } finally {
            setAssignSubmitting(false);
        }
    }

    async function handleRemoveAssignment(teacherId: number, assignmentId: number) {
        try {
            const res = await fetch(`/admin/api/teacher-class-assignments/${assignmentId}`, {
                method: 'DELETE',
                credentials: 'same-origin',
            });
            if (res.ok) {
                setAssignmentsByTeacher((prev) => ({
                    ...prev,
                    [teacherId]: (prev[teacherId] ?? []).filter((a) => a.id !== assignmentId),
                }));
            }
        } catch {
            setError('Failed to remove assignment.');
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
                                            {canManageAcademics && <th className="py-2 pr-4">Class assignments</th>}
                                            {canManage && <th className="py-2 pr-4">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map((user) => (
                                            <tr key={user.id} className="border-b last:border-0">
                                                <td className="py-2 pr-4">{user.name}</td>
                                                <td className="py-2 pr-4">{user.email}</td>
                                                {canManageAcademics && (
                                                    <td className="py-2 pr-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(assignmentsByTeacher[user.id] ?? []).map((a) => (
                                                                <span
                                                                    key={a.id}
                                                                    className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
                                                                >
                                                                    {a.school_class?.name ?? 'Class'}
                                                                    ({a.role.replace('_', ' ')})
                                                                    <button
                                                                        type="button"
                                                                        className="hover:text-destructive"
                                                                        onClick={() => handleRemoveAssignment(user.id, a.id)}
                                                                        aria-label="Remove"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                </span>
                                                            ))}
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => openAssign(user)}
                                                                aria-label="Assign to class"
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                )}
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

            <Dialog open={!!assigningTeacher} onOpenChange={(open) => !open && setAssigningTeacher(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Assign {assigningTeacher?.name} to class
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAssign} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="assign-class">Class</Label>
                            <select
                                id="assign-class"
                                className="border-input h-9 w-full rounded-md border px-3 py-2 text-sm"
                                value={assignClassId}
                                onChange={(e) => setAssignClassId(e.target.value)}
                                required
                            >
                                <option value="">Select class</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="assign-role">Role</Label>
                            <select
                                id="assign-role"
                                className="border-input h-9 w-full rounded-md border px-3 py-2 text-sm"
                                value={assignRole}
                                onChange={(e) => setAssignRole(e.target.value as 'class_teacher' | 'full_teacher')}
                            >
                                <option value="class_teacher">Class teacher (all subjects)</option>
                                <option value="full_teacher">Full teacher (teaches all)</option>
                            </select>
                        </div>
                        {assignError && <p className="text-sm text-red-500">{assignError}</p>}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setAssigningTeacher(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={assignSubmitting}>
                                {assignSubmitting ? 'Assigning...' : 'Assign'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
