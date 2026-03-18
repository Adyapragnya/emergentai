import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formats status labels from snake_case or colon-separated format to human-readable labels.
 * Examples:
 *   - "in_progress" -> "In Progress"
 *   - "ffa:completed" -> "FFA: Completed"
 *   - "lsa:acknowledged" -> "LSA: Acknowledged"
 *   - "pending" -> "Pending"
 */
export function formatStatusLabel(status) {
  if (!status) return '';
  
  // Handle colon-separated format (e.g., "ffa:completed")
  if (status.includes(':')) {
    const [prefix, suffix] = status.split(':');
    const formattedPrefix = prefix.toUpperCase();
    const formattedSuffix = suffix
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return `${formattedPrefix}: ${formattedSuffix}`;
  }
  
  // Handle snake_case format (e.g., "in_progress")
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
