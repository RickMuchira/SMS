import { useCallback, useEffect, useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
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

type SchoolClass = {
    id: number;
    name: string;
};

type ManagedUser = User & {
    roles?: { name: string }[];
    school_class?: SchoolClass;
};

type PaginatedResponse = {
    data: ManagedUser[];
};

const GUARDIAN_RELATIONSHIPS = ['Father', 'Mother', 'Guardian', 'Other'];

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Students', href: '/admin/students' },
];

// Simple email generator (matches backend logic)
function generateEmailFromName(name: string): string {
    if (!name.trim()) return '';
    const normalized = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '.');
    return `${normalized}@student.local`;
}

export default function AdminStudentsIndex() {
    const { hasPermission } = usePermissions();
    const canManage = hasPermission('manage students');

    const [list, setList] = useState<ManagedUser[]>([]);
    const [classes, setClasses] = useState<SchoolClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Create form state
    const [name, setName] = useState('');
    const [classId, setClassId] = useState('');
    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [guardianRelationship, setGuardianRelationship] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-generate email from name
    const generatedEmail = useMemo(() => generateEmailFromName(name), [name]);

    // Edit form state
    const [editing, setEditing] = useState<ManagedUser | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editClassId, setEditClassId] = useState('');
    const [editGuardianName, setEditGuardianName] = useState('');
    const [editGuardianPhone, setEditGuardianPhone] = useState('');
    const [editGuardianRelationship, setEditGuardianRelationship] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    // CSV import state
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{
        created: number;
        updated: number;
        errors: string[];
    } | null>(null);

    // Fetch classes
    useEffect(() => {
        fetch('/api/classes', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((data: PaginatedResponse & { data: SchoolClass[] }) => {
                setClasses(data.data ?? []);
            })
            .catch(() => {});
    }, []);

    const fetchList = useCallback(async () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        const response = await fetch(`/api/students?${params}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Failed to load students');
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
                if (!cancelled) setError('Unable to load students.');
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
            const body: Record<string, unknown> = {
                name,
            };
            if (classId) body.class_id = parseInt(classId);
            if (guardianName) body.guardian_name = guardianName;
            if (guardianPhone) body.guardian_phone = guardianPhone;
            if (guardianRelationship) body.guardian_relationship = guardianRelationship;

            const res = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const errBody = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(errBody?.message ?? 'Failed to create student');
            }
            const { user } = (await res.json()) as { user: ManagedUser };
            setList((prev) => [...prev, user]);
            setName('');
            setClassId('');
            setGuardianName('');
            setGuardianPhone('');
            setGuardianRelationship('');
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
        setEditClassId(user.class_id?.toString() ?? '');
        setEditGuardianName(user.guardian_name ?? '');
        setEditGuardianPhone(user.guardian_phone ?? '');
        setEditGuardianRelationship(user.guardian_relationship ?? '');
        setEditError(null);
    }

    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editing) return;
        setEditSubmitting(true);
        setEditError(null);
        try {
            const body: Record<string, unknown> = {
                name: editName,
                email: editEmail,
            };
            if (editPassword) body.password = editPassword;
            if (editClassId) body.class_id = parseInt(editClassId);
            body.guardian_name = editGuardianName || null;
            body.guardian_phone = editGuardianPhone || null;
            body.guardian_relationship = editGuardianRelationship || null;

            const res = await fetch(`/api/students/${editing.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(data?.message ?? 'Failed to update student');
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
        if (!canManage || !window.confirm(`Delete student "${user.name}"? This will remove their account.`)) return;
        try {
            const res = await fetch(`/api/students/${user.id}`, {
                method: 'DELETE',
                credentials: 'same-origin',
            });
            if (res.ok) setList((prev) => prev.filter((u) => u.id !== user.id));
        } catch {
            setError('Failed to delete student.');
        }
    }

    async function handleImport(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setImporting(true);
        setImportResult(null);
        setError(null);

        try {
            const res = await fetch('/api/students/import', {
                method: 'POST',
                credentials: 'same-origin',
                body: formData,
            });
            if (!res.ok) {
                const errBody = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(errBody?.message ?? 'Failed to import CSV');
            }
            const result = (await res.json()) as {
                created: number;
                updated: number;
                errors: string[];
            };
            setImportResult(result);
            // Refresh list
            fetchList().then(setList);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setImporting(false);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Student management" />

            <div className="space-y-8">
                {canManage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Create student account</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Email will be auto-generated from name. Password defaults to guardian phone if provided.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Student full name *</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Mary Wanjiru Muchira"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="class">Class</Label>
                                    <select
                                        id="class"
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={classId}
                                        onChange={(e) => setClassId(e.target.value)}
                                    >
                                        <option value="">No class</option>
                                        {classes.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="guardian-name">Guardian name</Label>
                                    <Input
                                        id="guardian-name"
                                        value={guardianName}
                                        onChange={(e) => setGuardianName(e.target.value)}
                                        placeholder="e.g. John Muchira"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="guardian-phone">Guardian phone (login identifier) *</Label>
                                    <div className="relative">
                                        <Input
                                            id="guardian-phone"
                                            type={showPassword ? 'text' : 'password'}
                                            value={guardianPhone}
                                            onChange={(e) => setGuardianPhone(e.target.value)}
                                            placeholder="e.g. super@gmail.com"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            title={showPassword ? 'Hide' : 'Show'}
                                        >
                                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        This will be used as the password. Parents log in with this.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="guardian-relationship">Guardian relationship</Label>
                                    <select
                                        id="guardian-relationship"
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={guardianRelationship}
                                        onChange={(e) => setGuardianRelationship(e.target.value)}
                                    >
                                        <option value="">Select relationship</option>
                                        {GUARDIAN_RELATIONSHIPS.map((rel) => (
                                            <option key={rel} value={rel}>
                                                {rel}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="generated-email">Email (auto-generated)</Label>
                                    <Input
                                        id="generated-email"
                                        value={generatedEmail}
                                        readOnly
                                        disabled
                                        className="bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Automatically generated from student name
                                    </p>
                                </div>
                                <div className="md:col-span-2 flex items-center gap-4">
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? 'Creating...' : 'Create student'}
                                    </Button>
                                    {error && <p className="text-sm text-red-500">{error}</p>}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {canManage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Import students from CSV</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Upload a CSV with columns: full_name, class_name, guardian_name, guardian_phone, guardian_relationship
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleImport} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="csv-file">CSV file</Label>
                                    <Input
                                        id="csv-file"
                                        name="file"
                                        type="file"
                                        accept=".csv"
                                        required
                                    />
                                </div>
                                <Button type="submit" disabled={importing}>
                                    {importing ? 'Importing...' : 'Upload & import'}
                                </Button>
                            </form>
                            {importResult && (
                                <div className="mt-4 p-4 border rounded-md space-y-2">
                                    <p className="font-medium">Import completed</p>
                                    <p className="text-sm text-green-600">{importResult.created} created, {importResult.updated} updated</p>
                                    {importResult.errors.length > 0 && (
                                        <div className="text-sm text-red-600">
                                            <p className="font-medium">{importResult.errors.length} errors:</p>
                                            <ul className="list-disc list-inside max-h-40 overflow-y-auto">
                                                {importResult.errors.map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Students</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Parents can log in using their phone number.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search by name, email or phone..."
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
                            <p className="text-sm text-muted-foreground">No students found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="py-2 pr-4">Name</th>
                                            <th className="py-2 pr-4">Email</th>
                                            <th className="py-2 pr-4">Class</th>
                                            <th className="py-2 pr-4">Guardian</th>
                                            {canManage && <th className="py-2 pr-4">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {list.map((user) => (
                                            <tr key={user.id} className="border-b last:border-0">
                                                <td className="py-2 pr-4">{user.name}</td>
                                                <td className="py-2 pr-4 text-sm text-muted-foreground">{user.email}</td>
                                                <td className="py-2 pr-4">{user.school_class?.name ?? '—'}</td>
                                                <td className="py-2 pr-4 text-sm">
                                                    {user.guardian_name && user.guardian_phone
                                                        ? `${user.guardian_name} (${user.guardian_phone})`
                                                        : user.guardian_phone || '—'}
                                                </td>
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit student</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Student name</Label>
                                <Input
                                    id="edit-name"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-class">Class</Label>
                                <select
                                    id="edit-class"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={editClassId}
                                    onChange={(e) => setEditClassId(e.target.value)}
                                >
                                    <option value="">No class</option>
                                    {classes.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-guardian-name">Guardian name</Label>
                                <Input
                                    id="edit-guardian-name"
                                    value={editGuardianName}
                                    onChange={(e) => setEditGuardianName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-guardian-phone">Guardian phone</Label>
                                <Input
                                    id="edit-guardian-phone"
                                    value={editGuardianPhone}
                                    onChange={(e) => setEditGuardianPhone(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-guardian-relationship">Relationship</Label>
                                <select
                                    id="edit-guardian-relationship"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={editGuardianRelationship}
                                    onChange={(e) => setEditGuardianRelationship(e.target.value)}
                                >
                                    <option value="">Select relationship</option>
                                    {GUARDIAN_RELATIONSHIPS.map((rel) => (
                                        <option key={rel} value={rel}>
                                            {rel}
                                        </option>
                                    ))}
                                </select>
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
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="edit-password">New password (leave blank to keep)</Label>
                                <Input
                                    id="edit-password"
                                    type="password"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                />
                            </div>
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
