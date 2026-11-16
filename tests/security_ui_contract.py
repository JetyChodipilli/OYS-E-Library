"""Checks security and UI source contracts; NOT a substitute for integration/DAST testing."""
from pathlib import Path
import re, sys, json
import tinycss2
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:(ROOT/p).read_text()
sec=read('backend/src/main/java/com/oys/elibrary/security/SecurityConfiguration.java')
sectors=read('backend/src/main/java/com/oys/elibrary/catalog/CatalogueController.java')
mat=read('backend/src/main/java/com/oys/elibrary/catalog/MaterialCatalogueController.java')
tax=read('backend/src/main/java/com/oys/elibrary/catalog/TaxonomyController.java')
preview=read('frontend/lib/previewGuard.ts')
student=read('frontend/components/StudentDashboard.tsx')
admin=read('frontend/components/AdminDashboard.tsx')
app=read('frontend/components/AppShell.tsx')
css=read('frontend/app/globals.css')
v4=read('backend/src/main/resources/db/migration/V4__published_content_integrity.sql')
checks={
'critical_method_security_enabled':'@EnableMethodSecurity' in sec,
'admin_route_authorized_at_filter_chain':'"/api/v1/elibrary/admin/**").hasAuthority("ROLE_OYS_SUPER_ADMIN")' in sec,
'unknown_routes_denied':'.anyRequest().denyAll()' in sec,
'jwt_audience_validated':'JwtClaimValidator<Collection<String>>' in sec,
'jwt_issuer_validated':'JwtValidators.createDefaultWithIssuer' in sec,
'student_college_claim_required':'Verified college membership is required' in sectors+mat+tax,
'sector_list_is_college_scoped':'material_college_visibility' in sectors and 'EXISTS' in sectors,
'subject_list_can_include_subcategories':'c.parent_id=:categoryId' in tax,
'published_catalogue_scans_checked':"ra.scan_status='CLEAN'" in mat and "oa.scan_status='CLEAN'" in mat,
'sql_parameters_for_catalogue':'MapSqlParameterSource' in mat,
'pagination_size_capped':'@Max(48)' in mat,
'new_v4_is_additive':not bool(re.search(r'(?im)^\s*(DROP TABLE|TRUNCATE|DELETE FROM)\b',v4)),
'published_documents_are_frozen':'trg_immutable_published_pages' in v4 and 'trg_immutable_published_toc' in v4 and 'trg_immutable_published_version' in v4,
'asset_quarantine_archives_publications':'trg_archive_unsafe_asset' in v4,
'asset_metadata_frozen':'trg_clean_asset_immutable' in v4,
'published_asset_types_verified':'trg_clean_published_assets' in v4,
'preview_disabled_in_production':'NODE_ENV !== "development"' in preview and 'OYS_PREVIEW_MODE !== "true"' in preview,
'admin_preview_does_not_post':'fetch(' not in admin and 'Production publishing requires' in admin,
'admin_kpis_not_fabricated':'String(adminRows.filter' in admin and 'Connect OYS analytics' in admin,
'no_nonfunctional_analytics_date_control':'const [range, setRange]' not in admin,
'no_empty_taxonomy_section':'sector !== "All sectors"' in student,
'sidebar_sector_navigation_not_plain_text': 'encodeURIComponent(name)' in app,
'static_topic_thumbnails':len(list((ROOT/'frontend/public/materials').glob('*.svg')))>=10,
'no_gif_assets':not list((ROOT/'frontend/public').rglob('*.gif')),
'only_navigation_icon_motion':css.count('transition:')==2 and '@keyframes' not in css,
'keyboard_focus_styles':':focus-visible' in css,
'reduced_motion_support':'prefers-reduced-motion:reduce' in css,
'responsive_breakpoints':all(bp in css for bp in ['max-width:800px','max-width:610px','max-width:430px']),
'no_dangerous_html':not any('dangerouslySetInnerHTML' in x for x in (app,student,admin)),
'no_client_side_auth_token_store':not any(x in (app+student+admin) for x in ('localStorage','sessionStorage','document.cookie')),
}
errors=[node for node in tinycss2.parse_stylesheet(css,skip_comments=True,skip_whitespace=True) if node.type=='error']
checks['css_parses']=not errors
for name,ok in checks.items():print(('PASS' if ok else 'FAIL')+' '+name)
print('RESULT',sum(checks.values()),'/',len(checks))
if not all(checks.values()):sys.exit(1)
