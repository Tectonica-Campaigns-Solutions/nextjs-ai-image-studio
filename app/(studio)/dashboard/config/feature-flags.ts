/**
 * Dashboard feature flags.
 *
 * Toggle features here without touching component logic.
 */
export const DASHBOARD_FEATURE_FLAGS = {
  commandPalette: true,
  darkThemeToggle: false,
  notifications: false,
} as const;

export type DashboardFeatureFlagKey = keyof typeof DASHBOARD_FEATURE_FLAGS;

export function isDashboardFeatureEnabled(
  key: DashboardFeatureFlagKey,
): boolean {
  return DASHBOARD_FEATURE_FLAGS[key];
}
