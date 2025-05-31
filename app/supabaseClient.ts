import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging (remove in production)
console.log("Supabase URL:", supabaseUrl ? "✓ Set" : "✗ Missing");
console.log("Supabase Key:", supabaseAnonKey ? "✓ Set" : "✗ Missing");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Missing Supabase environment variables: 
    NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✓" : "✗"}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? "✓" : "✗"}
  `);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
