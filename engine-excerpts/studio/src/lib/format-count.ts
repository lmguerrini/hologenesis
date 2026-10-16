/**
 * Shared singular/plural label for user-visible "<count> <noun>" strings so a
 * count of 1 never reads "1 events". Irregular plurals pass their own form
 * (retry -> retries, entry -> entries).
 */
export function formatCount(
  count: number,
  singular: string,
  plural: string = `${singular}s`
) {
  return `${count} ${count === 1 ? singular : plural}`;
}
