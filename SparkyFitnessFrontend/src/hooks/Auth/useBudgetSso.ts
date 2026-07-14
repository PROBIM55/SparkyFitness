import { useMutation } from '@tanstack/react-query';
import { exchangeBudgetSsoTicket } from '@/api/budgetSso';

export function useBudgetSsoExchange() {
  return useMutation({ mutationFn: exchangeBudgetSsoTicket });
}
