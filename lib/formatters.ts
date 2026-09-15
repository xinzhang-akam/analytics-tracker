/**
 * Format status string from database enum to Title Case display
 * e.g., "NOT_STARTED" -> "Not Started"
 */
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
