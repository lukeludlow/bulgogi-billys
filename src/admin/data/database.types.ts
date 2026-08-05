export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type Database = {
    graphql_public: {
        Tables: {
            [_ in never]: never;
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            graphql: {
                Args: {
                    extensions?: Json;
                    operationName?: string;
                    query?: string;
                    variables?: Json;
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
    public: {
        Tables: {
            admin_users: {
                Row: {
                    email: string;
                };
                Insert: {
                    email: string;
                };
                Update: {
                    email?: string;
                };
                Relationships: [];
            };
            batch_lines: {
                Row: {
                    cost: number;
                    id: string;
                    ingredient_id: string;
                    name: string;
                    position: number;
                };
                Insert: {
                    cost?: number;
                    id: string;
                    ingredient_id: string;
                    name: string;
                    position: number;
                };
                Update: {
                    cost?: number;
                    id?: string;
                    ingredient_id?: string;
                    name?: string;
                    position?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "batch_lines_ingredient_id_fkey";
                        columns: ["ingredient_id"];
                        isOneToOne: false;
                        referencedRelation: "ingredients";
                        referencedColumns: ["id"];
                    },
                ];
            };
            events: {
                Row: {
                    billys_hours: number;
                    date: string;
                    employee_hours: number;
                    market: string;
                    market_fee: number;
                    waste: number;
                };
                Insert: {
                    billys_hours?: number;
                    date: string;
                    employee_hours?: number;
                    market: string;
                    market_fee?: number;
                    waste?: number;
                };
                Update: {
                    billys_hours?: number;
                    date?: string;
                    employee_hours?: number;
                    market?: string;
                    market_fee?: number;
                    waste?: number;
                };
                Relationships: [];
            };
            ingredients: {
                Row: {
                    batch_yield: number | null;
                    cost_per_unit: number;
                    id: string;
                    name: string;
                    position: number;
                    pricing: string;
                    unit: string;
                };
                Insert: {
                    batch_yield?: number | null;
                    cost_per_unit?: number;
                    id: string;
                    name: string;
                    position: number;
                    pricing?: string;
                    unit: string;
                };
                Update: {
                    batch_yield?: number | null;
                    cost_per_unit?: number;
                    id?: string;
                    name?: string;
                    position?: number;
                    pricing?: string;
                    unit?: string;
                };
                Relationships: [];
            };
            market_overrides: {
                Row: {
                    date: string;
                    market: string;
                };
                Insert: {
                    date: string;
                    market: string;
                };
                Update: {
                    date?: string;
                    market?: string;
                };
                Relationships: [];
            };
            market_settings: {
                Row: {
                    classification: string | null;
                    employee_hourly_rate: number | null;
                    market: string;
                };
                Insert: {
                    classification?: string | null;
                    employee_hourly_rate?: number | null;
                    market: string;
                };
                Update: {
                    classification?: string | null;
                    employee_hourly_rate?: number | null;
                    market?: string;
                };
                Relationships: [];
            };
            menu_items: {
                Row: {
                    has_protein: boolean;
                    id: string;
                    name: string;
                    position: number;
                };
                Insert: {
                    has_protein?: boolean;
                    id: string;
                    name: string;
                    position: number;
                };
                Update: {
                    has_protein?: boolean;
                    id?: string;
                    name?: string;
                    position?: number;
                };
                Relationships: [];
            };
            processor_fees: {
                Row: {
                    amount: number;
                    month: string;
                };
                Insert: {
                    amount?: number;
                    month: string;
                };
                Update: {
                    amount?: number;
                    month?: string;
                };
                Relationships: [];
            };
            purchases: {
                Row: {
                    amount: number;
                    category: string;
                    date: string;
                    id: string;
                    note: string | null;
                };
                Insert: {
                    amount?: number;
                    category: string;
                    date: string;
                    id: string;
                    note?: string | null;
                };
                Update: {
                    amount?: number;
                    category?: string;
                    date?: string;
                    id?: string;
                    note?: string | null;
                };
                Relationships: [];
            };
            recipe_lines: {
                Row: {
                    amount: number;
                    ingredient_id: string;
                    item_id: string;
                    position: number;
                    variant_id: string;
                };
                Insert: {
                    amount?: number;
                    ingredient_id: string;
                    item_id: string;
                    position: number;
                    variant_id: string;
                };
                Update: {
                    amount?: number;
                    ingredient_id?: string;
                    item_id?: string;
                    position?: number;
                    variant_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "recipe_lines_item_id_variant_id_fkey";
                        columns: ["item_id", "variant_id"];
                        isOneToOne: false;
                        referencedRelation: "variants";
                        referencedColumns: ["item_id", "id"];
                    },
                ];
            };
            settings: {
                Row: {
                    blended_food_cost_percent: number;
                    employee_hourly_rate: number;
                    grocery_weekly_spend: number;
                    id: number;
                    packaging_cost_per_order: number;
                    sales_tax_rate_percent: number;
                    selected_protein: string;
                    updated_at: string;
                };
                Insert: {
                    blended_food_cost_percent?: number;
                    employee_hourly_rate?: number;
                    grocery_weekly_spend?: number;
                    id?: number;
                    packaging_cost_per_order?: number;
                    sales_tax_rate_percent?: number;
                    selected_protein?: string;
                    updated_at?: string;
                };
                Update: {
                    blended_food_cost_percent?: number;
                    employee_hourly_rate?: number;
                    grocery_weekly_spend?: number;
                    id?: number;
                    packaging_cost_per_order?: number;
                    sales_tax_rate_percent?: number;
                    selected_protein?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            transactions: {
                Row: {
                    amount: number;
                    brand: string | null;
                    date: string;
                    id: string;
                    method: string;
                    result: string;
                    type: string;
                };
                Insert: {
                    amount: number;
                    brand?: string | null;
                    date: string;
                    id: string;
                    method: string;
                    result: string;
                    type: string;
                };
                Update: {
                    amount?: number;
                    brand?: string | null;
                    date?: string;
                    id?: string;
                    method?: string;
                    result?: string;
                    type?: string;
                };
                Relationships: [];
            };
            variants: {
                Row: {
                    id: string;
                    item_id: string;
                    label: string;
                    position: number;
                    sell_price: number;
                    units_sold_this_week: number;
                };
                Insert: {
                    id: string;
                    item_id: string;
                    label: string;
                    position: number;
                    sell_price?: number;
                    units_sold_this_week?: number;
                };
                Update: {
                    id?: string;
                    item_id?: string;
                    label?: string;
                    position?: number;
                    sell_price?: number;
                    units_sold_this_week?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "variants_item_id_fkey";
                        columns: ["item_id"];
                        isOneToOne: false;
                        referencedRelation: "menu_items";
                        referencedColumns: ["id"];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            is_admin: { Args: never; Returns: boolean };
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

type DefaultSchema = DatabaseWithoutInternals[Extract<
    keyof Database,
    "public"
>];

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
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
            DefaultSchema["Views"])
      ? (DefaultSchema["Tables"] &
            DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
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
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
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
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema["Enums"]
        | { schema: keyof DatabaseWithoutInternals },
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
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema["CompositeTypes"]
        | { schema: keyof DatabaseWithoutInternals },
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
    graphql_public: {
        Enums: {},
    },
    public: {
        Enums: {},
    },
} as const;
