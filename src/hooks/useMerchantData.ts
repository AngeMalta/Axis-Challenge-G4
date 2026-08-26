import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMerchantData() {
  const chargersQuery = useQuery({
    queryKey: ["my-chargers"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("chargers")
        .select("*")
        .eq("owner_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ids = (chargersQuery.data ?? []).map((c) => c.id);

  const sessionsQuery = useQuery({
    queryKey: ["merchant-sessions", ids.join(",")],
    enabled: ids.length > 0,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charging_sessions")
        .select("*")
        .in("charger_id", ids)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return {
    chargers: chargersQuery.data ?? [],
    sessions: sessionsQuery.data ?? [],
    loading: chargersQuery.isLoading,
  };
}
