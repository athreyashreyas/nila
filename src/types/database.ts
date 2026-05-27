// Database types matching supabase/migrations/001_initial_schema.sql
// Run `supabase gen types typescript` to regenerate from live schema.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          key_salt: string;
          wrapped_key: string;
          recovery_wrapped_key: string | null;
          pbkdf2_iterations: number;
          reminder_enabled: boolean;
          reminder_hour: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          key_salt: string;
          wrapped_key: string;
          recovery_wrapped_key?: string | null;
          pbkdf2_iterations?: number;
          reminder_enabled?: boolean;
          reminder_hour?: number | null;
        };
        Update: {
          key_salt?: string;
          wrapped_key?: string;
          recovery_wrapped_key?: string | null;
          pbkdf2_iterations?: number;
          reminder_enabled?: boolean;
          reminder_hour?: number | null;
        };
      };
      cycles: {
        Row: {
          id: string;
          user_id: string;
          enc_data: string;
          enc_data_iv: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          enc_data: string;
          enc_data_iv: string;
        };
        Update: {
          enc_data?: string;
          enc_data_iv?: string;
        };
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          enc_data: string;
          enc_data_iv: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          enc_data: string;
          enc_data_iv: string;
        };
        Update: {
          enc_data?: string;
          enc_data_iv?: string;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          subscription: PushSubscriptionJSON;
          device_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription: PushSubscriptionJSON;
          device_name?: string | null;
        };
        Update: {
          subscription?: PushSubscriptionJSON;
          device_name?: string | null;
        };
      };
    };
  };
};

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
