import { SupabaseClient } from '@supabase/supabase-js';

export async function logActivity(
  supabase: SupabaseClient,
  params: {
    client_id: string;
    entity: string;
    entity_id?: string | null;
    action: string;
    field?: string;
    old_value?: string;
    new_value?: string;
    actor?: string;
  }
) {
  try {
    await supabase.from('portal_activity_log').insert({
      client_id: params.client_id,
      entity: params.entity,
      entity_id: params.entity_id ?? null,
      action: params.action,
      field: params.field ?? null,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
      actor: params.actor ?? 'agency',
    });
  } catch {
    // log failures must not break the main operation
  }
}
