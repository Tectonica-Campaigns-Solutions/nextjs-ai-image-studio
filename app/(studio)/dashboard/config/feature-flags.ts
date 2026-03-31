/**
 * Dashboard feature flags.
 *
 * Defaults can be overridden via NEXT_PUBLIC_* environment variables.
 *
 * Supported values for env vars:
 * - true: "1", "true", "yes", "on"
 * - false: "0", "false", "no", "off"
 */
const DASHBOARD_FEATURE_DEFAULTS = {
  commandPalette: true,
  darkThemeToggle: false,
  notifications: false,
  visualStudioAccessLogs: false,
} as const;

const DASHBOARD_FEATURE_ENV_KEYS = {
  commandPalette: "NEXT_PUBLIC_DASHBOARD_FEATURE_COMMAND_PALETTE",
  darkThemeToggle: "NEXT_PUBLIC_DASHBOARD_FEATURE_DARK_THEME_TOGGLE",
  notifications: "NEXT_PUBLIC_DASHBOARD_FEATURE_NOTIFICATIONS",
  visualStudioAccessLogs:
    "NEXT_PUBLIC_DASHBOARD_FEATURE_VISUAL_STUDIO_ACCESS_LOGS",
} as const;

export type DashboardFeatureFlagKey = keyof typeof DASHBOARD_FEATURE_DEFAULTS;

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function resolveDashboardFeatureFlag(key: DashboardFeatureFlagKey): boolean {
  const envKey = DASHBOARD_FEATURE_ENV_KEYS[key];
  const envValue = parseBooleanEnv(process.env[envKey]);
  if (typeof envValue === "boolean") return envValue;
  return DASHBOARD_FEATURE_DEFAULTS[key];
}

export const DASHBOARD_FEATURE_FLAGS: Record<DashboardFeatureFlagKey, boolean> =
  {
    commandPalette: resolveDashboardFeatureFlag("commandPalette"),
    darkThemeToggle: resolveDashboardFeatureFlag("darkThemeToggle"),
    notifications: resolveDashboardFeatureFlag("notifications"),
    visualStudioAccessLogs: resolveDashboardFeatureFlag(
      "visualStudioAccessLogs",
    ),
  };

export function isDashboardFeatureEnabled(
  key: DashboardFeatureFlagKey,
): boolean {
  return DASHBOARD_FEATURE_FLAGS[key];
}
