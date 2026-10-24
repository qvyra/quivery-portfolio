// Date columns are YYYY-MM-DD strings in the schemas and in stored drafts
// (testimonial.givenAt)
export const isDateKey = (key: string) => key === 'givenAt';

/** Validated content, or a stored draft, as Prisma column data */
export function toColumns(content: Record<string, unknown>): object {
  return Object.fromEntries(
    Object.entries(content).map(([key, value]) => [
      key,
      isDateKey(key) && typeof value === 'string' ? new Date(value) : value,
    ]),
  );
}

/** A row as it will be once published: its draft, if any, over its columns */
export function withDraft<R extends { draft: unknown }>(row: R): R {
  return row.draft && typeof row.draft === 'object'
    ? ({ ...row, ...toColumns(row.draft as Record<string, unknown>) } as R)
    : row;
}
