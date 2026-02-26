import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, LayoutGrid, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { usePermissions } from '@/hooks/use-permissions';
import AppLayout from '@/layouts/app-layout';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as adminUsersIndex } from '@/routes/admin/users';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: adminDashboard().url,
    },
];

export default function Dashboard() {
    const { roles } = usePermissions();
    const isSuperAdmin = roles.includes('super-admin');
    const page = usePage();
    const userName = (page.props.auth as { user?: { name?: string } } | undefined)?.user?.name;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card className="border-sidebar-border/70 dark:border-sidebar-border">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <LayoutGrid className="size-5 text-muted-foreground" />
                            <CardTitle className="text-lg">
                                {userName ? `Welcome back, ${userName}` : 'Dashboard'}
                            </CardTitle>
                        </div>
                        <CardDescription>
                            Overview of your school management. Use the sidebar to open Users, Classes, Students, or Staff.
                        </CardDescription>
                    </CardHeader>
                </Card>

                {isSuperAdmin && (
                    <Card className="border-amber-500/30 bg-amber-500/5 dark:border-amber-400/20 dark:bg-amber-500/10">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Shield className="size-5 text-amber-600 dark:text-amber-400" />
                                <CardTitle className="text-lg">Super Admin</CardTitle>
                            </div>
                            <CardDescription>
                                You have full access. Manage users, roles, and permissions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            <Button asChild variant="outline" size="sm" className="gap-2">
                                <Link href={adminUsersIndex().url}>
                                    User management
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="gap-2">
                                <Link href="/admin/students">
                                    Students
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="gap-2">
                                <Link href="/admin/staff">
                                    Staff & Teachers
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div>
                <div className="relative min-h-[12rem] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </AppLayout>
    );
}
