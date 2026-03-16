import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string for display.
 * Handles invalid dates (e.g., Docker's "0001-01-01T00:00:00Z" for never-started containers)
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);

  // Check if date is valid (not before year 2000, which indicates Docker's zero date)
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
    return 'Never';
  }

  return date.toLocaleString();
}
