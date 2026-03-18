import { render, screen } from "@testing-library/react";

import Home from "./page";

describe("Home page", () => {
  it("renders the current homepage heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        name: /peter is pregnant and wants to have a baby/i,
      }),
    ).toBeInTheDocument();
  });

  it("links to the pdf link tester page", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", {
        name: /open pdf link tester/i,
      }),
    ).toHaveAttribute("href", "/data_input");
  });
});
