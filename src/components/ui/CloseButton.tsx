import { memo } from "react";

type CloseButtonProps = {
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  sm: "p-1",
  md: "p-2",
  lg: "p-3",
};

const ICON_SIZES = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

function CloseButtonComponent({
  onClick,
  size = "md",
  className = "",
}: CloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        ${SIZE_CLASSES[size]}
        hover:bg-card-border rounded-full transition-colors
        ${className}
      `}
      aria-label="Close"
    >
      <svg
        className={ICON_SIZES[size]}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  );
}

export const CloseButton = memo(CloseButtonComponent);
