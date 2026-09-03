export type ScreenPoint = {
  x: number;
  y: number;
};

export type ScreenRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LabelDimensions = {
  width: number;
  height: number;
};

export type LabelFlags = {
  selected?: boolean;
  currentHome?: boolean;
  pastLived?: boolean;
  hovered?: boolean;
  focused?: boolean;
  featuredHub?: boolean;
  significantDestination?: boolean;
};

export type LabelCandidate = LabelFlags & {
  id: string;
  /** Stable canonical key used before id when candidates otherwise tie. */
  canonicalId?: string;
  name: string;
  point: ScreenPoint;
  dimensions?: LabelDimensions;
  width?: number;
  height?: number;
  estimatedWidth?: number;
  estimatedHeight?: number;
  markerRadius?: number;
  gap?: number;
  flags?: LabelFlags;
};

export type LabelPlacement = "below" | "above" | "right" | "left";

export type PlacedLabel = {
  id: string;
  canonicalId: string;
  name: string;
  placement: LabelPlacement;
  rect: ScreenRect;
  /** Top-left screen coordinate, matching rect.x/rect.y. */
  x: number;
  y: number;
  width: number;
  height: number;
  priority: LabelPriority;
};

export type LabelPriority =
  | "selected"
  | "current-home"
  | "past-lived"
  | "hovered-or-focused"
  | "featured-hub"
  | "significant-destination"
  | "minor";

export type ResolveLabelsOptions = {
  viewport: {
    width: number;
    height: number;
  };
  viewportPadding?: number;
  reservedRects?: readonly ScreenRect[];
  level?: "world" | "country" | "metro";
  /** Applied only when level is world. */
  worldLabelLimit?: number;
  markerRadius?: number;
  gap?: number;
  averageCharacterWidth?: number;
  labelHeight?: number;
  horizontalPadding?: number;
  /** Extra space between accepted labels. Does not move the stored rectangle. */
  collisionPadding?: number;
};

const PLACEMENT_ORDER: readonly LabelPlacement[] = [
  "below",
  "above",
  "right",
  "left",
];

const PRIORITY_RANK: Readonly<Record<LabelPriority, number>> = {
  selected: 0,
  "current-home": 1,
  "past-lived": 2,
  "hovered-or-focused": 3,
  "featured-hub": 4,
  "significant-destination": 5,
  minor: 6,
};

function flag(candidate: LabelCandidate, name: keyof LabelFlags): boolean {
  return Boolean(candidate[name] ?? candidate.flags?.[name]);
}

export function labelPriority(candidate: LabelCandidate): LabelPriority {
  if (flag(candidate, "selected")) return "selected";
  if (flag(candidate, "currentHome")) return "current-home";
  if (flag(candidate, "pastLived")) return "past-lived";
  if (flag(candidate, "hovered") || flag(candidate, "focused")) {
    return "hovered-or-focused";
  }
  if (flag(candidate, "featuredHub")) return "featured-hub";
  if (flag(candidate, "significantDestination")) {
    return "significant-destination";
  }
  return "minor";
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function stableCandidateId(candidate: LabelCandidate): string {
  return candidate.canonicalId ?? candidate.id;
}

/**
 * Exact priority order: selected, current home, past lived,
 * hovered/focused, featured hub, significant destination, minor.
 */
export function compareLabelCandidates(
  left: LabelCandidate,
  right: LabelCandidate,
): number {
  return (
    PRIORITY_RANK[labelPriority(left)] - PRIORITY_RANK[labelPriority(right)] ||
    compareText(stableCandidateId(left), stableCandidateId(right)) ||
    compareText(left.id, right.id)
  );
}

function positiveFinite(value: number | undefined): number | null {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function estimateLabelDimensions(
  candidate: Pick<
    LabelCandidate,
    | "name"
    | "dimensions"
    | "width"
    | "height"
    | "estimatedWidth"
    | "estimatedHeight"
  >,
  options: Pick<
    ResolveLabelsOptions,
    "averageCharacterWidth" | "labelHeight" | "horizontalPadding"
  > = {},
): LabelDimensions {
  const suppliedWidth =
    positiveFinite(candidate.dimensions?.width) ??
    positiveFinite(candidate.width) ??
    positiveFinite(candidate.estimatedWidth);
  const suppliedHeight =
    positiveFinite(candidate.dimensions?.height) ??
    positiveFinite(candidate.height) ??
    positiveFinite(candidate.estimatedHeight);
  const averageCharacterWidth = options.averageCharacterWidth ?? 7;
  const horizontalPadding = options.horizontalPadding ?? 6;

  return {
    width:
      suppliedWidth ??
      Math.max(
        1,
        Array.from(candidate.name).length * averageCharacterWidth +
          horizontalPadding * 2,
      ),
    height: suppliedHeight ?? options.labelHeight ?? 20,
  };
}

function placementRect(
  placement: LabelPlacement,
  point: ScreenPoint,
  dimensions: LabelDimensions,
  offset: number,
): ScreenRect {
  switch (placement) {
    case "below":
      return {
        x: point.x - dimensions.width / 2,
        y: point.y + offset,
        ...dimensions,
      };
    case "above":
      return {
        x: point.x - dimensions.width / 2,
        y: point.y - offset - dimensions.height,
        ...dimensions,
      };
    case "right":
      return {
        x: point.x + offset,
        y: point.y - dimensions.height / 2,
        ...dimensions,
      };
    case "left":
      return {
        x: point.x - offset - dimensions.width,
        y: point.y - dimensions.height / 2,
        ...dimensions,
      };
  }
}

export function screenRectsIntersect(
  left: ScreenRect,
  right: ScreenRect,
): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function isRectInsideViewport(
  rect: ScreenRect,
  viewport: ResolveLabelsOptions["viewport"],
  padding = 0,
): boolean {
  return (
    rect.x >= padding &&
    rect.y >= padding &&
    rect.x + rect.width <= viewport.width - padding &&
    rect.y + rect.height <= viewport.height - padding
  );
}

function inflateRect(rect: ScreenRect, padding: number): ScreenRect {
  if (padding <= 0) return rect;
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function collides(
  rect: ScreenRect,
  accepted: readonly PlacedLabel[],
  reserved: readonly ScreenRect[],
  padding: number,
): boolean {
  const padded = inflateRect(rect, padding);
  return (
    accepted.some((label) =>
      screenRectsIntersect(padded, inflateRect(label.rect, padding)),
    ) ||
    reserved.some((reservedRect) =>
      screenRectsIntersect(padded, reservedRect),
    )
  );
}

/**
 * Greedily places labels in screen space without measuring rendered nodes.
 * Repeated calls with equal inputs always return equal ordering and geometry.
 */
export function resolveLabelCollisions(
  candidates: readonly LabelCandidate[],
  options: ResolveLabelsOptions,
): PlacedLabel[] {
  const accepted: PlacedLabel[] = [];
  const sorted = [...candidates].sort(compareLabelCandidates);
  const viewportPadding = Math.max(0, options.viewportPadding ?? 8);
  const collisionPadding = Math.max(0, options.collisionPadding ?? 2);
  const reserved = options.reservedRects ?? [];
  const worldLimit =
    options.level === "world" && options.worldLabelLimit !== undefined
      ? Math.max(0, Math.floor(options.worldLabelLimit))
      : Number.POSITIVE_INFINITY;

  for (const candidate of sorted) {
    if (accepted.length >= worldLimit) break;

    const dimensions = estimateLabelDimensions(candidate, options);
    const markerRadius = Math.max(
      0,
      candidate.markerRadius ?? options.markerRadius ?? 6,
    );
    const gap = Math.max(0, candidate.gap ?? options.gap ?? 6);
    const offset = markerRadius + gap;

    for (const placement of PLACEMENT_ORDER) {
      const rect = placementRect(
        placement,
        candidate.point,
        dimensions,
        offset,
      );
      if (
        !isRectInsideViewport(rect, options.viewport, viewportPadding) ||
        collides(rect, accepted, reserved, collisionPadding)
      ) {
        continue;
      }

      accepted.push({
        id: candidate.id,
        canonicalId: stableCandidateId(candidate),
        name: candidate.name,
        placement,
        rect,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        priority: labelPriority(candidate),
      });
      break;
    }
  }

  return accepted;
}

export const placeLabels = resolveLabelCollisions;
export const resolveMapLabels = resolveLabelCollisions;
