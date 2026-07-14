import { api } from './api';

export function exchangeBudgetSsoTicket(ticket: string): Promise<void> {
  return api.post('/auth/budget-sso', { body: { ticket } });
}
