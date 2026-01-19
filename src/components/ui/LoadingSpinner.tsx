import { memo } from "react";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

function LoadingSpinnerComponent({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`
          ${SIZE_CLASSES[size]}
          animate-spin rounded-full border-b-2 border-primary
        `}
      />
    </div>
  );
}

export const LoadingSpinner = memo(LoadingSpinnerComponent);
