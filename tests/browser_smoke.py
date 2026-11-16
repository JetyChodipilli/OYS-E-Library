"""Run after starting the real Next.js dev preview: OYS_PREVIEW_MODE=true npm run dev.
Requires Python Playwright and downloaded browser binaries. Not part of offline checks.
Example: python tests/browser_smoke.py --base-url http://127.0.0.1:3000
"""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--base-url',default='http://127.0.0.1:3000')
parser.add_argument('--screenshots',default='qa/browser')
args=parser.parse_args()
out=Path(args.screenshots)
out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    try:
        for width,height in [(360,800),(390,844),(768,1024),(1280,900),(1440,900)]:
            page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
            for route,name in [('/','student'),('/reader','reader'),('/admin','admin')]:
                response=page.goto(args.base_url.rstrip('/')+route,wait_until='networkidle',timeout=30000)
                assert response and response.status==200, f'{route} returned {response.status if response else "no response"}'
                assert page.locator('h1').first.is_visible(),f'No visible heading: {name} {width}px'
                dimensions=page.evaluate('''() => ({
                    viewport: document.documentElement.clientWidth,
                    scroll: document.documentElement.scrollWidth,
                    bodyScroll: document.body.scrollWidth
                })''')
                assert dimensions['scroll']<=dimensions['viewport']+2, f'Horizontal overflow on {name} {width}px: {dimensions}'
                assert dimensions['bodyScroll']<=dimensions['viewport']+2, f'Body overflow on {name} {width}px: {dimensions}'
                page.screenshot(path=str(out/f'{name}_{width}.png'),full_page=True)
                if width<=768:
                    trigger=page.get_by_role('button',name='Open navigation')
                    assert trigger.is_visible(), f'Mobile menu absent: {name} {width}px'
                    trigger.click()
                    assert page.get_by_role('button',name='Close navigation menu').is_visible(), 'Mobile menu did not open'
                    page.keyboard.press('Escape')
                    assert not page.get_by_role('button',name='Close navigation menu').count(), 'Esc did not close nav'
            page.close()
        print('PASS: 15 responsive screen+viewport combinations; basic mobile nav and overflow')
    finally:
        browser.close()
