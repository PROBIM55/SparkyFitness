import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { verifyBudgetSsoTicket } from '../utils/budgetSso.js';

const TEST_SECRET = 'test-health-sso-secret-with-at-least-32-characters';

function createTicket(overrides: Record<string, unknown> = {}) {
  const now = 1_800_000_000;
  const payload = {
    v: 1,
    iss: 'budgetapp',
    aud: 'sparkyfitness',
    sub: '42',
    login: 'budget_admin',
    iat: now,
    exp: now + 300,
    jti: 'abcdefghijklmnopqrstuvwxyz012345',
    ...overrides,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TEST_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

describe('BudgetApp SSO ticket verification', () => {
  beforeEach(() => {
    process.env.HEALTH_SSO_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.HEALTH_SSO_SECRET;
  });

  it('accepts a valid short-lived ticket', () => {
    const payload = verifyBudgetSsoTicket(createTicket(), 1_800_000_010);
    expect(payload.sub).toBe('42');
    expect(payload.login).toBe('budget_admin');
  });

  it('accepts family identity claims from a version 2 ticket', () => {
    const payload = verifyBudgetSsoTicket(
      createTicket({
        v: 2,
        name: 'Александр',
        account_id: '7',
        member_id: '11',
        role: 'owner',
      }),
      1_800_000_010
    );
    expect(payload.v).toBe(2);
    if (payload.v === 2) {
      expect(payload.account_id).toBe('7');
      expect(payload.member_id).toBe('11');
      expect(payload.name).toBe('Александр');
    }
  });

  it('rejects invalid family identity claims', () => {
    expect(() =>
      verifyBudgetSsoTicket(
        createTicket({
          v: 2,
          name: 'Александр',
          account_id: '7',
          member_id: '11',
          role: 'superadmin',
        }),
        1_800_000_010
      )
    ).toThrow(/claims/);
  });

  it('rejects an expired ticket', () => {
    expect(() => verifyBudgetSsoTicket(createTicket(), 1_800_000_301)).toThrow(
      /lifetime/
    );
  });

  it('rejects a modified ticket', () => {
    const ticket = createTicket();
    const [payload] = ticket.split('.');
    expect(() =>
      verifyBudgetSsoTicket(`${payload}.invalid-signature`, 1_800_000_010)
    ).toThrow(/signature/);
  });

  it('rejects a ticket for another audience', () => {
    expect(() =>
      verifyBudgetSsoTicket(
        createTicket({ aud: 'other-service' }),
        1_800_000_010
      )
    ).toThrow(/claims/);
  });
});
