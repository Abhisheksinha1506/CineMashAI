import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createHash } from 'crypto'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Hash IP address for privacy and rate limiting
export function hashIP(request: Request | any): string {
  // Try to get IP from various headers
  const forwarded = request.headers?.get?.('x-forwarded-for') || 
                    request.headers?.get?.('x-real-ip') ||
                    request.ip ||
                    'unknown';
  
  // Use the first IP if multiple are provided
  const ip = forwarded?.split?.(',')[0]?.trim() || forwarded || 'unknown';
  
  // Create SHA256 hash
  return createHash('sha256').update(ip).digest('hex');
}
