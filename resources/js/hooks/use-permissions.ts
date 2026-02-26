import { useAuthContext } from '@/context/auth-context';

export function usePermissions() {
    const { roles, permissions, modules, loading } = useAuthContext();

    const hasPermission = (permission: string): boolean => {
        if (!permission) {
            return false;
        }

        if (roles.includes('super-admin')) {
            return true;
        }

        return permissions.includes(permission);
    };

    const canViewModule = (moduleKey: string): boolean => {
        if (roles.includes('super-admin')) {
            return true;
        }

        return modules.some((module) => module.key === moduleKey);
    };

    return {
        roles,
        permissions,
        modules,
        loading,
        hasPermission,
        canViewModule,
    };
}

