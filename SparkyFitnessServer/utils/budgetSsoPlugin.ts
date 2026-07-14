import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { getBudgetSsoEmail, verifyBudgetSsoTicket } from './budgetSso.js';

const ticketSchema = z.object({
  ticket: z.string().min(20).max(4096),
});

export const budgetSso = () =>
  ({
    id: 'budget-sso',
    endpoints: {
      signInWithBudget: createAuthEndpoint(
        '/budget-sso',
        {
          method: 'POST',
          body: ticketSchema,
        },
        async (ctx) => {
          let payload;
          try {
            payload = verifyBudgetSsoTicket(ctx.body.ticket);
          } catch {
            throw new APIError('UNAUTHORIZED', {
              message: 'Invalid or expired BudgetApp sign-in ticket.',
            });
          }

          const verificationId = `budget-sso:${payload.jti}`;
          if (
            await ctx.context.internalAdapter.findVerificationValue(
              verificationId
            )
          ) {
            throw new APIError('UNAUTHORIZED', {
              message: 'BudgetApp sign-in ticket has already been used.',
            });
          }
          await ctx.context.internalAdapter.createVerificationValue({
            identifier: verificationId,
            value: payload.sub,
            expiresAt: new Date(payload.exp * 1000),
          });

          const providerId = 'budgetapp';
          const accountId = `budgetapp:${payload.sub}`;
          const linkedAccount =
            await ctx.context.internalAdapter.findAccountByProviderId(
              accountId,
              providerId
            );

          let user = linkedAccount
            ? await ctx.context.internalAdapter.findUserById(
                linkedAccount.userId
              )
            : null;

          if (!user) {
            const email = getBudgetSsoEmail(payload.sub);
            const existingUser =
              await ctx.context.internalAdapter.findUserByEmail(email);
            user =
              existingUser?.user ||
              (await ctx.context.internalAdapter.createUser({
                email,
                emailVerified: true,
                name: payload.login,
              }));

            if (!linkedAccount) {
              await ctx.context.internalAdapter.createAccount({
                userId: user.id,
                accountId,
                providerId,
              });
            }
          } else if (user.name !== payload.login) {
            user = await ctx.context.internalAdapter.updateUser(user.id, {
              name: payload.login,
            });
          }

          const session = await ctx.context.internalAdapter.createSession(
            user.id
          );
          await setSessionCookie(ctx, { session, user });

          return ctx.json({ success: true });
        }
      ),
    },
  }) satisfies BetterAuthPlugin;
