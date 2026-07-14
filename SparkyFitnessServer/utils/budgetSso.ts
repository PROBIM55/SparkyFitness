import crypto from 'crypto';

export type BudgetSsoPayload = {
  v: 1;
  iss: 'budgetapp';
  aud: 'sparkyfitness';
  sub: string;
  login: string;
  iat: number;
  exp: number;
  jti: string;
};

function getSecret(): string {
  const secret = process.env.HEALTH_SSO_SECRET || '';
  if (secret.length < 32) {
    throw new Error('HEALTH_SSO_SECRET must contain at least 32 characters');
  }
  return secret;
}

function isBudgetSsoPayload(value: unknown): value is BudgetSsoPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.v === 1 &&
    payload.iss === 'budgetapp' &&
    payload.aud === 'sparkyfitness' &&
    typeof payload.sub === 'string' &&
    /^\d+$/.test(payload.sub) &&
    typeof payload.login === 'string' &&
    payload.login.length >= 1 &&
    payload.login.length <= 128 &&
    typeof payload.iat === 'number' &&
    Number.isInteger(payload.iat) &&
    typeof payload.exp === 'number' &&
    Number.isInteger(payload.exp) &&
    typeof payload.jti === 'string' &&
    /^[A-Za-z0-9_-]{20,}$/.test(payload.jti)
  );
}

export function verifyBudgetSsoTicket(
  ticket: string,
  now = Math.floor(Date.now() / 1000)
): BudgetSsoPayload {
  const [encodedPayload, providedSignature, extraPart] = ticket.split('.');
  if (!encodedPayload || !providedSignature || extraPart) {
    throw new Error('Invalid SSO ticket format');
  }

  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url');
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new Error('Invalid SSO ticket signature');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    );
  } catch {
    throw new Error('Invalid SSO ticket payload');
  }
  if (!isBudgetSsoPayload(payload)) {
    throw new Error('Invalid SSO ticket claims');
  }
  if (
    payload.iat > now + 5 ||
    payload.exp <= now ||
    payload.exp - payload.iat > 90
  ) {
    throw new Error('Expired or invalid SSO ticket lifetime');
  }

  return payload;
}

export function getBudgetSsoEmail(subject: string): string {
  const opaqueId = crypto
    .createHmac('sha256', getSecret())
    .update(`budget-user:${subject}`)
    .digest('hex')
    .slice(0, 32);
  return `budget-${opaqueId}@sso.budzhetapp.ru`;
}
