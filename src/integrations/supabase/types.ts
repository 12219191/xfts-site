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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          app_key: string
          created_at: string
          email: string
          environment: string
          expires_at: string
          id: string
          note: string | null
          owner_email: string | null
          owner_user_id: string
          revoked_at: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          app_key: string
          created_at?: string
          email: string
          environment?: string
          expires_at?: string
          id?: string
          note?: string | null
          owner_email?: string | null
          owner_user_id: string
          revoked_at?: string | null
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          app_key?: string
          created_at?: string
          email?: string
          environment?: string
          expires_at?: string
          id?: string
          note?: string | null
          owner_email?: string | null
          owner_user_id?: string
          revoked_at?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          reason: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
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
      catalog_plans: {
        Row: {
          active: boolean
          annual_lookup_key: string | null
          created_at: string
          cta_label: string
          description: string
          entitlements: Json
          features: Json
          id: string
          name: string
          price_lookup_key: string | null
          price_month_cents: number
          price_year_cents: number | null
          product_key: string
          seats: number | null
          sort_order: number
          tier: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          annual_lookup_key?: string | null
          created_at?: string
          cta_label?: string
          description?: string
          entitlements?: Json
          features?: Json
          id?: string
          name: string
          price_lookup_key?: string | null
          price_month_cents?: number
          price_year_cents?: number | null
          product_key: string
          seats?: number | null
          sort_order?: number
          tier?: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          annual_lookup_key?: string | null
          created_at?: string
          cta_label?: string
          description?: string
          entitlements?: Json
          features?: Json
          id?: string
          name?: string
          price_lookup_key?: string | null
          price_month_cents?: number
          price_year_cents?: number | null
          product_key?: string
          seats?: number | null
          sort_order?: number
          tier?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_plans_product_key_fkey"
            columns: ["product_key"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["key"]
          },
        ]
      }
      catalog_products: {
        Row: {
          available: boolean
          created_at: string
          key: string
          landing: string
          name: string
          price_prefix: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          key: string
          landing?: string
          name: string
          price_prefix: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          key?: string
          landing?: string
          name?: string
          price_prefix?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      cron_runs: {
        Row: {
          created_at: string
          duration_ms: number
          error: string | null
          finished_at: string | null
          id: string
          job: string
          ok: boolean
          result: Json
          started_at: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          job: string
          ok?: boolean
          result?: Json
          started_at?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          job?: string
          ok?: boolean
          result?: Json
          started_at?: string
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          author_email: string | null
          author_id: string | null
          body: string
          created_at: string
          customer_email: string
          customer_user_id: string
          id: string
          kind: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          body: string
          created_at?: string
          customer_email?: string
          customer_user_id: string
          id?: string
          kind?: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          body?: string
          created_at?: string
          customer_email?: string
          customer_user_id?: string
          id?: string
          kind?: string
          pinned?: boolean
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
      email_queue: {
        Row: {
          attempts: number
          created_at: string
          discard_reason: string | null
          environment: string
          id: string
          idempotency_key: string
          last_error: string | null
          next_attempt_at: string
          recipient: string
          reply_to: string | null
          sent_at: string | null
          status: string
          template: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          discard_reason?: string | null
          environment?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          next_attempt_at?: string
          recipient: string
          reply_to?: string | null
          sent_at?: string | null
          status?: string
          template: string
          template_data?: Json
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          discard_reason?: string | null
          environment?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          next_attempt_at?: string
          recipient?: string
          reply_to?: string | null
          sent_at?: string | null
          status?: string
          template?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      entitlement_definitions: {
        Row: {
          created_at: string
          description: string
          id: string
          key: string
          kind: string
          label: string
          product_key: string
          sort_order: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          key: string
          kind?: string
          label: string
          product_key: string
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          key?: string
          kind?: string
          label?: string
          product_key?: string
          sort_order?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_refunds: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          created_by_email: string | null
          currency: string
          environment: string
          id: string
          reason: string
          status: string
          stripe_charge_id: string
          stripe_invoice_id: string | null
          stripe_refund_id: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          currency?: string
          environment?: string
          id?: string
          reason?: string
          status?: string
          stripe_charge_id: string
          stripe_invoice_id?: string | null
          stripe_refund_id: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          currency?: string
          environment?: string
          id?: string
          reason?: string
          status?: string
          stripe_charge_id?: string
          stripe_invoice_id?: string | null
          stripe_refund_id?: string
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
      integration_events: {
        Row: {
          app_key: string
          created_at: string
          detail: Json
          duration_ms: number
          environment: string
          error: string | null
          http_status: number | null
          id: string
          kind: string
          reason: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          app_key?: string
          created_at?: string
          detail?: Json
          duration_ms?: number
          environment?: string
          error?: string | null
          http_status?: number | null
          id?: string
          kind: string
          reason?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          app_key?: string
          created_at?: string
          detail?: Json
          duration_ms?: number
          environment?: string
          error?: string | null
          http_status?: number | null
          id?: string
          kind?: string
          reason?: string | null
          status?: string
          user_id?: string | null
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
      provision_queue: {
        Row: {
          app_key: string
          attempts: number
          created_at: string
          delivered_at: string | null
          environment: string
          event: string
          id: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          price_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          app_key: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          environment?: string
          event: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          price_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          app_key?: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          environment?: string
          event?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          price_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sso_tokens: {
        Row: {
          app_key: string
          created_at: string
          created_by_admin: string | null
          expires_at: string
          id: string
          jti: string
          purpose: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          app_key: string
          created_at?: string
          created_by_admin?: string | null
          expires_at: string
          id?: string
          jti: string
          purpose?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          app_key?: string
          created_at?: string
          created_by_admin?: string | null
          expires_at?: string
          id?: string
          jti?: string
          purpose?: string
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
          courtesy_note: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          granted_by: string | null
          id: string
          is_courtesy: boolean
          last_event_created: string | null
          last_event_id: string | null
          price_id: string
          product_id: string
          seats_override: number | null
          seats_reported_at: string | null
          seats_used: number | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          courtesy_note?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          granted_by?: string | null
          id?: string
          is_courtesy?: boolean
          last_event_created?: string | null
          last_event_id?: string | null
          price_id: string
          product_id: string
          seats_override?: number | null
          seats_reported_at?: string | null
          seats_used?: number | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          courtesy_note?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          granted_by?: string | null
          id?: string
          is_courtesy?: boolean
          last_event_created?: string | null
          last_event_id?: string | null
          price_id?: string
          product_id?: string
          seats_override?: number | null
          seats_reported_at?: string | null
          seats_used?: number | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          attempts: number
          claimed_at: string
          created_at: string
          duration_ms: number
          environment: string
          error: string | null
          event_type: string
          id: string
          processed_at: string | null
          status: string
          stripe_event_id: string | null
          summary: Json
        }
        Insert: {
          attempts?: number
          claimed_at?: string
          created_at?: string
          duration_ms?: number
          environment?: string
          error?: string | null
          event_type: string
          id?: string
          processed_at?: string | null
          status?: string
          stripe_event_id?: string | null
          summary?: Json
        }
        Update: {
          attempts?: number
          claimed_at?: string
          created_at?: string
          duration_ms?: number
          environment?: string
          error?: string | null
          event_type?: string
          id?: string
          processed_at?: string | null
          status?: string
          stripe_event_id?: string | null
          summary?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_blog_schedule: { Args: never; Returns: undefined }
      verify_cron_key: {
        Args: { _name: string; _value: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_role:
        | "superadmin"
        | "financeiro"
        | "comercial"
        | "suporte"
        | "produto"
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
    Enums: {
      admin_role: [
        "superadmin",
        "financeiro",
        "comercial",
        "suporte",
        "produto",
      ],
    },
  },
} as const
