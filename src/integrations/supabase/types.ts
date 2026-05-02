export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_call_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          endpoint: string
          error: string | null
          http_status: number | null
          id: string
          job_id: string | null
          provider: string
          request_params: Json | null
          response: Json | null
          subscription_id: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          error?: string | null
          http_status?: number | null
          id?: string
          job_id?: string | null
          provider?: string
          request_params?: Json | null
          response?: Json | null
          subscription_id?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          error?: string | null
          http_status?: number | null
          id?: string
          job_id?: string | null
          provider?: string
          request_params?: Json | null
          response?: Json | null
          subscription_id?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "api_call_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scheduled_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_call_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          attempt: number
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          job_type: string
          max_attempts: number
          payload: Json | null
          phase: string | null
          result: Json | null
          run_at: string
          started_at: string | null
          status: string
          subscription_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          job_type: string
          max_attempts?: number
          payload?: Json | null
          phase?: string | null
          result?: Json | null
          run_at: string
          started_at?: string | null
          status?: string
          subscription_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          max_attempts?: number
          payload?: Json | null
          phase?: string | null
          result?: Json | null
          run_at?: string
          started_at?: string | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_jobs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          airline_iata: string
          api_call_count: number
          arr_actual_utc: string | null
          arr_city: string | null
          arr_estimated_utc: string | null
          arr_iata: string
          arr_time_utc: string | null
          created_at: string
          dep_actual_utc: string | null
          dep_city: string | null
          dep_estimated_utc: string | null
          dep_iata: string
          dep_local_datetime: string
          dep_time_utc: string
          failed_api_count: number
          flight_iata: string
          flight_number: string
          id: string
          last_response: Json | null
          last_status_text: string | null
          next_job_time: string | null
          phase: string
          retry_count: number
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          airline_iata: string
          api_call_count?: number
          arr_actual_utc?: string | null
          arr_city?: string | null
          arr_estimated_utc?: string | null
          arr_iata: string
          arr_time_utc?: string | null
          created_at?: string
          dep_actual_utc?: string | null
          dep_city?: string | null
          dep_estimated_utc?: string | null
          dep_iata: string
          dep_local_datetime: string
          dep_time_utc: string
          failed_api_count?: number
          flight_iata: string
          flight_number: string
          id?: string
          last_response?: Json | null
          last_status_text?: string | null
          next_job_time?: string | null
          phase?: string
          retry_count?: number
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          airline_iata?: string
          api_call_count?: number
          arr_actual_utc?: string | null
          arr_city?: string | null
          arr_estimated_utc?: string | null
          arr_iata?: string
          arr_time_utc?: string | null
          created_at?: string
          dep_actual_utc?: string | null
          dep_city?: string | null
          dep_estimated_utc?: string | null
          dep_iata?: string
          dep_local_datetime?: string
          dep_time_utc?: string
          failed_api_count?: number
          flight_iata?: string
          flight_number?: string
          id?: string
          last_response?: Json | null
          last_status_text?: string | null
          next_job_time?: string | null
          phase?: string
          retry_count?: number
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
