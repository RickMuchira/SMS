import AppLayout from '@/layouts/app-layout';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Award, TrendingUp, Users, BookOpen } from 'lucide-react';

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
    total: number;
    average: number;
    count: number;
    position: number;
};

type Analytics = {
    total_students: number;
    class_average: number;
    highest_score: number;
    lowest_score: number;
    subject_averages: Array<{
        subject: string;
        average: number;
        count: number;
    }>;
};

type ResultsData = {
    class: SchoolClass;
    term: AcademicTerm;
    students: StudentResult[];
    analytics: Analytics;
};

export default function AdminResultsView({
    terms,
    classes,
}: {
    terms: AcademicTerm[];
    classes: SchoolClass[];
}) {
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [resultsData, setResultsData] = useState<ResultsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setResultsData(null);
        } finally {
            setLoading(false);
        }
    };

    const breadcrumbs = [
        { label: 'Dashboard', href: '/admin/dashboard' },
        { label: 'Results', href: '/admin/results' },
        { label: 'View Analytics', href: '/admin/results/view' },
    ];

    const GRADE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="View Results & Analytics" />

            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Results Analytics</h1>
                        <p className="text-muted-foreground">
                            View class performance, rankings, and insights
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Class & Term</CardTitle>
                        <CardDescription>Choose a class and term to view results</CardDescription>
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
                                    {loading ? 'Loading...' : 'View Results'}
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {resultsData && (
                    <>
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Total Students
                                    </CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {resultsData.analytics.total_students}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Class Average
                                    </CardTitle>
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {resultsData.analytics.class_average.toFixed(1)}%
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Highest Score
                                    </CardTitle>
                                    <Award className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {resultsData.analytics.highest_score}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Lowest Score
                                    </CardTitle>
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {resultsData.analytics.lowest_score}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Subject Performance</CardTitle>
                                    <CardDescription>Average score per subject</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={resultsData.analytics.subject_averages}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="subject" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="average" fill="#3b82f6" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Top 10 Students</CardTitle>
                                    <CardDescription>Ranked by total marks</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {resultsData.students.slice(0, 10).map((student) => (
                                            <div
                                                key={student.user_id}
                                                className="flex items-center justify-between rounded-md border p-2"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                                        {student.position}
                                                    </div>
                                                    <span className="font-medium">
                                                        {student.name}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold">{student.total}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {student.average.toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>All Students Results</CardTitle>
                                <CardDescription>
                                    Complete results for {resultsData.class.name} -{' '}
                                    {resultsData.term.name}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-16">Position</TableHead>
                                                <TableHead>Student Name</TableHead>
                                                {resultsData.analytics.subject_averages.map(
                                                    (subj) => (
                                                        <TableHead key={subj.subject}>
                                                            {subj.subject}
                                                        </TableHead>
                                                    )
                                                )}
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead className="text-right">Average</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {resultsData.students.map((student) => (
                                                <TableRow key={student.user_id}>
                                                    <TableCell className="font-bold">
                                                        {student.position}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {student.name}
                                                    </TableCell>
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
                                                            return (
                                                                <TableCell key={subj.subject}>
                                                                    {result?.score ?? '-'}
                                                                </TableCell>
                                                            );
                                                        }
                                                    )}
                                                    <TableCell className="text-right font-bold">
                                                        {student.total}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {student.average.toFixed(1)}%
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
