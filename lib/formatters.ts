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
 * Constructs Date in local timezone by extracting date components
 * e.g., "2024-03-15" -> Date object representing March 15 in local timezone
 */
export function parseLocalDate(dateString: string): Date {
  // If date is already an ISO string with time, use as-is
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  // Extract date components and construct in local timezone
  const [year, month, day] = dateString.split('-').map(Number);
  // month is 0-indexed in Date constructor
  return new Date(year, month - 1, day);
}

/**
 * Format date to display string without timezone shift
 * Accepts date string, Date object, null, or undefined
 * Returns formatted string like "Mar 15, 2024" or empty string if invalid
 */
export function formatLocalDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';

  // Extract date string in YYYY-MM-DD format
  const dateStr = typeof dateInput === 'string'
    ? dateInput.split('T')[0]
    : dateInput.toISOString().split('T')[0];

  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return '';

  // Construct Date in local timezone (month is 0-indexed)
  const localDate = new Date(year, month - 1, day);

  // Format to "Mon DD, YYYY"
  return localDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format date to YYYY-MM-DD string for form inputs without timezone shift
 */
export function formatDateForInput(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';

  // Extract date string in YYYY-MM-DD format
  const dateStr = typeof dateInput === 'string'
    ? dateInput.split('T')[0]
    : dateInput.toISOString().split('T')[0];

  return dateStr;
}
