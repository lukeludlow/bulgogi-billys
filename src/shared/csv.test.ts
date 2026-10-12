import { describe, expect, it } from "vitest";
import { parseCsv } from "@/shared/csv.ts";

describe("parseCsv", () => {
    it("splits rows and fields", () => {
        expect(parseCsv("a,b\n1,2\n")).toEqual([
            ["a", "b"],
            ["1", "2"],
        ]);
    });

    it("flushes a last row with no trailing newline", () => {
        expect(parseCsv("a,b\n1,2")).toEqual([
            ["a", "b"],
            ["1", "2"],
        ]);
    });

    it("handles \\r\\n line endings", () => {
        expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
            ["a", "b"],
            ["1", "2"],
        ]);
    });

    it("keeps commas and newlines inside quoted fields", () => {
        expect(parseCsv('"US",1064\n"a, b","line\nbreak"')).toEqual([
            ["US", "1064"],
            ["a, b", "line\nbreak"],
        ]);
    });

    it("unescapes doubled quotes", () => {
        expect(parseCsv('"say ""hi"""')).toEqual([['say "hi"']]);
    });

    it("keeps empty fields", () => {
        expect(parseCsv("2026-07-01,0,0,,\n")).toEqual([
            ["2026-07-01", "0", "0", "", ""],
        ]);
    });

    it("strips a leading byte-order mark", () => {
        expect(parseCsv("﻿Date,Clicks\n")).toEqual([["Date", "Clicks"]]);
    });

    it("returns no rows for empty input", () => {
        expect(parseCsv("")).toEqual([]);
    });
});
