"use strict";
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://nhtpkqtjzxwblciibkux.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odHBrcXRqenh3YmxjaWlia3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODkxNDcsImV4cCI6MjA5MDU2NTE0N30.k1JXucVhmiwF0bONsgYCRw8U41YhYat0maWcM34CLR0";
const supabaseRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odHBrcXRqenh3YmxjaWlia3V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk4OTE0NywiZXhwIjoyMDkwNTY1MTQ3fQ.rLYbaPoLXeji1rGGI1cc0HuLP8dtnEZvCAbKbAiRyGo";

async function run() {
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const adminClient = createClient(supabaseUrl, supabaseRoleKey);

  console.log("Fetching participants with Anon Client...");
  const { data: anonData, error: anonErr } = await anonClient
    .from("participants")
    .select(`id, name`);
  if (anonErr) console.error("Anon Error:", anonErr);
  else console.log("Anon Client rows:", anonData.length);

  console.log("Fetching participants with Admin Client...");
  const { data: adminData, error: adminErr } = await adminClient
    .from("participants")
    .select(`id, name`);
  if (adminErr) console.error("Admin Error:", adminErr);
  else console.log("Admin Client rows:", adminData.length);
}

run();
