import { Badge } from "./ui.jsx";

const MAP = {
  sent: ["green", "Sent"],
  failed: ["red", "Failed"],
  pending: ["slate", "Sending…"],
  skipped_not_set_up: ["amber", "Not set up"],
  skipped_paused: ["amber", "Paused"],
};

export default function StatusBadge({ status, error }) {
  const [tone, label] = MAP[status] ?? ["slate", status];
  return <Badge tone={tone} title={error || undefined}>{label}</Badge>;
}
