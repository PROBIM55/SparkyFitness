import { useCallback } from 'react';
import { exchangeBudgetSsoTicket } from '@/api/budgetSso';

export function useBudgetSsoExchange() {
  return useCallback((ticket: string) => exchangeBudgetSsoTicket(ticket), []);
}
