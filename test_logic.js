"use strict";
// Test logic script
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient("https://nhtpkqtjzxwblciibkux.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odHBrcXRqenh3YmxjaWlia3V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk4OTE0NywiZXhwIjoyMDkwNTY1MTQ3fQ.rLYbaPoLXeji1rGGI1cc0HuLP8dtnEZvCAbKbAiRyGo");

async function run() {
  const token = "test-token-123";
  const { data: p, error: pErr } = await supabase.from("participants").insert({ name: "LogicTest", email: "test2@log.com", token: token, role: "Participant" }).select().single();
  
  if (pErr) {
    if (pErr.code === '23505') { // unique violation
       const ext = await supabase.from("participants").select().eq("token", token).single();
       console.log("Already exists:", ext.data.id);
       await supabase.from("meal_usage").update({ is_used: true }).eq("participant_id", ext.data.id);
       const after = await supabase.from("participants").select().eq("id", ext.data.id).single();
       console.log("Still exists:", !!after.data);
       return;
    }
    console.error("Insert error:", pErr);
    return;
  }
  
  console.log("Created:", p.id);
  
  await supabase.from("meal_usage").update({ is_used: true }).eq("participant_id", p.id);
  
  const { data: p2 } = await supabase.from("participants").select().eq("id", p.id).single();
  console.log("After update:", p2 ? "Exists" : "Deleted!");
  
  await supabase.from("participants").delete().eq("id", p.id);
  console.log("Cleaned up");
}
run();
