import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet, matchPath, useLocation } from 'react-router';
import { UserMenu } from './UserMenu';

type ShellNavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  matchPatterns?: string[];
};

type ShellLayoutProps = {
  title: string;
  subtitle: string;
  navigation: ShellNavigationItem[];
  headerContent?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
};

function isNavigationItemActive(pathname: string, item: ShellNavigationItem): boolean {
  if (pathname === item.href) {
    return true;
  }

  return item.matchPatterns?.some((pattern) => matchPath({ path: pattern, end: false }, pathname)) ?? false;
}

export function ShellLayout({
  title,
  subtitle,
  navigation,
  headerContent,
  sidebarFooter,
}: ShellLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="tracking-tight">{title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            <div className="flex items-center gap-4">
              {headerContent}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-[73px] min-h-[calc(100vh-73px)] w-64 border-r border-border bg-card">
          <nav className="space-y-1 p-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => {
                  const active = isActive || isNavigationItemActive(location.pathname, item);
                  return `flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`;
                }}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-sm">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {sidebarFooter ? <div className="mt-8 p-4">{sidebarFooter}</div> : null}
        </aside>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}