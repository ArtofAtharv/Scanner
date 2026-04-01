"use strict";

const url = "https://nhtpkqtjzxwblciibkux.supabase.co/rest/v1/participants?select=id,name,email,role,token,created_at,meal_usage(meal_type,is_used,used_at)&order=created_at.desc";
const headers = {
  "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odHBrcXRqenh3YmxjaWlia3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODkxNDcsImV4cCI6MjA5MDU2NTE0N30.k1JXucVhmiwF0bONsgYCRw8U41YhYat0maWcM34CLR0",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odHBrcXRqenh3YmxjaWlia3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODkxNDcsImV4cCI6MjA5MDU2NTE0N30.k1JXucVhmiwF0bONsgYCRw8U41YhYat0maWcM34CLR0"
};

fetch(url, { headers })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
       console.error("DB Error:", data);
       return;
    }
    
    let completeCount = 0;
    for (const p of data) {
       const usages = p.meal_usage || [];
       const allUsed = usages.length === 3 && usages.every(m => m.is_used);
       if (allUsed) {
           completeCount++;
           console.log("FULLY SCANNED PARTICIPANT FOUND IN API:", p.name, p.email);
       }
    }
    
    console.log("Total Participants in API:", data.length);
    console.log("Total Fully Scanned:", completeCount);
  })
  .catch(err => console.error("Fetch failed:", err));
