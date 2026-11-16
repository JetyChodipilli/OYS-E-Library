"use client";

import {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {AppShell} from "./AppShell";
import {Icon} from "./Icons";

const TOTAL_PAGES = 42;
const ELIGIBLE_FIRST = 5;
const ELIGIBLE_LAST = 40;
const ELIGIBLE_TOTAL = ELIGIBLE_LAST - ELIGIBLE_FIRST + 1;
const initialCompleted = Array.from({length: 12}, (_, i) => i + 5); // 5–16 inclusive, sample only
const chapters = [
  {title: "Introduction", page: 1},
  {title: "Getting started", page: 5},
  {title: "Java basics", page: 10},
  {title: "Variables & types", page: 16},
  {title: "Control flow", page: 22},
  {title: "Methods", page: 28},
  {title: "OOP concepts", page: 35},
  {title: "Summary", page: 40}
];
const chapterForPage = (page: number) => [...chapters].reverse().find(ch => page >= ch.page)?.title || "Introduction";

export function ReaderExperience() {
  const [page, setPage] = useState(16);
  const [completed, setCompleted] = useState<Set<number>>(new Set(initialCompleted));
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set([11]));
  const [panel, setPanel] = useState<"contents" | "bookmarks">("contents");
  const [seconds, setSeconds] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [toast, setToast] = useState("");
  const [active, setActive] = useState(true);
  const [lastMarked, setLastMarked] = useState(16);
  const eligible = page >= ELIGIBLE_FIRST && page <= ELIGIBLE_LAST;
  const marked = completed.has(page);
  const percent = Math.round((completed.size / ELIGIBLE_TOTAL) * 100);
  const title = useMemo(() => chapterForPage(page), [page]);
  useEffect(() => {
    const onVisibility = () => setActive(!document.hidden && document.hasFocus());
    const onBlur = () => setActive(false);
    const onFocus = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    onVisibility();
    return () => {document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("blur", onBlur); window.removeEventListener("focus", onFocus);};
  }, []);
  useEffect(() => {
    if (!active || !eligible || marked || seconds >= 8) return;
    const interval = window.setInterval(() => setSeconds(v => Math.min(v + 1, 8)), 1000);
    return () => window.clearInterval(interval);
  }, [active, eligible, marked, seconds, page]);
  const changePage = (next: number) => {
    setPage(Math.max(1, Math.min(TOTAL_PAGES, next)));
    setSeconds(0);
    setToast("");
  };
  const markRead = () => {
    if (!eligible || marked || seconds < 8) return;
    setCompleted(old => new Set([...old, page]));
    setLastMarked(page);
    setToast(`Page ${page} marked in this demo only. No progress was saved to OYS.`);
  };
  const toggleBookmark = () => setBookmarks(old => {const n = new Set(old); n.has(page) ? n.delete(page) : n.add(page); return n;});
  return <AppShell area="student" current="Continue reading" title="Document Reader">
    <div className="reader-heading"><div><Link className="back-link" href="/"><Icon name="arrow-left" size={17} /> Back to E-Library</Link><h1>Java Fundamentals</h1><p>IT / Java / {title} · Local interface demonstration</p></div><div className="reader-quickmeta"><span className="status-dot" /> Sample PDF · 42 pages</div></div>
    <div className="reading-layout">
      <aside className="surface-card toc-panel" aria-label="Document navigation">
        <div className="toc-tabs" role="group" aria-label="Reader panel"><button type="button" className={panel === "contents" ? "active" : ""} aria-pressed={panel === "contents"} onClick={() => setPanel("contents")}>Contents</button><button type="button" className={panel === "bookmarks" ? "active" : ""} aria-pressed={panel === "bookmarks"} onClick={() => setPanel("bookmarks")}>Bookmarks</button></div>
        {panel === "contents" ? <nav aria-label="Table of contents" className="toc-items">{chapters.map(ch => <button type="button" className={`toc-row ${ch.title === title ? "active" : ""}`} key={ch.page} aria-current={ch.title === title ? "location" : undefined} onClick={() => changePage(ch.page)}><span><Icon name={completed.has(ch.page) ? "check-circle" : "file"} size={15} /><span>{ch.title}</span></span><small>{ch.page}</small></button>)}</nav> : <div className="bookmark-items">{[...bookmarks].sort((a, b) => a - b).map(n => <button key={n} type="button" className="toc-row" onClick={() => changePage(n)}><span><Icon name="bookmark" size={15} /> Page {n}</span><small>Open</small></button>)}{bookmarks.size === 0 && <p className="panel-empty">No bookmarks in this preview.</p>}</div>}
        <div className="toc-meta"><Icon name="info" size={15} /> TOC destinations and bookmarks are examples; real PDF metadata will come from the backend.</div>
      </aside>
      <section className="surface-card reader-center" aria-label="Document viewer preview">
        <div className="reader-toolbar">
          <div className="toolbar-group"><button type="button" className="icon-button" aria-label="Previous page" disabled={page <= 1} onClick={() => changePage(page - 1)}><Icon name="chevron-left" /></button><span className="page-counter">Page <strong>{page}</strong> of {TOTAL_PAGES}</span><button type="button" className="icon-button" aria-label="Next page" disabled={page >= TOTAL_PAGES} onClick={() => changePage(page + 1)}><Icon name="chevron-right" /></button></div>
          <div className="toolbar-group"><button type="button" className="icon-button" disabled={zoom <= 80} aria-label="Zoom out" onClick={() => setZoom(z => Math.max(80, z - 10))}><Icon name="zoom-out" size={17} /></button><span className="zoom-value" aria-label="Zoom level">{zoom}%</span><button type="button" className="icon-button" disabled={zoom >= 120} aria-label="Zoom in" onClick={() => setZoom(z => Math.min(120, z + 10))}><Icon name="zoom-in" size={17} /></button><button type="button" className="icon-button bookmark-toolbar" aria-label={`${bookmarks.has(page) ? "Remove bookmark from" : "Bookmark"} page ${page}`} aria-pressed={bookmarks.has(page)} onClick={toggleBookmark}><Icon name={bookmarks.has(page) ? "bookmark-filled" : "bookmark"} size={18} /></button></div>
        </div>
        <div className="pdf-viewport"><div className="pdf-sheet" style={{fontSize: `${zoom}%`}}><div className="document-meta">OYS · LEARNING MATERIAL / JAVA</div><div className="document-rule" /><span className="document-chapter">CHAPTER {Math.max(1, chapters.findIndex(ch => ch.title === title) + 1).toString().padStart(2, "0")}</span><h2>{title}</h2><p>A variable stores a value that can be used by a program. In Java, each variable has a data type that describes the values it can hold.</p><p>Java provides primitive data types for simple values, and reference types for objects and arrays.</p><pre><code>{'int age = 21;\nString student = "OYS";\nboolean ready = true;'}</code></pre><p>Declare a variable by naming its type, then the variable, and optionally an initial value. The compiler uses type information to validate operations.</p><div className="document-note">Illustrative text for the UI prototype. This page is not loaded from an uploaded PDF.</div><span className="page-print-number">{page}</span></div></div>
        <div className="reader-actionbar"><div className="reading-hint"><Icon name={marked ? "check-circle" : "clock"} size={18} /><div><strong>{!eligible ? "Non-learning page" : marked ? "Already marked as read" : seconds >= 8 ? "Ready to mark as read" : `${8 - seconds} seconds of active viewing remaining`}</strong><span>{!eligible ? "This page is excluded from progress." : marked ? "This completion is a local preview record." : "An explicit confirmation is required for every eligible page."}</span></div></div><button type="button" className="button button-primary mark-button" onClick={markRead} disabled={!eligible || marked || seconds < 8}><Icon name="check" size={16} />{marked ? "Completed" : "Mark as Read"}</button></div>
      </section>
    </div>
    <div className="surface-card reader-progress-panel"><div><strong>Reading progress</strong><span>{completed.size} of {ELIGIBLE_TOTAL} eligible learning pages · last marked page {lastMarked}</span></div><div className="meter" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Demo reading progress"><span style={{width: `${percent}%`}} /></div><strong>{percent}%</strong></div>
    {toast && <div className="local-notice" role="status">{toast}</div>}
    <p className="preview-disclaimer">This is a PDF reader interface prototype. Timers and page markings are local demonstration state only and do not count toward real OYS progress, credits or entitlements.</p>
  </AppShell>;
}
