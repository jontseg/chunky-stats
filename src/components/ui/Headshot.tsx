import { memo } from "react";

type HeadshotProps = {
  url: string | null | undefined;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showTeamBadge?: boolean;
  teamId?: string | null;
};

const SIZE_CLASSES = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

const ICON_SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

function HeadshotComponent({
  url,
  name,
  size = "md",
  className = "",
  showTeamBadge = false,
  teamId,
}: HeadshotProps) {
  const sizeClass = SIZE_CLASSES[size];
  const iconSize = ICON_SIZES[size];

  return (
    <div className={`relative ${sizeClass} flex-shrink-0 ${className}`}>
      {url ? (
        <img
          src={url}
          alt={name}
          className={`${sizeClass} rounded-full object-cover bg-card-bg`}
          loading="lazy"
        />
      ) : (
        <div
          className={`${sizeClass} rounded-full bg-primary/10 flex items-center justify-center`}
        >
          <svg
            className={`${iconSize} text-primary`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      )}
      {showTeamBadge && teamId && (
        <div className="absolute -bottom-1 -right-1 rounded-full bg-background px-1.5 py-0.5 text-xs font-semibold border border-card-border">
          {teamId}
        </div>
      )}
    </div>
  );
}

export const Headshot = memo(HeadshotComponent);
