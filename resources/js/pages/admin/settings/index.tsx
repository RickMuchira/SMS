import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SystemSettings = {
    app_name: string;
    app_logo: string;
    email_domain: string;
    email_format: string;
};

type Props = {
    settings: SystemSettings;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'System Settings', href: '/admin/settings' },
];

export default function AdminSettingsIndex({ settings }: Props) {
    const [appName, setAppName] = useState(settings.app_name);
    const [appLogo, setAppLogo] = useState(settings.app_logo);
    const [emailDomain, setEmailDomain] = useState(settings.email_domain);
    const [emailFormat, setEmailFormat] = useState(settings.email_format);
    const [submitting, setSubmitting] = useState(false);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);

        router.post(
            '/admin/settings',
            {
                app_name: appName,
                app_logo: appLogo,
                email_domain: emailDomain,
                email_format: emailFormat,
            },
            {
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Settings" />

            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>System Settings</CardTitle>
                        <CardDescription>
                            Configure branding and email generation for your organization. Only accessible by super@gmail.com.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Branding</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="app-name">Application Name</Label>
                                        <Input
                                            id="app-name"
                                            value={appName}
                                            onChange={(e) => setAppName(e.target.value)}
                                            placeholder="e.g. My School SMS"
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Displayed next to the logo in the sidebar
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="app-logo">Logo URL</Label>
                                        <Input
                                            id="app-logo"
                                            value={appLogo}
                                            onChange={(e) => setAppLogo(e.target.value)}
                                            placeholder="e.g. /storage/logo.svg"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Path or URL to your organization's logo
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Email Generation</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="email-format">Email Format</Label>
                                        <select
                                            id="email-format"
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={emailFormat}
                                            onChange={(e) => setEmailFormat(e.target.value)}
                                        >
                                            <option value="{firstname}.{lastname}">
                                                firstname.lastname (e.g. mary.wanjiru)
                                            </option>
                                            <option value="{fullname}">
                                                fullname (e.g. marywanjirumuchira)
                                            </option>
                                            <option value="{firstname}{lastname}">
                                                firstnamelastname (e.g. marywanjiru)
                                            </option>
                                            <option value="{firstname}">
                                                firstname only (e.g. mary)
                                            </option>
                                        </select>
                                        <p className="text-xs text-muted-foreground">
                                            Format for auto-generating student emails
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email-domain">Email Domain</Label>
                                        <Input
                                            id="email-domain"
                                            value={emailDomain}
                                            onChange={(e) => setEmailDomain(e.target.value)}
                                            placeholder="e.g. student.myschool.edu"
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Domain suffix for student emails
                                        </p>
                                    </div>
                                </div>
                                <div className="rounded-md border p-4 bg-muted/50">
                                    <p className="text-sm font-medium mb-2">Example:</p>
                                    <p className="text-sm text-muted-foreground">
                                        For student "Mary Wanjiru Muchira" with format "{emailFormat}":
                                        <br />
                                        <span className="font-mono text-foreground">
                                            {emailFormat === '{firstname}.{lastname}'
                                                ? 'mary.wanjiru'
                                                : emailFormat === '{fullname}'
                                                  ? 'marywanjirumuchira'
                                                  : emailFormat === '{firstname}{lastname}'
                                                    ? 'marywanjiru'
                                                    : 'mary'}
                                            @{emailDomain}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Saving...' : 'Save Settings'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="border-amber-500/30 bg-amber-500/5 dark:border-amber-400/20 dark:bg-amber-500/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-amber-600 dark:text-amber-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Security Notice
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p>
                            Only the primary super administrator account (super@gmail.com) can access these settings and manage other administrators.
                        </p>
                        <p>
                            This ensures centralized control over organization branding and prevents unauthorized changes by other admin accounts.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
