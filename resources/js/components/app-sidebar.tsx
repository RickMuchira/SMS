import { Link } from '@inertiajs/react';
import { BookOpen, Bus, FileText, Folder, GraduationCap, LayoutGrid, Shield, Trophy, Users } from 'lucide-react';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { usePermissions } from '@/hooks/use-permissions';
import { dashboard as adminDashboard } from '@/routes/admin';
import type { NavItem } from '@/types';
import AppLogo from './app-logo';

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { canViewModule, hasPermission } = usePermissions();

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: adminDashboard(),
            icon: LayoutGrid,
        },
        ...(hasPermission('manage roles')
            ? [
                  {
                      title: 'User management',
                      href: '/admin/users',
                      icon: Shield,
                  } satisfies NavItem,
              ]
            : []),
        ...(hasPermission('manage classes')
            ? [
                  {
                      title: 'Classes',
                      href: '/admin/classes',
                      icon: LayoutGrid,
                  } satisfies NavItem,
              ]
            : []),
        ...(hasPermission('manage students')
            ? [
                  {
                      title: 'Students',
                      href: '/admin/students',
                      icon: Users,
                  } satisfies NavItem,
              ]
            : []),
        ...(hasPermission('manage staff')
            ? [
                  {
                      title: 'Staff & Teachers',
                      href: '/admin/staff/profiles',
                      icon: GraduationCap,
                  } satisfies NavItem,
              ]
            : []),
        ...(hasPermission('view drivers') || hasPermission('manage drivers')
            ? [
                  {
                      title: 'Drivers & Assistants',
                      href: '/admin/drivers',
                      icon: Bus,
                  } satisfies NavItem,
              ]
            : []),
        ...(canViewModule('fees')
            ? [
                  {
                      title: 'Fees',
                      href: '/admin/fees',
                      icon: FileText,
                  } satisfies NavItem,
              ]
            : []),
        ...(hasPermission('view results') || hasPermission('manage results') || hasPermission('manage academics')
            ? [
                  {
                      title: 'Results',
                      href: '/admin/results',
                      icon: Trophy,
                      items: [
                          {
                              title: 'Import Results',
                              href: '/admin/results',
                          },
                          {
                              title: 'View Analytics',
                              href: '/admin/results/view',
                          },
                          {
                              title: 'Edit Results',
                              href: '/admin/results/edit',
                          },
                          {
                              title: 'Stream Comparison',
                              href: '/admin/results/streams',
                          },
                      ],
                  } satisfies NavItem,
              ]
            : []),
        ...(canViewModule('transport')
            ? [
                  {
                      title: 'Transport',
                      href: '/transport',
                      icon: Bus,
                  } satisfies NavItem,
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={adminDashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
