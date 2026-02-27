import { Head } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { getCsrfToken } from '@/lib/csrf';
import type { BreadcrumbItem, User } from '@/types';

type ManagedUser = User & {
    roles?: { name: string }[];
};

type PaginatedUsers = {
    data: ManagedUser[];
};

type PermissionModule = {
    label: string;
    permissions: string[];
};

type AvailablePermissions = {
    modules: Record<string, PermissionModule>;
    userPermissions: string[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'User management', href: '/admin/users' },
];

export default function AdminUsersIndex() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<
        'all' | 'students' | 'non-students' | 'super-admin'
    >('all');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [editing, setEditing] = useState<ManagedUser | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [editPermissions, setEditPermissions] = useState<string[]>([]);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const [availablePermissions, setAvailablePermissions] =
        useState<AvailablePermissions | null>(null);
    const [permissionsLoading, setPermissionsLoading] = useState(true);

    // Fetch available permissions
    useEffect(() => {
        fetch('/admin/api/permissions', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((data: AvailablePermissions) => {
                setAvailablePermissions(data);
            })
            .catch(() => setError('Failed to load permissions'))
            .finally(() => setPermissionsLoading(false));
    }, []);

    const fetchUsers = useCallback(async () => {
        const response = await fetch('/admin/api/users?per_page=10000', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Failed to load users');
        const payload = (await response.json()) as PaginatedUsers;
        return payload.data ?? [];
    }, []);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchUsers()
            .then((data) => {
                if (!cancelled) setUsers(data);
            })
            .catch(() => {
                if (!cancelled) setError('Unable to load users.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [fetchUsers]);

    function getAccountType(user: ManagedUser): string {
        const roleNames = user.roles?.map((r) => r.name) ?? [];

        if (roleNames.includes('student')) {
            return 'Student';
        }

        if (roleNames.includes('teacher')) {
            return 'Teacher';
        }

        if (roleNames.includes('driver')) {
            return 'Driver';
        }

        if (roleNames.includes('staff')) {
            return 'Staff';
        }

        if (roleNames.includes('super-admin')) {
            return 'Super admin';
        }

        if (roleNames.length === 0) {
            return 'Unassigned';
        }

        return roleNames.join(', ');
    }

    const filteredUsers = users.filter((user) => {
        const term = search.trim().toLowerCase();
        const roleNames = user.roles?.map((r) => r.name) ?? [];
        const isStudent = roleNames.includes('student');
        const isSuperAdmin = roleNames.includes('super-admin');

        const matchesSearch =
            term.length === 0 ||
            user.name.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term);

        let matchesType = true;
        if (filterType === 'students') {
            matchesType = isStudent;
        } else if (filterType === 'non-students') {
            matchesType = !isStudent;
        } else if (filterType === 'super-admin') {
            matchesType = isSuperAdmin;
        }

        return matchesSearch && matchesType;
    });

    async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const csrf = getCsrfToken();
            const response = await fetch('/admin/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    permissions: selectedPermissions,
                }),
            });

            if (!response.ok) {
                const body = (await response.json().catch(() => null)) as
                    | { message?: string }
                    | null;
                throw new Error(body?.message ?? 'Failed to create user');
            }

            const created = (await response.json()) as { user: ManagedUser };
            setUsers((prev) => [...prev, created.user]);
            setName('');
            setEmail('');
            setPassword('');
            setSelectedPermissions([]);
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

    function togglePermission(permission: string) {
        setSelectedPermissions((prev) =>
            prev.includes(permission)
                ? prev.filter((p) => p !== permission)
                : [...prev, permission],
        );
    }

    function toggleModulePermissions(modulePerms: string[]) {
        const allSelected = modulePerms.every((p) =>
            selectedPermissions.includes(p),
        );

        if (allSelected) {
            setSelectedPermissions((prev) =>
                prev.filter((p) => !modulePerms.includes(p)),
            );
        } else {
            setSelectedPermissions((prev) => [
                ...new Set([...prev, ...modulePerms]),
            ]);
        }
    }

    function toggleEditPermission(permission: string) {
        setEditPermissions((prev) =>
            prev.includes(permission)
                ? prev.filter((p) => p !== permission)
                : [...prev, permission],
        );
    }

    function toggleEditModulePermissions(modulePerms: string[]) {
        const allSelected = modulePerms.every((p) =>
            editPermissions.includes(p),
        );

        if (allSelected) {
            setEditPermissions((prev) =>
                prev.filter((p) => !modulePerms.includes(p)),
            );
        } else {
            setEditPermissions((prev) => [
                ...new Set([...prev, ...modulePerms]),
            ]);
        }
    }

    async function openEdit(user: ManagedUser) {
        setEditing(user);
        setEditName(user.name);
        setEditEmail(user.email);
        setEditPassword('');
        setEditError(null);

        // Fetch user's current permissions
        try {
            const res = await fetch(`/admin/api/users/${user.id}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data = (await res.json()) as {
                    permissions: string[];
                };
                setEditPermissions(data.permissions || []);
            }
        } catch {
            setEditPermissions([]);
        }
    }

    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editing) return;
        setEditSubmitting(true);
        setEditError(null);
        try {
            const csrf = getCsrfToken();
            const body: {
                name: string;
                email: string;
                password?: string;
                permissions: string[];
            } = {
                name: editName,
                email: editEmail,
                permissions: editPermissions,
            };
            if (editPassword) body.password = editPassword;
            const res = await fetch(`/admin/api/users/${editing.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = (await res.json().catch(() => null)) as
                    | { message?: string }
                    | null;
                throw new Error(data?.message ?? 'Failed to update user');
            }
            const { user: updated } = (await res.json()) as {
                user: ManagedUser;
            };
            setUsers((prev) =>
                prev.map((u) => (u.id === updated.id ? updated : u)),
            );
            setEditing(null);
        } catch (err) {
            setEditError(
                err instanceof Error
                    ? err.message
                    : 'An unexpected error occurred.',
            );
        } finally {
            setEditSubmitting(false);
        }
    }

    async function handleDelete(user: ManagedUser) {
        if (
            !window.confirm(
                `Delete account "${user.name}"? This cannot be undone.`,
            )
        )
            return;
        try {
            const csrf = getCsrfToken();
            const res = await fetch(`/admin/api/users/${user.id}`, {
                method: 'DELETE',
                headers: csrf ? { 'X-CSRF-TOKEN': csrf } : undefined,
                credentials: 'same-origin',
            });
            if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== user.id));
        } catch {
            setError('Failed to delete user.');
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User management" />

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Create new admin account</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Create custom admins by selecting which permissions they
                            should have. You can only assign permissions that you have
                            yourself.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateUser} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(event) =>
                                            setName(event.target.value)
                                        }
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(event) =>
                                            setEmail(event.target.value)
                                        }
                                        required
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={
                                                showCreatePassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            value={password}
                                            onChange={(event) =>
                                                setPassword(event.target.value)
                                            }
                                            required
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowCreatePassword(
                                                    (prev) => !prev,
                                                )
                                            }
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            aria-label={
                                                showCreatePassword
                                                    ? 'Hide password'
                                                    : 'Show password'
                                            }
                                        >
                                            {showCreatePassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Permissions</Label>
                                    <span className="text-sm text-muted-foreground">
                                        {selectedPermissions.length} selected
                                    </span>
                                </div>

                                {permissionsLoading ? (
                                    <p className="text-sm text-muted-foreground">
                                        Loading permissions...
                                    </p>
                                ) : availablePermissions ? (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {Object.entries(
                                            availablePermissions.modules,
                                        ).map(([key, module]) => (
                                            <Card key={key} className="p-4">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-medium">
                                                            {module.label}
                                                        </h4>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleModulePermissions(
                                                                    module.permissions,
                                                                )
                                                            }
                                                            className="text-xs text-primary hover:underline"
                                                        >
                                                            {module.permissions.every(
                                                                (p) =>
                                                                    selectedPermissions.includes(
                                                                        p,
                                                                    ),
                                                            )
                                                                ? 'Deselect All'
                                                                : 'Select All'}
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {module.permissions.map(
                                                            (permission) => (
                                                                <div
                                                                    key={
                                                                        permission
                                                                    }
                                                                    className="flex items-center space-x-2"
                                                                >
                                                                    <Checkbox
                                                                        id={`perm-${permission}`}
                                                                        checked={selectedPermissions.includes(
                                                                            permission,
                                                                        )}
                                                                        onCheckedChange={() =>
                                                                            togglePermission(
                                                                                permission,
                                                                            )
                                                                        }
                                                                    />
                                                                    <Label
                                                                        htmlFor={`perm-${permission}`}
                                                                        className="text-sm font-normal cursor-pointer"
                                                                    >
                                                                        {
                                                                            permission
                                                                        }
                                                                    </Label>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-red-500">
                                        Failed to load permissions.
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Creating user...' : 'Create admin'}
                                </Button>
                                {error && (
                                    <p className="text-sm text-red-500">{error}</p>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>All user accounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-6 md:flex-row">
                            <aside className="w-full space-y-4 rounded-md border bg-muted/40 p-4 md:w-64">
                                <div className="space-y-2">
                                    <Label htmlFor="user-search" className="text-sm">
                                        Search accounts
                                    </Label>
                                    <Input
                                        id="user-search"
                                        placeholder="Name or email"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Filter by account type
                                    </p>
                                    <div className="grid gap-2">
                                        <Button
                                            type="button"
                                            variant={
                                                filterType === 'all'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            className="justify-start"
                                            onClick={() => setFilterType('all')}
                                        >
                                            All accounts
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                filterType === 'students'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            className="justify-start"
                                            onClick={() => setFilterType('students')}
                                        >
                                            Students
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                filterType === 'non-students'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            className="justify-start"
                                            onClick={() =>
                                                setFilterType('non-students')
                                            }
                                        >
                                            Admins & staff
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={
                                                filterType === 'super-admin'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            className="justify-start"
                                            onClick={() =>
                                                setFilterType('super-admin')
                                            }
                                        >
                                            Super admins
                                        </Button>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    As <span className="font-semibold">super admin</span>{' '}
                                    you can edit any account here. The primary
                                    `super@gmail.com` account itself is still
                                    protected from changes by others.
                                </p>
                            </aside>

                            <div className="flex-1 space-y-4">
                                {loading ? (
                                    <p className="text-sm text-muted-foreground">
                                        Loading users...
                                    </p>
                                ) : filteredUsers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No users match your current filters.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b text-left">
                                                    <th className="py-2 pr-4">
                                                        Name
                                                    </th>
                                                    <th className="py-2 pr-4">
                                                        Email
                                                    </th>
                                                    <th className="py-2 pr-4">
                                                        Account type
                                                    </th>
                                                    <th className="py-2 pr-4">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.map((user) => (
                                                    <tr
                                                        key={user.id}
                                                        className="border-b last:border-0"
                                                    >
                                                        <td className="py-2 pr-4">
                                                            {user.name}
                                                        </td>
                                                        <td className="py-2 pr-4">
                                                            {user.email}
                                                        </td>
                                                        <td className="py-2 pr-4">
                                                            {getAccountType(user)}
                                                        </td>
                                                        <td className="flex gap-2 py-2 pr-4">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    openEdit(
                                                                        user,
                                                                    )
                                                                }
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        user,
                                                                    )
                                                                }
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
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit user</DialogTitle>
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
                            <Label htmlFor="edit-password">
                                New password (leave blank to keep)
                            </Label>
                            <div className="relative">
                                <Input
                                    id="edit-password"
                                    type={showEditPassword ? 'text' : 'password'}
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowEditPassword((prev) => !prev)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label={
                                        showEditPassword
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                >
                                    {showEditPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Permissions</Label>
                                <span className="text-sm text-muted-foreground">
                                    {editPermissions.length} selected
                                </span>
                            </div>

                            {availablePermissions && (
                                <div className="grid gap-3 md:grid-cols-2">
                                    {Object.entries(availablePermissions.modules).map(
                                        ([key, module]) => (
                                            <Card key={key} className="p-3">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-medium">
                                                            {module.label}
                                                        </h4>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                toggleEditModulePermissions(
                                                                    module.permissions,
                                                                )
                                                            }
                                                            className="text-xs text-primary hover:underline"
                                                        >
                                                            {module.permissions.every((p) =>
                                                                editPermissions.includes(p),
                                                            )
                                                                ? 'Deselect All'
                                                                : 'Select All'}
                                                        </button>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {module.permissions.map(
                                                            (permission) => (
                                                                <div
                                                                    key={permission}
                                                                    className="flex items-center space-x-2"
                                                                >
                                                                    <Checkbox
                                                                        id={`edit-perm-${permission}`}
                                                                        checked={editPermissions.includes(
                                                                            permission,
                                                                        )}
                                                                        onCheckedChange={() =>
                                                                            toggleEditPermission(
                                                                                permission,
                                                                            )
                                                                        }
                                                                    />
                                                                    <Label
                                                                        htmlFor={`edit-perm-${permission}`}
                                                                        className="text-xs font-normal cursor-pointer"
                                                                    >
                                                                        {permission}
                                                                    </Label>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        ),
                                    )}
                                </div>
                            )}
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
                                {editSubmitting ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
