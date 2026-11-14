// Start Vite locally; this harness uses synthetic contacts and never calls an API.
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.EVO_SCREENSHOT_DIR || '/tmp/evo-m1-captures';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1000,height:900}});
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'||r.request().url().startsWith('data:')?r.continue():r.abort());
 await page.goto('http://127.0.0.1:5176/m1-preview.html');
 await page.locator('.deal-card-heading').first().waitFor();
 for(const theme of ['light','dark']) {
  await page.evaluate(t=>document.documentElement.classList.toggle('dark',t==='dark'),theme);
  for(const width of [304,288]) {
   await page.locator('section').evaluateAll((es,w)=>es.forEach(e=>e.style.width=`${w}px`),width);
   await page.waitForTimeout(150);
   const metrics=await page.locator('.deal-card-shell').evaluateAll(es=>es.map(e=>{
    const title=e.querySelector('.deal-title').getBoundingClientRect(), actions=e.querySelector('.m1-actions').getBoundingClientRect(),avatar=e.querySelector('.deal-contact-avatar').getBoundingClientRect();
    return {titleRight:title.right,actionsLeft:actions.left,titleHeight:title.height,avatarWidth:avatar.width,photos:e.querySelectorAll('.deal-contact-avatar').length};
   }));
   for(const m of metrics){ assert(m.titleRight<=m.actionsLeft);assert(m.titleHeight<=40);assert.equal(m.avatarWidth,26);assert.equal(m.photos,1); }
   await page.locator('.deal-title').last().evaluate(e=>{e.textContent='W'.repeat(200);});
   const extreme=await page.locator('.deal-title').last().boundingBox();
   const action=await page.locator('.m1-actions').last().boundingBox();
   assert(extreme.x+extreme.width<=action.x);assert(extreme.height<=40);
   assert(await page.locator('.deal-card-heading img').first().evaluate(e=>e.complete&&e.naturalWidth>0));
   assert.equal(await page.locator('.deal-contact-avatar').nth(2).innerText(),'CS');
   console.log(JSON.stringify({theme,width,cards:metrics.length,overlap:false}));
   await page.screenshot({path:`${out}/M1-cabecalho-${theme}-${width}.png`});
  }
 }
} finally {await browser.close();}
