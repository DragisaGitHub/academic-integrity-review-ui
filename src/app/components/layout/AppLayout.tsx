import { FileText, History, LayoutDashboard, Search, Settings, Upload } from 'lucide-react';
import { ANALYSES_ROUTE } from '../../routeAccess';
import { Input } from '../ui/input';
import { NotificationBell } from './NotificationBell';
import { ShellLayout } from './ShellLayout';

const userNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Upload Document', href: '/upload', icon: Upload },
  { name: 'Analyses', href: ANALYSES_ROUTE, icon: FileText, matchPatterns: [ANALYSES_ROUTE, `${ANALYSES_ROUTE}/*`] },
  { name: 'History', href: '/history', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppLayout() {
  return (
    <ShellLayout
      title="Academic Integrity Review"
      subtitle="Document Analysis Assistant"
      navigation={userNavigation}
      headerContent={
        <>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents, students, or courses..."
              className="pl-9"
            />
          </div>
          <NotificationBell />
        </>
      }
      sidebarFooter={
        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            All document analysis is performed locally. No student papers are sent to external cloud services.
          </p>
        </div>
      }
    />
  );
}