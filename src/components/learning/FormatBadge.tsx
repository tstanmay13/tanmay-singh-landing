interface FormatBadgeProps {
  format: "article" | "interactive" | "quickbite";
}

const FORMAT_CONFIG = {
  article: { icon: "\uD83D\uDCD6", label: "Article" },
  interactive: { icon: "\uD83E\uDDE9", label: "Interactive" },
  quickbite: { icon: "\u26A1", label: "Quick Bite" },
} as const;

export default function FormatBadge({ format }: FormatBadgeProps) {
  const config = FORMAT_CONFIG[format];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
      style={{
        fontFamily: "var(--font-body)",
        color: "var(--color-text-secondary)",
        background: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
      }}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
