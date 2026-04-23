import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { applyColorThemePreference, loadAppSettings } from './services/settings';
import { AuthProvider, useAuth } from './auth/AuthContext';

function AppShell() {
  const { currentUser, isAuthenticated, isInitializing } = useAuth();

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!isAuthenticated || currentUser?.role !== 'USER') {
      applyColorThemePreference('auto');
      return;
    }

    const cachedSettings = loadAppSettings(currentUser.id);
    applyColorThemePreference(cachedSettings.interfacePreferences.colorTheme);
  }, [currentUser?.id, currentUser?.role, isAuthenticated, isInitializing]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}