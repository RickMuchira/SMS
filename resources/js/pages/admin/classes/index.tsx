import { useCallback, useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { getCsrfToken } from '@/lib/csrf';
import type { BreadcrumbItem } from '@/types';

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
    
    // Create form state
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDescription, setCreateDescription] = useState('');
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Edit form state
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const fetchList = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            const response = await fetch(`/admin/api/classes?${params.toString()}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok) throw new Error('Failed to load classes');
            const payload = (await response.json()) as PaginatedResponse;
            setList(payload.data ?? []);
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    }, [search]);

    useEffect(() => {
        setLoading(true);
        fetchList().finally(() => setLoading(false));
    }, [fetchList]);

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setCreateSubmitting(true);
        setCreateError(null);

        try {
            const csrf = getCsrfToken();
            if (!csrf) {
                throw new Error('CSRF token not found. Please refresh the page.');
            }

            const res = await fetch('/admin/api/classes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: createName.trim(),
                    description: createDescription.trim() || null,
                }),
            });

            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { message?: string } | null;

                if (res.status === 419) {
                    throw new Error('Session expired. Please refresh the page and try again.');
                }

                throw new Error(body?.message ?? 'Failed to create class');
            }

            // Refetch list to stay in sync with backend
            await fetchList();

            // Close dialog and reset form
            setShowCreateDialog(false);
            setCreateName('');
            setCreateDescription('');
            setCreateError(null);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setCreateSubmitting(false);
        }
    }

    function openEditDialog(cls: SchoolClass) {
        setEditingId(cls.id);
        setEditName(cls.name);
        setEditDescription(cls.description ?? '');
        setEditError(null);
        setShowEditDialog(true);
    }

    function closeEditDialog() {
        setShowEditDialog(false);
        setEditingId(null);
        setEditName('');
        setEditDescription('');
        setEditError(null);
    }

    async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editingId) return;

        setEditSubmitting(true);
        setEditError(null);

        try {
            const csrf = getCsrfToken();
            if (!csrf) {
                throw new Error('CSRF token not found. Please refresh the page.');
            }

            const res = await fetch(`/admin/api/classes/${editingId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDescription.trim() || null,
                }),
            });

            const body = (await res.json().catch(() => null)) as
                | { message?: string; class?: SchoolClass }
                | null;

            if (!res.ok) {
                if (res.status === 419) {
                    throw new Error('Session expired. Please refresh the page and try again.');
                }

                throw new Error(body?.message ?? 'Failed to update class');
            }

            if (body?.class) {
                // Use the server-returned class as the source of truth.
                setList((prev) => prev.map((c) => (c.id === body.class!.id ? body.class! : c)));
            } else {
                // Fallback: update from the local form values.
                setList((prev) =>
                    prev.map((cls) =>
                        cls.id === editingId
                            ? {
                                  ...cls,
                                  name: editName.trim(),
                                  description: editDescription.trim() || null,
                              }
                            : cls,
                    ),
                );
            }

            // Close dialog and reset form
            closeEditDialog();
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setEditSubmitting(false);
        }
    }

    async function handleDelete(cls: SchoolClass) {
        if (!window.confirm(`Delete class "${cls.name}"? Students in this class will no longer have a class assigned.`)) {
            return;
        }
        
        try {
            const csrf = getCsrfToken();
            if (!csrf) {
                alert('CSRF token not found. Please refresh the page.');
                return;
            }
            
            const res = await fetch(`/admin/api/classes/${cls.id}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrf,
                },
                credentials: 'same-origin',
            });
            
            if (res.ok) {
                setList((prev) => prev.filter((c) => c.id !== cls.id));
            } else {
                const data = (await res.json().catch(() => null)) as { message?: string } | null;
                if (res.status === 419) {
                    alert('Session expired. Please refresh the page and try again.');
                } else {
                    alert(data?.message ?? 'Failed to delete class.');
                }
            }
        } catch (error) {
            alert('Failed to delete class.');
            console.error('Delete failed:', error);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Class management" />

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Classes</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Manage school classes and student groups.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex gap-2 flex-1 max-w-md">
                                <Input
                                    placeholder="Search by name..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => fetchList()}
                                >
                                    Search
                                </Button>
                            </div>
                            <Button onClick={() => setShowCreateDialog(true)}>
                                Create Class
                            </Button>
                        </div>

                        {loading ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">Loading classes...</p>
                        ) : list.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">
                                No classes found. Click "Create Class" to add one.
                            </p>
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
                                                <td className="py-2 pr-4">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditDialog(cls)}
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

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create new class</DialogTitle>
                        <DialogDescription>Add a new class to group students.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="create-name">Class name *</Label>
                            <Input
                                id="create-name"
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                placeholder="e.g. Grade 1 A"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create-description">Description (optional)</Label>
                            <Input
                                id="create-description"
                                value={createDescription}
                                onChange={(e) => setCreateDescription(e.target.value)}
                                placeholder="e.g. Morning session"
                            />
                        </div>
                        {createError && (
                            <p className="text-sm text-red-500">{createError}</p>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCreateDialog(false)}
                                disabled={createSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createSubmitting}>
                                {createSubmitting ? 'Creating...' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={(open) => !open && closeEditDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit class</DialogTitle>
                        <DialogDescription>Update the class name or description.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Class name *</Label>
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description (optional)</Label>
                            <Input
                                id="edit-description"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                            />
                        </div>
                        {editError && (
                            <p className="text-sm text-red-500">{editError}</p>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditDialog}
                                disabled={editSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editSubmitting}>
                                {editSubmitting ? 'Saving...' : 'Save changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
