import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token, meal_type } = await req.json();

    if (!token || !meal_type) {
      return new Response(
        JSON.stringify({ status: "invalid", error: "Missing token or meal_type." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Client with Service Role (to bypass RLS for mutations)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Validate Token and Get Participant
    const { data: participant, error: participantError } = await supabaseClient
      .from("participants")
      .select("id, name")
      .eq("token", token)
      .single();

    if (participantError) {
      return new Response(JSON.stringify({ status: "invalid", error: "DB Fetch Error: " + participantError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    if (!participant) {
      return new Response(JSON.stringify({ status: "invalid", error: "Token valid but not found in DB." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Atomically attempt to use the meal
    const { data: usage, error: usageError } = await supabaseClient
      .from("meal_usage")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("participant_id", participant.id)
      .eq("meal_type", meal_type)
      .eq("is_used", false)
      .select()
      .single();

    if (usageError || !usage) {
      // It might be already used or there's an issue
      // We log that an attempt was made on an already used ticket
      await supabaseClient.from("scan_logs").insert({
        participant_id: participant.id,
        meal_type,
        status: "already_used",
      });

      let finalStatus = "already_used";
      
      // PGRST116 means 0 rows matched (which means it's legitimately already used)
      // If it's a different database error, we should probably still count it as invalid.
      if (usageError && usageError.code !== "PGRST116") {
         return new Response(JSON.stringify({ status: "invalid", error: "DB Update Error: " + usageError.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
         });
      }

      return new Response(JSON.stringify({ status: "already_used", name: participant.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Log Successful Scan
    await supabaseClient.from("scan_logs").insert({
      participant_id: participant.id,
      meal_type,
      status: "success",
    });

    return new Response(
      JSON.stringify({ status: "success", name: participant.name }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
