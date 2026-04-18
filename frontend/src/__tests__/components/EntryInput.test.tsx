import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import EntryInput from "../../components/EntryInput";

vi.mock("../../services/api", () => ({
  api: {
    submitEntry: vi.fn().mockResolvedValue({ date: "2026-04-18", entry: {} }),
  },
}));

describe("EntryInput", () => {
  it("renders the input form", () => {
    render(<EntryInput onSubmitted={() => {}} />);
    expect(screen.getByPlaceholderText(/had a standup/i)).toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
    expect(screen.getByText("Screenshot")).toBeInTheDocument();
  });

  it("submit button is disabled when input is empty", () => {
    render(<EntryInput onSubmitted={() => {}} />);
    expect(screen.getByText("Submit")).toBeDisabled();
  });

  it("submit button is enabled when text is entered", async () => {
    const user = userEvent.setup();
    render(<EntryInput onSubmitted={() => {}} />);
    await user.type(screen.getByPlaceholderText(/had a standup/i), "test entry");
    expect(screen.getByText("Submit")).toBeEnabled();
  });
});
