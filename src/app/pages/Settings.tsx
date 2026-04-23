import { useEffect, useMemo, useState } from 'react';
import { Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import type { AppSettings } from '../types';
import {
  applyColorThemePreference,
  defaultAppSettings,
  getAppSettingsFromApi,
  saveAppSettings,
  saveAppSettingsToApi,
} from '../services/settings';

type SettingsFieldErrorKey =
  | 'fullName'
  | 'department'
  | 'university'
  | 'email'
  | 'documentStorageLocation';

type SettingsFieldErrors = Partial<Record<SettingsFieldErrorKey, string>>;

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function retentionPeriodToDays(period: AppSettings['dataRetention']['automaticDeletionAfter']): number {
  switch (period) {
    case '3months':
      return 90;
    case '6months':
      return 180;
    case '1year':
      return 365;
    case '2years':
      return 730;
    case 'never':
      return 0;
    default:
      return 365;
  }
}

export function Settings() {
  const { currentUser, isAuthenticated, isInitializing, markSettingsCompleted } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
  const [baselineSettings, setBaselineSettings] = useState<AppSettings>(defaultAppSettings);
  const [errors, setErrors] = useState<SettingsFieldErrors>({});
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasLoadedFromBackend, setHasLoadedFromBackend] = useState<boolean>(false);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!isAuthenticated || currentUser?.role !== 'USER') {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);

      try {
        const loaded = await getAppSettingsFromApi({ userId: currentUser.id });
        if (cancelled) return;
        setSettings(loaded);
        setBaselineSettings(loaded);
        setLastSavedSnapshot(JSON.stringify(loaded));
        setHasLoadedFromBackend(true);
      } catch {
        // Backend is the source of truth; if it fails, be explicit.
        toast.error('Failed to load settings from the backend.');

        if (cancelled) return;
        setSettings(defaultAppSettings);
        setBaselineSettings(defaultAppSettings);
        setLastSavedSnapshot(JSON.stringify(defaultAppSettings));
        setHasLoadedFromBackend(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.role, isAuthenticated, isInitializing]);

  useEffect(() => {
    if (!hasLoadedFromBackend) return;
    applyColorThemePreference(settings.interfacePreferences.colorTheme);
  }, [hasLoadedFromBackend, settings.interfacePreferences.colorTheme]);

  const validationErrors = useMemo(() => {
    const nextErrors: SettingsFieldErrors = {};

    if (!settings.profile.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!settings.profile.department.trim()) nextErrors.department = 'Department is required.';
    if (!settings.profile.university.trim()) nextErrors.university = 'University is required.';

    if (!settings.profile.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!isValidEmail(settings.profile.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (settings.localProcessing.enableLocalAiAnalysis && !settings.localProcessing.documentStorageLocation.trim()) {
      nextErrors.documentStorageLocation = 'Storage location is required when local AI analysis is enabled.';
    }

    return nextErrors;
  }, [settings]);

  async function handleSave(): Promise<void> {
    const currentSnapshot = JSON.stringify(settings);
    if (lastSavedSnapshot && currentSnapshot === lastSavedSnapshot) {
      toast('No changes to save.');
      return;
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fix the highlighted fields before saving.');
      return;
    }

    setIsSaving(true);
    try {
      await saveAppSettingsToApi(settings);
      if (currentUser) {
        saveAppSettings(currentUser.id, settings);
      }
      markSettingsCompleted();
      setLastSavedSnapshot(currentSnapshot);
      setBaselineSettings(settings);
      setHasLoadedFromBackend(true);
      applyColorThemePreference(settings.interfacePreferences.colorTheme);
      toast.success('Settings saved.');
    } catch {
      toast.error('Failed to save settings to the backend.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset(): void {
    // Requirement: restore last loaded backend values; don't persist until user saves.
    setSettings(baselineSettings);
    setErrors({});
    toast('Reverted unsaved changes.');
  }

  async function handleBrowseStorageLocation(): Promise<void> {
    if (!settings.localProcessing.enableLocalAiAnalysis) {
      toast('Enable local AI analysis to configure storage.');
      return;
    }

    if (!('showDirectoryPicker' in window)) {
      toast.error('Folder browsing is not supported in this browser.');
      return;
    }

    try {
      const picker = (window as unknown as {
        showDirectoryPicker: () => Promise<{ name?: unknown }>;
      }).showDirectoryPicker;

      const handle = await picker();
      const folderName = typeof handle.name === 'string' ? handle.name : '';

      if (!folderName) {
        toast.error('Unable to read selected folder name.');
        return;
      }

      setSettings((previous) => ({
        ...previous,
        localProcessing: {
          ...previous.localProcessing,
          documentStorageLocation: folderName,
        },
      }));

      toast.success('Folder selected.');
      toast('Note: browsers can’t provide the full local path; saved the folder name only.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('Unable to select folder.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-foreground mb-1">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure your analysis preferences and profile
        </p>
      </div>

      {/* Professor Profile */}
      <Card className="border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-foreground">Professor Profile</CardTitle>
          <CardDescription>Your academic information</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={settings.profile.fullName}
                onChange={(event) =>
                  setSettings((previous) => ({
                    ...previous,
                    profile: { ...previous.profile, fullName: event.target.value },
                  }))
                }
                placeholder="Enter your full name"
                aria-invalid={Boolean(errors.fullName)}
              />
              {errors.fullName ? (
                <p className="text-xs text-destructive">{errors.fullName}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={settings.profile.department}
                onChange={(event) =>
                  setSettings((previous) => ({
                    ...previous,
                    profile: { ...previous.profile, department: event.target.value },
                  }))
                }
                placeholder="e.g., Computer Science"
                aria-invalid={Boolean(errors.department)}
              />
              {errors.department ? (
                <p className="text-xs text-destructive">{errors.department}</p>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="university">University</Label>
              <Input
                id="university"
                value={settings.profile.university}
                onChange={(event) =>
                  setSettings((previous) => ({
                    ...previous,
                    profile: { ...previous.profile, university: event.target.value },
                  }))
                }
                placeholder="Enter your university"
                aria-invalid={Boolean(errors.university)}
              />
              {errors.university ? (
                <p className="text-xs text-destructive">{errors.university}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.profile.email}
                onChange={(event) =>
                  setSettings((previous) => ({
                    ...previous,
                    profile: { ...previous.profile, email: event.target.value },
                  }))
                }
                placeholder="name@university.edu"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Analysis Settings */}
      <Card className="border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-foreground">Default Analysis Modules</CardTitle>
          <CardDescription>
            These modules will be enabled by default for new document uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Citation Analysis</p>
              <p className="text-xs text-muted-foreground">Identify missing or incomplete citations</p>
            </div>
            <Switch
              checked={settings.analysisModules.citationAnalysis}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  analysisModules: { ...previous.analysisModules, citationAnalysis: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Reference Validation</p>
              <p className="text-xs text-muted-foreground">Verify cited sources and detect fabrication</p>
            </div>
            <Switch
              checked={settings.analysisModules.referenceValidation}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  analysisModules: { ...previous.analysisModules, referenceValidation: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Factual Consistency Review</p>
              <p className="text-xs text-muted-foreground">Detect contradictions and factual issues</p>
            </div>
            <Switch
              checked={settings.analysisModules.factualConsistencyReview}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  analysisModules: { ...previous.analysisModules, factualConsistencyReview: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Writing Style Consistency</p>
              <p className="text-xs text-muted-foreground">Identify unusual style variations</p>
            </div>
            <Switch
              checked={settings.analysisModules.writingStyleConsistency}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  analysisModules: { ...previous.analysisModules, writingStyleConsistency: checked },
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">AI Review Assistance</p>
              <p className="text-xs text-muted-foreground">Note patterns that may indicate assistance</p>
            </div>
            <Switch
              checked={settings.analysisModules.aiReviewAssistance}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  analysisModules: { ...previous.analysisModules, aiReviewAssistance: checked },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Local Processing */}
      <Card className="border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-foreground">Local Processing</CardTitle>
          <CardDescription>Configure local analysis settings</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Enable Local AI Analysis</p>
              <p className="text-xs text-muted-foreground">
                Process documents using local models (requires additional setup)
              </p>
            </div>
            <Switch
              checked={settings.localProcessing.enableLocalAiAnalysis}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  localProcessing: { ...previous.localProcessing, enableLocalAiAnalysis: checked },
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storage">Document Storage Location</Label>
            <div className="flex gap-2">
              <Input 
                id="storage" 
                value={settings.localProcessing.documentStorageLocation}
                onChange={(event) =>
                  setSettings((previous) => ({
                    ...previous,
                    localProcessing: {
                      ...previous.localProcessing,
                      documentStorageLocation: event.target.value,
                    },
                  }))
                }
                className="flex-1"
                placeholder="Choose or enter a storage location"
                aria-invalid={Boolean(errors.documentStorageLocation)}
              />
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  void handleBrowseStorageLocation();
                }}
                disabled={!settings.localProcessing.enableLocalAiAnalysis}
              >
                Browse
              </Button>
            </div>
            {errors.documentStorageLocation ? (
              <p className="text-xs text-destructive">{errors.documentStorageLocation}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card className="border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-foreground">Data Retention</CardTitle>
          <CardDescription>Manage how long documents are stored</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retention">Automatic Deletion After</Label>
            <Select
              value={settings.dataRetention.automaticDeletionAfter}
              onValueChange={(value) =>
                setSettings((previous) => ({
                  ...previous,
                  dataRetention: {
                    ...previous.dataRetention,
                    automaticDeletionAfter: value as AppSettings['dataRetention']['automaticDeletionAfter'],
                    documentRetentionDays: retentionPeriodToDays(
                      value as AppSettings['dataRetention']['automaticDeletionAfter'],
                    ),
                  },
                }))
              }
            >
              <SelectTrigger id="retention">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
                <SelectItem value="2years">2 Years</SelectItem>
                <SelectItem value="never">Never (Manual Only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Auto-delete Reviewed Documents</p>
              <p className="text-xs text-muted-foreground">
                Automatically remove documents marked as reviewed
              </p>
            </div>
            <Switch
              checked={settings.dataRetention.autoDeleteReviewedDocuments}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  dataRetention: { ...previous.dataRetention, autoDeleteReviewedDocuments: checked },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Interface Preferences */}
      <Card className="border-border">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-foreground">Interface Preferences</CardTitle>
          <CardDescription>Customize your workspace</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Color Theme</Label>
            <Select
              value={settings.interfacePreferences.colorTheme}
              onValueChange={(value) => {
                const nextTheme = value as AppSettings['interfacePreferences']['colorTheme'];
                setSettings((previous) => ({
                  ...previous,
                  interfacePreferences: {
                    ...previous.interfacePreferences,
                    colorTheme: nextTheme,
                  },
                }));
                applyColorThemePreference(nextTheme);
              }}
            >
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="auto">Auto (System)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="density">Display Density</Label>
            <Select
              value={settings.interfacePreferences.displayDensity}
              onValueChange={(value) =>
                setSettings((previous) => ({
                  ...previous,
                  interfacePreferences: {
                    ...previous.interfacePreferences,
                    displayDensity: value as AppSettings['interfacePreferences']['displayDensity'],
                  },
                }))
              }
            >
              <SelectTrigger id="density">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Show Severity Badges</p>
              <p className="text-xs text-muted-foreground">Display color-coded severity indicators</p>
            </div>
            <Switch
              checked={settings.interfacePreferences.showSeverityBadges}
              onCheckedChange={(checked) =>
                setSettings((previous) => ({
                  ...previous,
                  interfacePreferences: {
                    ...previous.interfacePreferences,
                    showSeverityBadges: checked,
                  },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Shield className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 mb-1">Privacy & Data Security</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                All document analysis is performed locally on your computer. No student papers or 
                analysis data are transmitted to external servers or cloud services. Documents are 
                stored only in the location you specify above. This tool is designed for local use 
                only and complies with academic privacy requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={isLoading || isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
