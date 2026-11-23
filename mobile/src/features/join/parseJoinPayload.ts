export const JOIN_CODE_LENGTH = 6;
export const JOIN_URL_SCHEME = 'wideimpactclassroom';

const JOIN_CODE_PATTERN = /^[0-9]{6}$/;

export function isValidJoinCode(value: string | null | undefined): value is string {
  return typeof value === 'string' && JOIN_CODE_PATTERN.test(value);
}

/** The payload encoded in the teacher's QR code (see docs/API.md). */
export function buildJoinUrl(code: string): string {
  return `${JOIN_URL_SCHEME}://join?code=${code}`;
}

function getQueryParam(query: string, name: string): string | null {
  for (const pair of query.split('&')) {
    const [rawKey, rawValue = ''] = pair.split('=');
    if (rawKey === undefined) continue;
    try {
      if (decodeURIComponent(rawKey) === name) return decodeURIComponent(rawValue.replace(/\+/g, ' '));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Extracts a join code from a scanned/pasted/deep-linked value.
 *
 * Accepts:
 *  - a bare 6-digit code: `483920` (surrounding whitespace ignored)
 *  - the app deep link: `wideimpactclassroom://join?code=483920` (also `:///join`, trailing slash)
 *  - any http(s) URL whose path ends with `/join` and has a `code` query param
 *
 * Returns the 6-digit code, or `null` when the payload is not a valid join payload.
 */
export function parseJoinPayload(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return null;

  if (isValidJoinCode(value)) return value;

  const match = /^([a-z][a-z0-9+.-]*):\/\/([^?#]*)\?([^#]*)/i.exec(value);
  if (!match) return null;

  const [, scheme = '', rest = '', query = ''] = match;
  const segments = rest.split('/').filter(Boolean);
  const lowerScheme = scheme.toLowerCase();

  let isJoinPath: boolean;
  if (lowerScheme === JOIN_URL_SCHEME) {
    // `scheme://join?...` (host = join) or `scheme:///join?...` (path = /join)
    isJoinPath = segments.length === 1 && segments[0]?.toLowerCase() === 'join';
  } else if (lowerScheme === 'http' || lowerScheme === 'https') {
    // segments[0] is the host
    isJoinPath = segments.length >= 2 && segments[segments.length - 1]?.toLowerCase() === 'join';
  } else {
    return null;
  }
  if (!isJoinPath) return null;

  const code = getQueryParam(query, 'code')?.trim() ?? null;
  return isValidJoinCode(code) ? code : null;
}
