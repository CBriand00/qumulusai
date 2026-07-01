import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://oomdaguzvdheotrkqdxs.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbWRhZ3V6dmRoZW90cmtxZHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0ODg4MTQsImV4cCI6MjA5ODA2NDgxNH0.RFcfu2TxPbvZpTAFDVgvSlewv7yEZfJ17rIbE5Hz79o",
  {
    auth: {
      autoRefreshToken: true,  // Silently refreshes the JWT before expiry
      persistSession:   true,  // Writes session to localStorage
      detectSessionInUrl: true, // Picks up #access_token from password-reset links
    },
  }
);
