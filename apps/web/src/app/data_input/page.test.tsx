import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DataInputPage from "./page";

describe("Data input page", () => {
  it("renders the page heading and home link", () => {
    render(<DataInputPage />);

    expect(
      screen.getByRole("heading", {
        name: /pdf link testing page/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: /back to home/i,
      }),
    ).toHaveAttribute("href", "/");
  });

  it("shows a warning for an invalid url and disables submission", async () => {
    const user = userEvent.setup();

    render(<DataInputPage />);

    await user.type(
      screen.getByRole("textbox", { name: /document title/i }),
      "Haib Copper PEA",
    );
    await user.type(
      screen.getByRole("textbox", { name: /pdf source url/i }),
      "not-a-valid-url",
    );

    expect(
      screen.getByText(/enter a valid `http` or `https` url before adding the link/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /add test link/i,
      }),
    ).toBeDisabled();
  });

  it("adds a valid link and resets the form", async () => {
    const user = userEvent.setup();

    render(<DataInputPage />);

    const titleInput = screen.getByRole("textbox", { name: /document title/i });
    const urlInput = screen.getByRole("textbox", { name: /pdf source url/i });
    const addButton = screen.getByRole("button", { name: /add test link/i });

    await user.type(titleInput, "Haib Copper PEA");
    await user.type(urlInput, "https://example.org/report.pdf");
    await user.click(addButton);

    expect(screen.getByText("Haib Copper PEA")).toBeInTheDocument();
    expect(screen.getByText("https://example.org/report.pdf")).toBeInTheDocument();
    expect(titleInput).toHaveValue("");
    expect(urlInput).toHaveValue("");
  });
});
