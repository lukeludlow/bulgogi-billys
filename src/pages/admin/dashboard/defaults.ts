import {
    PROTEIN_INGREDIENT_ID,
    type Ingredient,
    type MenuItem,
    type Settings,
} from "./types.ts";

// Best-guess starting numbers. Every value is editable in the UI — these are
// deliberately round, plausible estimates for a Korean-fusion food operation,
// not audited figures. Toppings are measured in ounces, proteins in pounds.
const INGREDIENTS: Ingredient[] = [
    { id: "beef", name: "Beef bulgogi", unit: "lb", costPerUnit: 7.0 },
    { id: "pork", name: "Pork bulgogi", unit: "lb", costPerUnit: 4.5 },
    { id: "fries", name: "French fries (raw)", unit: "oz", costPerUnit: 0.08 },
    { id: "rice", name: "Steamed rice", unit: "oz", costPerUnit: 0.06 },
    { id: "cheese", name: "Cheddar-jack cheese", unit: "oz", costPerUnit: 0.25 },
    {
        // Priced by batch to demo the sub-recipe builder: an ~80 oz batch that
        // costs $16 in ingredients works out to the same $0.20/oz.
        id: "seoul",
        name: "Seoul sauce",
        unit: "oz",
        costPerUnit: 0.2,
        pricing: "batch",
        batch: {
            yield: 80,
            lines: [
                { id: "soy", name: "Soy sauce", cost: 6 },
                { id: "sugar", name: "Brown sugar", cost: 3 },
                { id: "sesame", name: "Sesame oil", cost: 4 },
                { id: "garlic", name: "Garlic & ginger", cost: 3 },
            ],
        },
    },
    { id: "sriracha", name: "Sriracha", unit: "oz", costPerUnit: 0.1 },
    { id: "sourCream", name: "Sour cream", unit: "oz", costPerUnit: 0.12 },
    { id: "kimchi", name: "Kimchi", unit: "oz", costPerUnit: 0.2 },
    { id: "cabbage", name: "Pickled red cabbage", unit: "oz", costPerUnit: 0.1 },
    { id: "tortilla", name: "Corn tortilla", unit: "each", costPerUnit: 0.15 },
];

const P = PROTEIN_INGREDIENT_ID;

const ITEMS: MenuItem[] = [
    {
        id: "fries",
        name: "Bulgogi Fries",
        hasProtein: true,
        variants: [
            {
                id: "small",
                label: "Small",
                sellPrice: 7,
                recipe: [
                    { ingredientId: "fries", amount: 4 },
                    { ingredientId: P, amount: 0.15 },
                    { ingredientId: "cheese", amount: 1 },
                    { ingredientId: "seoul", amount: 0.5 },
                    { ingredientId: "sriracha", amount: 0.25 },
                    { ingredientId: "sourCream", amount: 0.5 },
                ],
            },
            {
                id: "regular",
                label: "Regular",
                sellPrice: 9,
                recipe: [
                    { ingredientId: "fries", amount: 6 },
                    { ingredientId: P, amount: 0.25 },
                    { ingredientId: "cheese", amount: 1.5 },
                    { ingredientId: "seoul", amount: 0.75 },
                    { ingredientId: "sriracha", amount: 0.4 },
                    { ingredientId: "sourCream", amount: 0.75 },
                ],
            },
            {
                id: "large",
                label: "Large",
                sellPrice: 12,
                recipe: [
                    { ingredientId: "fries", amount: 9 },
                    { ingredientId: P, amount: 0.35 },
                    { ingredientId: "cheese", amount: 2 },
                    { ingredientId: "seoul", amount: 1 },
                    { ingredientId: "sriracha", amount: 0.5 },
                    { ingredientId: "sourCream", amount: 1 },
                ],
            },
            {
                id: "texas",
                label: "Texas",
                sellPrice: 15,
                recipe: [
                    { ingredientId: "fries", amount: 12 },
                    { ingredientId: P, amount: 0.5 },
                    { ingredientId: "cheese", amount: 3 },
                    { ingredientId: "seoul", amount: 1.5 },
                    { ingredientId: "sriracha", amount: 0.75 },
                    { ingredientId: "sourCream", amount: 1.5 },
                ],
            },
        ],
    },
    {
        id: "rice",
        name: "Bulgogi Rice",
        hasProtein: true,
        variants: [
            {
                id: "small",
                label: "Small",
                sellPrice: 7,
                recipe: [
                    { ingredientId: "rice", amount: 5 },
                    { ingredientId: P, amount: 0.15 },
                    { ingredientId: "kimchi", amount: 1.5 },
                ],
            },
            {
                id: "regular",
                label: "Regular",
                sellPrice: 9,
                recipe: [
                    { ingredientId: "rice", amount: 7 },
                    { ingredientId: P, amount: 0.25 },
                    { ingredientId: "kimchi", amount: 2 },
                ],
            },
            {
                id: "large",
                label: "Large",
                sellPrice: 12,
                recipe: [
                    { ingredientId: "rice", amount: 10 },
                    { ingredientId: P, amount: 0.35 },
                    { ingredientId: "kimchi", amount: 2.5 },
                ],
            },
            {
                id: "texas",
                label: "Texas",
                sellPrice: 15,
                recipe: [
                    { ingredientId: "rice", amount: 14 },
                    { ingredientId: P, amount: 0.5 },
                    { ingredientId: "kimchi", amount: 3 },
                ],
            },
        ],
    },
    {
        id: "tacos",
        name: "Bulgogi Tacos",
        hasProtein: true,
        variants: [
            {
                id: "one",
                label: "One Taco",
                sellPrice: 4,
                recipe: [
                    { ingredientId: "tortilla", amount: 1 },
                    { ingredientId: P, amount: 0.12 },
                    { ingredientId: "kimchi", amount: 0.5 },
                    { ingredientId: "cabbage", amount: 0.5 },
                    { ingredientId: "seoul", amount: 0.25 },
                    { ingredientId: "sriracha", amount: 0.15 },
                    { ingredientId: "cheese", amount: 0.5 },
                ],
            },
            {
                id: "three",
                label: "Three Tacos",
                sellPrice: 11,
                recipe: [
                    { ingredientId: "tortilla", amount: 3 },
                    { ingredientId: P, amount: 0.36 },
                    { ingredientId: "kimchi", amount: 1.5 },
                    { ingredientId: "cabbage", amount: 1.5 },
                    { ingredientId: "seoul", amount: 0.75 },
                    { ingredientId: "sriracha", amount: 0.45 },
                    { ingredientId: "cheese", amount: 1.5 },
                ],
            },
        ],
    },
];

export const DEFAULT_SETTINGS: Settings = {
    selectedProtein: "beef",
    ingredients: INGREDIENTS,
    items: ITEMS,
    groceryWeeklySpend: 400,
    packagingCostPerOrder: 0.25,
    transactions: [],
    blendedFoodCostPercent: 32,
};
