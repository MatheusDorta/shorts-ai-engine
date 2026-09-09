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
      affiliate_links: {
        Row: {
          company: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          notes: string | null
          platform: Database["public"]["Enums"]["platform"] | null
          program: string
          tracking_url: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          platform?: Database["public"]["Enums"]["platform"] | null
          program: string
          tracking_url?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          platform?: Database["public"]["Enums"]["platform"] | null
          program?: string
          tracking_url?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics: {
        Row: {
          comments: number
          content_id: string | null
          conversions: number
          created_at: string
          follows: number
          id: string
          likes: number
          link_clicks: number
          platform: Database["public"]["Enums"]["platform"]
          revenue: number
          shares: number
          stat_date: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          comments?: number
          content_id?: string | null
          conversions?: number
          created_at?: string
          follows?: number
          id?: string
          likes?: number
          link_clicks?: number
          platform: Database["public"]["Enums"]["platform"]
          revenue?: number
          shares?: number
          stat_date?: string
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          comments?: number
          content_id?: string | null
          conversions?: number
          created_at?: string
          follows?: number
          id?: string
          likes?: number
          link_clicks?: number
          platform?: Database["public"]["Enums"]["platform"]
          revenue?: number
          shares?: number
          stat_date?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_actions: {
        Row: {
          action: Database["public"]["Enums"]["approval_action_type"]
          content_id: string
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_action_type"]
          content_id: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_action_type"]
          content_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          level: string
          message: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          level?: string
          message?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          level?: string
          message?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      content: {
        Row: {
          affiliate_link_id: string | null
          approved_at: string | null
          approved_by: string | null
          caption: string | null
          created_at: string
          cta: string | null
          description: string | null
          duration_seconds: number | null
          hashtags: string[]
          hook: string | null
          id: string
          notes: string | null
          rejection_reason: string | null
          scheduled_at: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["content_status"]
          thumbnail_path: string | null
          title: string
          updated_at: string
          user_id: string
          video_path: string | null
        }
        Insert: {
          affiliate_link_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          created_at?: string
          cta?: string | null
          description?: string | null
          duration_seconds?: number | null
          hashtags?: string[]
          hook?: string | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          scheduled_at?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_path?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_path?: string | null
        }
        Update: {
          affiliate_link_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          caption?: string | null
          created_at?: string
          cta?: string | null
          description?: string | null
          duration_seconds?: number | null
          hashtags?: string[]
          hook?: string | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          scheduled_at?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          thumbnail_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      content_platforms: {
        Row: {
          content_id: string
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["platform"]
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          platform: Database["public"]["Enums"]["platform"]
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["platform"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_platforms_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_accounts: {
        Row: {
          account_name: string | null
          created_at: string
          id: string
          is_connected: boolean
          notes: string | null
          platform: Database["public"]["Enums"]["platform"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          notes?: string | null
          platform: Database["public"]["Enums"]["platform"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          notes?: string | null
          platform?: Database["public"]["Enums"]["platform"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      publishing_jobs: {
        Row: {
          content_id: string
          created_at: string
          error_message: string | null
          id: string
          platform: Database["public"]["Enums"]["platform"]
          published_at: string | null
          result: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["publishing_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          platform: Database["public"]["Enums"]["platform"]
          published_at?: string | null
          result?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["publishing_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["platform"]
          published_at?: string | null
          result?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["publishing_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publishing_jobs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          creator_name: string | null
          id: string
          name: string
          notes: string | null
          permission_status: Database["public"]["Enums"]["permission_status"]
          source_type: Database["public"]["Enums"]["source_type"]
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_name?: string | null
          id?: string
          name: string
          notes?: string | null
          permission_status?: Database["public"]["Enums"]["permission_status"]
          source_type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          creator_name?: string | null
          id?: string
          name?: string
          notes?: string | null
          permission_status?: Database["public"]["Enums"]["permission_status"]
          source_type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_publishing_job: {
        Args: { p_job_id: string }
        Returns: Database["public"]["Tables"]["publishing_jobs"]["Row"]
      }
      retry_publishing_job: {
        Args: { p_job_id: string }
        Returns: Database["public"]["Tables"]["publishing_jobs"]["Row"]
      }
      review_content: {
        Args: {
          p_action: Database["public"]["Enums"]["approval_action_type"]
          p_content_id: string
          p_reason?: string | null
        }
        Returns: Database["public"]["Tables"]["content"]["Row"]
      }
      schedule_content: {
        Args: {
          p_content_id: string
          p_platform: Database["public"]["Enums"]["platform"]
          p_scheduled_at: string
        }
        Returns: Database["public"]["Tables"]["publishing_jobs"]["Row"]
      }
    }
    Enums: {
      approval_action_type: "approved" | "rejected"
      content_status:
        | "draft"
        | "processing"
        | "ready_for_review"
        | "approved"
        | "rejected"
        | "scheduled"
        | "published"
        | "failed"
      permission_status:
        | "confirmed_permission"
        | "licensed"
        | "own_content"
        | "unknown"
        | "not_allowed"
      platform: "youtube_shorts" | "tiktok"
      publishing_status:
        | "waiting"
        | "scheduled"
        | "publishing"
        | "published"
        | "failed"
      source_type: "youtube" | "podcast" | "live_stream" | "upload" | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      approval_action_type: ["approved", "rejected"],
      content_status: [
        "draft",
        "processing",
        "ready_for_review",
        "approved",
        "rejected",
        "scheduled",
        "published",
        "failed",
      ],
      permission_status: [
        "confirmed_permission",
        "licensed",
        "own_content",
        "unknown",
        "not_allowed",
      ],
      platform: ["youtube_shorts", "tiktok"],
      publishing_status: [
        "waiting",
        "scheduled",
        "publishing",
        "published",
        "failed",
      ],
      source_type: ["youtube", "podcast", "live_stream", "upload", "other"],
    },
  },
} as const
