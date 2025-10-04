import { createClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const checkAuthSettings = async () => {
  try {
    return { 
      success: true, 
      settings: {
        siteUrl: window.location.origin,
        emailConfirmationRequired: false
      }
    };
  } catch (error) {
    console.error('Error checking auth settings:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Function to manually confirm a user's email (in case it's needed)
export const confirmUserEmail = async (userId: string) => {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true
    });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error confirming user email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to confirm email' 
    };
  }
};

