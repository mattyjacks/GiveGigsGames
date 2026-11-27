import assert from "node:assert/strict";
const modulePath = process.env.PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error("PLAYWRIGHT_MODULE must point to the installed Playwright module.");
const { chromium } = await import(modulePath);
const browser = await chromium.launch({headless:true,args:["--no-sandbox"]});
try {
  const page = await browser.newPage();
  page.on("pageerror",error=>console.error("BROWSER_PAGE_ERROR",error.message));
  await page.goto("http://127.0.0.1:4174/games/semester-survival-runner-3d/tests/jay-gameplay-integration.html",{waitUntil:"networkidle",timeout:60000});
  await page.waitForFunction(()=>window.__jayGameplayTest?.done===true,{timeout:60000});
  const result=await page.evaluate(()=>window.__jayGameplayTest);
  console.log("JAY_GAMEPLAY_INTEGRATION_RESULT",JSON.stringify(result,null,2));
  assert.equal(result.ok,true,result.error||"Jay gameplay integration failed.");
  assert.ok(result.checks.skinnedMeshCount>0,"Skinned character mesh must load.");
  assert.equal(result.checks.runCyclesSimulated,101);
  assert.equal(result.checks.runActionStillRunning,true);
  assert.equal(result.checks.gameplayRootPositionPreserved,true);
  assert.deepEqual(result.checks.transitionStates,["jump","slide","fall","getUp","idle","run"]);
  assert.equal(result.checks.finalActiveState,"run");
} finally { await browser.close(); }
