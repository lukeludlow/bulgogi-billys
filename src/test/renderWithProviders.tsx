import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { render } from "vitest-browser-react";

export function renderWithProviders(
    ui: ReactNode,
    { route = "/" }: { route?: string } = {},
) {
    return render(ui, {
        wrapper: ({ children }) => (
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        ),
    });
}
