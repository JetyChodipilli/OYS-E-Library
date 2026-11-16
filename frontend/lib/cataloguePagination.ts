import type {Material, Sector} from "../components/sampleData";

export type AccessFilter = "All Materials" | "Free" | "Premium" | "Trending" | "Saved";
export type SortMode = "RECENT" | "UPDATED" | "TITLE_ASC" | "TITLE_DESC";
export type CatalogueFilters = {
  query: string; sector: "All sectors" | Sector; category: string; subcategory: string;
  subject: string; access: AccessFilter; sort: SortMode; savedIds: Set<string>;
};
const lower = (s: string) => s.trim().toLocaleLowerCase();
export function filterAndSortMaterials(rows: readonly Material[], f: CatalogueFilters): Material[] {
  const q = lower(f.query);
  const matches = rows.filter(m =>
    (f.sector === "All sectors" || m.sector === f.sector) &&
    (!f.category || m.category === f.category) &&
    (!f.subcategory || m.subcategory === f.subcategory) &&
    (!f.subject || m.subject === f.subject) &&
    (f.access === "All Materials" || (f.access === "Trending" ? m.trending :
      f.access === "Saved" ? f.savedIds.has(m.id) : m.access === f.access)) &&
    (!q || lower(`${m.title} ${m.description} ${m.sector} ${m.category} ${m.subcategory ?? ""} ${m.subject}`).includes(q))
  );
  const cmpTitle = (a: Material, b: Material) => a.title.localeCompare(b.title);
  return matches.sort((a, b) => {
    if (f.sort === "TITLE_ASC") return cmpTitle(a, b) || a.id.localeCompare(b.id);
    if (f.sort === "TITLE_DESC") return -cmpTitle(a, b) || a.id.localeCompare(b.id);
    const field = f.sort === "UPDATED" ? "updatedAt" : "addedAt";
    return b[field].localeCompare(a[field]) || a.id.localeCompare(b.id);
  });
}

export function paginate<T>(items: readonly T[], requestedPage: number, size: number) {
  if (!Number.isInteger(size) || size < 1 || size > 48) throw new RangeError("Page size must be 1–48");
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const page = Number.isFinite(requestedPage) ? Math.max(0, Math.min(Math.floor(requestedPage), totalPages - 1)) : 0;
  return {    
content: items.slice(page * size, (page + 1) * size), page, size, totalElements,
    totalPages, hasNext: page + 1 < totalPages, hasPrevious: page > 0  
};
}
