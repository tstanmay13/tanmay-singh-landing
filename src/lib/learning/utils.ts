export function getCategoryColor(slug: string): string {
  switch (slug) {
    case "ai-dev-career":
      return "var(--color-purple)";
    case "random-facts":
      return "var(--color-pink)";
    case "life-skills":
      return "var(--color-blue)";
    default:
      return "var(--color-accent)";
  }
}

export function getCategoryColorHex(slug: string): string {
  switch (slug) {
    case "ai-dev-career":
      return "#a855f7";
    case "random-facts":
      return "#ec4899";
    case "life-skills":
      return "#3b82f6";
    default:
      return "#00ff88";
  }
}
