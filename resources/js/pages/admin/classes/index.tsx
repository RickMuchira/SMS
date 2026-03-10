import { useCallback, useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { usePermissions } from '@/hooks/use-permissions';
import type { BreadcrumbItem } from '@/types';

type ExtraGuardian = {
    name: string;
    phone: string;
};

type Student = {
    id: number;
    name: string;
    email: string;
    class_id?: number | null;
    guardian_name?: string | null;
    guardian_phone?: string | null;
    guardian_relationship?: string | null;
    extra_guardians?: ExtraGuardian[];
    school_class?: SchoolClass;
};

type SchoolClass = {
    id: number;
    name: string;
    description?: string | null;
    students_count?: number;
    students?: Student[];
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
    const { hasPermission } = usePermissions();
    const canManageStudents = hasPermission('manage students');

    const [list, setList] = useState<SchoolClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set());
    const [loadingStudents, setLoadingStudents] = useState<Set<number>>(new Set());
    
    // Edit student state
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [editStudentName, setEditStudentName] = useState('');
    const [editStudentEmail, setEditStudentEmail] = useState('');
    const [editStudentPassword, setEditStudentPassword] = useState('');
    const [editStudentClassId, setEditStudentClassId] = useState('');
    const [editStudentGuardianName, setEditStudentGuardianName] = useState('');
    const [editStudentGuardianPhone, setEditStudentGuardianPhone] = useState('');
    const [editStudentGuardianRelationship] = useState('');
    const [editStudentExtraGuardians, setEditStudentExtraGuardians] = useState<ExtraGuardian[]>([]);
    const [editStudentSubmitting, setEditStudentSubmitting] = useState(false);
    const [editStudentError, setEditStudentError] = useState<string | null>(null);
    
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

    async function fetchStudentsForClass(classId: number) {
        if (loadingStudents.has(classId)) return;
        
        setLoadingStudents(prev => new Set(prev).add(classId));
        try {
            const response = await fetch(`/admin/api/students?class_id=${classId}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok) throw new Error('Failed to load students');
            const payload = await response.json();
            const students = payload.data ?? [];
            
            setList(prev => prev.map(cls => 
                cls.id === classId ? { ...cls, students } : cls
            ));
        } catch (error) {
            console.error('Failed to fetch students:', error);
        } finally {
            setLoadingStudents(prev => {
                const next = new Set(prev);
                next.delete(classId);
                return next;
            });
        }
    }

    function toggleClass(classId: number) {
        setExpandedClasses(prev => {
            const next = new Set(prev);
            if (next.has(classId)) {
                next.delete(classId);
            } else {
                next.add(classId);
                const cls = list.find(c => c.id === classId);
                if (cls && !cls.students) {
                    fetchStudentsForClass(classId);
                }
            }
            return next;
        });
    }

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

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
            };

            const res = await fetch('/admin/api/classes', {
                method: 'POST',
                headers,
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

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
            };

            const res = await fetch(`/admin/api/classes/${editingId}`, {
                method: 'PATCH',
                headers,
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

    function openEditStudentDialog(student: Student) {
        setEditingStudent(student);
        setEditStudentName(student.name);
        setEditStudentEmail(student.email);
        setEditStudentPassword('');
        setEditStudentClassId(student.class_id?.toString() ?? '');
        setEditStudentGuardianName(student.guardian_name ?? '');
        setEditStudentGuardianPhone(student.guardian_phone ?? '');
        setEditStudentGuardianRelationship('');
        setEditStudentExtraGuardians(student.extra_guardians ?? []);
        setEditStudentError(null);
    }

    function closeEditStudentDialog() {
        setEditingStudent(null);
        setEditStudentName('');
        setEditStudentEmail('');
        setEditStudentPassword('');
        setEditStudentClassId('');
        setEditStudentGuardianName('');
        setEditStudentGuardianPhone('');
        setEditStudentGuardianRelationship('');
        setEditStudentExtraGuardians([]);
        setEditStudentError(null);
    }

    async function handleEditStudent(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!editingStudent) return;
        setEditStudentSubmitting(true);
        setEditStudentError(null);
        try {
            const csrf = getCsrfToken();
            const body: Record<string, unknown> = {
                name: editStudentName,
                email: editStudentEmail,
            };
            if (editStudentPassword) body.password = editStudentPassword;
            if (editStudentClassId) body.class_id = parseInt(editStudentClassId);
            body.guardian_name = editStudentGuardianName || null;
            body.guardian_phone = editStudentGuardianPhone || null;
            // Relationship field no longer used in UI; keep null on backend.
            const cleanedExtra = editStudentExtraGuardians
                .map((g) => ({
                    name: g.name.trim(),
                    phone: g.phone.trim(),
                }))
                .filter((g) => g.name || g.phone);
            if (cleanedExtra.length > 0) body.extra_guardians = cleanedExtra;

            const res = await fetch(`/admin/api/students/${editingStudent.id}`, {
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
            const { user: updated } = (await res.json()) as { user: Student };
            setList((prev) =>
                prev.map((cls) =>
                    cls.students
                        ? {
                              ...cls,
                              students: cls.students.map((s) => (s.id === updated.id ? updated : s)),
                          }
                        : cls,
                ),
            );
            closeEditStudentDialog();
        } catch (err) {
            setEditStudentError(err instanceof Error ? err.message : 'Failed to update student.');
        } finally {
            setEditStudentSubmitting(false);
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

            const headers: Record<string, string> = {
                Accept: 'application/json',
                ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
            };

            const res = await fetch(`/admin/api/classes/${cls.id}`, {
                method: 'DELETE',
                headers,
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
                            <div className="space-y-2">
                                {list.map((cls) => (
                                    <Collapsible
                                        key={cls.id}
                                        open={expandedClasses.has(cls.id)}
                                        onOpenChange={() => toggleClass(cls.id)}
                                    >
                                        <div className="border rounded-md">
                                            <div className="flex items-center gap-4 p-4">
                                                <CollapsibleTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-8 w-8 p-0 hover:bg-muted"
                                                    >
                                                        {expandedClasses.has(cls.id) ? (
                                                            <ChevronDown className="h-5 w-5" />
                                                        ) : (
                                                            <ChevronRight className="h-5 w-5" />
                                                        )}
                                                    </Button>
                                                </CollapsibleTrigger>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-base">{cls.name}</h3>
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {cls.description || 'Imported from student sheet'}
                                                    </p>
                                                </div>
                                                <div className="text-sm font-medium whitespace-nowrap">
                                                    {cls.students_count ?? 0} students
                                                </div>
                                                <div className="flex gap-2 ml-4">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEditDialog(cls);
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(cls);
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                            <CollapsibleContent>
                                                <div className="border-t px-4 py-3 bg-muted/30">
                                                    {loadingStudents.has(cls.id) ? (
                                                        <p className="text-sm text-muted-foreground py-2">Loading students...</p>
                                                    ) : cls.students && cls.students.length > 0 ? (
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold mb-3">Students:</h4>
                                                            <div className="grid gap-2">
                                                                {cls.students.map((student) => (
                                                                    <div
                                                                        key={student.id}
                                                                        className="flex items-center gap-3 p-3 bg-background rounded-md border text-sm"
                                                                    >
                                                                        <span className="font-medium">{student.name}</span>
                                                                        <span className="text-muted-foreground">
                                                                            {student.email}
                                                                        </span>
                                                                        {canManageStudents && (
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="ml-auto"
                                                                                onClick={() => openEditStudentDialog(student)}
                                                                            >
                                                                                Edit
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground py-2">No students in this class</p>
                                                    )}
                                                </div>
                                            </CollapsibleContent>
                                        </div>
                                    </Collapsible>
                                ))}
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

            {/* Edit Student Dialog */}
            <Dialog open={!!editingStudent} onOpenChange={(open) => !open && closeEditStudentDialog()}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit student</DialogTitle>
                        <DialogDescription>Update student details.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditStudent} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="edit-student-name">Student name</Label>
                                <Input
                                    id="edit-student-name"
                                    value={editStudentName}
                                    onChange={(e) => setEditStudentName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-student-class">Class</Label>
                                <select
                                    id="edit-student-class"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={editStudentClassId}
                                    onChange={(e) => setEditStudentClassId(e.target.value)}
                                >
                                    <option value="">No class</option>
                                    {list.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-student-email">Email</Label>
                                <Input
                                    id="edit-student-email"
                                    type="email"
                                    value={editStudentEmail}
                                    onChange={(e) => setEditStudentEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-student-password">New password (leave blank to keep)</Label>
                                <Input
                                    id="edit-student-password"
                                    type="password"
                                    value={editStudentPassword}
                                    onChange={(e) => setEditStudentPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-student-guardian-name">Guardian name</Label>
                                <Input
                                    id="edit-student-guardian-name"
                                    value={editStudentGuardianName}
                                    onChange={(e) => setEditStudentGuardianName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-student-guardian-phone">Guardian phone</Label>
                                <Input
                                    id="edit-student-guardian-phone"
                                    value={editStudentGuardianPhone}
                                    onChange={(e) => setEditStudentGuardianPhone(e.target.value)}
                                />
                            </div>
                            {/* Relationship removed – only name & phone are editable. */}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Additional guardians (optional)</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setEditStudentExtraGuardians((prev) => [
                                            ...prev,
                                            { name: '', phone: '', relationship: '' },
                                        ])
                                    }
                                >
                                    Add guardian
                                </Button>
                            </div>
                            {editStudentExtraGuardians.length > 0 && (
                                <div className="space-y-3 border rounded-md p-3">
                                    {editStudentExtraGuardians.map((g, index) => (
                                        <div
                                            key={index}
                                                className="grid gap-2 md:grid-cols-[2fr,2fr,auto]"
                                        >
                                            <Input
                                                placeholder="Guardian name"
                                                value={g.name}
                                                onChange={(e) =>
                                                    setEditStudentExtraGuardians((prev) =>
                                                        prev.map((item, i) =>
                                                            i === index ? { ...item, name: e.target.value } : item,
                                                        ),
                                                    )
                                                }
                                            />
                                            <Input
                                                placeholder="Phone"
                                                value={g.phone}
                                                onChange={(e) =>
                                                    setEditStudentExtraGuardians((prev) =>
                                                        prev.map((item, i) =>
                                                            i === index ? { ...item, phone: e.target.value } : item,
                                                        ),
                                                    )
                                                }
                                            />
                                            {/* Relationship field removed – only name & phone are stored. */}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600"
                                                onClick={() =>
                                                    setEditStudentExtraGuardians((prev) =>
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
                        {editStudentError && (
                            <p className="text-sm text-red-500">{editStudentError}</p>
                        )}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditStudentDialog}
                                disabled={editStudentSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editStudentSubmitting}>
                                {editStudentSubmitting ? 'Saving...' : 'Save'}
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
