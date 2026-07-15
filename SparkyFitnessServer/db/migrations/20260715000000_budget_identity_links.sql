CREATE TABLE IF NOT EXISTS public.budget_identity_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_user_id TEXT NOT NULL UNIQUE,
    budget_account_id TEXT NOT NULL,
    budget_member_id TEXT,
    budget_role TEXT NOT NULL CHECK (budget_role IN ('owner', 'admin', 'member')),
    sparky_user_id UUID NOT NULL UNIQUE REFERENCES public."user"(id) ON DELETE CASCADE,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_identity_links_account_member
    ON public.budget_identity_links(budget_account_id, budget_member_id)
    WHERE budget_member_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_budget_identity_links_account
    ON public.budget_identity_links(budget_account_id);

ALTER TABLE public.budget_identity_links ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.family_access
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_access_budgetapp_pair
    ON public.family_access(owner_user_id, family_user_id)
    WHERE source = 'budgetapp';
