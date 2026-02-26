import type { PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { AuthUserWithRbac } from '@/types/auth';

type AuthContextValue = {
    user: AuthUserWithRbac['user'];
    roles: string[];
    permissions: string[];
    modules: { key: string; label: string }[];
    loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = PropsWithChildren<{
    initialUser: AuthUserWithRbac['user'];
    initialRoles: string[];
    initialPermissions: string[];
}>;

export function AuthProvider({
    children,
    initialUser,
    initialRoles,
    initialPermissions,
}: AuthProviderProps) {
    const [user] = useState<AuthUserWithRbac['user']>(initialUser);
    const [roles] = useState<string[]>(initialRoles);
    const [permissions] = useState<string[]>(initialPermissions);

    const modules: { key: string; label: string }[] = useMemo(() => {
        const definitions: { key: string; label: string; required: string[] }[] = [
            {
                key: 'students',
                label: 'Student Module',
                required: ['view students', 'manage students'],
            },
            {
                key: 'drivers',
                label: 'Driver Module',
                required: ['view drivers', 'manage drivers'],
            },
            {
                key: 'fees',
                label: 'Fee Module',
                required: ['view fees', 'manage fees'],
            },
            {
                key: 'transport',
                label: 'Transport Module',
                required: ['view transport', 'manage transport'],
            },
            {
                key: 'staff',
                label: 'Staff Module',
                required: ['view staff', 'manage staff'],
            },
            {
                key: 'teachers',
                label: 'Teacher Module',
                required: ['view teachers', 'manage teachers'],
            },
        ];

        if (roles.includes('super-admin')) {
            return definitions.map(({ key, label }) => ({ key, label }));
        }

        return definitions
            .filter(({ required }) => required.some((permission) => permissions.includes(permission)))
            .map(({ key, label }) => ({ key, label }));
    }, [permissions, roles]);

    const loading = false;

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            roles,
            permissions,
            modules,
            loading,
        }),
        [user, roles, permissions, modules, loading],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
    const ctx = useContext(AuthContext);

    if (!ctx) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }

    return ctx;
}

