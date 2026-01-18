import { supabase } from "@/integrations/supabase/client";

const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export interface AuthorizationResult {
  authorized: boolean;
  isAdmin: boolean;
}

/**
 * Check if the given email is authorized (either admin allowlist or table flag).
 * Keeps logic centralized to avoid drift between screens.
 */
export async function checkAuthorizationEmail(email: string): Promise<AuthorizationResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const isAdmin = adminEmails.includes(normalizedEmail);

  if (!normalizedEmail) return { authorized: false, isAdmin: false };

  try {
    const { data, error } = await supabase
      .from("usuarios_autorizados")
      .select("autorizado")
      .eq("email", normalizedEmail)
      .single();

    const authorized = Boolean(data?.autorizado) || isAdmin;
    if (error) {
      console.warn("Erro ao verificar autorização:", error.message);
    }

    return { authorized, isAdmin };
  } catch (err) {
    console.error("Falha ao checar autorização", err);
    return { authorized: isAdmin, isAdmin };
  }
}

/**
 * Register access request if it does not exist yet (pending approval).
 */
export async function registerAccessRequest(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  try {
    const { data: existing, error: queryError } = await supabase
      .from("usuarios_autorizados")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (queryError && queryError.code !== "PGRST116") {
      // PGRST116 -> row not found; ignore
      console.warn("Erro ao buscar solicitação de acesso:", queryError.message);
    }

    if (!existing) {
      await supabase.from("usuarios_autorizados").insert({ email: normalizedEmail, autorizado: false });
    }
  } catch (err) {
    console.error("Falha ao registrar solicitação de acesso", err);
  }
}
