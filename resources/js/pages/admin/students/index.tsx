import { Head } from '@inertiajs/react';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { usePermissions } from '@/hooks/use-permissions';
import { getCsrfToken } from '@/lib/csrf';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, User } from '@/types';

type SchoolClass = {
    id: number;
    name: string;
};

type ExtraGuardian = {
    name: string;
    phone: string;
    relationship: string;
};

type ManagedUser = User & {
    roles?: { name: string }[];
    school_class?: SchoolClass;
    extra_guardians?: ExtraGuardian[];
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
    const [extraGuardians, setExtraGuardians] = useState<ExtraGuardian[]>([]);

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
    const [editExtraGuardians, setEditExtraGuardians] = useState<ExtraGuardian[]>([]);

    // CSV import state
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<{
        created: number;
        updated: number;
        errors: string[];
    } | null>(null);
    
    // Full student list state (for bottom section)
    const [allStudents, setAllStudents] = useState<ManagedUser[]>([]);
    const [loadingAll, setLoadingAll] = useState(false);

    // Duplicate detection state
    const [duplicateGroups, setDuplicateGroups] = useState<ManagedUser[][]>([]);
    const [loadingDuplicates, setLoadingDuplicates] = useState(false);
    const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<Set<number>>(new Set());
    const [deletingDuplicates, setDeletingDuplicates] = useState(false);

    // Fetch classes (uses admin API so student-admins with "manage classes" can access)
    useEffect(() => {
        fetch('/admin/api/classes', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error('Failed to load classes');
                }

                return res.json();
            })
            .then((data: { data: SchoolClass[] }) => {
                setClasses(data.data ?? []);
            })
            .catch(() => {
                setClasses([]);
            });
    }, []);

    const fetchList = useCallback(async () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        const response = await fetch(`/admin/api/students?${params}`, {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Failed to load students');
        const payload = (await response.json()) as PaginatedResponse;
        return payload.data ?? [];
    }, [search]);

    const fetchAllStudents = useCallback(async () => {
        const response = await fetch('/admin/api/students', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Failed to load students');
        const payload = (await response.json()) as PaginatedResponse;
        return payload.data ?? [];
    }, []);

    const fetchDuplicates = useCallback(async () => {
        const response = await fetch('/admin/api/students/duplicates', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (!response.ok) throw new Error('Failed to load duplicates');
        const payload = (await response.json()) as { data: ManagedUser[][] };
        return payload.data ?? [];
    }, []);

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

    // Load all students initially for the bottom section
    useEffect(() => {
        let cancelled = false;
        setLoadingAll(true);
        fetchAllStudents()
            .then((data) => {
                if (!cancelled) setAllStudents(data);
            })
            .catch(() => {
                if (!cancelled) console.error('Unable to load all students.');
            })
            .finally(() => {
                if (!cancelled) setLoadingAll(false);
            });
        return () => { cancelled = true; };
    }, [fetchAllStudents]);

    // Load duplicate groups
    useEffect(() => {
        let cancelled = false;
        setLoadingDuplicates(true);
        fetchDuplicates()
            .then((data) => {
                if (!cancelled) {
                    setDuplicateGroups(data);
                    setSelectedDuplicateIds(new Set());
                }
            })
            .catch(() => {
                if (!cancelled) setDuplicateGroups([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingDuplicates(false);
            });
        return () => {
            cancelled = true;
        };
    }, [fetchDuplicates]);

    // Combine search results and all students for display
    const displayedStudents = useMemo(() => {
        if (search && list.length > 0) {
            // Show search results first, then remaining students
            const searchIds = new Set(list.map(s => s.id));
            const remaining = allStudents.filter(s => !searchIds.has(s.id));
            return [...list, ...remaining];
        }
        return allStudents;
    }, [search, list, allStudents]);

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const csrf = getCsrfToken();

            const body: Record<string, unknown> = {
                name,
            };
            if (classId) body.class_id = parseInt(classId);
            if (guardianName) body.guardian_name = guardianName;
            if (guardianPhone) body.guardian_phone = guardianPhone;
            if (guardianRelationship) body.guardian_relationship = guardianRelationship;

            const cleanedExtra = extraGuardians
                .map((g) => ({
                    name: g.name.trim(),
                    phone: g.phone.trim(),
                    relationship: g.relationship,
                }))
                .filter((g) => g.name || g.phone || g.relationship);
            if (cleanedExtra.length > 0) {
                body.extra_guardians = cleanedExtra;
            }

            const res = await fetch('/admin/api/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
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
            setExtraGuardians([]);
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
        setEditExtraGuardians(user.extra_guardians ?? []);
        setEditError(null);
    }

    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editing) return;
        setEditSubmitting(true);
        setEditError(null);
        try {
            const csrf = getCsrfToken();

            const body: Record<string, unknown> = {
                name: editName,
                email: editEmail,
            };
            if (editPassword) body.password = editPassword;
            if (editClassId) body.class_id = parseInt(editClassId);
            body.guardian_name = editGuardianName || null;
            body.guardian_phone = editGuardianPhone || null;
            body.guardian_relationship = editGuardianRelationship || null;

            const cleanedExtra = editExtraGuardians
                .map((g) => ({
                    name: g.name.trim(),
                    phone: g.phone.trim(),
                    relationship: g.relationship,
                }))
                .filter((g) => g.name || g.phone || g.relationship);
            if (cleanedExtra.length > 0) {
                body.extra_guardians = cleanedExtra;
            }

            const res = await fetch(`/admin/api/students/${editing.id}`, {
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
            const csrf = getCsrfToken();
            const res = await fetch(`/admin/api/students/${user.id}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
            });
            if (res.ok) {
                setList((prev) => prev.filter((u) => u.id !== user.id));
                setAllStudents((prev) => prev.filter((u) => u.id !== user.id));
                fetchDuplicates().then(setDuplicateGroups);
            }
        } catch {
            setError('Failed to delete student.');
        }
    }

    function toggleDuplicateSelection(id: number) {
        setSelectedDuplicateIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function selectAllDuplicates(keepFirst: boolean) {
        const ids = new Set<number>();
        duplicateGroups.forEach((group) => {
            const sorted = [...group].sort((a, b) => (a.email < b.email ? -1 : 1));
            (keepFirst ? sorted.slice(1) : sorted).forEach((u) => ids.add(u.id));
        });
        setSelectedDuplicateIds(ids);
    }

    async function handleBulkDeleteDuplicates() {
        if (!canManage || selectedDuplicateIds.size === 0) return;
        if (!window.confirm(`Delete ${selectedDuplicateIds.size} duplicate student(s)? This cannot be undone.`)) return;
        setDeletingDuplicates(true);
        setError(null);
        try {
            const csrf = getCsrfToken();
            const res = await fetch('/admin/api/students/bulk', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ ids: Array.from(selectedDuplicateIds) }),
            });
            if (!res.ok) throw new Error('Failed to delete');
            await res.json();
            const idsToDelete = Array.from(selectedDuplicateIds);
            setSelectedDuplicateIds(new Set());
            setList((prev) => prev.filter((u) => !idsToDelete.includes(u.id)));
            setAllStudents((prev) => prev.filter((u) => !idsToDelete.includes(u.id)));
            const groups = await fetchDuplicates();
            setDuplicateGroups(groups);
        } catch {
            setError('Failed to delete duplicate students.');
        } finally {
            setDeletingDuplicates(false);
        }
    }

    async function handleImport(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setImporting(true);
        setImportProgress(0);
        setImportResult(null);
        setError(null);

        try {
            const csrf = getCsrfToken();
            
            // Simulate progress animation
            const progressInterval = setInterval(() => {
                setImportProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + 10;
                });
            }, 200);

            const res = await fetch('/admin/api/students/import', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: formData,
            });
            
            clearInterval(progressInterval);
            setImportProgress(100);
            
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
            // Refresh lists and duplicates
            fetchList().then(setList);
            fetchAllStudents().then(setAllStudents);
            fetchDuplicates().then(setDuplicateGroups);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setImporting(false);
            setTimeout(() => setImportProgress(0), 1000);
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
                                            placeholder="e.g. 0712345678"
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
                                        Enter the local phone number starting with 0 (for example 0712345678).
                                        This exact value will be stored and used as the parent&apos;s login identifier
                                        and as the initial password.
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
                                <div className="md:col-span-2 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Additional guardians (optional)</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setExtraGuardians((prev) => [
                                                    ...prev,
                                                    { name: '', phone: '', relationship: '' },
                                                ])
                                            }
                                        >
                                            Add guardian
                                        </Button>
                                    </div>
                                    {extraGuardians.length > 0 && (
                                        <div className="space-y-3 border rounded-md p-3">
                                            {extraGuardians.map((g, index) => (
                                                <div
                                                    key={index}
                                                    className="grid gap-2 md:grid-cols-[2fr,2fr,1fr,auto]"
                                                >
                                                    <Input
                                                        placeholder="Guardian name"
                                                        value={g.name}
                                                        onChange={(e) =>
                                                            setExtraGuardians((prev) =>
                                                                prev.map((item, i) =>
                                                                    i === index
                                                                        ? {
                                                                              ...item,
                                                                              name: e.target.value,
                                                                          }
                                                                        : item,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                    <Input
                                                        placeholder="Phone e.g. 0712345678"
                                                        value={g.phone}
                                                        onChange={(e) =>
                                                            setExtraGuardians((prev) =>
                                                                prev.map((item, i) =>
                                                                    i === index
                                                                        ? {
                                                                              ...item,
                                                                              phone: e.target.value,
                                                                          }
                                                                        : item,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                    <select
                                                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                        value={g.relationship}
                                                        onChange={(e) =>
                                                            setExtraGuardians((prev) =>
                                                                prev.map((item, i) =>
                                                                    i === index
                                                                        ? {
                                                                              ...item,
                                                                              relationship: e.target.value,
                                                                          }
                                                                        : item,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        <option value="">Relationship</option>
                                                        {GUARDIAN_RELATIONSHIPS.map((rel) => (
                                                            <option key={rel} value={rel}>
                                                                {rel}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() =>
                                                            setExtraGuardians((prev) =>
                                                                prev.filter((_, i) => i !== index),
                                                            )
                                                        }
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                Upload a CSV or Excel (.xlsx) file. First row must include: full_name (required), then any of class_name, guardian_name, guardian_phone, guardian_relationship
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
                                        accept=".csv,.xlsx,.xls"
                                        required
                                    />
                                </div>
                                {importing && importProgress > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Importing...</span>
                                            <span className="font-medium">{importProgress}%</span>
                                        </div>
                                        <Progress value={importProgress} />
                                    </div>
                                )}
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

                {(canManage || duplicateGroups.length > 0) && (
                    <Card className="border-amber-200 dark:border-amber-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-500" />
                                Potential duplicates
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                These students share the same name and may be duplicates. Select the ones to delete and click
                                &quot;Delete selected&quot;. Or use &quot;Select all duplicates (keep first)&quot; to mark all
                                but the first in each group for deletion.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingDuplicates ? (
                                <p className="text-sm text-muted-foreground">Checking for duplicates...</p>
                            ) : duplicateGroups.length === 0 ? (
                                <p className="text-sm text-green-600 dark:text-green-500">No duplicates found.</p>
                            ) : (
                                <>
                                    {canManage && (
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => selectAllDuplicates(true)}
                                            >
                                                Select all duplicates (keep first per group)
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedDuplicateIds(new Set())}
                                            >
                                                Clear selection
                                            </Button>
                                            {selectedDuplicateIds.size > 0 && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={deletingDuplicates}
                                                    onClick={handleBulkDeleteDuplicates}
                                                >
                                                    {deletingDuplicates ? 'Deleting...' : `Delete selected (${selectedDuplicateIds.size})`}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        {duplicateGroups.map((group, idx) => (
                                            <div
                                                key={idx}
                                                className="rounded-md border border-amber-200 dark:border-amber-800 p-4 space-y-2"
                                            >
                                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                                    {group.length} duplicate{group.length > 1 ? 's' : ''}: {group[0]?.name}
                                                </p>
                                                <div className="space-y-2">
                                                    {group.map((u) => (
                                                        <div
                                                            key={u.id}
                                                            className="flex items-center gap-4 p-2 rounded bg-muted/50 text-sm"
                                                        >
                                                            {canManage && (
                                                                <Checkbox
                                                                    checked={selectedDuplicateIds.has(u.id)}
                                                                    onCheckedChange={() => toggleDuplicateSelection(u.id)}
                                                                />
                                                            )}
                                                            <span className="font-medium">{u.name}</span>
                                                            <span className="text-muted-foreground">{u.email}</span>
                                                            <span className="text-muted-foreground">
                                                                {u.school_class?.name ?? '—'}
                                                            </span>
                                                            {canManage && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-red-600 hover:text-red-700 ml-auto"
                                                                    onClick={() => handleDelete(u)}
                                                                >
                                                                    Delete
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Students</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {search && list.length > 0
                                ? `Showing ${list.length} search result${list.length !== 1 ? 's' : ''} (highlighted) • ${allStudents.length} total students` 
                                : `All students (${allStudents.length} total)`}
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
                            {search && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setSearch('')}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                        {loading || loadingAll ? (
                            <p className="text-sm text-muted-foreground">Loading...</p>
                        ) : displayedStudents.length === 0 ? (
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
                                        {displayedStudents.map((user, index) => {
                                            const isSearchResult = search && index < list.length;
                                            return (
                                                <tr 
                                                    key={user.id} 
                                                    className={`border-b last:border-0 ${isSearchResult ? 'bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-blue-500' : ''}`}
                                                >
                                                    <td className="py-2 pr-4 font-medium">{user.name}</td>
                                                    <td className="py-2 pr-4 text-sm text-muted-foreground">{user.email}</td>
                                                    <td className="py-2 pr-4">{user.school_class?.name ?? '—'}</td>
                                                    <td className="py-2 pr-4 text-sm">
                                                        <div className="space-y-1">
                                                            <div>
                                                                {user.guardian_name && user.guardian_phone
                                                                    ? `${user.guardian_name} (${user.guardian_phone})`
                                                                    : user.guardian_phone || '—'}
                                                            </div>
                                                            {user.extra_guardians && user.extra_guardians.length > 0 && (
                                                                <div className="text-xs text-muted-foreground space-y-0.5">
                                                                    {user.extra_guardians.map((g, i) => (
                                                                        <div key={i}>
                                                                            {g.name || 'Guardian'}{' '}
                                                                            {g.phone ? `(${g.phone})` : ''}
                                                                            {g.relationship ? ` – ${g.relationship}` : ''}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
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
                                            );
                                        })}
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
                            <div className="md:col-span-2 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Additional guardians (optional)</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setEditExtraGuardians((prev) => [
                                                ...prev,
                                                { name: '', phone: '', relationship: '' },
                                            ])
                                        }
                                    >
                                        Add guardian
                                    </Button>
                                </div>
                                {editExtraGuardians.length > 0 && (
                                    <div className="space-y-3 border rounded-md p-3">
                                        {editExtraGuardians.map((g, index) => (
                                            <div
                                                key={index}
                                                className="grid gap-2 md:grid-cols-[2fr,2fr,1fr,auto]"
                                            >
                                                <Input
                                                    placeholder="Guardian name"
                                                    value={g.name}
                                                    onChange={(e) =>
                                                        setEditExtraGuardians((prev) =>
                                                            prev.map((item, i) =>
                                                                i === index
                                                                    ? { ...item, name: e.target.value }
                                                                    : item,
                                                            ),
                                                        )
                                                    }
                                                />
                                                <Input
                                                    placeholder="Phone e.g. 0712345678"
                                                    value={g.phone}
                                                    onChange={(e) =>
                                                        setEditExtraGuardians((prev) =>
                                                            prev.map((item, i) =>
                                                                i === index
                                                                    ? { ...item, phone: e.target.value }
                                                                    : item,
                                                            ),
                                                        )
                                                    }
                                                />
                                                <select
                                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    value={g.relationship}
                                                    onChange={(e) =>
                                                        setEditExtraGuardians((prev) =>
                                                            prev.map((item, i) =>
                                                                i === index
                                                                    ? { ...item, relationship: e.target.value }
                                                                    : item,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    <option value="">Relationship</option>
                                                    {GUARDIAN_RELATIONSHIPS.map((rel) => (
                                                        <option key={rel} value={rel}>
                                                            {rel}
                                                        </option>
                                                    ))}
                                                </select>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700"
                                                    onClick={() =>
                                                        setEditExtraGuardians((prev) =>
                                                            prev.filter((_, i) => i !== index),
                                                        )
                                                    }
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
