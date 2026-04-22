import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { applyColorThemePreference, getAppSettingsFromApi } from './services/settings';

export default function App() {
  useEffect(() => {
    applyColorThemePreference('auto');

    // Refresh from backend (source of truth) without spamming toasts.
    (async () => {
      try {
        const fresh = await getAppSettingsFromApi();
        applyColorThemePreference(fresh.interfacePreferences.colorTheme);
      } catch {
      }
    })();
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}