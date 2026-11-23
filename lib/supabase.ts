import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://pzjagveajiyjlloawiiu.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_9ockDo5UCvC9vxGeOtvdfg_pFVT6nU3";

export const isSupabaseConfigured = Boolean(url && key);
export const supabase = isSupabaseConfigured ? createClient(url, key) : null;

export async function signIn(email: string, password: string) {
  if (!supabase) return { demo: true as const, error: null };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { demo: false as const, data, error };
}

export async function changePassword(password: string) {
  if (!supabase) return { error: null };
  return supabase.auth.updateUser({ password, data: { must_change_password: false } });
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}
