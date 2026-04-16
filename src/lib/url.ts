export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // 1. Explicit Deployment URL (Highest priority for custom domains)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // 2. Vercel System URL fallback
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Local development fallback
  return 'http://localhost:3000';
}
