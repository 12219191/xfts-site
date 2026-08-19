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
      admin_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      blog_articles: {
        Row: {
          author: string
          category: string
          content: string
          created_at: string
          id: string
          image_url: string
          publish_at: string | null
          published: boolean
          slug: string
          summary: string
          title: string
          unpublish_at: string | null
          updated_at: string
        }
        Insert: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string
          publish_at?: string | null
          published?: boolean
          slug: string
          summary?: string
          title: string
          unpublish_at?: string | null
          updated_at?: string
        }
        Update: {
          author?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string
          publish_at?: string | null
          published?: boolean
          slug?: string
          summary?: string
          title?: string
          unpublish_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dunning_emails: {
        Row: {
          created_at: string
          email: string | null
          environment: string
          error: string | null
          id: string
          stage: number
          status: string
          stripe_subscription_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          environment?: string
          error?: string | null
          id?: string
          stage: number
          status?: string
          stripe_subscription_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          environment?: string
          error?: string | null
          id?: string
          stage?: number
          status?: string
          stripe_subscription_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dunning_state: {
        Row: {
          amount_due: number | null
          blocked_at: string | null
          created_at: string
          email: string | null
          environment: string
          failed_at: string
          grace_until: string
          invoice_id: string | null
          last_stage: number
          price_id: string | null
          resolved_at: string | null
          stripe_subscription_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_due?: number | null
          blocked_at?: string | null
          created_at?: string
          email?: string | null
          environment?: string
          failed_at?: string
          grace_until?: string
          invoice_id?: string | null
          last_stage?: number
          price_id?: string | null
          resolved_at?: string | null
          stripe_subscription_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_due?: number | null
          blocked_at?: string | null
          created_at?: string
          email?: string | null
          environment?: string
          failed_at?: string
          grace_until?: string
          invoice_id?: string | null
          last_stage?: number
          price_id?: string | null
          resolved_at?: string | null
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      form_submissions: {
        Row: {
          assunto: string | null
          botao: string | null
          created_at: string
          crm_attempts: number
          crm_error: string | null
          crm_lead_id: string | null
          crm_status: string
          crm_synced_at: string | null
          cta_id: string | null
          cta_label: string | null
          cta_page: string | null
          cta_placement: string | null
          duration_ms: number
          email: string | null
          empresa: string | null
          error_message: string | null
          fbclid: string | null
          form_type: string
          gclid: string | null
          http_status: number | null
          id: string
          landing_page: string | null
          lt_fbclid: string | null
          lt_gclid: string | null
          lt_landing_page: string | null
          lt_referrer: string | null
          lt_utm_campaign: string | null
          lt_utm_content: string | null
          lt_utm_medium: string | null
          lt_utm_source: string | null
          lt_utm_term: string | null
          mensagem: string | null
          nome: string | null
          reference_id: string
          referrer: string | null
          segmento: string | null
          source: string | null
          status: string
          tela: string
          telefone: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          assunto?: string | null
          botao?: string | null
          created_at?: string
          crm_attempts?: number
          crm_error?: string | null
          crm_lead_id?: string | null
          crm_status?: string
          crm_synced_at?: string | null
          cta_id?: string | null
          cta_label?: string | null
          cta_page?: string | null
          cta_placement?: string | null
          duration_ms?: number
          email?: string | null
          empresa?: string | null
          error_message?: string | null
          fbclid?: string | null
          form_type: string
          gclid?: string | null
          http_status?: number | null
          id?: string
          landing_page?: string | null
          lt_fbclid?: string | null
          lt_gclid?: string | null
          lt_landing_page?: string | null
          lt_referrer?: string | null
          lt_utm_campaign?: string | null
          lt_utm_content?: string | null
          lt_utm_medium?: string | null
          lt_utm_source?: string | null
          lt_utm_term?: string | null
          mensagem?: string | null
          nome?: string | null
          reference_id: string
          referrer?: string | null
          segmento?: string | null
          source?: string | null
          status: string
          tela?: string
          telefone?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          assunto?: string | null
          botao?: string | null
          created_at?: string
          crm_attempts?: number
          crm_error?: string | null
          crm_lead_id?: string | null
          crm_status?: string
          crm_synced_at?: string | null
          cta_id?: string | null
          cta_label?: string | null
          cta_page?: string | null
          cta_placement?: string | null
          duration_ms?: number
          email?: string | null
          empresa?: string | null
          error_message?: string | null
          fbclid?: string | null
          form_type?: string
          gclid?: string | null
          http_status?: number | null
          id?: string
          landing_page?: string | null
          lt_fbclid?: string | null
          lt_gclid?: string | null
          lt_landing_page?: string | null
          lt_referrer?: string | null
          lt_utm_campaign?: string | null
          lt_utm_content?: string | null
          lt_utm_medium?: string | null
          lt_utm_source?: string | null
          lt_utm_term?: string | null
          mensagem?: string | null
          nome?: string | null
          reference_id?: string
          referrer?: string | null
          segmento?: string | null
          source?: string | null
          status?: string
          tela?: string
          telefone?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          image_url: string
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alt_text?: string | null
          image_url: string
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alt_text?: string | null
          image_url?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sso_tokens: {
        Row: {
          app_key: string
          created_at: string
          expires_at: string
          id: string
          jti: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          app_key: string
          created_at?: string
          expires_at: string
          id?: string
          jti: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          app_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          jti?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          created_at: string
          environment: string
          event_type: string
          id: string
          price_id: string | null
          reason: string | null
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          environment?: string
          event_type: string
          id?: string
          price_id?: string | null
          reason?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          environment?: string
          event_type?: string
          id?: string
          price_id?: string | null
          reason?: string | null
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_blog_schedule: { Args: never; Returns: undefined }
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
