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

/**
 * Parse date string safely without timezone shift
 * Appends noon time to ensure consistent local date display
 * e.g., "2024-03-15" -> Date object representing March 15 at noon local time
 */
export function parseLocalDate(dateString: string): Date {
  // If date is already an ISO string with time, use as-is
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  // Append noon time to prevent timezone shift
  return new Date(`${dateString}T12:00:00`);
}
