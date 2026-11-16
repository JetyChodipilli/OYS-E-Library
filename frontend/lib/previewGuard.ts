import "server-only";
import {notFound} from "next/navigation";
/** These routes are UI-only fixtures. Fail closed outside an explicit local preview. */
export function requireDemoPreview(): void {
  if (process.env.NODE_ENV !== "development" || process.env.OYS_PREVIEW_MODE !== "true") notFound();
}
