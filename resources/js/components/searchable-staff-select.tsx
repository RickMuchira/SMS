import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type StaffOption = {
    id: number;
    name: string;
};

type SearchableStaffSelectProps = {
    staff: StaffOption[];
    value: number | '';
    onChange: (id: number | '') => void;
    label: string;
    placeholder?: string;
    emptyOption?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
};

export function SearchableStaffSelect({
    staff,
    value,
    onChange,
    label,
    placeholder = 'Search staff...',
    emptyOption = 'No staff selected',
    required = false,
    disabled = false,
    className,
}: SearchableStaffSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedStaff = staff.find((s) => s.id === value);
    const displayValue = selectedStaff?.name ?? '';

    const filteredStaff = useCallback(() => {
        if (!search.trim()) return staff;
        const q = search.toLowerCase().trim();
        return staff.filter((s) => s.name.toLowerCase().includes(q));
    }, [staff, search]);

    const filtered = filteredStaff();

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className={cn('space-y-2', className)}>
            <Label className="text-sm font-medium">{label}</Label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setOpen((o) => !o)}
                    disabled={disabled}
                    className={cn(
                        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left shadow-xs transition-colors',
                        'hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        !displayValue && 'text-muted-foreground',
                    )}
                >
                    <span className="truncate">{displayValue || emptyOption}</span>
                    <ChevronDown
                        className={cn('h-4 w-4 shrink-0 opacity-50', open && 'rotate-180')}
                    />
                </button>

                {open && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
                        <div className="p-2 border-b">
                            <Input
                                type="text"
                                placeholder={placeholder}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setOpen(false);
                                        setSearch('');
                                    }
                                }}
                            />
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    onChange('');
                                    setOpen(false);
                                    setSearch('');
                                }}
                                className={cn(
                                    'w-full rounded-sm px-2 py-1.5 text-left text-sm',
                                    !value
                                        ? 'bg-accent font-medium'
                                        : 'hover:bg-accent/50',
                                )}
                            >
                                {emptyOption}
                            </button>
                            {filtered.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(s.id);
                                        setOpen(false);
                                        setSearch('');
                                    }}
                                    className={cn(
                                        'w-full rounded-sm px-2 py-1.5 text-left text-sm',
                                        value === s.id
                                            ? 'bg-accent font-medium'
                                            : 'hover:bg-accent/50',
                                    )}
                                >
                                    {s.name}
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <p className="px-2 py-3 text-sm text-muted-foreground">
                                    No staff found
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
