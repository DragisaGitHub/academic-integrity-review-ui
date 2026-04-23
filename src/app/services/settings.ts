import type { AppSettings, AppUser, RetentionPeriod, UiDensityPreference, UiThemePreference } from '../types';
import { apiEndpoints } from '../api';
import { getJson, HttpError, postJson } from '../api';

const SETTINGS_STORAGE_KEY_PREFIX = 'academicIntegrityReview.settings.v2';

export const defaultAppSettings: AppSettings = {
  profile: {
    fullName: '',
    department: '',
    university: '',
    email: '',
  },
  analysisModules: {
    citationAnalysis: true,
    referenceValidation: true,
    factualConsistencyReview: true,
    writingStyleConsistency: true,
    aiReviewAssistance: true,
  },
  localProcessing: {
    enableLocalAiAnalysis: false,
    documentStorageLocation: '',
  },
  dataRetention: {
    documentRetentionDays: 365,
    automaticDeletionAfter: '1year',
    autoDeleteReviewedDocuments: false,
  },
  interfacePreferences: {
    colorTheme: 'light',
    displayDensity: 'comfortable',
    showSeverityBadges: true,
    readingLayout: 'default',
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes' || normalized === '1') return true;
    if (normalized === 'false' || normalized === 'no' || normalized === '0') return false;
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isThemePreference(value: unknown): value is UiThemePreference {
  return value === 'light' || value === 'dark' || value === 'auto';
}

function isDensityPreference(value: unknown): value is UiDensityPreference {
  return value === 'compact' || value === 'comfortable' || value === 'spacious';
}

type BackendColorTheme = 'LIGHT' | 'DARK' | 'SYSTEM';
type BackendDisplayDensity = 'COMPACT' | 'COMFORTABLE' | 'SPACIOUS';

function toBackendColorTheme(value: UiThemePreference): BackendColorTheme {
  switch (value) {
    case 'light':
      return 'LIGHT';
    case 'dark':
      return 'DARK';
    case 'auto':
    default:
      return 'SYSTEM';
  }
}

function fromBackendColorTheme(value: unknown): UiThemePreference {
  const raw = (asString(value) ?? '').trim().toUpperCase();
  switch (raw) {
    case 'LIGHT':
      return 'light';
    case 'DARK':
      return 'dark';
    case 'SYSTEM':
      return 'auto';
    default:
      return isThemePreference(value) ? value : defaultAppSettings.interfacePreferences.colorTheme;
  }
}

function toBackendDisplayDensity(value: UiDensityPreference): BackendDisplayDensity {
  switch (value) {
    case 'compact':
      return 'COMPACT';
    case 'spacious':
      return 'SPACIOUS';
    case 'comfortable':
    default:
      return 'COMFORTABLE';
  }
}

function fromBackendDisplayDensity(value: unknown): UiDensityPreference {
  const raw = (asString(value) ?? '').trim().toUpperCase();
  switch (raw) {
    case 'COMPACT':
      return 'compact';
    case 'SPACIOUS':
      return 'spacious';
    case 'COMFORTABLE':
      return 'comfortable';
    default:
      return isDensityPreference(value) ? value : defaultAppSettings.interfacePreferences.displayDensity;
  }
}

function toBackendReadingLayout(value: string): string {
  const raw = value.trim();
  if (!raw) return 'DEFAULT';
  if (raw === 'DEFAULT' || raw === 'CONTINUOUS' || raw === 'PAGED' || raw === 'WIDE') return raw;
  if (raw === 'default') return 'DEFAULT';
  if (raw === 'continuous') return 'CONTINUOUS';
  if (raw === 'paged') return 'PAGED';
  if (raw === 'wide') return 'WIDE';
  return raw;
}

function fromBackendReadingLayout(value: unknown): string {
  const raw = (asString(value) ?? '').trim();
  if (!raw) return defaultAppSettings.interfacePreferences.readingLayout;
  if (raw === 'DEFAULT') return 'default';
  if (raw === 'CONTINUOUS') return 'continuous';
  if (raw === 'PAGED') return 'paged';
  if (raw === 'WIDE') return 'wide';
  return raw;
}

const RETENTION_NEVER_DAYS = 0;

function retentionPeriodToDays(period: RetentionPeriod): number {
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
      return RETENTION_NEVER_DAYS;
    default:
      return 365;
  }
}

function retentionDaysToPeriod(days: number): RetentionPeriod {
  if (!Number.isFinite(days)) return defaultAppSettings.dataRetention.automaticDeletionAfter;
  if (days <= 0) return 'never';
  if (days === 90) return '3months';
  if (days === 180) return '6months';
  if (days === 365) return '1year';
  if (days === 730) return '2years';

  const candidates: Array<{ period: RetentionPeriod; days: number }> = [
    { period: '3months', days: 90 },
    { period: '6months', days: 180 },
    { period: '1year', days: 365 },
    { period: '2years', days: 730 },
  ];

  let best = candidates[0];
  let bestDistance = Math.abs(days - best.days);

  for (const candidate of candidates.slice(1)) {
    const distance = Math.abs(days - candidate.days);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return best.period;
}

/** Flat backend contract for GET/POST /api/settings */
export interface SettingsDto {
  settingsCompleted?: boolean;
  professorName: string;
  department: string;
  university: string;
  email: string;

  citationAnalysis: boolean;
  referenceValidation: boolean;
  factualConsistencyReview: boolean;
  writingStyleConsistency: boolean;
  aiReviewAssistance: boolean;

  localAiEnabled: boolean;
  storageLocation: string;

  documentRetentionDays: number;
  autoDeleteReviewedDocuments: boolean;

  colorTheme: BackendColorTheme;
  displayDensity: BackendDisplayDensity;
  showSeverityBadges: boolean;
  readingLayout: string;
}

export type UserSettingsBootstrap = {
  settings: AppSettings;
  settingsCompleted: boolean;
};

function getSettingsStorageKey(userId: string): string {
  return `${SETTINGS_STORAGE_KEY_PREFIX}.${userId}`;
}

function getRequiredSettingsCompletion(settings: AppSettings): boolean {
  return Boolean(
    settings.profile.fullName.trim() &&
    settings.profile.department.trim() &&
    settings.profile.university.trim() &&
    settings.profile.email.trim(),
  );
}

function resolveSettingsCompleted(payload: unknown, settings: AppSettings, fallback?: boolean): boolean {
  if (isRecord(payload)) {
    const explicitCompletion = asBoolean(payload.settingsCompleted);
    if (explicitCompletion !== undefined) {
      return explicitCompletion;
    }
  }

  if (fallback !== undefined) {
    return fallback;
  }

  return getRequiredSettingsCompletion(settings);
}

function mergeWithDefaults(partial: unknown): AppSettings {
  if (!isRecord(partial)) return defaultAppSettings;

  const profile = isRecord(partial.profile) ? partial.profile : {};
  const analysisModules = isRecord(partial.analysisModules) ? partial.analysisModules : {};
  const localProcessing = isRecord(partial.localProcessing) ? partial.localProcessing : {};
  const dataRetention = isRecord(partial.dataRetention) ? partial.dataRetention : {};
  const interfacePreferences = isRecord(partial.interfacePreferences) ? partial.interfacePreferences : {};

  const documentRetentionDays =
    asNumber(dataRetention.documentRetentionDays) ?? defaultAppSettings.dataRetention.documentRetentionDays;

  return {
    profile: {
      fullName: typeof profile.fullName === 'string' ? profile.fullName : defaultAppSettings.profile.fullName,
      department: typeof profile.department === 'string' ? profile.department : defaultAppSettings.profile.department,
      university: typeof profile.university === 'string' ? profile.university : defaultAppSettings.profile.university,
      email: typeof profile.email === 'string' ? profile.email : defaultAppSettings.profile.email,
    },
    analysisModules: {
      citationAnalysis:
        typeof analysisModules.citationAnalysis === 'boolean'
          ? analysisModules.citationAnalysis
          : defaultAppSettings.analysisModules.citationAnalysis,
      referenceValidation:
        typeof analysisModules.referenceValidation === 'boolean'
          ? analysisModules.referenceValidation
          : defaultAppSettings.analysisModules.referenceValidation,
      factualConsistencyReview:
        typeof analysisModules.factualConsistencyReview === 'boolean'
          ? analysisModules.factualConsistencyReview
          : defaultAppSettings.analysisModules.factualConsistencyReview,
      writingStyleConsistency:
        typeof analysisModules.writingStyleConsistency === 'boolean'
          ? analysisModules.writingStyleConsistency
          : defaultAppSettings.analysisModules.writingStyleConsistency,
      aiReviewAssistance:
        typeof analysisModules.aiReviewAssistance === 'boolean'
          ? analysisModules.aiReviewAssistance
          : defaultAppSettings.analysisModules.aiReviewAssistance,
    },
    localProcessing: {
      enableLocalAiAnalysis:
        typeof localProcessing.enableLocalAiAnalysis === 'boolean'
          ? localProcessing.enableLocalAiAnalysis
          : defaultAppSettings.localProcessing.enableLocalAiAnalysis,
      documentStorageLocation:
        typeof localProcessing.documentStorageLocation === 'string'
          ? localProcessing.documentStorageLocation
          : defaultAppSettings.localProcessing.documentStorageLocation,
    },
    dataRetention: {
      documentRetentionDays,
      automaticDeletionAfter:
        dataRetention.automaticDeletionAfter === '3months' ||
        dataRetention.automaticDeletionAfter === '6months' ||
        dataRetention.automaticDeletionAfter === '1year' ||
        dataRetention.automaticDeletionAfter === '2years' ||
        dataRetention.automaticDeletionAfter === 'never'
          ? dataRetention.automaticDeletionAfter
          : retentionDaysToPeriod(documentRetentionDays),
      autoDeleteReviewedDocuments:
        typeof dataRetention.autoDeleteReviewedDocuments === 'boolean'
          ? dataRetention.autoDeleteReviewedDocuments
          : defaultAppSettings.dataRetention.autoDeleteReviewedDocuments,
    },
    interfacePreferences: {
      colorTheme:
        interfacePreferences.colorTheme === 'light' ||
        interfacePreferences.colorTheme === 'dark' ||
        interfacePreferences.colorTheme === 'auto'
          ? interfacePreferences.colorTheme
          : defaultAppSettings.interfacePreferences.colorTheme,
      displayDensity:
        interfacePreferences.displayDensity === 'compact' ||
        interfacePreferences.displayDensity === 'comfortable' ||
        interfacePreferences.displayDensity === 'spacious'
          ? interfacePreferences.displayDensity
          : defaultAppSettings.interfacePreferences.displayDensity,
      showSeverityBadges:
        typeof interfacePreferences.showSeverityBadges === 'boolean'
          ? interfacePreferences.showSeverityBadges
          : defaultAppSettings.interfacePreferences.showSeverityBadges,
      readingLayout:
        asString(interfacePreferences.readingLayout) ?? defaultAppSettings.interfacePreferences.readingLayout,
    },
  };
}

function mapSettingsDtoToModel(payload: unknown): AppSettings {
  if (!isRecord(payload)) return defaultAppSettings;

  // If the backend already returns nested shape, keep backward compatibility.
  if ('profile' in payload || 'analysisModules' in payload || 'localProcessing' in payload) {
    return mergeWithDefaults(payload);
  }

  const professorName = asString(payload.professorName) ?? asString(payload.fullName) ?? '';
  const department = asString(payload.department) ?? '';
  const university = asString(payload.university) ?? '';
  const email = asString(payload.email) ?? '';

  const citationAnalysis = asBoolean(payload.citationAnalysis) ?? defaultAppSettings.analysisModules.citationAnalysis;
  const referenceValidation =
    asBoolean(payload.referenceValidation) ?? defaultAppSettings.analysisModules.referenceValidation;
  const factualConsistencyReview =
    asBoolean(payload.factualConsistencyReview) ?? defaultAppSettings.analysisModules.factualConsistencyReview;
  const writingStyleConsistency =
    asBoolean(payload.writingStyleConsistency) ?? defaultAppSettings.analysisModules.writingStyleConsistency;
  const aiReviewAssistance =
    asBoolean(payload.aiReviewAssistance) ?? defaultAppSettings.analysisModules.aiReviewAssistance;

  const localAiEnabled = asBoolean(payload.localAiEnabled) ?? defaultAppSettings.localProcessing.enableLocalAiAnalysis;
  const storageLocation = asString(payload.storageLocation) ?? '';

  const documentRetentionDays =
    asNumber(payload.documentRetentionDays) ?? defaultAppSettings.dataRetention.documentRetentionDays;
  const autoDeleteReviewedDocuments =
    asBoolean(payload.autoDeleteReviewedDocuments) ?? defaultAppSettings.dataRetention.autoDeleteReviewedDocuments;

  const colorTheme = fromBackendColorTheme(payload.colorTheme);
  const displayDensity = fromBackendDisplayDensity(payload.displayDensity);

  const showSeverityBadges =
    asBoolean(payload.showSeverityBadges) ?? defaultAppSettings.interfacePreferences.showSeverityBadges;

  const readingLayout = fromBackendReadingLayout(payload.readingLayout);

  const nested = {
    profile: {
      fullName: professorName,
      department,
      university,
      email,
    },
    analysisModules: {
      citationAnalysis,
      referenceValidation,
      factualConsistencyReview,
      writingStyleConsistency,
      aiReviewAssistance,
    },
    localProcessing: {
      enableLocalAiAnalysis: localAiEnabled,
      documentStorageLocation: storageLocation,
    },
    dataRetention: {
      documentRetentionDays,
      automaticDeletionAfter: retentionDaysToPeriod(documentRetentionDays),
      autoDeleteReviewedDocuments,
    },
    interfacePreferences: {
      colorTheme,
      displayDensity,
      showSeverityBadges,
      readingLayout,
    },
  };

  return mergeWithDefaults(nested);
}

function mapSettingsModelToDto(settings: AppSettings): unknown {
  const retentionDays =
    Number.isFinite(settings.dataRetention.documentRetentionDays)
      ? settings.dataRetention.documentRetentionDays
      : retentionPeriodToDays(settings.dataRetention.automaticDeletionAfter);

  const dto: SettingsDto = {
    professorName: settings.profile.fullName,
    department: settings.profile.department,
    university: settings.profile.university,
    email: settings.profile.email,

    citationAnalysis: settings.analysisModules.citationAnalysis,
    referenceValidation: settings.analysisModules.referenceValidation,
    factualConsistencyReview: settings.analysisModules.factualConsistencyReview,
    writingStyleConsistency: settings.analysisModules.writingStyleConsistency,
    aiReviewAssistance: settings.analysisModules.aiReviewAssistance,

    localAiEnabled: settings.localProcessing.enableLocalAiAnalysis,
    storageLocation: settings.localProcessing.documentStorageLocation,

    documentRetentionDays: retentionDays,
    autoDeleteReviewedDocuments: settings.dataRetention.autoDeleteReviewedDocuments,

    colorTheme: toBackendColorTheme(settings.interfacePreferences.colorTheme),
    displayDensity: toBackendDisplayDensity(settings.interfacePreferences.displayDensity),
    showSeverityBadges: settings.interfacePreferences.showSeverityBadges,
    readingLayout: toBackendReadingLayout(settings.interfacePreferences.readingLayout),
  };

  return dto;
}

export function loadAppSettings(userId: string): AppSettings {
  try {
    const raw = localStorage.getItem(getSettingsStorageKey(userId));
    if (!raw) return defaultAppSettings;

    return mergeWithDefaults(JSON.parse(raw) as unknown);
  } catch {
    return defaultAppSettings;
  }
}

export function saveAppSettings(userId: string, settings: AppSettings): void {
  localStorage.setItem(getSettingsStorageKey(userId), JSON.stringify(settings));
}

export function resetAppSettings(userId?: string): void {
  if (userId) {
    localStorage.removeItem(getSettingsStorageKey(userId));
    return;
  }

  const keysToRemove: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(SETTINGS_STORAGE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

export interface GetAppSettingsOptions {
  optional?: boolean;
  userId?: string;
}

/**
 * Backend settings read.
 *
 * GET /api/settings
 */
export async function getAppSettingsFromApi(options: GetAppSettingsOptions = {}): Promise<AppSettings> {
  try {
    const payload = await getJson<unknown>(apiEndpoints.settingsApi, {
      skipUnauthorizedRedirect: options.optional,
    });
    const mapped = mapSettingsDtoToModel(payload);
    // Cache the last known-good backend settings for offline/local-first use.
    if (options.userId) {
      saveAppSettings(options.userId, mapped);
    }
    return mapped;
  } catch (error) {
    if (options.optional && error instanceof HttpError && [401, 403, 404].includes(error.status)) {
      return options.userId ? loadAppSettings(options.userId) : defaultAppSettings;
    }

    if (error instanceof HttpError && error.status === 404) {
      // If the endpoint isn't implemented yet, keep a predictable fallback.
      throw error;
    }

    throw error;
  }
}

/**
 * Backend settings write.
 *
 * POST /api/settings
 */
export async function saveAppSettingsToApi(settings: AppSettings): Promise<void> {
  const dto = mapSettingsModelToDto(settings);
  await postJson<unknown, unknown>(apiEndpoints.settingsApi, dto);
}

export async function getUserSettingsBootstrapFromApi(user: AppUser): Promise<UserSettingsBootstrap> {
  if (user.role !== 'USER') {
    return {
      settings: defaultAppSettings,
      settingsCompleted: true,
    };
  }

  try {
    const payload = await getJson<unknown>(apiEndpoints.settingsApi, {
      skipUnauthorizedRedirect: true,
    });
    const settings = mapSettingsDtoToModel(payload);
    const settingsCompleted = resolveSettingsCompleted(payload, settings, user.settingsCompleted);
    saveAppSettings(user.id, settings);

    return {
      settings,
      settingsCompleted,
    };
  } catch (error) {
    if (error instanceof HttpError && [404, 403].includes(error.status)) {
      resetAppSettings(user.id);
      return {
        settings: defaultAppSettings,
        settingsCompleted: false,
      };
    }

    throw error;
  }
}

let autoThemeCleanup: (() => void) | null = null;

export function applyColorThemePreference(theme: AppSettings['interfacePreferences']['colorTheme']): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (autoThemeCleanup) {
    autoThemeCleanup();
    autoThemeCleanup = null;
  }

  const setDarkClass = (isDark: boolean) => {
    root.classList.toggle('dark', isDark);
  };

  if (theme === 'dark') {
    setDarkClass(true);
    return;
  }

  if (theme === 'light') {
    setDarkClass(false);
    return;
  }

  // Auto/system: follow OS preference.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    setDarkClass(false);
    return;
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  setDarkClass(media.matches);

  const listener = (event: MediaQueryListEvent) => {
    setDarkClass(event.matches);
  };

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', listener);
    autoThemeCleanup = () => media.removeEventListener('change', listener);
  } else {
    // Older Safari
    media.addListener(listener);
    autoThemeCleanup = () => media.removeListener(listener);
  }
}
