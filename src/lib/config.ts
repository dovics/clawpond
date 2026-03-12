/**
 * Get the server host for connecting to ZeroClaw instances.
 * Uses NEXT_PUBLIC_SERVER_HOST if set, otherwise falls back to localhost.
 */
export function getServerHost(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use the environment variable or fallback to window location
    return process.env.NEXT_PUBLIC_SERVER_HOST || window.location.hostname;
  }
  // Server-side: use the environment variable or localhost
  return process.env.NEXT_PUBLIC_SERVER_HOST || 'localhost';
}

/**
 * Build a connection URL for a ZeroClaw instance.
 */
export function buildInstanceUrl(port: number): string {
  const host = getServerHost();
  return `http://${host}:${port}`;
}
