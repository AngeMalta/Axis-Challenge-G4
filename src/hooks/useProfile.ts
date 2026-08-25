import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  company_name: string | null;
  theme: string;
  account_type: string;
};

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      if (data) return data as Profile;
      const { data: created, error: insErr } = await supabase
        .from("profiles")
        .insert({ id: user.id, display_name: user.email?.split("@")[0] ?? "Novo usuário" })
        .select("*")
        .single();
      if (insErr) throw insErr;
      return created as Profile;
    },
  });
}
