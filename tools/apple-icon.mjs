// Rasterize the existing favicon geometry. Provisional packaging art, not approved store artwork.
import {chromium} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  const page=await browser.newPage({viewport:{width:1024,height:1024},deviceScaleFactor:1});
  await page.setContent(`<html><body style="margin:0;background:#e9e7dc"><svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="-7 -7 54 54"><circle cx="20" cy="24" r="14" fill="#7a8069"/><path d="M20 14Q16 1 30 4Q31 15 20 14" fill="#89ad8c"/><circle cx="15" cy="23" r="2" fill="#fff5da"/><circle cx="25" cy="23" r="2" fill="#fff5da"/></svg></body></html>`);
  await page.screenshot({path:fileURLToPath(new URL('../platforms/apple/Dustlings/Assets.xcassets/AppIcon.appiconset/AppIcon.png',import.meta.url))});
} finally {await browser.close();}
