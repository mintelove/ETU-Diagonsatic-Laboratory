/**
 * Utility to get the public application base URL for generating public report links.
 * Prefers VITE_PUBLIC_APP_URL environment variable, falls back to window.location.origin.
 */
export function getPublicAppUrl() {
  const envUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'https://etu-diagonsatic-laboratory.onrender.com';
}

export function buildPublicReportUrl(token) {
  if (!token) return '';
  const baseUrl = getPublicAppUrl();
  return `${baseUrl}/report/public/${token}`;
}
