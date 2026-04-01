const url = "https://nhtpkqtjzxwblciibkux.supabase.co/rest/v1/participants?token=eq.95ed0e6d-b225-4d2f-bef7-ea858373d0d0&select=*";
const headers = {
  "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odHBrcXRqenh3YmxjaWlia3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODkxNDcsImV4cCI6MjA5MDU2NTE0N30.k1JXucVhmiwF0bONsgYCRw8U41YhYat0maWcM34CLR0",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odHBrcXRqenh3YmxjaWlia3V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk4OTE0NywiZXhwIjoyMDkwNTY1MTQ3fQ.rLYbaPoLXeji1rGGI1cc0HuLP8dtnEZvCAbKbAiRyGo"
};

fetch(url, { headers })
  .then(res => res.text())
  .then(text => console.log("DB RESULT:", text))
  .catch(err => console.error(err));
