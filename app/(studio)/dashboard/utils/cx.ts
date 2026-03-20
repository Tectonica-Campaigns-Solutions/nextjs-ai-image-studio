/**
 * Minimal conditional className helper used by the dashboard's Dashboard screens.
 * Filters out falsy values and joins the rest with a space.
 *
 * For components that already import shadcn's `cn` (clsx + tailwind-merge) use
 * that instead — this exists only to avoid the extra dependency in screen-level
 * files that don't otherwise import from @/lib/utils.
 */
export function cx(...classes: Array<string | undefined | null | false>): string {
  return classes.filter(Boolean).join(" ");
}
