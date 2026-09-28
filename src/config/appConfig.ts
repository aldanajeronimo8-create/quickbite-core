export type RuntimeMode = 'core';
export type AppEnvironment = 'development' | 'staging' | 'production';

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME ?? 'QuickBite',
  appVersion: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
  appEnv: (import.meta.env.VITE_APP_ENV ?? 'development') as AppEnvironment,
  publicAppUrl: import.meta.env.VITE_PUBLIC_APP_URL ?? '',
  runtimeMode: 'core' as RuntimeMode,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseStorageBucket: '',
  supabaseRealtimeEnabled: false,
  dataRefreshIntervalMs: Number(import.meta.env.VITE_DATA_REFRESH_INTERVAL_MS ?? 5000),
  passwordResetMode: 'email' as const,
  monitoringDsn: import.meta.env.VITE_MONITORING_DSN ?? '',
  monitoringProvider: import.meta.env.VITE_MONITORING_PROVIDER ?? 'console',
  analyticsProvider: import.meta.env.VITE_ANALYTICS_PROVIDER ?? 'none',
  analyticsKey: import.meta.env.VITE_ANALYTICS_KEY ?? '',
  otelEndpoint: import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT ?? '',
  adminInviteCode: import.meta.env.VITE_ADMIN_INVITE_CODE ?? '',
  allowedOrigins: (import.meta.env.VITE_ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
  primaryDomain: import.meta.env.VITE_PRIMARY_DOMAIN ?? '',
  cdnUrl: import.meta.env.VITE_CDN_URL ?? '',
};

export function hasSupabaseConfig() { return false; }
export function needsFirstRunSetup() { return !appConfig.apiBaseUrl; }
