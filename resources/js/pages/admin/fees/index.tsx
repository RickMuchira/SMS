import { Head } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
    base_fee: number | null;
    uniform_fee?: number | null;
};

type Activity = {
    id: number;
    name: string;
    price: number | null;
};

type Props = {
    terms: Term[];
    classes: SchoolClass[];
    activities: Activity[];
};

type NotFoundStudent = {
    name: string;
    class: string;
};

type ImportResult = {
    updated_classes: number;
    updated_transport: number;
    activities_upserted: number;
    student_activities_created: number;
    debit_credit_updated?: number;
    amount_paid_updated?: number;
    errors: string[];
    not_found_students: NotFoundStudent[];
};

type PreviewIssue = {
    row: number | null;
    message: string;
    column?: string | null;
    class_name?: string;
    student_name?: string;
    class?: string;
};

type SheetReport = {
    header_ok: boolean;
    rows_valid?: number;
    rows_invalid?: number;
    rows_count?: number;
    issues: PreviewIssue[];
    activity_names?: string[];
    not_found_students?: NotFoundStudent[];
    undefined_activities?: string[];
};

type PreviewResult = {
    class_fees: SheetReport;
    transport_fees: SheetReport;
    activities: SheetReport;
    student_activities: SheetReport;
};

const CLASS_FEES_HEADERS = ['Class Name', 'Base Fee', 'Uniform Fee'];
const DEBIT_CREDIT_HEADERS = ['Student Name', 'Class', 'Debit Balance', 'Credit Balance'];
const AMOUNT_PAID_HEADERS = ['Student Name', 'Class', 'Amount Paid'];
const TRANSPORT_FEES_HEADERS = ['Student Name', 'Class', 'Transport Fee', 'Student Email'];
const ACTIVITIES_HEADERS = ['Activity Name', 'Price'];

/** Preferred column order for extracurricular activities in StudentActivities sheet */
const ACTIVITY_COLUMN_ORDER = ['Skating', 'Chess', 'Ballet', 'Taekwondo', 'Music'];

function sortActivitiesByPreferredOrder(activities: Activity[]): Activity[] {
    return [...activities].sort((a, b) => {
        const ia = ACTIVITY_COLUMN_ORDER.indexOf(a.name);
        const ib = ACTIVITY_COLUMN_ORDER.indexOf(b.name);
        if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Fees', href: '/admin/fees' },
];

function parsePaste(text: string): string[][] {
    return text
        .trim()
        .split(/\r?\n/)
        .map((line) => line.split(/[\t,]/).map((c) => c.trim()));
}

export default function AdminFeesIndex({ terms, classes, activities }: Props) {
    const { hasPermission } = usePermissions();
    const canManageStudents = hasPermission('manage students');

    const [selectedTermId, setSelectedTermId] = useState<number | null>(
        terms.find((t) => t.is_active)?.id ?? terms[0]?.id ?? null,
    );
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [disapprovedKeys, setDisapprovedKeys] = useState<Set<string>>(new Set());
    const [createdKeys, setCreatedKeys] = useState<Set<string>>(new Set());
    const [approvingKey, setApprovingKey] = useState<string | null>(null);
    const [approveError, setApproveError] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [importMode, setImportMode] = useState<'spreadsheet' | 'upload'>('spreadsheet');
    const [activeSheet, setActiveSheet] = useState<'class' | 'transport' | 'activities' | 'student' | 'debitCredit' | 'amountPaid'>('class');
    const [classFeesRows, setClassFeesRows] = useState<string[][]>(
        classes.map((c) => [c.name, String(c.base_fee ?? ''), String(c.uniform_fee ?? '')]),
    );
    const [transportFeesRows, setTransportFeesRows] = useState<string[][]>([]);
    const [activitiesRows, setActivitiesRows] = useState<string[][]>(() =>
        sortActivitiesByPreferredOrder(activities).map((a) => [a.name, String(a.price ?? '')]),
    );
    const [studentActivitiesRows, setStudentActivitiesRows] = useState<string[][]>([]);
    const [debitCreditRows, setDebitCreditRows] = useState<string[][]>([]);
    const [amountPaidRows, setAmountPaidRows] = useState<string[][]>([]);

    const selectedTerm = useMemo(
        () => terms.find((t) => t.id === selectedTermId) ?? null,
        [terms, selectedTermId],
    );

    async function handleImport(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!selectedTermId) {
            setError('Please select a term before importing fees.');

            return;
        }

        const formData = new FormData(e.currentTarget);
        formData.set('term_id', String(selectedTermId));

        setImporting(true);
        setImportProgress(0);
        setImportResult(null);
        setError(null);

        try {
            const csrf = getCsrfToken();

            const progressInterval = setInterval(() => {
                setImportProgress((prev) => {
                    if (prev >= 90) {
                        return prev;
                    }

                    return prev + 10;
                });
            }, 200);

            const res = await fetch('/admin/api/fees/import', {
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
                const errBody = (await res.json().catch(() => null)) as
                    | { message?: string; errors?: Record<string, string[] | string> }
                    | null;

                if (errBody?.errors) {
                    const firstError =
                        Object.values(errBody.errors)
                            .flat()
                            .find((msg) => Boolean(msg)) ?? errBody.message;

                    throw new Error((firstError as string | undefined) ?? 'Failed to import fees.');
                }

                throw new Error(errBody?.message ?? 'Failed to import fees.');
            }

            const result = (await res.json()) as ImportResult;
            setImportResult(result);
            setDisapprovedKeys(new Set());
            setCreatedKeys(new Set());
            setApproveError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred while importing fees.');
        } finally {
            setImporting(false);
            setTimeout(() => setImportProgress(0), 1_000);
        }
    }

    async function handleSpreadsheetProcess(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedTermId) {
            setError('Please select a term before importing.');
            return;
        }
        setImporting(true);
        setImportResult(null);
        setError(null);
        setDisapprovedKeys(new Set());
        setCreatedKeys(new Set());
        setApproveError(null);
        try {
            const csrf = getCsrfToken();
            const res = await fetch('/admin/api/fees/import/from-spreadsheet', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    term_id: selectedTermId,
                    class_fees: classFeesRows,
                    transport_fees: transportFeesRows,
                    activities: [...activitiesRows].sort((a, b) => {
                        const na = (a[0] ?? '').trim();
                        const nb = (b[0] ?? '').trim();
                        const ia = ACTIVITY_COLUMN_ORDER.indexOf(na);
                        const ib = ACTIVITY_COLUMN_ORDER.indexOf(nb);
                        if (ia === -1 && ib === -1) return na.localeCompare(nb);
                        if (ia === -1) return 1;
                        if (ib === -1) return -1;
                        return ia - ib;
                    }),
                    student_activities: studentActivitiesRows,
                    debit_credit: debitCreditRows,
                    amount_paid: amountPaidRows,
                }),
            });
            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message ?? 'Failed to import.');
            }
            const result = (await res.json()) as ImportResult;
            setImportResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import fees.');
        } finally {
            setImporting(false);
        }
    }

    function deleteRow(
        setter: React.Dispatch<React.SetStateAction<string[][]>>,
        rowIdx: number,
    ) {
        setter((prev) => prev.filter((_, i) => i !== rowIdx));
    }

    function addRow(
        setter: React.Dispatch<React.SetStateAction<string[][]>>,
        numCols: number,
    ) {
        setter((prev) => [...prev, Array(numCols).fill('')]);
    }

    function updateCell(
        setter: React.Dispatch<React.SetStateAction<string[][]>>,
        rowIdx: number,
        colIdx: number,
        value: string,
    ) {
        setter((prev) => {
            const next = prev.map((r) => [...r]);
            if (!next[rowIdx]) next[rowIdx] = Array(prev[0]?.length ?? 1).fill('');
            next[rowIdx][colIdx] = value;
            return next;
        });
    }

    function handlePaste(
        setter: React.Dispatch<React.SetStateAction<string[][]>>,
        numCols: number,
        e: React.ClipboardEvent,
    ) {
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        const rows = parsePaste(text);
        if (rows.length === 0) return;
        setter((prev) => [
            ...prev,
            ...rows.map((row) => {
                const filled = row.slice(0, numCols).map((c) => c ?? '');
                return [...filled, ...Array(Math.max(0, numCols - filled.length)).fill('')];
            }),
        ]);
    }

    const activityNames = useMemo(() => {
        const names = activitiesRows.map((r) => r[0]?.trim() ?? '').filter(Boolean);
        return [...names].sort((a, b) => {
            const ia = ACTIVITY_COLUMN_ORDER.indexOf(a);
            const ib = ACTIVITY_COLUMN_ORDER.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });
    }, [activitiesRows]);
    const studentActivitiesCols = 2 + activityNames.length;

    async function handleAnalyze(e: React.MouseEvent) {
        e.preventDefault();
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            setError('Please select a file first.');
            return;
        }
        setAnalyzing(true);
        setPreviewResult(null);
        setError(null);
        try {
            const csrf = getCsrfToken();
            const formData = new FormData();
            formData.set('file', file);
            const res = await fetch('/admin/api/fees/import/preview', {
                method: 'POST',
                headers: { Accept: 'application/json', ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}) },
                credentials: 'same-origin',
                body: formData,
            });
            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message ?? 'Failed to analyze file.');
            }
            const result = (await res.json()) as PreviewResult;
            setPreviewResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to analyze file.');
        } finally {
            setAnalyzing(false);
        }
    }

    function keyFor(s: NotFoundStudent) {
        return `${s.name}|${s.class}`;
    }

    function handleDisapprove(s: NotFoundStudent) {
        setDisapprovedKeys((prev) => new Set(prev).add(keyFor(s)));
    }

    async function handleApprove(s: NotFoundStudent) {
        if (!canManageStudents) return;
        const key = keyFor(s);
        setApprovingKey(key);
        setApproveError(null);
        try {
            const csrf = getCsrfToken();
            const res = await fetch('/admin/api/fees/import/create-students', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ students: [s] }),
            });
            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(body?.message ?? 'Failed to create student.');
            }
            setCreatedKeys((prev) => new Set(prev).add(key));
        } catch (err) {
            setApproveError(err instanceof Error ? err.message : 'Failed to create student.');
        } finally {
            setApprovingKey(null);
        }
    }

    const notFoundStudents =
        importResult?.not_found_students?.filter(
            (s) => !disapprovedKeys.has(keyFor(s)) && !createdKeys.has(keyFor(s)),
        ) ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fees" />

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Fees dashboard</CardTitle>
                        <CardDescription>
                            View and manage school fees by term. Import via spreadsheet or Excel upload.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline" size="sm">
                                <a href="/admin/fees/summary">Fee summary</a>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <a href="/admin/fees/activities">Manage activities</a>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <a href="/admin/fees/classes">Manage class base fees</a>
                            </Button>
                        </div>

                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                            <Label htmlFor="term-select">Current term</Label>
                            <select
                                id="term-select"
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm md:w-64"
                                value={selectedTermId ?? ''}
                                onChange={(event) =>
                                    setSelectedTermId(
                                        event.target.value ? Number(event.target.value) : null,
                                    )
                                }
                            >
                                {terms.length === 0 ? (
                                    <option value="">No terms configured</option>
                                ) : (
                                    terms.map((term) => (
                                        <option key={term.id} value={term.id}>
                                            {term.name}
                                        </option>
                                    ))
                                )}
                            </select>
                            {selectedTerm && (
                                <p className="text-xs text-muted-foreground">
                                    Managing fees for{' '}
                                    <span className="font-medium">
                                        {selectedTerm.name}
                                    </span>
                                    .
                                </p>
                            )}
                        </div>

                        <div className="flex w-full flex-col gap-4 md:w-auto md:items-end">
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={importMode === 'spreadsheet' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setImportMode('spreadsheet')}
                                >
                                    Spreadsheet
                                </Button>
                                <Button
                                    type="button"
                                    variant={importMode === 'upload' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setImportMode('upload')}
                                >
                                    Upload Excel
                                </Button>
                            </div>

                            {importMode === 'spreadsheet' ? (
                                <form
                                    onSubmit={handleSpreadsheetProcess}
                                    className="flex w-full max-w-4xl flex-col gap-4"
                                >
                                    <div className="flex flex-wrap gap-2">
                                        {(['class', 'transport', 'activities', 'student', 'debitCredit', 'amountPaid'] as const).map((sheet) => (
                                            <Button
                                                key={sheet}
                                                type="button"
                                                variant={activeSheet === sheet ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setActiveSheet(sheet)}
                                            >
                                                {sheet === 'class' && 'ClassFees'}
                                                {sheet === 'transport' && 'TransportFees'}
                                                {sheet === 'activities' && 'Activities'}
                                                {sheet === 'student' && 'StudentActivities'}
                                                {sheet === 'debitCredit' && 'DebitCredit'}
                                                {sheet === 'amountPaid' && 'AmountPaid'}
                                            </Button>
                                        ))}
                                    </div>

                                    {activeSheet === 'class' && (
                                        <div
                                            className="overflow-x-auto rounded-md border"
                                            onPasteCapture={(e) => handlePaste(setClassFeesRows, 3, e)}
                                        >
                                            <table className="w-full min-w-[380px] text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/50">
                                                        {CLASS_FEES_HEADERS.map((h) => (
                                                            <th key={h} className="px-3 py-2 text-left font-medium">
                                                                {h}
                                                            </th>
                                                        ))}
                                                        <th className="px-3 py-2 text-left font-medium w-16">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {classFeesRows.map((row, ri) => (
                                                        <tr key={ri} className="border-b">
                                                            {[0, 1, 2].map((ci) => (
                                                                <td key={ci} className="p-0">
                                                                    <input
                                                                        className="w-full min-w-[100px] border-0 px-3 py-2 focus:ring-1 focus:ring-ring"
                                                                        value={row[ci] ?? ''}
                                                                        placeholder={ci === 2 ? '(optional)' : undefined}
                                                                        onChange={(e) =>
                                                                            updateCell(setClassFeesRows, ri, ci, e.target.value)
                                                                        }
                                                                    />
                                                                </td>
                                                            ))}
                                                            <td className="p-0">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-full"
                                                                    onClick={() => deleteRow(setClassFeesRows, ri)}
                                                                >
                                                                    ×
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="m-2"
                                                onClick={() => addRow(setClassFeesRows, 3)}
                                            >
                                                Add row
                                            </Button>
                                        </div>
                                    )}

                                    {activeSheet === 'transport' && (
                                        <div
                                            className="overflow-x-auto rounded-md border"
                                            onPasteCapture={(e) => handlePaste(setTransportFeesRows, 4, e)}
                                        >
                                            <table className="w-full min-w-[480px] text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/50">
                                                        {TRANSPORT_FEES_HEADERS.map((h) => (
                                                            <th key={h} className="px-3 py-2 text-left font-medium">
                                                                {h}
                                                            </th>
                                                        ))}
                                                        <th className="px-3 py-2 text-left font-medium w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {transportFeesRows.map((row, ri) => (
                                                        <tr key={ri} className="border-b">
                                                            {[0, 1, 2, 3].map((ci) => (
                                                                <td key={ci} className="p-0">
                                                                    <input
                                                                        className="w-full min-w-[100px] border-0 px-3 py-2 focus:ring-1 focus:ring-ring"
                                                                        value={row[ci] ?? ''}
                                                                        onChange={(e) =>
                                                                            updateCell(setTransportFeesRows, ri, ci, e.target.value)
                                                                        }
                                                                        placeholder={ci === 3 ? '(optional)' : undefined}
                                                                    />
                                                                </td>
                                                            ))}
                                                            <td className="p-0">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-full"
                                                                    onClick={() => deleteRow(setTransportFeesRows, ri)}
                                                                >
                                                                    ×
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="m-2"
                                                onClick={() => addRow(setTransportFeesRows, 4)}
                                            >
                                                Add row
                                            </Button>
                                        </div>
                                    )}

                                    {activeSheet === 'activities' && (
                                        <div
                                            className="overflow-x-auto rounded-md border"
                                            onPasteCapture={(e) => handlePaste(setActivitiesRows, 2, e)}
                                        >
                                            <table className="w-full min-w-[280px] text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/50">
                                                        {ACTIVITIES_HEADERS.map((h) => (
                                                            <th key={h} className="px-3 py-2 text-left font-medium">
                                                                {h}
                                                            </th>
                                                        ))}
                                                        <th className="px-3 py-2 text-left font-medium w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activitiesRows.map((row, ri) => (
                                                        <tr key={ri} className="border-b">
                                                            {[0, 1].map((ci) => (
                                                                <td key={ci} className="p-0">
                                                                    <input
                                                                        className="w-full min-w-[100px] border-0 px-3 py-2 focus:ring-1 focus:ring-ring"
                                                                        value={row[ci] ?? ''}
                                                                        onChange={(e) =>
                                                                            updateCell(setActivitiesRows, ri, ci, e.target.value)
                                                                        }
                                                                    />
                                                                </td>
                                                            ))}
                                                            <td className="p-0">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-full"
                                                                    onClick={() => deleteRow(setActivitiesRows, ri)}
                                                                >
                                                                    ×
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="m-2"
                                                onClick={() => addRow(setActivitiesRows, 2)}
                                            >
                                                Add row
                                            </Button>
                                        </div>
                                    )}

                                    {activeSheet === 'student' && (
                                        <div
                                            className="overflow-x-auto rounded-md border"
                                            onPasteCapture={(e) => handlePaste(setStudentActivitiesRows, studentActivitiesCols, e)}
                                        >
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/50">
                                                        <th className="px-3 py-2 text-left font-medium">Student Name</th>
                                                        <th className="px-3 py-2 text-left font-medium">Class</th>
                                                        {activityNames.map((name) => (
                                                            <th key={name} className="min-w-[80px] px-3 py-2 text-left font-medium">
                                                                {name || '(add in Activities)'}
                                                            </th>
                                                        ))}
                                                        {activityNames.length === 0 && (
                                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                                                Add activities first
                                                            </th>
                                                        )}
                                                        <th className="px-3 py-2 text-left font-medium w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {studentActivitiesRows.map((row, ri) => (
                                                        <tr key={ri} className="border-b">
                                                            {Array.from({ length: studentActivitiesCols }, (_, ci) => (
                                                                <td key={ci} className="p-0">
                                                                    <input
                                                                        className="w-full min-w-[80px] border-0 px-3 py-2 focus:ring-1 focus:ring-ring"
                                                                        value={row[ci] ?? ''}
                                                                        placeholder={ci >= 2 ? 'yes/no' : undefined}
                                                                        onChange={(e) =>
                                                                            updateCell(setStudentActivitiesRows, ri, ci, e.target.value)
                                                                        }
                                                                    />
                                                                </td>
                                                            ))}
                                                            <td className="p-0">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-full"
                                                                    onClick={() => deleteRow(setStudentActivitiesRows, ri)}
                                                                >
                                                                    ×
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="m-2"
                                                onClick={() =>
                                                    setStudentActivitiesRows((prev) => [
                                                        ...prev,
                                                        Array(studentActivitiesCols).fill(''),
                                                    ])
                                                }
                                            >
                                                Add row
                                            </Button>
                                        </div>
                                    )}

                                    {activeSheet === 'debitCredit' && (
                                        <div
                                            className="overflow-x-auto rounded-md border"
                                            onPasteCapture={(e) => handlePaste(setDebitCreditRows, 4, e)}
                                        >
                                            <table className="w-full min-w-[480px] text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/50">
                                                        {DEBIT_CREDIT_HEADERS.map((h) => (
                                                            <th key={h} className="px-3 py-2 text-left font-medium">
                                                                {h}
                                                            </th>
                                                        ))}
                                                        <th className="px-3 py-2 text-left font-medium w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {debitCreditRows.map((row, ri) => (
                                                        <tr key={ri} className="border-b">
                                                            {[0, 1, 2, 3].map((ci) => (
                                                                <td key={ci} className="p-0">
                                                                    <input
                                                                        className="w-full min-w-[100px] border-0 px-3 py-2 focus:ring-1 focus:ring-ring"
                                                                        value={row[ci] ?? ''}
                                                                        onChange={(e) =>
                                                                            updateCell(setDebitCreditRows, ri, ci, e.target.value)
                                                                        }
                                                                        placeholder={ci >= 2 ? '0' : undefined}
                                                                    />
                                                                </td>
                                                            ))}
                                                            <td className="p-0">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-full"
                                                                    onClick={() => deleteRow(setDebitCreditRows, ri)}
                                                                >
                                                                    ×
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="m-2"
                                                onClick={() => addRow(setDebitCreditRows, 4)}
                                            >
                                                Add row
                                            </Button>
                                        </div>
                                    )}

                                    {activeSheet === 'amountPaid' && (
                                        <div
                                            className="overflow-x-auto rounded-md border"
                                            onPasteCapture={(e) => handlePaste(setAmountPaidRows, 3, e)}
                                        >
                                            <table className="w-full min-w-[360px] text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/50">
                                                        {AMOUNT_PAID_HEADERS.map((h) => (
                                                            <th key={h} className="px-3 py-2 text-left font-medium">
                                                                {h}
                                                            </th>
                                                        ))}
                                                        <th className="px-3 py-2 text-left font-medium w-16"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {amountPaidRows.map((row, ri) => (
                                                        <tr key={ri} className="border-b">
                                                            {[0, 1, 2].map((ci) => (
                                                                <td key={ci} className="p-0">
                                                                    <input
                                                                        className="w-full min-w-[100px] border-0 px-3 py-2 focus:ring-1 focus:ring-ring"
                                                                        value={row[ci] ?? ''}
                                                                        onChange={(e) =>
                                                                            updateCell(setAmountPaidRows, ri, ci, e.target.value)
                                                                        }
                                                                        placeholder={ci === 2 ? '0' : undefined}
                                                                    />
                                                                </td>
                                                            ))}
                                                            <td className="p-0">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-full"
                                                                    onClick={() => deleteRow(setAmountPaidRows, ri)}
                                                                >
                                                                    ×
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="m-2"
                                                onClick={() => addRow(setAmountPaidRows, 3)}
                                            >
                                                Add row
                                            </Button>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        You can paste from Excel or CSV (tab/comma separated). For activity columns use &quot;yes&quot; or &quot;no&quot;.
                                    </p>
                                    <Button type="submit" disabled={importing}>
                                        {importing ? 'Processing…' : 'Process import'}
                                    </Button>
                                    {error && <p className="text-xs text-red-500">{error}</p>}
                                </form>
                            ) : (
                                <form
                                    onSubmit={handleImport}
                                    className="flex w-full flex-col gap-3 md:w-80"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="fees-file">Fee Excel file</Label>
                                        <Input
                                            ref={fileInputRef}
                                            id="fees-file"
                                            name="file"
                                            type="file"
                                            accept=".xlsx,.xls"
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Expected sheets: ClassFees, TransportFees, Activities, StudentActivities.
                                        </p>
                                    </div>

                                    {importing && importProgress > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">Importing fees…</span>
                                                <span className="font-medium">{importProgress}%</span>
                                            </div>
                                            <Progress value={importProgress} />
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={analyzing || importing}
                                            onClick={handleAnalyze}
                                        >
                                            {analyzing ? 'Analyzing…' : 'Analyze file'}
                                        </Button>
                                        <Button type="submit" disabled={importing || analyzing}>
                                            {importing ? 'Importing fees…' : 'Upload & import fees'}
                                        </Button>
                                    </div>

                                    {error && (
                                        <p className="text-xs text-red-500">
                                            {error}
                                        </p>
                                    )}
                                </form>
                            )}

                            {importResult && (
                                <div className="mt-2 w-full rounded-md border px-3 py-2 text-xs md:w-80">
                                    <p className="font-medium">Import completed</p>
                                    <div className="mt-1 space-y-0.5 text-muted-foreground">
                                        <p>
                                            <span className="font-medium text-foreground">
                                                {importResult.updated_classes}
                                            </span>{' '}
                                            classes updated
                                        </p>
                                        <p>
                                            <span className="font-medium text-foreground">
                                                {importResult.updated_transport}
                                            </span>{' '}
                                            transport fees updated
                                        </p>
                                        <p>
                                            <span className="font-medium text-foreground">
                                                {importResult.activities_upserted}
                                            </span>{' '}
                                            activities saved
                                        </p>
                                        <p>
                                            <span className="font-medium text-foreground">
                                                {importResult.student_activities_created}
                                            </span>{' '}
                                            student activities created
                                        </p>
                                        {typeof importResult.debit_credit_updated === 'number' && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    {importResult.debit_credit_updated}
                                                </span>{' '}
                                                debit/credit records updated
                                            </p>
                                        )}
                                        {typeof importResult.amount_paid_updated === 'number' && (
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    {importResult.amount_paid_updated}
                                                </span>{' '}
                                                amount paid records updated
                                            </p>
                                        )}
                                    </div>
                                    {importResult.errors.length > 0 && (
                                        <div className="mt-2 space-y-1 text-red-600">
                                            <p className="font-medium">
                                                {importResult.errors.length} warning
                                                {importResult.errors.length > 1 ? 's' : ''}:
                                            </p>
                                            <ul className="max-h-32 list-inside list-disc overflow-y-auto">
                                                {importResult.errors.map((msg, index) => (
                                                    <li key={index}>{msg}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground max-w-xs text-right">
                                Upload your Excel sheet (base fee, transport, and activities). The system will update
                                classes, transport fees, and extracurricular activities for the selected term.
                            </p>
                        </div>
                        </div>
                    </CardContent>
                </Card>

                {importResult && (importResult.not_found_students?.length ?? 0) > 0 && (
                    <Card className="border-amber-500/50 dark:border-amber-800">
                        <CardHeader>
                            <CardTitle className="text-amber-800 dark:text-amber-200">
                                Students not found in system
                            </CardTitle>
                            <CardDescription>
                                These students appear in your fee import but do not exist in the system yet.
                                Approve to create them (requires manage students), or disapprove to dismiss.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {approveError && (
                                <p className="mb-3 text-sm text-red-600 dark:text-red-400">
                                    {approveError}
                                </p>
                            )}
                            {notFoundStudents.length > 0 ? (
                                <div className="space-y-2">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="pb-2 font-medium">Name</th>
                                                <th className="pb-2 font-medium">Recorded class</th>
                                                <th className="pb-2 font-medium text-right">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {notFoundStudents.map((s) => {
                                                const key = keyFor(s);
                                                const isApproving = approvingKey === key;

                                                return (
                                                    <tr key={key} className="border-b last:border-0">
                                                        <td className="py-2 font-medium">{s.name}</td>
                                                        <td className="py-2 text-muted-foreground">
                                                            {s.class}
                                                        </td>
                                                        <td className="py-2 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={
                                                                        !canManageStudents ||
                                                                        isApproving
                                                                    }
                                                                    onClick={() =>
                                                                        handleApprove(s)
                                                                    }
                                                                >
                                                                    {isApproving
                                                                        ? 'Creating…'
                                                                        : 'Approve'}
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    disabled={isApproving}
                                                                    onClick={() =>
                                                                        handleDisapprove(s)
                                                                    }
                                                                >
                                                                    Disapprove
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    All listed students have been reviewed. Approved students were
                                    created; disapproved ones were dismissed.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>By student</CardTitle>
                        <CardDescription>
                            A detailed list of students, their debit / credit balances, and payments for the
                            selected term will appear here.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            We&apos;ve set up the database layer (terms, fee structures, student fees, and
                            payments). Next step is wiring this view to those tables and your Excel import so
                            you can search students, filter by class, and drill into individual statements.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

