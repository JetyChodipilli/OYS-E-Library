"use client";

import {useEffect, useRef, useState, type FormEvent} from "react";
import {AppShell} from "./AppShell";
import {Icon} from "./Icons";
import {adminRows, materials, sectors, type Sector} from "./sampleData";
import {paginate} from "../lib/cataloguePagination";

// Preview metrics are derived from the fixture catalogue, not invented live traffic.
const kpis = [
  {label: "Published (demo)", value: String(adminRows.filter(r => r.status === "Published").length), subtitle: "Example catalogue", icon: "book" as const},
  {label: "In review (demo)", value: String(adminRows.filter(r => r.status === "In review").length), subtitle: "Waiting for approval", icon: "clock" as const},
  {label: "Drafts (demo)", value: String(adminRows.filter(r => r.status === "Draft").length), subtitle: "Not published", icon: "file" as const},
  {label: "Reader analytics", value: "—", subtitle: "Connect OYS analytics", icon: "users" as const}
];

export function AdminDashboard() {
  const [query, setQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [access, setAccess] = useState<"Free" | "Premium">("Free");
  const [sector, setSector] = useState<string>("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [subject, setSubject] = useState("");
  const [categorySector, setCategorySector] = useState<Sector>("IT");
  const [adminPage, setAdminPage] = useState(0);
  const [adminPageSize, setAdminPageSize] = useState(12);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [coverFile, setCoverFile] = useState("");
  const [notice, setNotice] = useState("");
  const uploadRef = useRef<HTMLDialogElement>(null);
  const matches = adminRows.filter(row => `${row.title} ${row.subject} ${row.category} ${row.sector} ${row.status}`.toLowerCase().includes(query.trim().toLowerCase()));
  const adminResult = paginate(matches, adminPage, adminPageSize);
  const unique = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  const sectorSamples = materials.filter(m => m.sector === sector);
  const availableCategories = unique(sectorSamples.map(m => m.category));
  const availableSubcategories = unique(sectorSamples.filter(m => m.category === category).flatMap(m => m.subcategory ? [m.subcategory] : []));
  const availableSubjects = unique(sectorSamples.filter(m => m.category === category && (!subcategory || m.subcategory === subcategory)).map(m => m.subject));
  const categorySamples = materials.filter(m => m.sector === categorySector);
  const categoryGroups = unique(categorySamples.map(m => m.category)).map(name => ({name, count: categorySamples.filter(m => m.category === name).length, subs: unique(categorySamples.filter(m => m.category === name).flatMap(m => m.subcategory ? [m.subcategory] : []))}));
  useEffect(() => {
    const onHash = () => {if (location.hash === "#upload") setUploadOpen(true);};
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    const dlg = uploadRef.current;
    if (!dlg) return;
    if (uploadOpen && !dlg.open) dlg.showModal();
    if (!uploadOpen && dlg.open) dlg.close();
  }, [uploadOpen]);
  const closeUpload = () => {setUploadOpen(false); setNotice("");};
  const previewSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(`Form preview complete: ${title || "Untitled material"} (${access}). No data or files were uploaded. Production publishing requires authenticated backend APIs, document scanning and Super Admin authorization.`);
  };
  return <AppShell area="admin" current="Dashboard" title="Super Admin">
    <div className="page-heading admin-heading"><div><div className="overline">CONTENT MANAGEMENT</div><h1>Library overview</h1><p>Manage materials, publishing and student engagement.</p></div><button type="button" className="button button-primary" onClick={() => setUploadOpen(true)}><Icon name="plus" size={17} /> Add material</button></div>
    <section className="kpi-grid" aria-label="Library key performance indicators">{kpis.map(k => <div className="surface-card kpi-card" key={k.label}><div className="kpi-label"><span>{k.label}</span><Icon name={k.icon} size={20} /></div><strong>{k.value}</strong><p>{k.subtitle}</p></div>)}</section>
    <section id="analytics" className="admin-overview-grid" aria-label="Activity and review queues">
      <div className="surface-card analytics-card"><div className="card-heading"><div><h2>Reading engagement</h2><p>Real usage metrics will appear after OYS analytics integration</p></div></div><div className="analytics-empty"><span className="analytics-empty-icon"><Icon name="chart" size={24} /></span><strong>Analytics connection required</strong><p>Sessions, verified completions and Premium redemptions will be reported here once live data is available.</p></div></div>
      <div className="surface-card queue-card"><div className="card-heading"><div><h2>Publishing queue</h2><p>Recent material activity</p></div><span className="queue-count">Review queue</span></div><div className="queue-list"><div><span className="queue-icon"><Icon name="file" size={17} /></span><span><strong>Advanced Java</strong><small>TOC and page eligibility review</small></span><span className="status-pill review">In review</span></div><div><span className="queue-icon"><Icon name="file" size={17} /></span><span><strong>Electronic Circuits</strong><small>Metadata is not yet published</small></span><span className="status-pill draft">Draft</span></div><div><span className="queue-icon"><Icon name="check-circle" size={17} /></span><span><strong>Java Fundamentals</strong><small>Available in published catalogue</small></span><span className="status-pill published">Published</span></div></div></div>
    </section>
    <section id="categories" className="content-section" aria-labelledby="admin-categories-title"><div className="section-heading"><div><h2 id="admin-categories-title">Category &amp; subcategory structure</h2><p>Organize large sector libraries without creating duplicate materials</p></div><label className="sort-control"><span>Sector</span><select aria-label="Preview categories by sector" value={categorySector} onChange={e => setCategorySector(e.target.value as Sector)}>{sectors.map(s => <option key={s}>{s}</option>)}</select></label></div>
      <div className="category-admin-grid">{categoryGroups.map(group => <div className="surface-card category-admin-card" key={group.name}><div className="category-admin-header"><strong>{group.name}</strong><span>{group.count} demo materials</span></div><div className="category-admin-subs">{group.subs.length ? group.subs.map(sub => <span key={sub}>{sub}</span>) : <span>Direct subjects · no subcategory required</span>}</div></div>)}</div>
      <p className="category-admin-note">Category management APIs now exist for authenticated Super Admins. This public sample Admin screen does not issue write requests or publish content.</p>
    </section>
    <section id="materials" className="content-section" aria-labelledby="admin-materials-title"><div className="section-heading"><div><h2 id="admin-materials-title">Recent materials</h2><p>Manage publishing and review material details</p></div><span className="result-caption">{matches.length} records shown</span></div>
      <div className="admin-search-row"><label className="input-search"><Icon name="search" size={18} /><span className="sr-only">Search admin materials</span><input type="search" placeholder="Search by material, subject or status…" value={query} onChange={e => {setQuery(e.target.value); setAdminPage(0);}} /></label><button type="button" className="button button-secondary" onClick={() => setUploadOpen(true)}><Icon name="plus" size={16} /> New material</button></div>
      <div className="surface-card table-card"><div className="table-scroll"><table className="materials-table"><caption className="sr-only">Illustrative material publishing records</caption><thead><tr><th scope="col">Material</th><th scope="col">Sector</th><th scope="col">Access</th><th scope="col">Status</th><th scope="col">Updated</th></tr></thead><tbody>{adminResult.content.map(item => <tr key={item.id}><td><strong>{item.title}</strong><span>{item.subject}</span></td><td>{item.sector}</td><td>{item.type}</td><td><span className={`status-pill ${item.status === "Published" ? "published" : item.status === "Draft" ? "draft" : "review"}`}>{item.status}</span></td><td>{item.date}</td></tr>)}</tbody></table>{matches.length === 0 && <div className="table-empty">No materials match your search.</div>}</div></div>
      <div className="pagination-bar" role="navigation" aria-label="Admin material pages"><span className="pagination-summary">{matches.length ? `${adminResult.page * adminResult.size + 1}–${Math.min((adminResult.page + 1) * adminResult.size, matches.length)} of ${matches.length}` : "0 materials"}</span><label className="page-size-label">Per page<select value={adminPageSize} onChange={e => {setAdminPageSize(Number(e.target.value)); setAdminPage(0);}}>{[12, 24, 48].map(n => <option key={n}>{n}</option>)}</select></label><div className="page-buttons"><button className="button button-secondary" type="button" disabled={!adminResult.hasPrevious} onClick={() => setAdminPage(adminResult.page - 1)}><Icon name="chevron-left" size={16} /> Previous</button><span>Page {adminResult.page + 1} of {adminResult.totalPages}</span><button className="button button-secondary" type="button" disabled={!adminResult.hasNext} onClick={() => setAdminPage(adminResult.page + 1)}>Next <Icon name="chevron-right" size={16} /></button></div></div>
    </section>
    <p className="preview-disclaimer">All records and counts shown here are demo fixtures. Upload, publishing, audit logs and analytics APIs require secure backend integration; this preview does not change OYS data.</p>

    <dialog ref={uploadRef} className="upload-dialog" aria-labelledby="upload-dialog-title" onClose={closeUpload} onClick={event => {if (event.target === uploadRef.current) closeUpload();}}><div className="dialog-inner"><div className="dialog-top"><div><div className="overline">SUPER ADMIN · CONTENT UPLOAD</div><h2 id="upload-dialog-title">Create new material</h2></div><button type="button" className="icon-button" aria-label="Close upload form" onClick={closeUpload}><Icon name="close" /></button></div><div className="upload-steps" aria-label="Upload process preview"><span className="step-active">1. Material details</span><span>2. Process document</span><span>3. TOC review</span><span>4. Publish</span></div>
      <form className="upload-form" onSubmit={previewSubmit}><div className="form-columns"><label>Sector <span aria-hidden="true">*</span><select value={sector} required onChange={event => {setSector(event.target.value); setCategory(""); setSubcategory(""); setSubject("");}}><option value="">Select sector</option>{sectors.map(s => <option key={s}>{s}</option>)}</select></label><label>Category <span aria-hidden="true">*</span><select value={category} required disabled={!sector} onChange={event => {setCategory(event.target.value); setSubcategory(""); setSubject("");}}><option value="">Select category</option>{availableCategories.map(c => <option key={c}>{c}</option>)}</select></label></div><div className="form-columns"><label>Subcategory (optional)<select value={subcategory} disabled={!availableSubcategories.length} onChange={event => {setSubcategory(event.target.value); setSubject("");}}><option value="">No specific subcategory</option>{availableSubcategories.map(c => <option key={c}>{c}</option>)}</select></label><label>Subject <span aria-hidden="true">*</span><select required value={subject} disabled={!category} onChange={event => setSubject(event.target.value)}><option value="">Select subject</option>{availableSubjects.map(c => <option key={c}>{c}</option>)}</select></label></div><label>Material title <span aria-hidden="true">*</span><input type="text" required value={title} maxLength={160} onChange={event => setTitle(event.target.value)} placeholder="e.g., Java Fundamentals" /></label><label>Description <span aria-hidden="true">*</span><textarea required value={description} maxLength={1000} rows={3} onChange={event => setDescription(event.target.value)} placeholder="Briefly describe what students will learn…" /></label><fieldset className="access-field"><legend>Access type <span aria-hidden="true">*</span></legend><label><input type="radio" name="access" checked={access === "Free"} onChange={() => setAccess("Free")} /> Free</label><label><input type="radio" name="access" checked={access === "Premium"} onChange={() => setAccess("Premium")} /> Premium</label></fieldset><div className="form-columns"><label>Static cover image (PNG, JPG, WebP)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setCoverFile(event.target.files?.[0]?.name || "")} />{coverFile && <small>Selected: {coverFile}</small>}</label><label>Material file (PDF or DOCX)<input type="file" required accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => setSelectedFile(event.target.files?.[0]?.name || "")} />{selectedFile && <small>Selected: {selectedFile}</small>}</label></div><p className="form-help"><Icon name="info" size={16} /> Local preview only. No file is uploaded or stored. Actual publishing requires server-side file validation, malware scanning, TOC approval and college visibility controls.</p>{notice && <div className="form-notice" role="status">{notice}</div>}<div className="dialog-actions"><button className="button button-secondary" type="button" onClick={closeUpload}>Cancel</button><button className="button button-primary" type="submit">Preview material details <Icon name="arrow-right" size={16} /></button></div></form>
    </div></dialog>
  </AppShell>;
}
