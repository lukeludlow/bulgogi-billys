// Cascades and check constraints (REFACTOR_PLAN §5.3) — the schema guarantees
// the app leans on but the PostgREST stub can't see.
//
// These matter because the app's mapping layer trusts them. `rowsToSettings`
// narrows check-constrained columns with `oneOf` on the way in, which is only
// a real guard if the database refuses the bad value on the way out; and the
// config save relies on cascades to sweep child rows when a parent goes.

import { beforeAll, describe, expect, test } from "vitest";
import { psql, readRows, resetData, sqlError } from "./localStack.ts";

beforeAll(resetData);

describe("cascades", () => {
    test("deleting an ingredient takes its batch lines", () => {
        expect(readRows("batch_lines", "ingredient_id = 'seoul'")).not.toEqual(
            [],
        );
        psql("delete from public.ingredients where id = 'seoul';");
        expect(readRows("batch_lines", "ingredient_id = 'seoul'")).toEqual([]);
    });

    test("deleting a variant takes its recipe lines", () => {
        expect(
            readRows(
                "recipe_lines",
                "item_id = 'fries' and variant_id = 'small'",
            ),
        ).not.toEqual([]);
        psql(
            "delete from public.variants where item_id = 'fries' and id = 'small';",
        );
        expect(
            readRows(
                "recipe_lines",
                "item_id = 'fries' and variant_id = 'small'",
            ),
        ).toEqual([]);
    });

    test("deleting a menu item takes its variants and their recipe lines", () => {
        psql("delete from public.menu_items where id = 'fries';");
        expect(readRows("variants", "item_id = 'fries'")).toEqual([]);
        expect(readRows("recipe_lines", "item_id = 'fries'")).toEqual([]);
    });
});

describe("constraints", () => {
    beforeAll(resetData);

    test("a recipe line may name an ingredient that doesn't exist", () => {
        // Deliberate: 'protein' is a sentinel the app resolves client-side, and
        // a since-deleted ingredient is tolerated rather than fatal
        // (20260727000000_initial_schema.sql).
        psql(
            `insert into public.recipe_lines (item_id, variant_id, ingredient_id, amount, position)
             values ('fries', 'regular', 'no-such-ingredient', 1, 99);`,
        );
        expect(
            readRows("recipe_lines", "ingredient_id = 'no-such-ingredient'"),
        ).toHaveLength(1);
    });

    test("settings is a singleton", () => {
        expect(
            sqlError("insert into public.settings (id) values (2);"),
        ).toMatch(/settings_id_check/);
    });

    test.each([
        [
            "an unknown ingredient unit",
            `insert into public.ingredients (id, name, unit, position)
             values ('bad', 'Bad', 'kg', 99);`,
            /ingredients_unit_check/,
        ],
        [
            "batch pricing without a yield",
            `insert into public.ingredients (id, name, unit, pricing, position)
             values ('bad', 'Bad', 'lb', 'batch', 99);`,
            /ingredients_check/,
        ],
        [
            "an unknown event market",
            `insert into public.events (date, market) values ('2026-07-01', 'narnia');`,
            /events_market_check/,
        ],
        [
            "an unknown purchase category",
            `insert into public.purchases (id, date, category, amount)
             values ('bad', '2026-07-01', 'beverages', 1);`,
            /purchases_category_check/,
        ],
        [
            "a malformed fee month",
            `insert into public.processor_fees (month, amount) values ('July 2026', 1);`,
            /processor_fees_month_check/,
        ],
        [
            "an unknown market classification",
            `insert into public.market_settings (market, classification)
             values ('other', 'excellent');`,
            // The constraint kept its original name through the
            // market_classifications → market_settings rename.
            /market_classifications_classification_check/,
        ],
    ])("rejects %s", (_label, sql, expected) => {
        expect(sqlError(sql)).toMatch(expected);
    });
});
