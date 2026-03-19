import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) =>
                    item.items && item.items.length > 0 ? (
                        <NavCollapsibleItem key={item.title} item={item} isCurrentUrl={isCurrentUrl} />
                    ) : (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentUrl(item.href)}
                                tooltip={{ children: item.title }}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ),
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}

function NavCollapsibleItem({
    item,
    isCurrentUrl,
}: {
    item: NavItem;
    isCurrentUrl: (href: string) => boolean;
}) {
    const anyChildActive = item.items?.some((sub) => isCurrentUrl(sub.href)) ?? false;
    const [open, setOpen] = useState(anyChildActive || isCurrentUrl(item.href));

    return (
        <Collapsible open={open} onOpenChange={setOpen} asChild>
            <SidebarMenuItem>
                <SidebarMenuButton
                    tooltip={{ children: item.title }}
                    isActive={isCurrentUrl(item.href)}
                    onClick={() => setOpen((o) => !o)}
                    className="cursor-pointer"
                >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight
                        className={`ml-auto h-4 w-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                    />
                </SidebarMenuButton>

                <CollapsibleContent>
                    <SidebarMenuSub>
                        {item.items!.map((sub) => (
                            <SidebarMenuSubItem key={sub.href}>
                                <SidebarMenuSubButton asChild isActive={isCurrentUrl(sub.href)}>
                                    <Link href={sub.href} prefetch>
                                        <span>{sub.title}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}
