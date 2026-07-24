import {
  ClipboardList,
} from "lucide-react";
import type {
  MouseEventHandler,
} from "react";

interface TaskDetailsButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export default function TaskDetailsButton({
  onClick,
  disabled = false,
  label = "View task details",
  className = "",
}: TaskDetailsButtonProps) {
  const buttonClassName = [
    "task-details-button",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="dialog"
    >
      <ClipboardList
        size={17}
        aria-hidden="true"
      />

      <span>{label}</span>
    </button>
  );
}