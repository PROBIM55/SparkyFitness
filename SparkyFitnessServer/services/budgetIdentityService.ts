import { getSystemClient } from '../db/poolManager.js';

export type BudgetIdentityClaims = {
  sub: string;
  account_id: string;
  member_id: string | null;
  role: 'owner' | 'admin' | 'member';
};

export async function syncBudgetIdentity(
  claims: BudgetIdentityClaims,
  sparkyUserId: string
): Promise<void> {
  const client = await getSystemClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO public.budget_identity_links (
         budget_user_id,
         budget_account_id,
         budget_member_id,
         budget_role,
         sparky_user_id,
         last_synced_at
       ) VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (budget_user_id) DO UPDATE SET
         budget_account_id = EXCLUDED.budget_account_id,
         budget_member_id = EXCLUDED.budget_member_id,
         budget_role = EXCLUDED.budget_role,
         sparky_user_id = EXCLUDED.sparky_user_id,
         last_synced_at = NOW()`,
      [
        claims.sub,
        claims.account_id,
        claims.member_id,
        claims.role,
        sparkyUserId,
      ]
    );

    const users = (await client.query(
      `SELECT bil.sparky_user_id, u.email
       FROM public.budget_identity_links bil
       JOIN public."user" u ON u.id = bil.sparky_user_id
       WHERE bil.budget_account_id = $1`,
      [claims.account_id]
    )) as { rows: Array<{ sparky_user_id: string; email: string }> };

    const current = users.rows.find(
      (row) => row.sparky_user_id === sparkyUserId
    );
    const emptyPermissions = {
      can_manage_diary: false,
      can_view_food_library: false,
      can_view_exercise_library: false,
      can_manage_checkin: false,
      can_view_reports: false,
      can_manage_medications: false,
      share_external_providers: false,
    };

    if (current) {
      for (const peer of users.rows) {
        if (peer.sparky_user_id === sparkyUserId) continue;
        for (const access of [
          {
            ownerId: sparkyUserId,
            familyId: peer.sparky_user_id,
            familyEmail: peer.email,
          },
          {
            ownerId: peer.sparky_user_id,
            familyId: sparkyUserId,
            familyEmail: current.email,
          },
        ]) {
          await client.query(
            `INSERT INTO public.family_access (
               owner_user_id,
               family_user_id,
               family_email,
               access_permissions,
               is_active,
               status,
               source
             )
             SELECT $1, $2, $3, $4, FALSE, 'inactive', 'budgetapp'
             WHERE NOT EXISTS (
               SELECT 1 FROM public.family_access existing
               WHERE existing.owner_user_id = $1
                 AND existing.family_user_id = $2
                 AND existing.source <> 'budgetapp'
             )
             ON CONFLICT (owner_user_id, family_user_id)
               WHERE source = 'budgetapp'
             DO UPDATE SET family_email = EXCLUDED.family_email,
                           updated_at = NOW()`,
            [
              access.ownerId,
              access.familyId,
              access.familyEmail,
              JSON.stringify(emptyPermissions),
            ]
          );
        }
      }
    }

    await client.query(
      `UPDATE public.family_access fa
       SET is_active = FALSE,
           status = 'inactive',
           updated_at = NOW()
       WHERE fa.source = 'budgetapp'
         AND (fa.owner_user_id = $1 OR fa.family_user_id = $1)
         AND NOT EXISTS (
           SELECT 1
           FROM public.budget_identity_links owner_link
           JOIN public.budget_identity_links family_link
             ON family_link.budget_account_id = owner_link.budget_account_id
           WHERE owner_link.sparky_user_id = fa.owner_user_id
             AND family_link.sparky_user_id = fa.family_user_id
         )`,
      [sparkyUserId]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
