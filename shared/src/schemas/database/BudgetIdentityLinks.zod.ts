import { z } from "zod";

export const budgetIdentityLinkSchema = z.object({
  id: z.string().uuid(),
  budget_user_id: z.string(),
  budget_account_id: z.string(),
  budget_member_id: z.string().nullable(),
  budget_role: z.enum(["owner", "admin", "member"]),
  sparky_user_id: z.string().uuid(),
  last_synced_at: z.date(),
  created_at: z.date(),
});

export const budgetIdentityLinkInitializerSchema = budgetIdentityLinkSchema
  .omit({ id: true, last_synced_at: true, created_at: true })
  .extend({
    id: z.string().uuid().optional(),
    last_synced_at: z.date().optional(),
    created_at: z.date().optional(),
  });

export type BudgetIdentityLink = z.infer<typeof budgetIdentityLinkSchema>;
export type BudgetIdentityLinkInitializer = z.infer<
  typeof budgetIdentityLinkInitializerSchema
>;
