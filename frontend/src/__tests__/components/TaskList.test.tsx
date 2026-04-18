import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TaskList from "../../components/TaskList";

describe("TaskList", () => {
  it("renders 'No tasks' when list is empty", () => {
    render(<TaskList tasks={[]} />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  });

  it("renders tasks with completion status", () => {
    const tasks = [
      { text: "Done task", completed: true },
      { text: "Pending task", completed: false, due: "2026-04-21" },
    ];
    render(<TaskList tasks={tasks} />);
    expect(screen.getByText("Done task")).toBeInTheDocument();
    expect(screen.getByText("Pending task")).toBeInTheDocument();
    expect(screen.getByText("2026-04-21")).toBeInTheDocument();
  });

  it("renders date when showDate is true", () => {
    const tasks = [{ text: "Task", completed: false, date: "2026-04-18", index: 0 }];
    render(<TaskList tasks={tasks} showDate />);
    expect(screen.getByText("2026-04-18")).toBeInTheDocument();
  });
});
