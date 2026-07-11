import { expect, test } from "vitest";
import handler from "./admin-logout.js";

test("responds 405 for non-POST methods", async () => {
    const response = await handler({ method: "GET" });
    expect(response.status).toBe(405);
});

test("responds 204 for POST", async () => {
    const response = await handler({ method: "POST" });
    expect(response.status).toBe(204);
});
