import { Shield, Users } from 'lucide-react';
import { Badge } from '../ui/badge';
import { ShellLayout } from './ShellLayout';

const adminNavigation = [
  {
    name: 'User Administration',
    href: '/admin/users',
    icon: Users,
    matchPatterns: ['/admin/users', '/admin/*'],
  },
];

export function AdminLayout() {
  return (
    <ShellLayout
      title="Academic Integrity Review"
      subtitle="Administration"
      navigation={adminNavigation}
      headerContent={
        <Badge variant="outline" className="gap-2 border-slate-300 bg-slate-50 px-3 py-1 text-slate-700">
          <Shield className="h-3.5 w-3.5" />
          Admin Area
        </Badge>
      }
      sidebarFooter={
        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Administrative actions affect access and governance settings for the review workspace.
          </p>
        </div>
      }
    />
  );
}