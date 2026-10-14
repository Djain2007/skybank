type Tone = "success" | "error" | "warning" | "neutral" | "crypto";

const toneFor: Record<string, Tone> = {
  COMPLETED: "success",
  SUCCESS: "success",
  FAILED: "error",
  FAILURE: "error",
};

const labelFor: Record<string, string> = {
  COMPLETED: "Completed",
  SUCCESS: "Success",
  FAILED: "Failed",
  FAILURE: "Failure",
};

/**
 * Renders a status value from the API as a quiet dot badge.
 * Unknown values fall back to a neutral badge with the raw text.
 */
export default function StatusBadge({ status, tone }: { status: string; tone?: Tone }) {
  const resolved = tone ?? toneFor[status] ?? "neutral";
  return <span className={`badge badge-${resolved}`}>{labelFor[status] ?? status}</span>;
}
