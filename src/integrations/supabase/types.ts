export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          username: string;
          email: string;
          age_group: "14-18" | "18+" | null;
          experience_level: "beginner" | "intermediate" | "pro" | null;
          cash_balance: string | number;
          starting_cash: string | number;
          max_cap: string | number | null;
          confidence_score: number;
          streak: number;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          username?: string;
          email?: string;
          age_group?: "14-18" | "18+" | null;
          experience_level?: "beginner" | "intermediate" | "pro" | null;
          cash_balance?: string | number;
          starting_cash?: string | number;
          max_cap?: string | number | null;
          confidence_score?: number;
          streak?: number;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          username?: string;
          email?: string;
          age_group?: "14-18" | "18+" | null;
          experience_level?: "beginner" | "intermediate" | "pro" | null;
          cash_balance?: string | number;
          starting_cash?: string | number;
          max_cap?: string | number | null;
          confidence_score?: number;
          streak?: number;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      holdings: {
        Row: {
          id: string;
          user_id: string;
          stock_symbol: string;
          shares: string | number;
          avg_buy_price: string | number;
          company_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stock_symbol: string;
          shares: string | number;
          avg_buy_price: string | number;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stock_symbol?: string;
          shares?: string | number;
          avg_buy_price?: string | number;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          stock_symbol: string;
          type: "BUY" | "SELL";
          shares: string | number;
          prices: string | number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stock_symbol: string;
          type: "BUY" | "SELL";
          shares: string | number;
          prices: string | number;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stock_symbol?: string;
          type?: "BUY" | "SELL";
          shares?: string | number;
          prices?: string | number;
          recorded_at?: string;
        };
        Relationships: [];
      };
      sold_stocks: {
        Row: {
          id: string;
          user_id: string;
          stock_symbol: string;
          company_name: string | null;
          shares_sold: string | number;
          sale_price_per_share: string | number;
          proceeds: string | number;
          avg_cost_per_share_at_sale: string | number;
          cost_basis: string | number;
          realized_pnl: string | number;
          recorded_at: string;
          transaction_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          stock_symbol: string;
          company_name?: string | null;
          shares_sold: string | number;
          sale_price_per_share: string | number;
          proceeds: string | number;
          avg_cost_per_share_at_sale: string | number;
          cost_basis: string | number;
          realized_pnl: string | number;
          recorded_at?: string;
          transaction_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          stock_symbol?: string;
          company_name?: string | null;
          shares_sold?: string | number;
          sale_price_per_share?: string | number;
          proceeds?: string | number;
          avg_cost_per_share_at_sale?: string | number;
          cost_basis?: string | number;
          realized_pnl?: string | number;
          recorded_at?: string;
          transaction_id?: string | null;
        };
        Relationships: [];
      };
      watchlist: {
        Row: {
          id: string;
          user_id: string;
          stock_symbol: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stock_symbol: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stock_symbol?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      execute_paper_buy: {
        Args: {
          p_symbol: string;
          p_company_name: string;
          p_shares: number;
          p_price: number;
        };
        Returns: Json;
      };
      execute_paper_sell: {
        Args: {
          p_symbol: string;
          p_shares: number;
          p_price: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
