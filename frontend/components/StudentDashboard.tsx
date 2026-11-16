"use client";

import Link from "next/link";
import {useEffect, useMemo, useRef, useState} from "react";
import {AppShell} from "./AppShell";
import {Icon, type IconName} from "./Icons";
import {MaterialCover} from "./MaterialCover";
import {materials, sectors, type Material, type Sector} from "./sampleData";
import {filterAndSortMaterials, paginate, type AccessFilter, type SortMode} from "../lib/cataloguePagination";

const filters: AccessFilter[] = ["All Materials", "Free", "Premium", "Trending", "Saved"];
const sectorIcons: Record<Sector, IconName> = {"Engineering": "graduation", "IT": "code", "Private Jobs": "briefcase", "Government Jobs": "landmark"};
const unique = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));

export function StudentDashboard() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccessFilter>("All Materials");
  const [sector, setSector] = useState<"All sectors" | Sector>("All sectors");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [subject, setSubject] = useState("");
  const [sort, setSort] = useState<SortMode>("RECENT");
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(0);
  const [saved, setSaved] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<Material | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Allow the sidebar to open a specific sector without trusting arbitrary query values.
  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("sector");
    if (selected && sectors.some(name => name === selected)) {
      setSector(selected as Sector);
      setPage(0);
    }
  }, []);

  const sectorItems = useMemo(() => sector === "All sectors" ? materials : materials.filter(m => m.sector === sector), [sector]);
  const categories = useMemo(() => sector === "All sectors" ? [] : unique(sectorItems.map(m => m.category)), [sector, sectorItems]);
  const categoryItems = useMemo(() => category ? sectorItems.filter(m => m.category === category) : sectorItems, [category, sectorItems]);
  const subcategories = useMemo(() => unique(categoryItems.flatMap(m => m.subcategory ? [m.subcategory] : [])), [categoryItems]);
  const subjectItems = useMemo(() => subcategory ? categoryItems.filter(m => m.subcategory === subcategory) : categoryItems, [subcategory, categoryItems]);
  const subjects = useMemo(() => sector === "All sectors" ? [] : unique(subjectItems.map(m => m.subject)), [sector, subjectItems]);
  const filtered = useMemo(() => filterAndSortMaterials(materials, {query, access: filter, sector, category, subcategory, subject, sort, savedIds: saved}), [query, filter, sector, category, subcategory, subject, sort, saved]);
  const result = useMemo(() => paginate(filtered, page, pageSize), [filtered, page, pageSize]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);
  const chooseSector = (value: "All sectors" | Sector) => {
    setSector(value); setCategory(""); setSubcategory(""); setSubject(""); setPage(0);
  };
  const chooseCategory = (value: string) => {setCategory(value); setSubcategory(""); setSubject(""); setPage(0);};
  const chooseSubcategory = (value: string) => {setSubcategory(value); setSubject(""); setPage(0);};
  const toggleSaved = (id: string) => setSaved(old => {const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next;});
  const reset = () => {setQuery(""); setFilter("All Materials"); chooseSector("All sectors"); setSort("RECENT");};
  const changePage = (next: number) => {setPage(next); document.getElementById("materials")?.scrollIntoView({block: "start", behavior: "auto"});};

  return <AppShell area="student" current="Home" title="E-Library">
    <div className="page-heading"><div><div className="overline">STUDENT LIBRARY</div><h1>Your learning library</h1><p>Browse by sector, category and subject to find the right material.</p></div></div>
    <section className="welcome-cards" aria-label="Learning overview">
      <div className="surface-card continue-card" id="continue"><div className="continue-cover" aria-hidden="true"><span>OYS · IT</span><strong>Java<br />101</strong><span>FOUNDATIONS</span></div><div className="continue-detail"><div className="overline">CONTINUE READING</div><h2>Java Fundamentals</h2><p>Variables and data types · Page 16 of 42</p><div className="progress-line"><div className="meter" role="progressbar" aria-valuenow={33} aria-valuemin={0} aria-valuemax={100} aria-label="Sample reading progress"><span style={{width: "33%"}} /></div><strong>33%</strong></div><Link className="button button-primary" href="/reader">Reader preview <Icon name="arrow-right" size={16} /></Link></div></div>
      <div className="surface-card credit-card" id="premium"><div className="credit-head"><div className="overline">PREMIUM UNLOCK PROGRESS</div><Icon name="lock" size={22} /></div><div className="credit-value">2 <span>/ 3 Free materials</span></div><p>Complete one more Free material to earn your next Premium unlock credit.</p><span className="credit-note">0 available credits · Illustrative values</span></div>
    </section>

    <section id="sectors" className="content-section" aria-labelledby="sector-heading">
      <div className="section-heading"><div><h2 id="sector-heading">Browse by sector</h2><p>Start with your learning or career pathway</p></div><button className="text-action" onClick={() => chooseSector("All sectors")}>All sectors <Icon name="arrow-right" size={15} /></button></div>
      <div className="sector-grid">{sectors.map(name => <button key={name} type="button" className={`surface-card sector-card ${sector === name ? "sector-selected" : ""}`} aria-pressed={sector === name} onClick={() => {chooseSector(name); document.getElementById("category-heading")?.scrollIntoView({block: "center"});}}><span className="sector-icon"><Icon name={sectorIcons[name]} size={22} /></span><strong>{name}</strong><span className="sector-caption">{name === "Engineering" ? "Core engineering" : name === "IT" ? "Programming & technology" : name === "Private Jobs" ? "Placement preparation" : "Competitive examinations"}</span></button>)}</div>
    </section>

    {sector !== "All sectors" && <section className="content-section taxonomy-section" aria-labelledby="category-heading">
      <div className="section-heading"><div><h2 id="category-heading">Browse by category</h2><p>{`Categories in ${sector}`}</p></div><span className="result-caption">{categories.length} categories</span></div>

      <div className="category-chip-grid" role="group" aria-label="Choose content category"><button type="button" className={`category-chip ${!category ? "is-selected" : ""}`} aria-pressed={!category} onClick={() => chooseCategory("")}>All categories</button>{categories.map(name => <button type="button" key={name} className={`category-chip ${category === name ? "is-selected" : ""}`} aria-pressed={category === name} onClick={() => {chooseCategory(name); document.getElementById("materials")?.scrollIntoView({block: "start"});}}>{name}<span>{sectorItems.filter(m => m.category === name).length}</span></button>)}</div>
    </section>}

    <section id="materials" className="content-section" aria-labelledby="materials-title">
      <div className="section-heading"><div><h2 id="materials-title">Explore materials</h2><p>Filter by category, subcategory, subject or access type</p></div><span className="result-caption" role="status" aria-live="polite">{filtered.length} sample materials</span></div>
      <nav className="catalogue-breadcrumbs" aria-label="Selected content path"><button type="button" onClick={reset}>E-Library</button><Icon name="chevron-right" size={13} /><span>{sector === "All sectors" ? "All sectors" : sector}</span>{category && <><Icon name="chevron-right" size={13} /><span>{category}</span></>}{subcategory && <><Icon name="chevron-right" size={13} /><span>{subcategory}</span></>}{subject && <><Icon name="chevron-right" size={13} /><span>{subject}</span></>}</nav>
      <label className="input-search catalogue-search"><Icon name="search" size={18} /><span className="sr-only">Search materials</span><input type="search" value={query} maxLength={100} onChange={event => {setQuery(event.target.value); setPage(0);}} placeholder="Search material names, subjects or topics…" autoComplete="off" /></label>
      <div className="catalogue-filter-grid">
        <label>Sector<select value={sector} onChange={e => chooseSector(e.target.value as "All sectors" | Sector)}><option>All sectors</option>{sectors.map(n => <option key={n}>{n}</option>)}</select></label>
        <label>Category<select value={category} disabled={sector === "All sectors"} onChange={e => chooseCategory(e.target.value)}><option value="">All categories</option>{categories.map(n => <option key={n}>{n}</option>)}</select></label>
        <label>Subcategory<select value={subcategory} disabled={!subcategories.length} onChange={e => chooseSubcategory(e.target.value)}><option value="">All subcategories</option>{subcategories.map(n => <option key={n}>{n}</option>)}</select></label>
        <label>Subject<select value={subject} onChange={e => {setSubject(e.target.value); setPage(0);}}><option value="">All subjects</option>{subjects.map(n => <option key={n}>{n}</option>)}</select></label>
      </div>
      <div className="catalogue-results-toolbar"><div className="filter-tabs" role="group" aria-label="Filter materials by access or discovery status">{filters.map(value => <button type="button" aria-pressed={filter === value} className={filter === value ? "tab-selected" : ""} key={value} onClick={() => {setFilter(value); setPage(0);}}>{value}</button>)}</div><label className="sort-control"><span>Sort</span><select aria-label="Sort materials" value={sort} onChange={e => {setSort(e.target.value as SortMode); setPage(0);}}><option value="RECENT">Recently added</option><option value="UPDATED">Recently updated</option><option value="TITLE_ASC">Title A–Z</option><option value="TITLE_DESC">Title Z–A</option></select></label></div>
      {result.content.length > 0 ? <div className="materials-grid">{result.content.map(item => <article className="surface-card material-card" key={item.id}>
        <MaterialCover material={item} priority={item.id === "java"} />
        <div className="material-card-body"><div className="material-tags"><span>{item.category} · {item.subject}</span><span className={`access-pill ${item.access === "Premium" ? "premium" : "free"}`}>{item.access === "Premium" && <Icon name="lock" size={12} />} {item.access}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="material-foot"><div className="material-micro">{item.progress ? `${item.progress}% progress` : item.trending ? "Trending · Popular" : "Study resource"}</div><div className="card-actions"><button type="button" className="icon-button save-button" aria-label={`${saved.has(item.id) ? "Remove" : "Save"} ${item.title} ${saved.has(item.id) ? "from" : "to"} saved materials`} aria-pressed={saved.has(item.id)} title={saved.has(item.id) ? "Remove saved material" : "Save material (preview only)"} onClick={() => toggleSaved(item.id)}><Icon name={saved.has(item.id) ? "bookmark-filled" : "bookmark"} size={17} /></button><button className="card-open-button" type="button" onClick={() => setSelected(item)} aria-label={`View ${item.title} details`}><Icon name="arrow-right" size={17} /></button></div></div></div>
      </article>)}</div> : <div className="empty-panel surface-card"><Icon name="search" size={27} /><h3>No matching materials</h3><p>Try a different category or keyword.</p><button type="button" className="button button-secondary" onClick={reset}>Clear filters</button></div>}
      <div className="pagination-bar" role="navigation" aria-label="Material result pages"><div className="pagination-summary">{result.totalElements ? `${result.page * result.size + 1}–${Math.min((result.page + 1) * result.size, result.totalElements)} of ${result.totalElements}` : "0 materials"}</div><label className="page-size-label">Per page<select value={pageSize} onChange={e => {setPageSize(Number(e.target.value)); setPage(0);}}>{[12, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}</select></label><div className="page-buttons"><button type="button" className="button button-secondary" disabled={!result.hasPrevious} onClick={() => changePage(result.page - 1)}><Icon name="chevron-left" size={16} /> Previous</button><span aria-live="polite">Page {result.page + 1} of {result.totalPages}</span><button type="button" className="button button-secondary" disabled={!result.hasNext} onClick={() => changePage(result.page + 1)}>Next <Icon name="chevron-right" size={16} /></button></div></div>
    </section>

    <section id="saved" className="saved-summary" aria-label="Saved materials summary"><Icon name="bookmark" size={17} /><span><strong>Saved materials:</strong> {saved.size} selected in this preview. Saving to your account requires OYS backend integration.</span>{saved.size > 0 && <button type="button" onClick={() => {setFilter("Saved"); setPage(0); document.getElementById("materials")?.scrollIntoView({block: "start"});}}>View saved</button>}</section>
    <p className="preview-disclaimer">Local demonstration: search, category filters, and paging use sample data. Production REST catalogue pagination and college authorization are implemented separately in Spring Boot and still require live OYS identity integration.</p>
    <dialog ref={dialogRef} className="material-dialog" aria-labelledby="material-dialog-title" onClose={() => setSelected(null)} onClick={event => {if (event.target === dialogRef.current) setSelected(null);}}>{selected && <div className="dialog-inner"><div className="dialog-top"><span className="overline">MATERIAL OVERVIEW</span><button type="button" className="icon-button" aria-label="Close details" onClick={() => setSelected(null)}><Icon name="close" /></button></div><div className="dialog-cover"><MaterialCover material={selected} /></div><h2 id="material-dialog-title">{selected.title}</h2><p className="dialog-description">{selected.description}</p><div className="dialog-details"><span>{selected.sector}</span><span>{selected.category}</span>{selected.subcategory && <span>{selected.subcategory}</span>}<span>{selected.subject}</span><span>{selected.pages} pages</span><span>{selected.access}</span></div><div className="dialog-info"><Icon name="info" size={18} /><span>Preview only. Real document loading, college entitlement and progress persistence are not connected.</span></div><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setSelected(null)}>Close</button>{selected.id === "java" ? <Link className="button button-primary" href="/reader">Reader preview <Icon name="arrow-right" size={16} /></Link> : <span className="button button-disabled" aria-disabled="true">Reader not connected</span>}</div></div>}</dialog>
  </AppShell>;
}
