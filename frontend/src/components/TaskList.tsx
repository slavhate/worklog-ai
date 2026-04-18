import { api } from "../services/api";
import InlineEdit from "./InlineEdit";
import type { TaskEntry } from "../types";

interface TaskListProps {
  tasks: (TaskEntry & { date?: string; index?: number })[];
  showDate?: boolean;
  onToggle?: () => void;
  onEditTask?: (index: number, field: keyof TaskEntry, value: string | boolean) => void;
}

export default function TaskList({ tasks, showDate, onToggle, onEditTask }: TaskListProps) {
  async function handleToggle(date: string, index: number) {
    await api.toggleTask(date, index);
    onToggle?.();
  }

  if (tasks.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--color-text-muted)", padding: "12px 0" }}>
        No tasks yet
      </p>
    );
  }

  return (
    <div
      style={{
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      {tasks.map((task, i) => {
        const isOverdue = task.due && !task.completed && task.due < new Date().toISOString().slice(0, 10);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              borderBottom: i < tasks.length - 1 ? "1px solid var(--color-border)" : "none",
              transition: "background var(--transition-fast)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <button
              onClick={() => task.date != null && task.index != null && handleToggle(task.date, task.index)}
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: task.completed
                  ? "none"
                  : `2px solid ${isOverdue ? "var(--color-danger)" : "var(--color-border-strong)"}`,
                background: task.completed ? "var(--color-success)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all var(--transition-fast)",
                padding: 0,
              }}
            >
              {task.completed && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              )}
            </button>
            {task.time && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-accent)", minWidth: 40, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {task.time}
              </span>
            )}
            {onEditTask ? (
              <InlineEdit
                value={task.text}
                onSave={(v) => onEditTask(i, "text", v)}
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: task.completed ? "var(--color-text-muted)" : "var(--color-text-primary)",
                  textDecoration: "none",
                }}
              />
            ) : (
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: task.completed ? "var(--color-text-muted)" : "var(--color-text-primary)",
                  textDecoration: "none",
                  transition: "color var(--transition-fast)",
                }}
              >
                {task.text}
              </span>
            )}
            {showDate && task.date && (
              <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{task.date}</span>
            )}
            {task.due && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: isOverdue ? "var(--color-danger-bg)" : "var(--color-warning-bg)",
                  color: isOverdue ? "var(--color-danger)" : "var(--color-warning)",
                }}
              >
                {task.due}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
