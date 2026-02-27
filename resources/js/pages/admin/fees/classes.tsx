import { Head } from '@inertiajs/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCsrfToken } from '@/lib/csrf';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type SchoolClass = {
    id: number;
    name: string;
    base_fee: number | null;
    description: string | null;
};

type Props = {
    classes: SchoolClass[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Fees', href: '/admin/fees' },
    { title: 'Class Base Fees', href: '/admin/fees/classes' },
];

export default function FeeClassesIndex({ classes: initialClasses }: Props) {
    const [classes, setClasses] = useState(initialClasses);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editFee, setEditFee] = useState('');

    async function handleUpdate(id: number, newFee: string) {
        setError(null);
        try {
            const csrf = getCsrfToken();
            const res = await fetch(`/admin/api/fees/classes/${id}`, {
                method: 'PATCH',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ base_fee: parseFloat(newFee) }),
            });
            if (!res.ok) throw new Error('Failed to update.');
            const updated = (await res.json()) as SchoolClass;
            setClasses((prev) => prev.map((c) => (c.id === id ? updated : c)));
            setEditingId(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update.');
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manage Class Base Fees" />

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Class base fees</CardTitle>
                        <CardDescription>
                            Set the base fee for each class. These are used in the fee import spreadsheet
                            and can be updated here or via the import.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
                        {classes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No classes found. Create classes in the Classes module first.
                            </p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-2 font-medium">Class name</th>
                                        <th className="pb-2 font-medium">Base fee</th>
                                        <th className="pb-2 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classes.map((cls) => (
                                        <tr key={cls.id} className="border-b">
                                            <td className="py-2">{cls.name}</td>
                                            <td className="py-2">
                                                {editingId === cls.id ? (
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={editFee}
                                                        onChange={(e) => setEditFee(e.target.value)}
                                                        className="w-32"
                                                    />
                                                ) : (
                                                    cls.base_fee ?? 'Not set'
                                                )}
                                            </td>
                                            <td className="py-2 text-right">
                                                {editingId === cls.id ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleUpdate(cls.id, editFee)}
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditingId(null)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditingId(cls.id);
                                                            setEditFee(String(cls.base_fee ?? ''));
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
