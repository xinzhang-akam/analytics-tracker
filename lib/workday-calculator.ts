import { addDays, isWeekend } from 'date-fns';

/**
 * Check if a date is a non-working day (weekend only)
 */
export function isNonWorkingDay(date: Date): boolean {
  return isWeekend(date);
}

/**
 * Add working days to a start date, excluding weekends only
 * For release steps (workdays = 0), returns the same date
 */
export function addWorkdays(startDate: Date, workdays: number): Date {
  let currentDate = new Date(startDate);

  // Special case: if workdays is 0, return the same date (for release steps)
  if (workdays === 0) {
    return currentDate;
  }

  let remainingDays = workdays;

  // If start date is a weekend, move to next working day first
  while (isNonWorkingDay(currentDate)) {
    currentDate = addDays(currentDate, 1);
  }

  // Add the required workdays
  while (remainingDays > 0) {
    currentDate = addDays(currentDate, 1);

    if (!isNonWorkingDay(currentDate)) {
      remainingDays--;
    }
  }

  return currentDate;
}

/**
 * Calculate the number of working days between two dates
 */
export function getWorkdaysBetween(startDate: Date, endDate: Date): number {
  let currentDate = new Date(startDate);
  const normalizedEndDate = new Date(endDate);
  let workdays = 0;

  while (currentDate < normalizedEndDate) {
    if (!isNonWorkingDay(currentDate)) {
      workdays++;
    }
    currentDate = addDays(currentDate, 1);
  }

  return workdays;
}

/**
 * Get the next working day from a given date
 */
export function getNextWorkingDay(date: Date): Date {
  let currentDate = addDays(new Date(date), 1);

  while (isNonWorkingDay(currentDate)) {
    currentDate = addDays(currentDate, 1);
  }

  return currentDate;
}

/**
 * Get the previous working day from a given date
 */
export function getPreviousWorkingDay(date: Date): Date {
  let currentDate = addDays(new Date(date), -1);

  while (isNonWorkingDay(currentDate)) {
    currentDate = addDays(currentDate, -1);
  }

  return currentDate;
}
