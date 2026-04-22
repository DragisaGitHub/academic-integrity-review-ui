import { Link, Outlet, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  History, 
  Settings,
  Search,
} from 'lucide-react';
import { Input } from '../ui/input';
import { NotificationBell } from './NotificationBell';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Upload Document', href: '/upload', icon: Upload },
  { name: 'Analyses', href: '/analyses', icon: FileText },
  { name: 'History', href: '/history', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div>
                <h1 className="tracking-tight">Academic Integrity Review</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Document Analysis Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search documents, students, or courses..." 
                  className="pl-9"
                />
              </div>
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border min-h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 mt-8">
            <div className="bg-muted border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                All document analysis is performed locally. No student papers are sent to external cloud services.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}