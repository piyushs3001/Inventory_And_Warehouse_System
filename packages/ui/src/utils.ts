import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns up to 2 uppercase initials from a display name (e.g. "Rosa Martins" → "RM"). */
export function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean).slice(0, 2);
  const out = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  return out || '?';
}
