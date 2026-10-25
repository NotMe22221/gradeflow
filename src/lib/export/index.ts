import { csvExporter } from "@/lib/export/csv";
import type { GradebookExporter } from "@/lib/export/types";

export type { ExportOptions, ExportResult, GradebookExporter } from "@/lib/export/types";

/**
 * Registered gradebook exporters, keyed by the `?format=` value on
 * GET /api/classes/[classId]/gradebook/export.
 *
 * To add a real LMS integration, implement GradebookExporter (see
 * ./types.ts), e.g. a `canvasExporter` in ./canvas.ts, and register it here.
 * The gradebook page renders one export button per registered exporter
 * (from listExporters()), and the route's teacher check, ownership check,
 * and published-only data apply to it automatically.
 */
const EXPORTERS: readonly GradebookExporter[] = [csvExporter];

const BY_ID = new Map(EXPORTERS.map((exporter) => [exporter.id, exporter]));

export const DEFAULT_EXPORT_FORMAT = csvExporter.id;

export function getExporter(id: string): GradebookExporter | null {
  return BY_ID.get(id.trim().toLowerCase()) ?? null;
}

/** Every registered exporter, default first. Drives the export UI and route errors. */
export function listExporters(): readonly GradebookExporter[] {
  return EXPORTERS;
}
