/**
 * Builds a { id → name } lookup map from an array of objects with id and name.
 */
export function createNameMap(
  items: Array<{ id: string; name: string }>,
): Record<string, string> {
  return Object.fromEntries(items.map((item) => [item.id, item.name]));
}

/**
 * Slices an array for client-side pagination and returns the page + metadata.
 */
export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): { paged: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const start = (page - 1) * pageSize;
  return {
    paged: items.slice(start, start + pageSize),
    totalPages,
  };
}
