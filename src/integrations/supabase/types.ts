export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      athletes: {
        Row: {
          club_id: string | null
          country_id: string | null
          created_at: string
          id: string
          jersey_number: number | null
          name: string
          photo_url: string | null
          position: string | null
          slug: string
          sport_id: string | null
        }
        Insert: {
          club_id?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          jersey_number?: number | null
          name: string
          photo_url?: string | null
          position?: string | null
          slug: string
          sport_id?: string | null
        }
        Update: {
          club_id?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          jersey_number?: number | null
          name?: string
          photo_url?: string | null
          position?: string | null
          slug?: string
          sport_id?: string | null
        }
        Relationships: []
      }
      city_ambassadors: {
        Row: {
          city: string
          claimed_at: string
          club_id: string | null
          country_id: string | null
          fan_id: string
          id: string
          is_active: boolean
        }
        Insert: {
          city: string
          claimed_at?: string
          club_id?: string | null
          country_id?: string | null
          fan_id: string
          id?: string
          is_active?: boolean
        }
        Update: {
          city?: string
          claimed_at?: string
          club_id?: string | null
          country_id?: string | null
          fan_id?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      clubs: {
        Row: {
          country_id: string | null
          created_at: string
          fan_count: number
          founded_year: number | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string
          secondary_color: string
          slug: string
          sport_id: string | null
          stadium: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          fan_count?: number
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string
          secondary_color?: string
          slug: string
          sport_id?: string | null
          stadium?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string
          fan_count?: number
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string
          secondary_color?: string
          slug?: string
          sport_id?: string | null
          stadium?: string | null
        }
        Relationships: []
      }
      communities: {
        Row: {
          club_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          member_count: number
          name: string
          post_count: number
          slug: string
          sport_id: string | null
        }
        Insert: {
          club_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          member_count?: number
          name: string
          post_count?: number
          slug: string
          sport_id?: string | null
        }
        Update: {
          club_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          member_count?: number
          name?: string
          post_count?: number
          slug?: string
          sport_id?: string | null
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          fan_id: string
          id: string
          joined_at: string
          role: string
        }
        Insert: {
          community_id: string
          fan_id: string
          id?: string
          joined_at?: string
          role?: string
        }
        Update: {
          community_id?: string
          fan_id?: string
          id?: string
          joined_at?: string
          role?: string
        }
        Relationships: []
      }
      competitions: {
        Row: {
          country_id: string | null
          created_at: string
          id: string
          level: string
          logo_url: string | null
          name: string
          slug: string
          sport_id: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          id?: string
          level?: string
          logo_url?: string | null
          name: string
          slug: string
          sport_id?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string
          id?: string
          level?: string
          logo_url?: string | null
          name?: string
          slug?: string
          sport_id?: string | null
        }
        Relationships: []
      }
      content_interactions: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          fan_id: string
          id: string
          interaction_type: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          fan_id: string
          id?: string
          interaction_type: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          fan_id?: string
          id?: string
          interaction_type?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          flag_url: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          flag_url?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          flag_url?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      digital_collectibles: {
        Row: {
          athlete_id: string | null
          club_id: string | null
          earned_at: string
          fan_id: string
          id: string
          image_url: string | null
          name: string
          rarity: string
        }
        Insert: {
          athlete_id?: string | null
          club_id?: string | null
          earned_at?: string
          fan_id: string
          id?: string
          image_url?: string | null
          name: string
          rarity?: string
        }
        Update: {
          athlete_id?: string | null
          club_id?: string | null
          earned_at?: string
          fan_id?: string
          id?: string
          image_url?: string | null
          name?: string
          rarity?: string
        }
        Relationships: []
      }
      earn_tasks: {
        Row: {
          club_id: string | null
          coins_reward: number
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          match_id: string | null
          max_completions_per_fan: number
          payload: Json | null
          spent_budget_coins: number
          sponsor_id: string | null
          task_type: string
          title: string
          total_budget_coins: number | null
        }
        Insert: {
          club_id?: string | null
          coins_reward?: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          match_id?: string | null
          max_completions_per_fan?: number
          payload?: Json | null
          spent_budget_coins?: number
          sponsor_id?: string | null
          task_type: string
          title: string
          total_budget_coins?: number | null
        }
        Update: {
          club_id?: string | null
          coins_reward?: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          match_id?: string | null
          max_completions_per_fan?: number
          payload?: Json | null
          spent_budget_coins?: number
          sponsor_id?: string | null
          task_type?: string
          title?: string
          total_budget_coins?: number | null
        }
        Relationships: []
      }
      fan_athletes: {
        Row: {
          athlete_id: string
          fan_id: string
          followed_at: string
          id: string
        }
        Insert: {
          athlete_id: string
          fan_id: string
          followed_at?: string
          id?: string
        }
        Update: {
          athlete_id?: string
          fan_id?: string
          followed_at?: string
          id?: string
        }
        Relationships: []
      }
      fan_clubs: {
        Row: {
          club_id: string
          fan_id: string
          followed_at: string
          id: string
          is_primary: boolean
        }
        Insert: {
          club_id: string
          fan_id: string
          followed_at?: string
          id?: string
          is_primary?: boolean
        }
        Update: {
          club_id?: string
          fan_id?: string
          followed_at?: string
          id?: string
          is_primary?: boolean
        }
        Relationships: []
      }
      fan_commercial_profiles: {
        Row: {
          brand_affinity: Json
          commercial_value_score: number
          data_consent: boolean
          estimated_annual_value: number
          fan_id: string
          id: string
          spending_power: string
          updated_at: string
        }
        Insert: {
          brand_affinity?: Json
          commercial_value_score?: number
          data_consent?: boolean
          estimated_annual_value?: number
          fan_id: string
          id?: string
          spending_power?: string
          updated_at?: string
        }
        Update: {
          brand_affinity?: Json
          commercial_value_score?: number
          data_consent?: boolean
          estimated_annual_value?: number
          fan_id?: string
          id?: string
          spending_power?: string
          updated_at?: string
        }
        Relationships: []
      }
      fan_competitions: {
        Row: {
          competition_id: string
          fan_id: string
          followed_at: string
          id: string
        }
        Insert: {
          competition_id: string
          fan_id: string
          followed_at?: string
          id?: string
        }
        Update: {
          competition_id?: string
          fan_id?: string
          followed_at?: string
          id?: string
        }
        Relationships: []
      }
      fan_engagement_events: {
        Row: {
          coins_delta: number
          created_at: string
          event_data: Json | null
          event_type: string
          fan_id: string
          id: string
        }
        Insert: {
          coins_delta?: number
          created_at?: string
          event_data?: Json | null
          event_type: string
          fan_id: string
          id?: string
        }
        Update: {
          coins_delta?: number
          created_at?: string
          event_data?: Json | null
          event_type?: string
          fan_id?: string
          id?: string
        }
        Relationships: []
      }
      fan_passports: {
        Row: {
          communities_joined: number
          correct_predictions: number
          created_at: string
          engagement_tier: string
          fan_coins_balance: number
          fan_coins_earned: number
          fan_coins_spent: number
          fan_id: string
          id: string
          identity_score: number
          posts_created: number
          total_predictions: number
          updated_at: string
        }
        Insert: {
          communities_joined?: number
          correct_predictions?: number
          created_at?: string
          engagement_tier?: string
          fan_coins_balance?: number
          fan_coins_earned?: number
          fan_coins_spent?: number
          fan_id: string
          id?: string
          identity_score?: number
          posts_created?: number
          total_predictions?: number
          updated_at?: string
        }
        Update: {
          communities_joined?: number
          correct_predictions?: number
          created_at?: string
          engagement_tier?: string
          fan_coins_balance?: number
          fan_coins_earned?: number
          fan_coins_spent?: number
          fan_id?: string
          id?: string
          identity_score?: number
          posts_created?: number
          total_predictions?: number
          updated_at?: string
        }
        Relationships: []
      }
      fan_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country_id: string | null
          created_at: string
          display_name: string | null
          fan_personality_type: string | null
          id: string
          is_verified: boolean
          onboarding_completed: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country_id?: string | null
          created_at?: string
          display_name?: string | null
          fan_personality_type?: string | null
          id: string
          is_verified?: boolean
          onboarding_completed?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country_id?: string | null
          created_at?: string
          display_name?: string | null
          fan_personality_type?: string | null
          id?: string
          is_verified?: boolean
          onboarding_completed?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      fan_proofs: {
        Row: {
          caption: string | null
          coins_awarded: number
          fan_id: string
          id: string
          media_url: string
          status: string
          submitted_at: string
          task_id: string | null
        }
        Insert: {
          caption?: string | null
          coins_awarded?: number
          fan_id: string
          id?: string
          media_url: string
          status?: string
          submitted_at?: string
          task_id?: string | null
        }
        Update: {
          caption?: string | null
          coins_awarded?: number
          fan_id?: string
          id?: string
          media_url?: string
          status?: string
          submitted_at?: string
          task_id?: string | null
        }
        Relationships: []
      }
      fan_rewards: {
        Row: {
          current_balance: number
          fan_id: string
          id: string
          lifetime_tier: string
          total_earned: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          current_balance?: number
          fan_id: string
          id?: string
          lifetime_tier?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          current_balance?: number
          fan_id?: string
          id?: string
          lifetime_tier?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      fan_sports: {
        Row: {
          fan_id: string
          followed_at: string
          id: string
          sport_id: string
        }
        Insert: {
          fan_id: string
          followed_at?: string
          id?: string
          sport_id: string
        }
        Update: {
          fan_id?: string
          followed_at?: string
          id?: string
          sport_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_club_id: string | null
          away_score: number | null
          competition_id: string | null
          created_at: string
          home_club_id: string | null
          home_score: number | null
          id: string
          minute: number | null
          scheduled_at: string
          status: string
          venue: string | null
        }
        Insert: {
          away_club_id?: string | null
          away_score?: number | null
          competition_id?: string | null
          created_at?: string
          home_club_id?: string | null
          home_score?: number | null
          id?: string
          minute?: number | null
          scheduled_at: string
          status?: string
          venue?: string | null
        }
        Update: {
          away_club_id?: string | null
          away_score?: number | null
          competition_id?: string | null
          created_at?: string
          home_club_id?: string | null
          home_score?: number | null
          id?: string
          minute?: number | null
          scheduled_at?: string
          status?: string
          venue?: string | null
        }
        Relationships: []
      }
      post_replies: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: []
      }
      post_votes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          post_id: string
          vote: number
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          post_id: string
          vote: number
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          post_id?: string
          vote?: number
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          community_id: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          media_url: string | null
          reply_count: number
          vote_count: number
        }
        Insert: {
          author_id: string
          community_id: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          media_url?: string | null
          reply_count?: number
          vote_count?: number
        }
        Update: {
          author_id?: string
          community_id?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          media_url?: string | null
          reply_count?: number
          vote_count?: number
        }
        Relationships: []
      }
      prediction_leaderboards: {
        Row: {
          accuracy: number
          correct_predictions: number
          fan_id: string
          id: string
          period: string
          points: number
          rank: number | null
          total_predictions: number
          updated_at: string
        }
        Insert: {
          accuracy?: number
          correct_predictions?: number
          fan_id: string
          id?: string
          period?: string
          points?: number
          rank?: number | null
          total_predictions?: number
          updated_at?: string
        }
        Update: {
          accuracy?: number
          correct_predictions?: number
          fan_id?: string
          id?: string
          period?: string
          points?: number
          rank?: number | null
          total_predictions?: number
          updated_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          away_score_prediction: number
          coins_wagered: number
          coins_won: number
          confidence: string
          created_at: string
          fan_id: string
          home_score_prediction: number
          id: string
          is_correct: boolean | null
          match_id: string
          points_awarded: number
        }
        Insert: {
          away_score_prediction: number
          coins_wagered?: number
          coins_won?: number
          confidence?: string
          created_at?: string
          fan_id: string
          home_score_prediction: number
          id?: string
          is_correct?: boolean | null
          match_id: string
          points_awarded?: number
        }
        Update: {
          away_score_prediction?: number
          coins_wagered?: number
          coins_won?: number
          confidence?: string
          created_at?: string
          fan_id?: string
          home_score_prediction?: number
          id?: string
          is_correct?: boolean | null
          match_id?: string
          points_awarded?: number
        }
        Relationships: []
      }
      prize_claims: {
        Row: {
          claimed_at: string
          coins_spent: number
          fan_id: string
          fulfillment_details: Json | null
          id: string
          prize_id: string
          status: string
        }
        Insert: {
          claimed_at?: string
          coins_spent: number
          fan_id: string
          fulfillment_details?: Json | null
          id?: string
          prize_id: string
          status?: string
        }
        Update: {
          claimed_at?: string
          coins_spent?: number
          fan_id?: string
          fulfillment_details?: Json | null
          id?: string
          prize_id?: string
          status?: string
        }
        Relationships: []
      }
      prizes: {
        Row: {
          category: string
          claimed_count: number
          club_id: string | null
          coins_cost: number
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sponsor_id: string | null
          stock: number
        }
        Insert: {
          category?: string
          claimed_count?: number
          club_id?: string | null
          coins_cost: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sponsor_id?: string | null
          stock?: number
        }
        Update: {
          category?: string
          claimed_count?: number
          club_id?: string | null
          coins_cost?: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sponsor_id?: string | null
          stock?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          coins_awarded_referred: number
          coins_awarded_referrer: number
          completed_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          coins_awarded_referred?: number
          coins_awarded_referrer?: number
          completed_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          coins_awarded_referred?: number
          coins_awarded_referrer?: number
          completed_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      reward_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          fan_id: string
          id: string
          reference_id: string | null
          source: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          fan_id: string
          id?: string
          reference_id?: string | null
          source: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          fan_id?: string
          id?: string
          reference_id?: string | null
          source?: string
          type?: string
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          tier: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          tier?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          tier?: string
        }
        Relationships: []
      }
      sponsor_campaigns: {
        Row: {
          budget_coins: number
          conversions: number
          created_at: string
          end_date: string | null
          engagements: number
          id: string
          impressions: number
          name: string
          objective: string | null
          spent_coins: number
          sponsor_id: string
          start_date: string | null
          status: string
          target_clubs: Json | null
          target_sports: Json | null
          target_tiers: string[] | null
        }
        Insert: {
          budget_coins?: number
          conversions?: number
          created_at?: string
          end_date?: string | null
          engagements?: number
          id?: string
          impressions?: number
          name: string
          objective?: string | null
          spent_coins?: number
          sponsor_id: string
          start_date?: string | null
          status?: string
          target_clubs?: Json | null
          target_sports?: Json | null
          target_tiers?: string[] | null
        }
        Update: {
          budget_coins?: number
          conversions?: number
          created_at?: string
          end_date?: string | null
          engagements?: number
          id?: string
          impressions?: number
          name?: string
          objective?: string | null
          spent_coins?: number
          sponsor_id?: string
          start_date?: string | null
          status?: string
          target_clubs?: Json | null
          target_sports?: Json | null
          target_tiers?: string[] | null
        }
        Relationships: []
      }
      sports: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      talking_points: {
        Row: {
          club_id: string | null
          context: string | null
          created_at: string
          generated_by: string
          id: string
          match_id: string | null
          prompt: string
        }
        Insert: {
          club_id?: string | null
          context?: string | null
          created_at?: string
          generated_by?: string
          id?: string
          match_id?: string | null
          prompt: string
        }
        Update: {
          club_id?: string | null
          context?: string | null
          created_at?: string
          generated_by?: string
          id?: string
          match_id?: string | null
          prompt?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          coins_awarded: number
          completed_at: string
          fan_id: string
          id: string
          response_data: Json | null
          task_id: string
        }
        Insert: {
          coins_awarded: number
          completed_at?: string
          fan_id: string
          id?: string
          response_data?: Json | null
          task_id: string
        }
        Update: {
          coins_awarded?: number
          completed_at?: string
          fan_id?: string
          id?: string
          response_data?: Json | null
          task_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_fan_identity_score: {
        Args: { p_fan_id: string }
        Returns: number
      }
      update_engagement_tier: {
        Args: { p_fan_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]

export type Enums<T extends keyof DefaultSchema["Enums"]> =
  DefaultSchema["Enums"][T]
