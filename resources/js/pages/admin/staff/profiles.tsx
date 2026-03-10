import { Head } from '@inertiajs/react';
import { Briefcase, Building2, DollarSign, Eye, Pencil, Search, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { getCsrfToken } from '@/lib/csrf';
import type { BreadcrumbItem } from '@/types';

type Department = {
    id: number;
    name: string;
    code: string;
};

type SalaryPreview = {
    gross_salary: number;
    total_allowances: number;
    nssf_employee: number;
    nssf_employer: number;
    shif: number;
    ahl_employee: number;
    ahl_employer: number;
    paye: number;
    total_custom_deductions: number;
    total_deductions: number;
    net_salary: number;
};

type StaffProfile = {
    id: number;
    employee_id: string;
    user: { id: number; name: string; email: string };
    job_title: string | null;
    department: Department | null;
    employment_type: string;
    employment_status: string;
    gross_monthly_salary: number;
    total_allowances: number;
    total_custom_deductions?: number;
    phone_number: string | null;
    national_id_number: string | null;
    gender: string | null;
    tsc_number: string | null;
    kra_pin: string | null;
    nssf_number: string | null;
    sha_shif_number: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_branch: string | null;
    next_of_kin_name: string | null;
    next_of_kin_relationship: string | null;
    next_of_kin_phone: string | null;
};

type PaginatedResponse = {
    data: StaffProfile[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Staff Profiles', href: '/admin/staff/profiles' },
];

const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract'];
const EMPLOYMENT_STATUS = ['active', 'suspended', 'terminated'];

export default function StaffProfilesIndex() {
    const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showViewDialog, setShowViewDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null);
    const [salaryPreview, setSalaryPreview] = useState<SalaryPreview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);

    // Create form state
    const [name, setName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [employmentType, setEmploymentType] = useState('full-time');
    const [employmentStatus, setEmploymentStatus] = useState('active');
    const [grossSalary, setGrossSalary] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editJobTitle, setEditJobTitle] = useState('');
    const [editDepartmentId, setEditDepartmentId] = useState('');
    const [editEmploymentType, setEditEmploymentType] = useState('full-time');
    const [editEmploymentStatus, setEditEmploymentStatus] = useState('active');
    const [editGrossSalary, setEditGrossSalary] = useState('');
    const [editNationalId, setEditNationalId] = useState('');
    const [editGender, setEditGender] = useState('');
    const [editTscNumber, setEditTscNumber] = useState('');
    const [editKraPin, setEditKraPin] = useState('');
    const [editNssfNumber, setEditNssfNumber] = useState('');
    const [editShaNumber, setEditShaNumber] = useState('');
    const [editBankName, setEditBankName] = useState('');
    const [editBankAccount, setEditBankAccount] = useState('');
    const [editNextOfKinName, setEditNextOfKinName] = useState('');
    const [editNextOfKinRelation, setEditNextOfKinRelation] = useState('');
    const [editNextOfKinPhone, setEditNextOfKinPhone] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);

    useEffect(() => {
        fetch('/admin/api/staff-departments', {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((data: { data: Department[] }) => setDepartments(data.data ?? []))
            .catch(() => setDepartments([]));
    }, []);

    useEffect(() => {
        fetchStaff();
    }, [searchTerm, filterDepartment, filterStatus, currentPage]);

    async function fetchStaff() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.set('search', searchTerm);
            if (filterDepartment) params.set('department_id', filterDepartment);
            if (filterStatus) params.set('employment_status', filterStatus);
            params.set('page', currentPage.toString());

            const res = await fetch(`/admin/api/staff?${params}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!res.ok) throw new Error('Failed to load staff');

            const data = (await res.json()) as PaginatedResponse;
            setStaffProfiles(data.data ?? []);
            setCurrentPage(data.meta.current_page);
            setTotalPages(data.meta.last_page);
            setTotal(data.meta.total);
            setError(null);
        } catch {
            setError('Unable to load staff profiles');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const csrf = getCsrfToken();
            const res = await fetch('/admin/api/staff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name,
                    phone_number: mobileNumber,
                    job_title: jobTitle,
                    department_id: departmentId ? parseInt(departmentId) : null,
                    employment_type: employmentType,
                    employment_status: employmentStatus,
                    gross_monthly_salary: parseFloat(grossSalary),
                }),
            });

            if (!res.ok) {
                const errBody = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(errBody?.message ?? 'Failed to create staff');
            }

            setShowCreateDialog(false);
            resetForm();
            fetchStaff();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setSubmitting(false);
        }
    }

    function resetForm() {
        setName('');
        setMobileNumber('');
        setJobTitle('');
        setDepartmentId('');
        setEmploymentType('full-time');
        setEmploymentStatus('active');
        setGrossSalary('');
        setError(null);
    }

    useEffect(() => {
        if (!selectedStaff || !showViewDialog) return;
        setLoadingPreview(true);
        setSalaryPreview(null);
        const now = new Date();
        const csrf = getCsrfToken();
        fetch('/admin/api/payroll/calculate-preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                staff_profile_id: selectedStaff.id,
                year: now.getFullYear(),
                month: now.getMonth() + 1,
            }),
        })
            .then((r) => r.ok ? r.json() : Promise.reject())
            .then((data: { data: SalaryPreview }) => setSalaryPreview(data.data))
            .catch(() => setSalaryPreview(null))
            .finally(() => setLoadingPreview(false));
    }, [selectedStaff?.id, showViewDialog]);

    function openEditDialog(staff: StaffProfile) {
        setSelectedStaff(staff);
        setEditName(staff.user.name);
        setEditEmail(staff.user.email);
        setEditPhone(staff.phone_number ?? '');
        setEditJobTitle(staff.job_title ?? '');
        setEditDepartmentId(staff.department_id?.toString() ?? '');
        setEditEmploymentType(staff.employment_type);
        setEditEmploymentStatus(staff.employment_status);
        setEditGrossSalary(String(staff.gross_monthly_salary ?? ''));
        setEditNationalId(staff.national_id_number ?? '');
        setEditGender(staff.gender ?? '');
        setEditTscNumber(staff.tsc_number ?? '');
        setEditKraPin(staff.kra_pin ?? '');
        setEditNssfNumber(staff.nssf_number ?? '');
        setEditShaNumber(staff.sha_shif_number ?? '');
        setEditBankName(staff.bank_name ?? '');
        setEditBankAccount(staff.bank_account_number ?? '');
        setEditNextOfKinName(staff.next_of_kin_name ?? '');
        setEditNextOfKinRelation(staff.next_of_kin_relationship ?? '');
        setEditNextOfKinPhone(staff.next_of_kin_phone ?? '');
        setEditPassword('');
        setShowEditDialog(true);
    }

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!selectedStaff) return;
        setEditSubmitting(true);
        setError(null);
        try {
            const csrf = getCsrfToken();
            const res = await fetch(`/admin/api/staff/${selectedStaff.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: editName,
                    email: editEmail,
                    ...(editPassword ? { password: editPassword } : {}),
                    phone_number: editPhone,
                    job_title: editJobTitle || null,
                    department_id: editDepartmentId ? parseInt(editDepartmentId) : null,
                    employment_type: editEmploymentType,
                    employment_status: editEmploymentStatus,
                    gross_monthly_salary: parseFloat(editGrossSalary),
                    national_id_number: editNationalId || null,
                    gender: editGender || null,
                    tsc_number: editTscNumber || null,
                    kra_pin: editKraPin || null,
                    nssf_number: editNssfNumber || null,
                    sha_shif_number: editShaNumber || null,
                    bank_name: editBankName || null,
                    bank_account_number: editBankAccount || null,
                    next_of_kin_name: editNextOfKinName || null,
                    next_of_kin_relationship: editNextOfKinRelation || null,
                    next_of_kin_phone: editNextOfKinPhone || null,
                }),
            });
            if (!res.ok) {
                const err = (await res.json().catch(() => null)) as { message?: string } | null;
                throw new Error(err?.message ?? 'Failed to update');
            }
            const { data } = (await res.json()) as { data: StaffProfile };
            setStaffProfiles((prev) => prev.map((s) => (s.id === data.id ? data : s)));
            setSelectedStaff(data);
            setShowEditDialog(false);
            fetchStaff();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        } finally {
            setEditSubmitting(false);
        }
    }

    function formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
        }).format(amount);
    }

    function getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'suspended':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'terminated':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Staff Profiles" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Staff Profiles</h1>
                        <p className="text-muted-foreground">Manage all staff members and their information</p>
                    </div>
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <UserPlus className="mr-2 size-4" />
                        Add Staff Member
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="size-5" />
                            Search & Filter
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-4">
                            <Input
                                placeholder="Search by name, employee ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <select
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={filterDepartment}
                                onChange={(e) => setFilterDepartment(e.target.value)}
                            >
                                <option value="">All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Status</option>
                                {EMPLOYMENT_STATUS.map((status) => (
                                    <option key={status} value={status}>
                                        {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </option>
                                ))}
                            </select>
                            <Button variant="outline" onClick={() => {
                                setSearchTerm('');
                                setFilterDepartment('');
                                setFilterStatus('');
                            }}>
                                Clear Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Staff List ({total} total)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading staff profiles...</p>
                        ) : staffProfiles.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No staff profiles found.</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="py-2 pr-4">Employee ID</th>
                                                <th className="py-2 pr-4">Name</th>
                                                <th className="py-2 pr-4">Login Email</th>
                                                <th className="py-2 pr-4">Password (set/reset)</th>
                                                <th className="py-2 pr-4">Mobile</th>
                                                <th className="py-2 pr-4">Job Title</th>
                                                <th className="py-2 pr-4">Department</th>
                                                <th className="py-2 pr-4">Type</th>
                                                <th className="py-2 pr-4">Status</th>
                                                <th className="py-2 pr-4">Salary</th>
                                                <th className="py-2 pr-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {staffProfiles.map((staff) => (
                                                <tr key={staff.id} className="border-b last:border-0">
                                                    <td className="py-2 pr-4 font-mono text-xs">{staff.employee_id}</td>
                                                    <td className="py-2 pr-4">
                                                        <div className="font-medium">{staff.user.name}</div>
                                                    </td>
                                                            <td className="py-2 pr-4 text-xs">{staff.user.email}</td>
                                                            <td className="py-2 pr-4 text-xs">
                                                                <Button
                                                                    variant="outline"
                                                                    size="xs"
                                                                    onClick={() => openEditDialog(staff)}
                                                                >
                                                                    Edit password
                                                                </Button>
                                                            </td>
                                                    <td className="py-2 pr-4 text-xs">{staff.phone_number || '—'}</td>
                                                    <td className="py-2 pr-4">{staff.job_title || '—'}</td>
                                                    <td className="py-2 pr-4">{staff.department?.name || '—'}</td>
                                                    <td className="py-2 pr-4">
                                                        <span className="text-xs">
                                                            {staff.employment_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 pr-4">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(staff.employment_status)}`}>
                                                            {staff.employment_status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 pr-4 font-medium">
                                                        {formatCurrency(staff.gross_monthly_salary)}
                                                    </td>
                                                    <td className="py-2 pr-4">
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedStaff(staff);
                                                                    setShowViewDialog(true);
                                                                }}
                                                            >
                                                                <Eye className="size-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openEditDialog(staff)}
                                                            >
                                                                <Pencil className="size-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-muted-foreground">
                                            Page {currentPage} of {totalPages}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage((prev) => prev - 1)}
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage((prev) => prev + 1)}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Staff Member</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name *</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mobile">Mobile Number *</Label>
                                <Input
                                    id="mobile"
                                    type="tel"
                                    value={mobileNumber}
                                    onChange={(e) => setMobileNumber(e.target.value)}
                                    placeholder="+254 704 239 729"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="job-title">Job Title</Label>
                                <Input
                                    id="job-title"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    placeholder="e.g. Senior Teacher"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <select
                                    id="department"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={departmentId}
                                    onChange={(e) => setDepartmentId(e.target.value)}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="employment-type">Employment Type *</Label>
                                <select
                                    id="employment-type"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={employmentType}
                                    onChange={(e) => setEmploymentType(e.target.value)}
                                    required
                                >
                                    {EMPLOYMENT_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="employment-status">Employment Status *</Label>
                                <select
                                    id="employment-status"
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={employmentStatus}
                                    onChange={(e) => setEmploymentStatus(e.target.value)}
                                    required
                                >
                                    {EMPLOYMENT_STATUS.map((status) => (
                                        <option key={status} value={status}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gross-salary">Gross Monthly Salary (KES) *</Label>
                                <Input
                                    id="gross-salary"
                                    type="number"
                                    step="0.01"
                                    value={grossSalary}
                                    onChange={(e) => setGrossSalary(e.target.value)}
                                    placeholder="50000"
                                    required
                                />
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowCreateDialog(false);
                                    resetForm();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Creating...' : 'Create Staff'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Staff Profile Details</DialogTitle>
                    </DialogHeader>
                    {selectedStaff && (
                        <div className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Employee ID</h3>
                                        <p className="font-mono text-lg">{selectedStaff.employee_id}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
                                        <p className="text-lg">{selectedStaff.user.name}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                                        <p className="text-lg">{selectedStaff.phone_number || '—'}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">National ID</h3>
                                        <p className="text-lg">{selectedStaff.national_id_number || '—'}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Gender</h3>
                                        <p className="text-lg capitalize">{selectedStaff.gender || '—'}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">TSC Number</h3>
                                        <p className="text-lg">{selectedStaff.tsc_number || '—'}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">KRA PIN</h3>
                                        <p className="text-lg">{selectedStaff.kra_pin || '—'}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">NSSF Number</h3>
                                        <p className="text-lg">{selectedStaff.nssf_number || '—'}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">SHA / SHIF Number</h3>
                                        <p className="text-lg">{selectedStaff.sha_shif_number || '—'}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Briefcase className="size-4" />
                                            Job Title
                                        </h3>
                                        <p className="text-lg">{selectedStaff.job_title || '—'}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                            <Building2 className="size-4" />
                                            Department
                                        </h3>
                                        <p className="text-lg">{selectedStaff.department?.name || '—'}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Employment Type</h3>
                                        <p className="text-lg capitalize">{selectedStaff.employment_type.replace('-', ' ')}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusBadgeClass(selectedStaff.employment_status)}`}>
                                            {selectedStaff.employment_status}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Bank</h3>
                                        <p className="text-lg">{selectedStaff.bank_name || '—'}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Bank Account</h3>
                                        <p className="text-lg font-mono">{selectedStaff.bank_account_number || '—'}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">Next of Kin</h3>
                                        <p className="text-lg">
                                            {selectedStaff.next_of_kin_name ? (
                                                <>
                                                    {selectedStaff.next_of_kin_name}
                                                    {selectedStaff.next_of_kin_relationship && (
                                                        <span className="text-muted-foreground"> ({selectedStaff.next_of_kin_relationship})</span>
                                                    )}
                                                    <br />
                                                    <span className="text-sm text-muted-foreground">{selectedStaff.next_of_kin_phone || ''}</span>
                                                </>
                                            ) : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                                    <DollarSign className="size-4" />
                                    Salary Information
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Gross Monthly Salary</p>
                                        <p className="text-2xl font-bold">{formatCurrency(selectedStaff.gross_monthly_salary)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Allowances</p>
                                        <p className="text-2xl font-bold">{formatCurrency(selectedStaff.total_allowances ?? 0)}</p>
                                    </div>
                                </div>
                            </div>
                            {loadingPreview ? (
                                <p className="text-sm text-muted-foreground">Loading salary calculation...</p>
                            ) : salaryPreview ? (
                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Payroll Calculation Preview (This Month)</h3>
                                    <div className="rounded-lg border p-4 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>Gross Salary</span>
                                            <span className="font-medium">{formatCurrency(salaryPreview.gross_salary)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>+ Allowances</span>
                                            <span>{formatCurrency(salaryPreview.total_allowances)}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>− NSSF (Employee)</span>
                                            <span>{formatCurrency(salaryPreview.nssf_employee)}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>− SHIF</span>
                                            <span>{formatCurrency(salaryPreview.shif)}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>− AHL (Employee)</span>
                                            <span>{formatCurrency(salaryPreview.ahl_employee)}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>− PAYE</span>
                                            <span>{formatCurrency(salaryPreview.paye)}</span>
                                        </div>
                                        {salaryPreview.total_custom_deductions > 0 && (
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>− Custom Deductions</span>
                                                <span>{formatCurrency(salaryPreview.total_custom_deductions)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between pt-2 border-t font-bold text-base">
                                            <span>Net Salary</span>
                                            <span>{formatCurrency(salaryPreview.net_salary)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
                        {selectedStaff && (
                            <Button variant="outline" onClick={() => { setShowViewDialog(false); openEditDialog(selectedStaff); }}>Edit</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Staff Profile</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Full Name *</Label>
                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Login Email *</Label>
                                <Input
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>New Password (optional)</Label>
                                <Input
                                    type="text"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    placeholder="Leave blank to keep current password"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Mobile Number *</Label>
                                <Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+254 704 239 729" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Job Title</Label>
                                <Input value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} placeholder="e.g. Teacher" />
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <select className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editDepartmentId} onChange={(e) => setEditDepartmentId(e.target.value)}>
                                    <option value="">Select Department</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>National ID</Label>
                                <Input value={editNationalId} onChange={(e) => setEditNationalId(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <select className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editGender} onChange={(e) => setEditGender(e.target.value)}>
                                    <option value="">—</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>TSC Number</Label>
                                <Input value={editTscNumber} onChange={(e) => setEditTscNumber(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>KRA PIN</Label>
                                <Input value={editKraPin} onChange={(e) => setEditKraPin(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>NSSF Number</Label>
                                <Input value={editNssfNumber} onChange={(e) => setEditNssfNumber(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>SHA / SHIF Number</Label>
                                <Input value={editShaNumber} onChange={(e) => setEditShaNumber(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Bank Name</Label>
                                <Input value={editBankName} onChange={(e) => setEditBankName(e.target.value)} placeholder="e.g. Equity Bank" />
                            </div>
                            <div className="space-y-2">
                                <Label>Bank Account Number</Label>
                                <Input value={editBankAccount} onChange={(e) => setEditBankAccount(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Employment Type *</Label>
                                <select className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editEmploymentType} onChange={(e) => setEditEmploymentType(e.target.value)} required>
                                    {EMPLOYMENT_TYPES.map((t) => (
                                        <option key={t} value={t}>{t.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Employment Status *</Label>
                                <select className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editEmploymentStatus} onChange={(e) => setEditEmploymentStatus(e.target.value)} required>
                                    {EMPLOYMENT_STATUS.map((s) => (
                                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Gross Monthly Salary (KES) *</Label>
                                <Input type="number" step="0.01" value={editGrossSalary} onChange={(e) => setEditGrossSalary(e.target.value)} required />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-muted-foreground">Next of Kin</Label>
                                <div className="grid gap-2 md:grid-cols-3">
                                    <Input placeholder="Name" value={editNextOfKinName} onChange={(e) => setEditNextOfKinName(e.target.value)} />
                                    <Input placeholder="Relationship" value={editNextOfKinRelation} onChange={(e) => setEditNextOfKinRelation(e.target.value)} />
                                    <Input placeholder="Phone" value={editNextOfKinPhone} onChange={(e) => setEditNextOfKinPhone(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                            <Button type="submit" disabled={editSubmitting}>{editSubmitting ? 'Saving...' : 'Save'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
