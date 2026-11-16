"use client";

import {useEffect, useRef, useState, type ReactNode} from "react";
import Link from "next/link";
import {Icon, type IconName} from "./Icons";

type NavLink = {label: string; href: string; icon: IconName; active?: boolean};
const studentLinks: NavLink[] = [
  {label: "Home", href: "/", icon: "home"},
  {label: "Explore materials", href: "/#materials", icon: "search"},
  {label: "Continue reading", href: "/reader", icon: "book"},
  {label: "Saved materials", href: "/#saved", icon: "bookmark"},
  {label: "Premium credits", href: "/#premium", icon: "lock"}
];
const adminLinks: NavLink[] = [
  {label: "Dashboard", href: "/admin", icon: "dashboard"},
  {label: "Materials", href: "/admin#materials", icon: "materials"},
  {label: "Uploads", href: "/admin#upload", icon: "upload"},
  {label: "Categories", href: "/admin#categories", icon: "folder"},
  {label: "Analytics", href: "/admin#analytics", icon: "chart"}
];

function NavItem({item, selected, close}: {item: NavLink; selected: boolean; close: () => void}) {
  return <Link href={item.href} className={`nav-link ${selected ? "is-active" : ""}`} aria-current={selected ? "page" : undefined} onClick={close}>
    <Icon name={item.icon} size={19} className="animated-nav-icon" /><span>{item.label}</span>
  </Link>;
}

export function AppShell({children, area = "student", current = "home", title = "E-Library"}: {children: ReactNode; area?: "student" | "admin"; current?: string; title?: string}) {
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previouslyOpen = useRef(false);
  const closeNav = () => setNavOpen(false);
  useEffect(() => {
    if (!navOpen) return;
    const keyHandler = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {setNavOpen(false); return;}
      if (ev.key === "Tab") {
        const focusables = Array.from(navRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') ?? []);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (ev.shiftKey && document.activeElement === first) {ev.preventDefault(); last.focus();}
        else if (!ev.shiftKey && document.activeElement === last) {ev.preventDefault(); first.focus();}
      }
    };
    document.addEventListener("keydown", keyHandler);
    const media = window.matchMedia("(min-width: 801px)");
    const mediaHandler = () => {if (media.matches) setNavOpen(false);};
    media.addEventListener("change", mediaHandler);
    const firstLink = navRef.current?.querySelector<HTMLAnchorElement>("a.nav-link");
    firstLink?.focus();
    return () => {document.removeEventListener("keydown", keyHandler); media.removeEventListener("change", mediaHandler);};
  }, [navOpen]);
  useEffect(() => {
    if (previouslyOpen.current && !navOpen) triggerRef.current?.focus();
    previouslyOpen.current = navOpen;
  }, [navOpen]);
  const links = area === "admin" ? adminLinks : studentLinks;
  return <div className="app-frame">
    <a className="skip-link" href="#page-main">Skip to main content</a>
    {navOpen && <button type="button" className="mobile-scrim" aria-label="Close navigation menu" onClick={closeNav} />}
    <aside id="oys-sidebar" ref={navRef} className={`app-sidebar ${navOpen ? "nav-open" : ""}`} aria-label={`${area === "admin" ? "Admin" : "Student"} navigation`}>
      <Link className="brand" href={area === "admin" ? "/admin" : "/"} onClick={closeNav} aria-label="OYS E-Library home"><span className="brand-symbol" aria-hidden="true">O</span><span><strong>OYS</strong><small>E-Library</small></span></Link>
      <span className="sidebar-caption">{area === "admin" ? "MANAGEMENT" : "YOUR WORKSPACE"}</span>
      <nav className="nav-list" aria-label="Main navigation">
        {links.map(item => <NavItem key={item.label} item={item} selected={item.label.toLowerCase().replaceAll(" ", "") === current.toLowerCase().replaceAll(" ", "")} close={closeNav} />)}
      </nav>
      {area === "student" && <div className="sidebar-context"><span className="sidebar-caption">LEARNING SECTORS</span><div className="sidebar-sector-list">{["Engineering", "IT", "Private Jobs", "Government Jobs"].map(name => <Link key={name} href={`/?sector=${encodeURIComponent(name)}#sectors`} onClick={closeNav} aria-label={`Browse ${name} sector`}>{name}</Link>)}</div></div>}
      <div className="sidebar-bottom"><span className="sidebar-bottom-dot" /> OYS learning workspace<br /><span>Demo environment</span></div>
    </aside>
    <div className="app-main" inert={navOpen}>
      <header className="app-topbar">
        <div className="topbar-start"><button type="button" ref={triggerRef} className="mobile-nav-trigger icon-button" aria-label={navOpen ? "Close navigation" : "Open navigation"} aria-expanded={navOpen} aria-controls="oys-sidebar" onClick={() => setNavOpen(v => !v)}><Icon name={navOpen ? "close" : "menu"} /></button><div className="breadcrumbs"><span>OYS</span><span className="breadcrumb-divider">/</span><strong>{title}</strong></div></div>
        <div className="topbar-end"><span className="preview-status" role="status">Demo workspace · example data</span><nav className="preview-links" aria-label="Preview screens"><Link className={area === "student" && current !== "Continue reading" ? "selected" : ""} href="/">Student</Link><Link className={current === "Continue reading" ? "selected" : ""} href="/reader">Reader</Link><Link className={area === "admin" ? "selected" : ""} href="/admin">Admin</Link></nav><div className="account-bubble" role="img" aria-label="Sample account avatar">OS</div></div>
      </header>
      <main id="page-main" className="page-container">{children}</main>
    </div>
  </div>;
}
