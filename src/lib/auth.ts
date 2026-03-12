import { cookies, headers } from 'next/headers';

const TOKEN_COOKIE_NAME = 'auth_token';
const TOKEN_EXPIRY_DAYS = 30;

// Check if the request is using HTTPS
async function isSecureConnection(): Promise<boolean> {
  try {
    const headersList = await headers();
    const xForwardedProto = headersList.get('x-forwarded-proto');
    const protocol = xForwardedProto || headersList.get('x-forwarded-protocol') || '';
    return protocol.toLowerCase() === 'https';
  } catch {
    return false;
  }
}

// Get the expected token from environment
export function getExpectedToken(): string {
  const token = process.env.AUTH_TOKEN;
  if (!token) {
    throw new Error('AUTH_TOKEN environment variable is not set');
  }
  return token;
}

// Verify if the provided token matches
export function verifyToken(token: string): boolean {
  try {
    const expectedToken = getExpectedToken();
    return token === expectedToken;
  } catch {
    return false;
  }
}

// Set authentication cookie
export async function setAuthToken(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: await isSecureConnection(),
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/',
  });
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  return verifyToken(token);
}

// Clear authentication cookie
export async function clearAuthToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}
