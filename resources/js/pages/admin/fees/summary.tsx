import { Head, router } from '@inertiajs/react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Term = {
    id: number;
    name: string;
    term_number: string;
    academic_year: string;
    is_active: boolean;
};

type SummaryRow = {
    student_name: string;
    class: string;
    debit_balance: number;
    credit_balance: number;
    base_fee: number;
    uniform_fee: number;
    transport_fee: number;
    extra_activity_total: number;
    total_fee_this_term: number;
    amount_paid: number;
    closing_balance: number;
};

type Props = {
    terms: Term[];
    selectedTermId: number;
    summary: SummaryRow[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Fees', href: '/admin/fees' },
    { title: 'Fee Summary', href: '/admin/fees/summary' },
];

function formatCurrency(n: number): string {
    return new Intl.NumberFormat('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

const COLUMNS: { key: keyof SummaryRow; label: string }[] = [
    { key: 'student_name', label: 'Student Name' },
    { key: 'class', label: 'Class' },
    { key: 'debit_balance', label: 'Debit Balance' },
    { key: 'credit_balance', label: 'Credit Balance' },
    { key: 'base_fee', label: 'Base Fee' },
    { key: 'uniform_fee', label: 'Uniform Fee' },
    { key: 'transport_fee', label: 'Transport Fee' },
    { key: 'extra_activity_total', label: 'Extra Activity Total' },
    { key: 'total_fee_this_term', label: 'Total Fee This Term' },
    { key: 'amount_paid', label: 'Amount Paid' },
    { key: 'closing_balance', label: 'Closing Balance' },
];

export default function AdminFeesSummary({ terms, selectedTermId, summary }: Props) {
    function handleTermChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const id = e.target.value ? Number(e.target.value) : null;
        if (id) {
            router.get('/admin/fees/summary', { term_id: id }, { preserveState: false });
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fee Summary" />

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Fee summary</CardTitle>
                        <CardDescription>
                            Overall list of all students with debit/credit balances, fee breakdown, and closing balance for the selected term.
                        </CardDescription>
                        <div className="pt-2">
                            <label htmlFor="term-select" className="mr-2 text-sm text-muted-foreground">
                                Academic term:
                            </label>
                            <select
                                id="term-select"
                                value={selectedTermId}
                                onChange={handleTermChange}
                                className="rounded-md border bg-background px-2 py-1 text-sm"
                            >
                                {terms.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.academic_year})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full min-w-[900px] text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        {COLUMNS.map((col) => (
                                            <th key={col.key} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.length === 0 ? (
                                        <tr>
                                            <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-muted-foreground">
                                                No students found. Ensure students are enrolled and fee import has been run.
                                            </td>
                                        </tr>
                                    ) : (
                                        summary.map((row, idx) => (
                                            <tr key={idx} className="border-b hover:bg-muted/30">
                                                <td className="whitespace-nowrap px-3 py-2">{row.student_name}</td>
                                                <td className="whitespace-nowrap px-3 py-2">{row.class}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(row.debit_balance)}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(row.credit_balance)}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(row.base_fee)}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(row.uniform_fee)}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(row.transport_fee)}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(row.extra_activity_total)}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium">{formatCurrency(row.total_fee_this_term)}</td>
                                                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(row.amount_paid)}</td>
                                                <td
                                                    className={`whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium ${
                                                        row.closing_balance > 0 ? 'text-destructive' : row.closing_balance < 0 ? 'text-green-600' : ''
                                                    }`}
                                                >
                                                    {formatCurrency(row.closing_balance)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
