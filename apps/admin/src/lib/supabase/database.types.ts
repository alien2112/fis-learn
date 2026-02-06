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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_code_usages: {
        Row: {
          code_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_code_usages_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_code_usages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      access_codes: {
        Row: {
          code: string
          course_id: string | null
          created_at: string
          created_by_id: string
          current_redemptions: number
          expires_at: string | null
          id: string
          is_single_use: boolean
          material_id: string | null
          max_redemptions: number
          status: Database["public"]["Enums"]["AccessCodeStatus"]
          type: Database["public"]["Enums"]["AccessCodeType"]
          updated_at: string
        }
        Insert: {
          code: string
          course_id?: string | null
          created_at?: string
          created_by_id: string
          current_redemptions?: number
          expires_at?: string | null
          id: string
          is_single_use?: boolean
          material_id?: string | null
          max_redemptions?: number
          status?: Database["public"]["Enums"]["AccessCodeStatus"]
          type: Database["public"]["Enums"]["AccessCodeType"]
          updated_at?: string
        }
        Update: {
          code?: string
          course_id?: string | null
          created_at?: string
          created_by_id?: string
          current_redemptions?: number
          expires_at?: string | null
          id?: string
          is_single_use?: boolean
          material_id?: string | null
          max_redemptions?: number
          status?: Database["public"]["Enums"]["AccessCodeStatus"]
          type?: Database["public"]["Enums"]["AccessCodeType"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_codes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          body: string
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_pinned: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          scheduled_at: string | null
          slug: string
          status: Database["public"]["Enums"]["BlogPostStatus"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id: string
          is_pinned?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["BlogPostStatus"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_pinned?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["BlogPostStatus"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_url?: string | null
          id: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_translations: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          locale: string
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id: string
          locale: string
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          locale?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      course_instructors: {
        Row: {
          assigned_at: string
          course_id: string
          id: string
          is_primary: boolean
          user_id: string
        }
        Insert: {
          assigned_at?: string
          course_id: string
          id: string
          is_primary?: boolean
          user_id: string
        }
        Update: {
          assigned_at?: string
          course_id?: string
          id?: string
          is_primary?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          approved_at: string | null
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by_id: string
          description: string | null
          id: string
          is_featured: boolean
          language: string
          level: Database["public"]["Enums"]["CourseLevel"]
          price: number | null
          pricing_model: Database["public"]["Enums"]["PricingModel"]
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["CourseStatus"]
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by_id: string
          description?: string | null
          id: string
          is_featured?: boolean
          language?: string
          level?: Database["public"]["Enums"]["CourseLevel"]
          price?: number | null
          pricing_model?: Database["public"]["Enums"]["PricingModel"]
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["CourseStatus"]
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by_id?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          language?: string
          level?: Database["public"]["Enums"]["CourseLevel"]
          price?: number | null
          pricing_model?: Database["public"]["Enums"]["PricingModel"]
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["CourseStatus"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          payment_status: Database["public"]["Enums"]["PaymentStatus"]
          progress_percent: number
          status: Database["public"]["Enums"]["EnrollmentStatus"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id: string
          payment_status?: Database["public"]["Enums"]["PaymentStatus"]
          progress_percent?: number
          status?: Database["public"]["Enums"]["EnrollmentStatus"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["PaymentStatus"]
          progress_percent?: number
          status?: Database["public"]["Enums"]["EnrollmentStatus"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_profiles: {
        Row: {
          bio: string | null
          created_at: string
          credentials: string | null
          id: string
          rating: number
          rating_count: number
          social_links: Json | null
          specialization: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          credentials?: string | null
          id: string
          rating?: number
          rating_count?: number
          social_links?: Json | null
          specialization?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          credentials?: string | null
          id?: string
          rating?: number
          rating_count?: number
          social_links?: Json | null
          specialization?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_type: Database["public"]["Enums"]["ContentType"]
          created_at: string
          description: string | null
          id: string
          is_free_preview: boolean
          material_id: string | null
          section_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content_type: Database["public"]["Enums"]["ContentType"]
          created_at?: string
          description?: string | null
          id: string
          is_free_preview?: boolean
          material_id?: string | null
          section_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: Database["public"]["Enums"]["ContentType"]
          created_at?: string
          description?: string | null
          id?: string
          is_free_preview?: boolean
          material_id?: string | null
          section_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      live_class_attendees: {
        Row: {
          id: string
          joined_at: string | null
          left_at: string | null
          live_class_id: string
          registered_at: string
          user_id: string
        }
        Insert: {
          id: string
          joined_at?: string | null
          left_at?: string | null
          live_class_id: string
          registered_at?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          live_class_id?: string
          registered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_class_attendees_live_class_id_fkey"
            columns: ["live_class_id"]
            isOneToOne: false
            referencedRelation: "live_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_class_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      live_classes: {
        Row: {
          capacity: number | null
          course_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          instructor_id: string
          is_recurring: boolean
          meeting_url: string | null
          recording_url: string | null
          recurrence_rule: string | null
          start_at: string
          status: Database["public"]["Enums"]["LiveClassStatus"]
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id: string
          instructor_id: string
          is_recurring?: boolean
          meeting_url?: string | null
          recording_url?: string | null
          recurrence_rule?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["LiveClassStatus"]
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          instructor_id?: string
          is_recurring?: boolean
          meeting_url?: string | null
          recording_url?: string | null
          recurrence_rule?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["LiveClassStatus"]
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          description: string | null
          duration: number | null
          file_url: string | null
          id: string
          title: string
          type: Database["public"]["Enums"]["MaterialType"]
          updated_at: string
          uploaded_by_id: string
          version: number
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number | null
          file_url?: string | null
          id: string
          title: string
          type: Database["public"]["Enums"]["MaterialType"]
          updated_at?: string
          uploaded_by_id: string
          version?: number
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number | null
          file_url?: string | null
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["MaterialType"]
          updated_at?: string
          uploaded_by_id?: string
          version?: number
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          email_verified_at: string | null
          id: string
          last_login_at: string | null
          locale: string
          name: string
          password_hash: string
          role: Database["public"]["Enums"]["Role"]
          status: Database["public"]["Enums"]["UserStatus"]
          timezone: string
          two_fa_enabled: boolean
          two_fa_secret: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          email_verified_at?: string | null
          id: string
          last_login_at?: string | null
          locale?: string
          name: string
          password_hash: string
          role?: Database["public"]["Enums"]["Role"]
          status?: Database["public"]["Enums"]["UserStatus"]
          timezone?: string
          two_fa_enabled?: boolean
          two_fa_secret?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          email_verified_at?: string | null
          id?: string
          last_login_at?: string | null
          locale?: string
          name?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["Role"]
          status?: Database["public"]["Enums"]["UserStatus"]
          timezone?: string
          two_fa_enabled?: boolean
          two_fa_secret?: string | null
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
      AccessCodeStatus: "ACTIVE" | "EXPIRED" | "REVOKED"
      AccessCodeType: "COURSE" | "VIDEO"
      BlogPostStatus: "DRAFT" | "SCHEDULED" | "PUBLISHED"
      ContentType: "VIDEO" | "PDF" | "QUIZ" | "ASSIGNMENT"
      CourseLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
      CourseStatus: "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED"
      EnrollmentStatus: "ACTIVE" | "COMPLETED" | "DROPPED"
      LiveClassStatus: "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
      MaterialType: "VIDEO" | "PDF" | "QUIZ" | "ASSIGNMENT"
      PaymentStatus: "FREE" | "PAID" | "CODE_REDEEMED"
      PricingModel: "FREE" | "PAID" | "ACCESS_CODE_ONLY"
      Role: "SUPER_ADMIN" | "ADMIN" | "INSTRUCTOR" | "STUDENT"
      UserStatus: "ACTIVE" | "SUSPENDED" | "BANNED" | "PENDING_VERIFICATION"
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
      AccessCodeStatus: ["ACTIVE", "EXPIRED", "REVOKED"],
      AccessCodeType: ["COURSE", "VIDEO"],
      BlogPostStatus: ["DRAFT", "SCHEDULED", "PUBLISHED"],
      ContentType: ["VIDEO", "PDF", "QUIZ", "ASSIGNMENT"],
      CourseLevel: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
      CourseStatus: ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"],
      EnrollmentStatus: ["ACTIVE", "COMPLETED", "DROPPED"],
      LiveClassStatus: ["UPCOMING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      MaterialType: ["VIDEO", "PDF", "QUIZ", "ASSIGNMENT"],
      PaymentStatus: ["FREE", "PAID", "CODE_REDEEMED"],
      PricingModel: ["FREE", "PAID", "ACCESS_CODE_ONLY"],
      Role: ["SUPER_ADMIN", "ADMIN", "INSTRUCTOR", "STUDENT"],
      UserStatus: ["ACTIVE", "SUSPENDED", "BANNED", "PENDING_VERIFICATION"],
    },
  },
} as const
