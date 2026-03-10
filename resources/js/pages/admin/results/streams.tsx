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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp } from 'lucide-react';
import { getCsrfToken } from '@/lib/csrf';

type AcademicTerm = {
    id: number;
    name: string;
    term_number: number;
    academic_year: string;
    is_active: boolean;
};

type StreamData = {
    class_id: number;
    class_name: string;
    student_count: number;
    average_score: number;
    total_results: number;
};

type ComparisonData = {
    grade_code: string;
    term_id: number;
    streams: StreamData[];
};

export default function AdminStreamsComparison({
    terms,
    streams,
}: {
    terms: AcademicTerm[];
    streams: Record<string, Array<{ id: number; name: string }>>;
}) {
    const [selectedGradeCode, setSelectedGradeCode] = useState<string>('');
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeTerm = terms.find((t) => t.is_active);
    useEffect(() => {
        if (activeTerm && !selectedTermId) {
            setSelectedTermId(activeTerm.id.toString());
        }
    }, [activeTerm, selectedTermId]);

    const fetchComparison = async () => {
        if (!selectedGradeCode || !selectedTermId) {
            setError('Please select a grade and term');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/admin/api/results/streams/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    grade_code: selectedGradeCode,
                    academic_term_id: parseInt(selectedTermId),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch comparison');
            }

            const data = await response.json();
            setComparisonData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setComparisonData(null);
        } finally {
            setLoading(false);
        }
    };

    const breadcrumbs = [
        { label: 'Dashboard', href: '/admin/dashboard' },
        { label: 'Results', href: '/admin/results' },
        { label: 'Stream Comparison', href: '/admin/results/streams' },
    ];

    const gradeOptions = Object.keys(streams).sort();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Stream Comparison" />

            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Stream Comparison</h1>
                        <p className="text-muted-foreground">
                            Compare performance across different streams
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Grade & Term</CardTitle>
                        <CardDescription>Choose a grade with multiple streams and a term</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Grade</label>
                                <Select value={selectedGradeCode} onValueChange={setSelectedGradeCode}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {gradeOptions.map((gradeCode) => (
                                            <SelectItem key={gradeCode} value={gradeCode}>
                                                {gradeCode} ({streams[gradeCode].length} streams)
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
                                    onClick={fetchComparison}
                                    disabled={!selectedGradeCode || !selectedTermId || loading}
                                    className="w-full"
                                >
                                    {loading ? 'Loading...' : 'Compare Streams'}
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

                {comparisonData && (
                    <>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Average Performance by Stream</CardTitle>
                                    <CardDescription>
                                        Comparison of average scores across streams
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={comparisonData.streams}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="class_name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="average_score" fill="#3b82f6" name="Average Score" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Student Count by Stream</CardTitle>
                                    <CardDescription>
                                        Number of students in each stream
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={comparisonData.streams}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="class_name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="student_count" fill="#10b981" name="Students" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Stream Details</CardTitle>
                                <CardDescription>
                                    Detailed statistics for each stream
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-3">
                                    {comparisonData.streams.map((stream) => (
                                        <Card key={stream.class_id}>
                                            <CardHeader>
                                                <CardTitle className="text-lg">
                                                    {stream.class_name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm text-muted-foreground">
                                                            Students
                                                        </span>
                                                    </div>
                                                    <span className="font-bold">
                                                        {stream.student_count}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm text-muted-foreground">
                                                            Average Score
                                                        </span>
                                                    </div>
                                                    <span className="font-bold">
                                                        {stream.average_score.toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-muted-foreground">
                                                        Total Results
                                                    </span>
                                                    <span className="font-medium">
                                                        {stream.total_results}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
