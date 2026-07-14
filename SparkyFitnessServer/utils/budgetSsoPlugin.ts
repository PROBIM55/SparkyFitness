import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';
import { getBudgetSsoEmail, verifyBudgetSsoTicket } from './budgetSso.js';

const ticketSchema = z.object({
  ticket: z.string().min(20).max(4096),
});

const budgetSsoPage = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Вход в раздел здоровья</title>
  <style>
    :root{color-scheme:dark;font-family:ui-sans-serif,system-ui,sans-serif;background:#020817;color:#f8fafc}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}
    main{width:min(448px,100%);padding:30px;border:1px solid #243047;border-radius:12px;text-align:center;background:#030b1c}
    svg{width:40px;height:40px;margin-bottom:14px}h1{margin:0;font-size:22px}p{margin:18px 0;color:#9db7dc;line-height:1.5}
    a{display:inline-block;padding:11px 18px;border-radius:7px;background:#25334d;color:#fff;text-decoration:none;font-weight:700}
  </style>
</head>
<body>
  <main>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.4-9.2-8.4C.8 8.8 3 4.5 7.2 4.5c2 0 3.5 1 4.8 2.7 1.3-1.7 2.8-2.7 4.8-2.7 4.2 0 6.4 4.3 4.4 8.1C19 16.6 12 21 12 21Z"/><path d="M7 12h3l1.2-2.5L13 15l1.2-3H17"/></svg>
    <h1 id="status">Входим в раздел здоровья</h1>
    <p id="detail">Используем ваш текущий аккаунт BudgetApp.</p>
    <a id="retry" href="https://budzhetapp.ru/app/sso/health" hidden>Повторить через BudgetApp</a>
  </main>
  <script>
    (() => {
      const status = document.getElementById('status');
      const detail = document.getElementById('detail');
      const retry = document.getElementById('retry');
      const ticket = new URLSearchParams(location.hash.slice(1)).get('ticket');
      history.replaceState(null, '', location.pathname);
      if (!localStorage.getItem('budgetSsoLocaleInitialized')) {
        localStorage.setItem('i18nextLng', 'ru');
        localStorage.setItem('language', 'ru');
        localStorage.setItem('budgetSsoLocaleInitialized', '1');
        document.cookie = 'i18next=ru; Path=/; Max-Age=31536000; SameSite=Lax; Secure';
      }
      const fail = () => {
        status.textContent = 'Не удалось выполнить единый вход';
        detail.textContent = 'Вернитесь в BudgetApp и повторите переход в раздел «Здоровье».';
        retry.hidden = false;
      };
      if (!ticket) {
        fail();
        return;
      }
      fetch('/api/auth/budget-sso', {
        method: 'POST',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ticket})
      }).then((response) => {
        if (!response.ok) throw new Error('SSO exchange failed');
        location.replace('/');
      }).catch(fail);
    })();
  </script>
</body>
</html>`;

export const budgetSso = () =>
  ({
    id: 'budget-sso',
    endpoints: {
      budgetSsoPage: createAuthEndpoint(
        '/budget-sso-page',
        { method: 'GET' },
        async () =>
          new Response(budgetSsoPage, {
            headers: {
              'Cache-Control': 'no-store',
              'Content-Type': 'text/html; charset=utf-8',
              'Content-Security-Policy':
                "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
              'Referrer-Policy': 'no-referrer',
              'X-Content-Type-Options': 'nosniff',
            },
          })
      ),
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
