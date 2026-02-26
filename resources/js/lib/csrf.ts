/**
 * Reads the CSRF token from the meta tag (name="csrf-token").
 * Use this for X-XSRF-TOKEN or X-CSRF-TOKEN headers when making state-changing API requests.
 */
export function getCsrfToken(): string | null {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
    return meta?.getAttribute('content') ?? null;
}
