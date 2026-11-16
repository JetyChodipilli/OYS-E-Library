import type {ReactNode} from "react";

export type IconName =
  | "home" | "search" | "book" | "bookmark" | "lock" | "folder" | "dashboard"
  | "materials" | "upload" | "chart" | "history" | "menu" | "close" | "arrow-right"
  | "arrow-left" | "chevron-right" | "chevron-left" | "check" | "filter" | "bell"
  | "users" | "check-circle" | "clock" | "layers" | "plus" | "external" | "info"
  | "graduation" | "code" | "briefcase" | "landmark" | "zoom-in" | "zoom-out"
  | "eye" | "file" | "more" | "refresh" | "bookmark-filled";

const artwork: Record<IconName, ReactNode> = {
  home: <><path className="icon-anim-roof" d="m3 10 9-7 9 7" /><path d="M5.5 9.5V20h13V9.5M10 20v-7h4v7" /></>,
  search: <><circle cx="10.6" cy="10.5" r="6.3" /><path className="icon-anim-handle" d="m15.3 15.3 5.2 5.2" /></>,
  book: <><path d="M12 6c-3-2-6-2-10-1v14c4-1 7-1 10 1V6Z" /><path className="icon-anim-page" d="M12 6c3-2 6-2 10-1v14c-4-1-7-1-10 1V6Z" /></>,
  bookmark: <path className="icon-anim-bookmark" d="M6 3.5h12v17L12 17l-6 3.5v-17Z" />,
  "bookmark-filled": <path d="M6 3.5h12v17L12 17l-6 3.5v-17Z" fill="currentColor" stroke="currentColor" />,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path className="icon-anim-shackle" d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  folder: <><path className="icon-anim-folder" d="M3 8V6a2 2 0 0 1 2-2h4l3 3h7a2 2 0 0 1 2 2" /><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" /></>,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  materials: <><path d="M6 3h9l4 4v14H6V3Z" /><path d="M15 3v5h4M9 12h7M9 16h7" /></>,
  upload: <><path d="M12 16V3m0 0L7 8m5-5 5 5" className="icon-anim-upload" /><path d="M4 17v4h16v-4" /></>,
  chart: <><path d="M4 20V12M9 20V5M14 20v-8M19 20V9" /><path d="M2 21h20" /></>,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l4 2" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  close: <><path d="M5 5 19 19M19 5 5 19" /></>,
  "arrow-right": <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
  "arrow-left": <><path d="M20 12H4m6-6-6 6 6 6" /></>,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  "chevron-left": <path d="m15 5-7 7 7 7" />,
  check: <path d="m4 12 5 5L20 6" />,
  filter: <><path d="M4 7h16M7 12h10M10 17h4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9ZM10 21h4" /></>,
  users: <><circle cx="9" cy="8" r="4" /><path d="M2 21v-3a7 7 0 0 1 14 0v3M18 5a4 4 0 0 1 0 8M17 15a6 6 0 0 1 5 6" /></>,
  "check-circle": <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  external: <><path d="M13 4h7v7M20 4l-9 9" /><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  graduation: <><path d="m2 9 10-5 10 5-10 5L2 9ZM6 12v6c3 2 9 2 12 0v-6M22 10v7" /></>,
  code: <><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M9 7V4h6v3M3 13h18M10 13v2h4v-2" /></>,
  landmark: <><path d="m2 10 10-6 10 6H2ZM4 20h16M2 22h20M6 10v10M10 10v10M14 10v10M18 10v10" /></>,
  "zoom-in": <><circle cx="10" cy="10" r="7" /><path d="M10 7v6M7 10h6m2 5 6 6" /></>,
  "zoom-out": <><circle cx="10" cy="10" r="7" /><path d="M7 10h6m2 5 6 6" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  file: <><path d="M6 2h9l4 4v16H6V2ZM15 2v5h4" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
  refresh: <><path d="M20 8a8 8 0 0 0-14-2L4 9m0-5v5h5M4 16a8 8 0 0 0 14 2l2-3m0 5v-5h-5" /></>
};

export function Icon({name, size = 19, className = ""}: {name: IconName; size?: number; className?: string}) {
  return <svg className={`ui-icon ${className}`} aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{artwork[name]}</svg>;
}
