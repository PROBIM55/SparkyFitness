import { useEffect, useRef, useState } from 'react';
import { HeartPulse, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBudgetSsoExchange } from '@/hooks/Auth/useBudgetSso';

const BUDGET_SSO_URL = 'https://budzhetapp.ru/app/sso/health';

export default function BudgetSso() {
  const exchangeTicket = useBudgetSsoExchange();
  const exchangeStarted = useRef(false);
  const [ticket] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get(
      'ticket'
    );
    window.history.replaceState(null, '', '/budget-sso');
    return value;
  });
  const [failed, setFailed] = useState(!ticket);

  useEffect(() => {
    if (!ticket || exchangeStarted.current) return;
    exchangeStarted.current = true;

    if (!localStorage.getItem('budget_sso_language_initialized')) {
      localStorage.setItem('i18nextLng', 'ru');
      localStorage.setItem('budget_sso_language_initialized', '1');
    }

    void exchangeTicket(ticket)
      .then(() => {
        window.location.replace('/');
      })
      .catch(() => setFailed(true));
  }, [exchangeTicket, ticket]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <HeartPulse className="mx-auto mb-2 h-10 w-10 text-primary" />
          <CardTitle>
            {failed
              ? 'Не удалось выполнить единый вход'
              : 'Входим в раздел здоровья'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {failed ? (
            <>
              <p className="mb-5 text-sm text-muted-foreground">
                Вернитесь в BudgetApp и повторите переход в раздел «Здоровье».
              </p>
              <Button asChild>
                <a href={BUDGET_SSO_URL}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Повторить через BudgetApp
                </a>
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Используем ваш текущий аккаунт BudgetApp.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
