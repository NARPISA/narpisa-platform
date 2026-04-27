import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import ThemeRegistry from "@/components/theme-registry";

import DatabaseFilterRail from "./database-filter-rail";

function renderRail(
  props: Partial<ComponentProps<typeof DatabaseFilterRail>> = {},
) {
  return render(
    <ThemeRegistry>
      <DatabaseFilterRail
        menuOpen={false}
        onOpenMenu={vi.fn()}
        activeCategory="Mines"
        filterGroups={[]}
        onToggleFilterOption={vi.fn()}
        onResetFilters={vi.fn()}
        onExportCsv={vi.fn()}
        onExportPdf={vi.fn()}
        isAdmin={false}
        hasPendingChanges={false}
        isSaving={false}
        pendingChangeCount={0}
        onSaveChanges={vi.fn()}
        {...props}
      />
    </ThemeRegistry>,
  );
}

describe("DatabaseFilterRail", () => {
  it("does not render admin save controls for non-admin users", () => {
    renderRail();

    expect(screen.queryByRole("button", { name: /no changes/i })).not.toBeInTheDocument();
  });

  it("shows a disabled save state for admins with no pending edits", () => {
    renderRail({ isAdmin: true });

    expect(screen.getByRole("button", { name: /no changes/i })).toBeDisabled();
  });

  it("enables the save action when an admin has pending edits", () => {
    const onSaveChanges = vi.fn();
    renderRail({
      isAdmin: true,
      hasPendingChanges: true,
      pendingChangeCount: 2,
      onSaveChanges,
    });

    const saveButton = screen.getByRole("button", { name: /save 2 changes/i });
    expect(saveButton).toBeEnabled();
    saveButton.click();
    expect(onSaveChanges).toHaveBeenCalledTimes(1);
  });
});
