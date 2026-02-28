import { AppLayout } from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trash2, Save, AlertCircle, Pencil } from 'lucide-react';
import { getCsrfToken } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AcademicTerm = {
    id: number;
    name: string;
    term_number: number;
    academic_year: string;
    is_active: boolean;
};

type SchoolClass = {
    id: number;
    name: string;
    grade_code: string | null;
};

type SubjectResult = {
    name: string;
    score: string | null;
    max_score: string | null;
    grade: string | null;
};

type StudentResult = {
    user_id: number;
    name: string;
    subjects: Record<string, SubjectResult>;
};

type ResultsData = {
    students: StudentResult[];
    analytics: {
        subject_averages: Array<{
            subject: string;
            average: number;
        }>;
    };
};

export default function AdminResultsEdit({
    terms,
    classes,
}: {
    terms: AcademicTerm[];
    classes: SchoolClass[];
}) {
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [resultsData, setResultsData] = useState<ResultsData | null>(null);
    const [editedResults, setEditedResults] = useState<
        Record<string, Record<string, { id?: number; score: string }>>
    >({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<number | null>(null);
    const [editingStudentId, setEditingStudentId] = useState<number | null>(null);

    const activeTerm = terms.find((t) => t.is_active);
    useEffect(() => {
        if (activeTerm && !selectedTermId) {
            setSelectedTermId(activeTerm.id.toString());
        }
    }, [activeTerm, selectedTermId]);

    const fetchResults = async () => {
        if (!selectedClassId || !selectedTermId) {
            setError('Please select a class and term');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/admin/api/results/class/${selectedClassId}/${selectedTermId}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch results');
            }

            const data = await response.json();
            setResultsData(data);
            setEditedResults({});
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setResultsData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleCellChange = (userId: number, subjectCode: string, value: string) => {
        setEditedResults((prev) => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [subjectCode]: {
                    score: value,
                },
            },
        }));
    };

    const handleSave = async () => {
        if (!resultsData) return;

        setSaving(true);
        setError(null);

        try {
            const updates: Array<{
                user_id: number;
                subject_code: string;
                score: string;
            }> = [];
            for (const [userIdStr, subjects] of Object.entries(editedResults)) {
                const userId = parseInt(userIdStr);
                const student = resultsData.students.find((s) => s.user_id === userId);
                if (!student) continue;

                for (const [subjectCode, data] of Object.entries(subjects)) {
                    const originalResult = student.subjects[subjectCode];
                    if (originalResult && data.score !== originalResult.score) {
                        updates.push({
                            user_id: userId,
                            subject_code: subjectCode,
                            score: data.score,
                        });
                    }
                }
            }

            if (updates.length === 0) {
                setError('No changes to save');
                setSaving(false);
                return;
            }

            const response = await fetch('/admin/api/results/bulk-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    school_class_id: Number(selectedClassId),
                    academic_term_id: Number(selectedTermId),
                    results: updates,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save results');
            }

            await fetchResults();
            setEditedResults({});
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save results');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!selectedClassId || !selectedTermId) return;

        setSaving(true);
        setError(null);

        try {
            const response = await fetch('/admin/api/results/bulk-destroy', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    school_class_id: parseInt(selectedClassId),
                    academic_term_id: parseInt(selectedTermId),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete results');
            }

            setResultsData(null);
            setEditedResults({});
            setDeleteDialogOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete results');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStudent = async () => {
        if (!selectedClassId || !selectedTermId || !studentToDelete) return;

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(
                `/admin/api/results/student/${studentToDelete}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                    },
                    body: JSON.stringify({
                        school_class_id: Number(selectedClassId),
                        academic_term_id: Number(selectedTermId),
                    }),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to delete student results');
            }

            await fetchResults();
            setStudentToDelete(null);
            setDeleteDialogOpen(false);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to delete student results'
            );
        } finally {
            setSaving(false);
        }
    };

    const breadcrumbs = [
        { label: 'Dashboard', href: '/admin/dashboard' },
        { label: 'Results', href: '/admin/results' },
        { label: 'Edit Results', href: '/admin/results/edit' },
    ];

    const hasChanges = Object.keys(editedResults).length > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Results" />

            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Edit Results</h1>
                        <p className="text-muted-foreground">
                            Modify existing results or delete them
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Class & Term</CardTitle>
                        <CardDescription>Choose a class and term to edit results</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Class</label>
                                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((cls) => (
                                            <SelectItem key={cls.id} value={cls.id.toString()}>
                                                {cls.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Term</label>
                                <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select term" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {terms.map((term) => (
                                            <SelectItem key={term.id} value={term.id.toString()}>
                                                {term.name} {term.is_active && '(Active)'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end">
                                <Button
                                    onClick={fetchResults}
                                    disabled={!selectedClassId || !selectedTermId || loading}
                                    className="w-full"
                                >
                                    {loading ? 'Loading...' : 'Load Results'}
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {resultsData && (
                    <>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Edit Results</CardTitle>
                                        <CardDescription>
                                            Click on a score to edit it
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleSave}
                                            disabled={!hasChanges || saving}
                                            variant="default"
                                        >
                                            <Save className="mr-2 h-4 w-4" />
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                        <Button
                                            onClick={() => setDeleteDialogOpen(true)}
                                            disabled={saving}
                                            variant="destructive"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete All
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="border px-3 py-2 text-left text-sm font-semibold">
                                                    Student Name
                                                </th>
                                                {resultsData.analytics.subject_averages.map(
                                                    (subj) => (
                                                        <th
                                                            key={subj.subject}
                                                            className="border px-3 py-2 text-center text-sm font-semibold"
                                                        >
                                                            {subj.subject}
                                                        </th>
                                                    )
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resultsData.students.map((student) => (
                                                <tr
                                                    key={student.user_id}
                                                    className={
                                                        editingStudentId === student.user_id
                                                            ? 'border-b bg-muted/30'
                                                            : 'border-b'
                                                    }
                                                >
                                                    <td className="border px-3 py-2 font-medium">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span>{student.name}</span>
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7"
                                                                    onClick={() =>
                                                                        setEditingStudentId(
                                                                            student.user_id,
                                                                        )
                                                                    }
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-destructive"
                                                                    onClick={() => {
                                                                        setStudentToDelete(
                                                                            student.user_id,
                                                                        );
                                                                        setDeleteDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {resultsData.analytics.subject_averages.map(
                                                        (subj) => {
                                                            const subjectKey = Object.keys(
                                                                student.subjects
                                                            ).find(
                                                                (key) =>
                                                                    student.subjects[key].name ===
                                                                    subj.subject
                                                            );
                                                            const result = subjectKey
                                                                ? student.subjects[subjectKey]
                                                                : null;
                                                            const editedValue =
                                                                editedResults[student.user_id]?.[
                                                                    subjectKey ?? ''
                                                                ]?.score;
                                                            const displayValue =
                                                                editedValue !== undefined
                                                                    ? editedValue
                                                                    : result?.score ?? '';

                                                            return (
                                                                <td
                                                                    key={subj.subject}
                                                                    className="border px-1 py-1"
                                                                >
                                                                    <Input
                                                                        value={displayValue}
                                                                        onChange={(e) =>
                                                                            handleCellChange(
                                                                                student.user_id,
                                                                                subjectKey ?? '',
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className="h-8 w-full border-0 text-center focus-visible:ring-1"
                                                                    />
                                                                </td>
                                                            );
                                                        }
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {studentToDelete
                                ? 'This will permanently delete this student’s results for this class and term.'
                                : 'This will permanently delete all results for this class and term.'}{' '}
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={studentToDelete ? handleDeleteStudent : handleDeleteAll}
                            className="bg-destructive"
                        >
                            {studentToDelete ? 'Delete Student Results' : 'Delete All Results'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
