"""v1.5 offline contract checks. Does NOT substitute for real DB/HTTP/browser tests."""
from pathlib import Path
import json,re,subprocess,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
M=ROOT/'backend/src/main/resources/db/migration'
V1=(M/'V1__core_schema.sql').read_text()
V2=(M/'V2__integrity_guards.sql').read_text()
V3=(M/'V3__category_hierarchy_and_search.sql').read_text()
CAT=(ROOT/'backend/src/main/java/com/oys/elibrary/catalog/MaterialCatalogueController.java').read_text()
TAX=(ROOT/'backend/src/main/java/com/oys/elibrary/catalog/TaxonomyController.java').read_text()
ADM=(ROOT/'backend/src/main/java/com/oys/elibrary/admin/AdminCategoryController.java').read_text()
SUB=(ROOT/'backend/src/main/java/com/oys/elibrary/admin/AdminSubjectController.java').read_text()
STU=(ROOT/'frontend/components/StudentDashboard.tsx').read_text()
DASH=(ROOT/'frontend/components/AdminDashboard.tsx').read_text()
CSS=(ROOT/'frontend/app/globals.css').read_text()
POM=(ROOT/'backend/pom.xml').read_text()
PKG=json.loads((ROOT/'frontend/package.json').read_text())
checks={
    'v1_migration_retained':all(f'CREATE TABLE {x} (' in V1 for x in ['sectors','subjects','materials','material_pages','student_page_completions','student_reward_accounts']),
    'v2_migration_retained':'trg_page_completion_eligible' in V2,
    'v3_categories_created':'CREATE TABLE categories (' in V3,
    'v3_category_parent_fk':'FOREIGN KEY (sector_id,parent_id)' in V3,
    'v3_unique_root_sibling_slug':'UNIQUE NULLS NOT DISTINCT (sector_id,parent_id,slug)' in V3,
    'v3_one_subcategory_level':'trg_categories_depth' in V3,
    'v3_prevent_hiding_populated_category':'trg_categories_activity' in V3,
    'v3_active_subject_category':'trg_subject_category_active' in V3,
    'v3_subject_backfill':'UPDATE subjects s' in V3 and "'general'" in V3,
    'v3_subject_category_not_null':'ALTER COLUMN category_id SET NOT NULL' in V3,
    'v3_subject_sector_fk':'subjects_category_same_sector_fk' in V3,
    'v3_search_indexes':'gin_trgm_ops' in V3,
    'v3_no_drop_or_truncate':not re.search(r'\b(?:DROP TABLE|TRUNCATE|DELETE FROM)\b',V3,re.I),
    'api_category_list':'@GetMapping("/categories")' in TAX,
    'api_subject_list':'@GetMapping("/subjects")' in TAX,
    'api_taxonomy_college_filter':'material_college_visibility' in TAX and 'jwt.getClaimAsString("college_id")' in TAX,
    'api_material_list':'@GetMapping("/materials")' in CAT,
    'api_college_from_jwt':'jwt.getClaimAsString("college_id")' in CAT,
    'api_no_college_query_param':'@RequestParam String collegeId' not in CAT,
    'api_fails_closed_on_missing_college':'Verified college membership is required' in CAT,
    'api_uses_bound_params':'MapSqlParameterSource' in CAT and 'ILIKE :search' in CAT,
    'api_order_allowlist':'String safeOrder = switch' in CAT,
    'api_sort_bad_request':'Unsupported sort option' in CAT,
    'api_rejects_oversize_page':'@Max(48)' in CAT,
    'api_repeatable_read_consistency':'Isolation.REPEATABLE_READ' in CAT,
    'api_material_college_filter':'material_college_visibility' in CAT,
    'api_publish_only':"m.publication_status='PUBLISHED'" in CAT,
    'admin_category_role':'ROLE_OYS_SUPER_ADMIN' in ADM,
    'admin_category_update':'@PutMapping("/{id}")' in ADM,
    'admin_subject_role':'ROLE_OYS_SUPER_ADMIN' in SUB,
    'student_taxonomy_selection':'Browse by category' in STU and 'Subcategory' in STU and 'All subjects' in STU,
    'student_sorted_paginated':'filterAndSortMaterials' in STU and 'paginate(filtered,page,pageSize)' in re.sub(r'\s+','',STU),
    'student_page_reset':'setPage(0)' in STU,
    'admin_category_preview':'Category &amp; subcategory structure' in DASH,
    'admin_paginated_list':'paginate(matches,adminPage,adminPageSize)' in re.sub(r'\s+','',DASH),
    'frontend_demo_gate':'requireDemoPreview()' in (ROOT/'frontend/app/admin/page.tsx').read_text() and 'OYS_PREVIEW_MODE' in (ROOT/'frontend/lib/previewGuard.ts').read_text(),
    'frontend_no_dangerous_html':'dangerouslySetInnerHTML' not in STU+DASH,
    'frontend_arctic_blue':'#F3F8FC' in CSS or '#f3f8fc' in CSS.lower(),
    'frontend_glass':'backdrop-filter:blur' in CSS,
    'frontend_responsive':'@media(max-width:430px)' in CSS and '@media(max-width:800px)' in CSS,
    'frontend_no_gifs':not any((ROOT/'frontend/public').rglob('*.gif')),
    'frontend_motion_reduced':'prefers-reduced-motion:reduce' in CSS,
    'frontend_preview_labels':'preview-disclaimer' in STU and 'preview-disclaimer' in DASH,
    'node_ts_frontend':'typescript' in PKG['devDependencies'],
}
try:ET.fromstring(POM);checks['pom_well_formed']=True
except ET.ParseError:checks['pom_well_formed']=False
for name,ok in checks.items():print(('PASS' if ok else 'FAIL')+' '+name)
print(f"PASS COUNT {sum(checks.values())}/{len(checks)}")
if not all(checks.values()):raise SystemExit(1)
