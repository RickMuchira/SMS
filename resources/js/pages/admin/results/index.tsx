import { Head } from '@inertiajs/react';
import { Check, FileSpreadsheet, Pencil, Plus, Table2, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/use-permissions';
import { getCsrfToken } from '@/lib/csrf';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Term = {
    id: number;
    name: string;
    term_number: string;
    academic_year: string;
    is_active: boolean;
};

type SchoolClass = {
    id: number;
    name: string;
    grade_code: string | null;
};

type Props = {
    terms: Term[];
    classes: SchoolClass[];
};

type ImportResult = {
    created: number;
    updated: number;
    errors: string[];
};

type SubjectResult = {
    name: string;
    score: string | null;
    max_score: string | null;
    grade: string | null;
};

type StudentResultRow = {
    user_id: number;
    name: string;
    email: string | null;
    subjects: Record<string, SubjectResult>;
    total: number;
    average: number;
    count: number;
    position: number;
};

type ViewResultsData = {
    class: SchoolClass;
    term: Term;
    students: StudentResultRow[];
    analytics: {
        total_students: number;
        class_average: number;
        highest_score: number;
        lowest_score: number;
        subject_averages: Array<{ subject: string; average: number; count: number }>;
    };
    anomalies: string[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Results', href: '/admin/results' },
];

const GRADE_TEMPLATES: Record<string, string[]> = {
    PP1: ['Student Name', 'Math', 'Language', 'ENV', 'Creative'],
    PP2: ['Student Name', 'Language', 'N/W', 'Literacy', 'Inter', 'Art'],
    G1: ['Student Name', 'Math', 'English', 'Kiswahili', 'Environment'],
    G2: ['Student Name', 'ENV', 'CRE', 'Creative', 'Math', 'Eng', 'Kisw'],
    G3: ['Student Name', 'Math', 'Eng', 'Kisw', 'ENV', 'CRE', 'C/A'],
    G4: ['Student Name', 'Math', 'Eng', 'Kisw', 'C/A', 'CRE', 'ENV'],
    G5: ['Student Name', 'ENG', 'KISW', 'MATH', 'S/T', 'CRE', 'AGRI', 'SST', 'C.A'],
    G6: ['Student Name', 'Math', 'Eng', 'Kisw', 'Agri', 'CRE', 'SST', 'S/T', 'CA'],
    DEFAULT: ['Student Name'], // For classes without grade_code
};

function parsePaste(text: string): string[][] {
    return text
        .trim()
        .split(/\r?\n/)
        .map((line) => line.split(/[\t,]/).map((c) => String(c ?? '').trim()));
}

export default function AdminResultsIndex({ terms, classes }: Props) {
    const { hasPermission } = usePermissions();
    const canManage = hasPermission('manage results') || hasPermission('manage academics');

    const [selectedTermId, setSelectedTermId] = useState<number | null>(
        terms.find((t) => t.is_active)?.id ?? terms[0]?.id ?? null,
    );
    const [selectedClassId, setSelectedClassId] = useState<number | null>(classes[0]?.id ?? null);
    const [rows, setRows] = useState<string[][]>([]);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [customHeaders, setCustomHeaders] = useState<string[]>([]);
    const [isEditingHeaders, setIsEditingHeaders] = useState(false);

    // View All Results tab
    const [viewClassId, setViewClassId] = useState<number | null>(classes[0]?.id ?? null);
    const [viewTermId, setViewTermId] = useState<number | null>(
        terms.find((t) => t.is_active)?.id ?? terms[0]?.id ?? null,
    );
    const [viewData, setViewData] = useState<ViewResultsData | null>(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewError, setViewError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'view' | 'import'>('view');

    // Inline editing state
    const [editingRowId, setEditingRowId] = useState<number | null>(null);
    const [editedScores, setEditedScores] = useState<Record<string, string>>({});
    const [savingRow, setSavingRow] = useState(false);
    const [deleteStudentId, setDeleteStudentId] = useState<number | null>(null);
    const [deletingStudent, setDeletingStudent] = useState(false);

    const selectedClass = classes.find((c) => c.id === selectedClassId);
    const gradeCode = selectedClass?.grade_code ?? '';
    const defaultHeaders = GRADE_TEMPLATES[gradeCode] ?? GRADE_TEMPLATES.DEFAULT;
    const headers = customHeaders.length > 0 ? customHeaders : defaultHeaders;

    // Initialize rows with headers when class changes
    useMemo(() => {
        if (headers.length > 0 && rows.length === 0) {
            setRows([]);
        }
        // Reset custom headers when class changes
        setCustomHeaders([]);
        setIsEditingHeaders(false);
    }, [selectedClassId]);

    function deleteRow(rowIdx: number) {
        setRows((prev) => prev.filter((_, i) => i !== rowIdx));
    }

    function addRow() {
        setRows((prev) => [...prev, Array(headers.length).fill('')]);
    }

    function addHeaderColumn() {
        const newHeader = `Subject ${customHeaders.length > 0 ? customHeaders.length : defaultHeaders.length}`;
        setCustomHeaders((prev) =>
            prev.length > 0 ? [...prev, newHeader] : [...defaultHeaders, newHeader],
        );
        setRows((prev) => prev.map((row) => [...row, '']));
    }

    function removeHeaderColumn(index: number) {
        if (index === 0) return; // Don't allow removing "Student Name"
        setCustomHeaders((prev) => prev.filter((_, i) => i !== index));
        setRows((prev) => prev.map((row) => row.filter((_, i) => i !== index)));
    }

    function updateHeaderName(index: number, value: string) {
        setCustomHeaders((prev) => {
            const newHeaders = prev.length > 0 ? [...prev] : [...defaultHeaders];
            newHeaders[index] = value;
            return newHeaders;
        });
    }

    function saveHeaders() {
        setIsEditingHeaders(false);
    }

    function resetHeaders() {
        setCustomHeaders([]);
        setIsEditingHeaders(false);
        setRows([]);
    }

    function updateCell(rowIdx: number, colIdx: number, value: string) {
        setRows((prev) => {
            const next = prev.map((r) => [...r]);
            if (!next[rowIdx]) next[rowIdx] = Array(headers.length).fill('');
            next[rowIdx][colIdx] = value;
            return next;
        });
    }

    function handlePaste(e: React.ClipboardEvent) {
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        const pastedRows = parsePaste(text);
        if (pastedRows.length === 0) return;
        setRows((prev) => [
            ...prev,
            ...pastedRows.map((row) => {
                const filled = row.slice(0, headers.length).map((c) => c ?? '');
                return [...filled, ...Array(Math.max(0, headers.length - filled.length)).fill('')];
            }),
        ]);
    }

    async function handleImport(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedClassId || !selectedTermId || rows.length === 0) {
            setError('Please select class, term, and add at least one student row.');
            return;
        }

        setImporting(true);
        setImportProgress(0);
        setImportResult(null);
        setError(null);

        try {
            const csrf = getCsrfToken();
            const progressInterval = setInterval(() => {
                setImportProgress((prev) => (prev >= 90 ? prev : prev + 10));
            }, 200);

            // Add headers as first row
            const dataWithHeaders = [headers, ...rows];

            const res = await fetch('/admin/api/results/import/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    school_class_id: selectedClassId,
                    academic_term_id: selectedTermId,
                    rows: dataWithHeaders,
                }),
            });

            const previewData = await res.json();
            if (!res.ok) {
                throw new Error(previewData.message ?? 'Preview failed');
            }

            // Auto-import matched rows
            if (previewData.matched && previewData.matched.length > 0) {
                const importRows = previewData.matched.map((m: any) => ({
                    user_id: m.user_id,
                    scores: m.scores,
                }));

                const importRes = await fetch('/admin/api/results/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        school_class_id: selectedClassId,
                        academic_term_id: selectedTermId,
                        rows: importRows,
                    }),
                });

                clearInterval(progressInterval);
                setImportProgress(100);

                const importData = await importRes.json();
                if (!importRes.ok) {
                    throw new Error(importData.message ?? 'Import failed');
                }
                setImportResult(importData);
                setRows([]); // Clear after successful import
            } else {
                clearInterval(progressInterval);
                setImportProgress(100);
                throw new Error('No students matched. Please check names.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setImporting(false);
            setTimeout(() => setImportProgress(0), 1000);
        }
    }

    const loadViewResults = useCallback(async () => {
        if (!viewClassId || !viewTermId) {
            setViewError('Please select class and term.');
            return;
        }
        setViewLoading(true);
        setViewError(null);
        setViewData(null);
        try {
            const res = await fetch(`/admin/api/results/class/${viewClassId}/${viewTermId}`);
            if (!res.ok) throw new Error('Failed to load results');
            const data: ViewResultsData = await res.json();
            setViewData(data);
        } catch (err) {
            setViewError(err instanceof Error ? err.message : 'Failed to load results');
        } finally {
            setViewLoading(false);
        }
    }, [viewClassId, viewTermId]);

    useEffect(() => {
        if (activeTab === 'view' && viewClassId && viewTermId) {
            void loadViewResults();
        }
    }, [activeTab, viewClassId, viewTermId, loadViewResults]);

    function startEditing(student: StudentResultRow) {
        const scores: Record<string, string> = {};
        if (student.subjects) {
            for (const [code, subj] of Object.entries(student.subjects)) {
                scores[code] = subj.score ?? '';
            }
        }
        setEditedScores(scores);
        setEditingRowId(student.user_id);
        setViewError(null);
    }

    async function saveRow(student: StudentResultRow) {
        if (!viewClassId || !viewTermId) return;
        setSavingRow(true);
        try {
            const updates = Object.entries(editedScores).map(([subjectCode, score]) => ({
                user_id: student.user_id,
                subject_code: subjectCode,
                score,
            }));
            const res = await fetch('/admin/api/results/bulk-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken() ?? '',
                },
                body: JSON.stringify({
                    school_class_id: viewClassId,
                    academic_term_id: viewTermId,
                    results: updates,
                }),
            });
            if (!res.ok) throw new Error('Save failed');
            setEditingRowId(null);
            void loadViewResults();
        } catch {
            setViewError('Failed to save changes.');
        } finally {
            setSavingRow(false);
        }
    }

    async function deleteStudent(userId: number | null) {
        if (!userId || !viewClassId || !viewTermId) {
            return;
        }
        setDeletingStudent(true);
        try {
            const res = await fetch(`/admin/api/results/student/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken() ?? '',
                },
                body: JSON.stringify({
                    school_class_id: viewClassId,
                    academic_term_id: viewTermId,
                }),
            });
            if (!res.ok) throw new Error('Delete failed');
            setDeleteStudentId(null);
            void loadViewResults();
        } catch {
            setViewError('Failed to delete student results.');
        } finally {
            setDeletingStudent(false);
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Results" />

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Results</h1>
                    <p className="text-muted-foreground mt-1">
                        Import results or view all students&apos; results from the database.
                    </p>
                </div>

                <div className="flex gap-2 border-b pb-2">
                    <Button
                        type="button"
                        variant={activeTab === 'view' ? 'default' : 'ghost'}
                        size="sm"
                        className="gap-2"
                        onClick={() => setActiveTab('view')}
                    >
                        <Table2 className="h-4 w-4" />
                        View All Results
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'import' ? 'default' : 'ghost'}
                        size="sm"
                        className="gap-2"
                        onClick={() => setActiveTab('import')}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Import Results
                    </Button>
                </div>

                {activeTab === 'view' && (
                    <div className="mt-6 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>View students&apos; results</CardTitle>
                                <CardDescription>
                                    Select class and term to see all results from the database. Results
                                    load automatically for the current selection.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap items-end gap-4">
                                    <div className="space-y-2 w-[200px]">
                                        <Label htmlFor="view-term">Term</Label>
                                        <Select
                                            value={viewTermId?.toString() ?? ''}
                                            onValueChange={(v) => setViewTermId(Number(v) || null)}
                                        >
                                            <SelectTrigger id="view-term">
                                                <SelectValue placeholder="Select term" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {terms.map((t) => (
                                                    <SelectItem key={t.id} value={t.id.toString()}>
                                                        {t.name} {t.academic_year}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 w-[200px]">
                                        <Label htmlFor="view-class">Class</Label>
                                        <Select
                                            value={viewClassId?.toString() ?? ''}
                                            onValueChange={(v) => setViewClassId(Number(v) || null)}
                                        >
                                            <SelectTrigger id="view-class">
                                                <SelectValue placeholder="Select class" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classes.map((c) => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>
                                                        {c.name}
                                                        {c.grade_code ? ` (${c.grade_code})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {viewError && (
                                    <p className="mt-3 text-sm text-destructive">{viewError}</p>
                                )}
                            </CardContent>
                        </Card>

                        {viewData && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        {viewData.class.name} — {viewData.term.name}
                                    </CardTitle>
                                    <CardDescription>
                                        {viewData.analytics.total_students} students • Class average:{' '}
                                        {Number(viewData.analytics.class_average ?? 0).toFixed(1)}% • Highest:{' '}
                                        {viewData.analytics.highest_score} • Lowest:{' '}
                                        {viewData.analytics.lowest_score}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                {viewData.anomalies && viewData.anomalies.length > 0 && (
                                    <div className="mb-4 rounded-md border border-amber-400 bg-amber-50 p-3 dark:bg-amber-950/30">
                                        <p className="mb-1 text-sm font-semibold text-amber-700 dark:text-amber-400">
                                            ⚠ Anomalies detected ({viewData.anomalies.length})
                                        </p>
                                        <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
                                            {viewData.anomalies.map((a, i) => (
                                                <li key={i}>{a}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                    <div className="overflow-x-auto rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="w-12 font-semibold">Pos</TableHead>
                                                    <TableHead className="font-semibold">Student name</TableHead>
                                                    <TableHead className="font-semibold">Email</TableHead>
                                                    {viewData.analytics.subject_averages.map((s) => (
                                                        <TableHead key={s.subject} className="text-center font-semibold">
                                                            {s.subject}
                                                        </TableHead>
                                                    ))}
                                                    <TableHead className="text-right font-semibold">Total</TableHead>
                                                    <TableHead className="text-right font-semibold">Avg %</TableHead>
                                                    <TableHead className="w-24 font-semibold">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {viewData.students.map((student) => {
                                                    const isEditing = editingRowId === student.user_id;
                                                    return (
                                                        <TableRow
                                                            key={student.user_id}
                                                            className={isEditing ? 'bg-primary/5' : undefined}
                                                        >
                                                            <TableCell className="font-medium">
                                                                {student.position}
                                                            </TableCell>
                                                            <TableCell className="font-medium whitespace-nowrap">
                                                                {student.name}
                                                            </TableCell>
                                                            <TableCell>
                                                                {student.email ? (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {student.email}
                                                                    </span>
                                                                ) : (
                                                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                                                                        No email
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            {viewData.analytics.subject_averages.map((subj) => {
                                                                const subjectKey = student.subjects
                                                                    ? Object.keys(student.subjects).find(
                                                                          (k) =>
                                                                              student.subjects[k]?.name ===
                                                                              subj.subject,
                                                                      )
                                                                    : undefined;
                                                                const storedVal =
                                                                    subjectKey && student.subjects
                                                                        ? student.subjects[subjectKey]?.score
                                                                        : null;
                                                                return (
                                                                    <TableCell key={subj.subject} className="p-1 text-center">
                                                                        {isEditing && subjectKey ? (
                                                                            <input
                                                                                type="text"
                                                                                value={editedScores[subjectKey] ?? storedVal ?? ''}
                                                                                onChange={(e) =>
                                                                                    setEditedScores((prev) => ({
                                                                                        ...prev,
                                                                                        [subjectKey]: e.target.value,
                                                                                    }))
                                                                                }
                                                                                className="w-14 rounded border px-1 py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                                                            />
                                                                        ) : (
                                                                            storedVal ?? '—'
                                                                        )}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                            <TableCell className="text-right font-medium">
                                                                {student.total}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {Number(student.average ?? 0).toFixed(1)}%
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1">
                                                                    {isEditing ? (
                                                                        <>
                                                                            <button
                                                                                title="Save"
                                                                                disabled={savingRow}
                                                                                onClick={() => saveRow(student)}
                                                                                className="rounded p-1 text-green-600 hover:bg-green-50"
                                                                            >
                                                                                <Check className="h-4 w-4" />
                                                                            </button>
                                                                            <button
                                                                                title="Cancel"
                                                                                onClick={() => setEditingRowId(null)}
                                                                                className="rounded p-1 text-muted-foreground hover:bg-muted"
                                                                            >
                                                                                <X className="h-4 w-4" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                title="Edit"
                                                                                onClick={() => startEditing(student)}
                                                                                className="rounded p-1 hover:bg-muted"
                                                                            >
                                                                                <Pencil className="h-3.5 w-3.5" />
                                                                            </button>
                                                                            <button
                                                                                title="Delete student results"
                                                                                onClick={() => setDeleteStudentId(student.user_id)}
                                                                                className="rounded p-1 text-destructive hover:bg-destructive/10"
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {viewData.students.length === 0 && (
                                        <p className="py-8 text-center text-muted-foreground">
                                            No results in the database for this class and term.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                    </div>
                )}

                {/* Delete student confirm */}
                {deleteStudentId !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="bg-background w-full max-w-sm rounded-xl border p-6 shadow-lg">
                            <h3 className="mb-2 text-base font-semibold">Delete student results?</h3>
                            <p className="text-muted-foreground mb-4 text-sm">
                                This will permanently remove this student&apos;s results for the
                                selected class and term. This cannot be undone.
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    className="rounded border px-4 py-1.5 text-sm"
                                    onClick={() => setDeleteStudentId(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={deletingStudent}
                                    className="rounded bg-destructive px-4 py-1.5 text-sm text-white hover:bg-destructive/90"
                                    onClick={() => deleteStudent(deleteStudentId)}
                                >
                                    {deletingStudent ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'import' && (
                <div className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Select class and term</CardTitle>
                        <CardDescription>
                            Headers will be set automatically based on the selected class.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleImport}>
                            <div className="flex flex-wrap gap-6 mb-6">
                                <div className="space-y-2 w-[200px]">
                                    <Label htmlFor="term">Term</Label>
                                    <Select
                                        value={selectedTermId?.toString() ?? ''}
                                        onValueChange={(v) => setSelectedTermId(Number(v) || null)}
                                    >
                                        <SelectTrigger id="term">
                                            <SelectValue placeholder="Select term" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {terms.map((t) => (
                                                <SelectItem key={t.id} value={t.id.toString()}>
                                                    {t.name} {t.academic_year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 w-[200px]">
                                    <Label htmlFor="class">Class</Label>
                                    <Select
                                        value={selectedClassId?.toString() ?? ''}
                                        onValueChange={(v) => {
                                            setSelectedClassId(Number(v) || null);
                                            setRows([]);
                                        }}
                                    >
                                        <SelectTrigger id="class">
                                            <SelectValue placeholder="Select class" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map((c) => (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                    {c.name}
                                                    {c.grade_code ? ` (${c.grade_code})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {selectedClass && (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>
                                                Headers
                                                {!gradeCode && (
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        (No template for this class)
                                                    </span>
                                                )}
                                            </Label>
                                            <div className="flex gap-2">
                                                {!isEditingHeaders ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setIsEditingHeaders(true)}
                                                    >
                                                        Edit headers
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={resetHeaders}
                                                        >
                                                            Reset
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="default"
                                                            size="sm"
                                                            onClick={saveHeaders}
                                                        >
                                                            Done
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {isEditingHeaders && (
                                            <div className="bg-muted/50 space-y-2 rounded-md border p-3">
                                                <p className="text-xs text-muted-foreground">
                                                    Click on a header to edit its name, or add/remove columns.
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {headers.map((h, i) => (
                                                        <div key={i} className="flex items-center gap-1">
                                                            <Input
                                                                value={h}
                                                                onChange={(e) =>
                                                                    updateHeaderName(i, e.target.value)
                                                                }
                                                                className="h-8 w-32 text-xs"
                                                                disabled={i === 0}
                                                            />
                                                            {i > 0 && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-destructive"
                                                                    onClick={() => removeHeaderColumn(i)}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8"
                                                        onClick={addHeaderColumn}
                                                    >
                                                        <Plus className="mr-1 h-3 w-3" />
                                                        Add column
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="overflow-x-auto border rounded-md">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    {headers.map((h, i) => (
                                                        <th
                                                            key={i}
                                                            className="border-r px-2 py-2 text-left font-semibold"
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                    <th className="px-2 py-2 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((row, rIdx) => (
                                                    <tr key={rIdx} className="border-t">
                                                        {headers.map((_, cIdx) => (
                                                            <td
                                                                key={cIdx}
                                                                className="border-r p-0"
                                                            >
                                                                <input
                                                                    type="text"
                                                                    className="w-full border-0 bg-transparent px-2 py-1.5 text-sm focus:bg-accent/5 focus:outline-none"
                                                                    value={row[cIdx] ?? ''}
                                                                    onChange={(e) =>
                                                                        updateCell(
                                                                            rIdx,
                                                                            cIdx,
                                                                            e.target.value,
                                                                        )
                                                                    }
                                                                    onPaste={
                                                                        cIdx === 0 && rIdx === rows.length - 1
                                                                            ? handlePaste
                                                                            : undefined
                                                                    }
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="px-2">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 text-destructive"
                                                                onClick={() => deleteRow(rIdx)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addRow}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add row
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={!canManage || importing || rows.length === 0}
                                        >
                                            {importing ? 'Importing…' : 'Import results'}
                                        </Button>
                                    </div>

                                    {importing && importProgress > 0 && (
                                        <Progress value={importProgress} className="mt-4" />
                                    )}

                                    {error && (
                                        <p className="mt-2 text-sm text-destructive">{error}</p>
                                    )}

                                    {importResult && (
                                        <div className="bg-muted/50 mt-4 rounded-md p-4">
                                            <p className="font-medium">Import complete</p>
                                            <p className="text-muted-foreground text-sm">
                                                Created: {importResult.created} • Updated:{' '}
                                                {importResult.updated}
                                            </p>
                                            {importResult.errors?.length > 0 && (
                                                <ul className="mt-2 list-inside list-disc text-sm text-destructive">
                                                    {importResult.errors.map((err, i) => (
                                                        <li key={i}>{err}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </form>
                    </CardContent>
                </Card>
                </div>
                )}
            </div>
        </AppLayout>
    );
}
