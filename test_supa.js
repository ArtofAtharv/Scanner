"use strict";
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://nhtpkqtjzxwblciibkux.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odHBrcXRqenh3YmxjaWlia3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODkxNDcsImV4cCI6MjA5MDU2NTE0N30.k1JXucVhmiwF0bONsgYCRw8U41YhYat0maWcM34CLR0"
);

async function testOuterJoin() {
  console.log("Fetching participants...");
  const { data, error } = await supabase
    .from("participants")
    .select(`
      id, name, email, role, token, created_at,
      meal_usage(meal_type, is_used, used_at)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Error:", error);
    return;
  }

  // Count participants that have exactly 3 true is_used boolean values
  let missingUIBugCount = 0;
  for (const p of data) {
    if (!p.meal_usage) continue;
    const allUsed = p.meal_usage.every(m => m.is_used === true);
    if (allUsed && p.meal_usage.length === 3) {
      console.log("FOUND FULLY USED PARTICIPANT:", p.name, p.email);
      missingUIBugCount++;
    }
  }
  
  console.log("Total users fetched:", data.length);
  console.log("Users with all 3 meals used:", missingUIBugCount);
}

testOuterJoin();
