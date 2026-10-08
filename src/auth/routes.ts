// Distinct pathname per company; hashes from the early prototype remain readable.
export function portalSlug(pathname = window.location.pathname): string | null {
  return pathname.startsWith('/portal/') ? pathname.split('/')[2] || 'invalid' : null;
}
export function portalURL(slug: string, route = '/anmelden'): string {
  return `/portal/${encodeURIComponent(slug)}${route}`;
}
export function readRoute(): string {
  if(window.location.hash.startsWith('#/')) return window.location.hash.slice(1).split('?')[0];
  const path=window.location.pathname;
  const route=portalSlug(path) ? '/'+path.split('/').slice(3).join('/') : path;
  return route==='/' || !route ? '/anmelden' : route.replace(/\/$/,'');
}
export function readResetToken(): string {
  return new URLSearchParams(window.location.search).get('token') ?? new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('token') ?? '';
}
