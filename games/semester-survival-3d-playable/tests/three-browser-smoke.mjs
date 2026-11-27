import test from "node:test";
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

// Regression coverage: preserve impact shake while keeping camera recovery drift-free.
test("production 3D runner validates Jay, vehicle impacts, and retry", async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]
  });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => {
    localStorage.setItem("semester-survival-runner-3d-v1", JSON.stringify({
      version: 1, semester: 8, semesterDistance: 990, gpa: 3.2, coins: 0,
      totalDistance: 0, best: 0, runs: 0, collected: 0, cats: 0,
      up: { magnet: 0, shield: 0, double: 0, head: 0, score: 0, coffee: 0 },
      sound: true, vibration: true, motion: false, quality: "High", shop: []
    }));
  });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  try {
    await page.goto("http://127.0.0.1:4173/?smoke=1", { waitUntil: "domcontentloaded" });
    const world = page.locator("#three-world");
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.rendererReady === "true", null, { timeout: 60000 });
    const diagnostics = await world.evaluate(node => ({
      clipCount: Number(node.dataset.jayClipCount),
      clips: node.dataset.jayClips.split(","),
      mouthPose: node.dataset.jayMouthPose,
      runMotionFound: node.dataset.jayRunMotionFound === "true",
      runMotionTracks: Number(node.dataset.jayRunMotionTracks),
      runMotionFallback: node.dataset.jayRunMotionFallback === "true",
      runApproachEndpoint: Number(node.dataset.jayRunApproachEndpoint),
      neutralizedMouthMorphs: Number(node.dataset.jayMouthMorphsNeutralized),
      quality: node.dataset.graphicsQuality,
      canvas: Boolean(node.querySelector("canvas")),
      canvasWidth: node.querySelector("canvas")?.width || 0,
      webgl2: Boolean(node.querySelector("canvas")?.getContext("webgl2"))
    }));
    assert.ok(diagnostics.canvas, "Three.js canvas must be mounted");
    assert.ok(diagnostics.canvasWidth > 0, "WebGL canvas must have a real drawing buffer");
    assert.ok(diagnostics.webgl2, "Three.js must acquire a WebGL2 context");
    assert.ok(diagnostics.clipCount >= 5, "Jay must load at least five authored clips");
    for (const clip of ["idle", "run", "jump", "slide", "fall"]) {
      assert.ok(diagnostics.clips.includes(clip), "missing Jay clip: " + clip);
    }
    assert.equal(diagnostics.quality, "High");
    assert.equal(diagnostics.mouthPose, "neutral", "Jay must start with a neutral closed-mouth facial pose");
    assert.equal(diagnostics.runMotionFound, true, "Jay run clip must expose a detectable root-motion channel");
    assert.equal(diagnostics.runMotionTracks, 0, "the authored in-place run clip should contain no root-motion tracks");
    assert.equal(diagnostics.runMotionFallback, false, "the endless run must use the authored in-place clip, not a fallback");
    assert.ok(diagnostics.runApproachEndpoint > 0, "the first run must stop at its forward-most pose");
    assert.ok(Number.isFinite(diagnostics.neutralizedMouthMorphs), "facial pose diagnostics must be present");

    await page.locator('[data-page="settings"]').first().click();
    await page.locator("#quality").selectOption({ label: "Performance" });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.graphicsQuality === "Performance", null, { timeout: 3000 });

    await page.locator("#nav-play").click();
    await page.waitForFunction(() => ["run", "idle"].includes(document.querySelector("#three-world")?.dataset.activeAnimation), null, { timeout: 5000 });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.jayRunPhase === "loop", null, { timeout: 12000 });
    assert.equal(await page.evaluate(() => window.__runnerSmoke.holdSafeRun()), true, "the smoke test must hold random spawns while checking controls");
    const earlyLateBusModels = await page.evaluate(() => window.__runnerSmoke.probeLateBus());
    assert.equal(earlyLateBusModels, 1, "a late bus obstacle must render as a real 3D vehicle");
    const coinProbe = await page.evaluate(() => window.__runnerSmoke.probeCoin());
    assert.equal(coinProbe.coins, 1, "same-lane coin pickup must award a coin");
    assert.equal(coinProbe.remaining, 0, "collected coins must leave the active world");
    const powerupProbe = await page.evaluate(() => window.__runnerSmoke.probePowerup({ kind: "COFFEE", type: "food" }));
    assert.equal(powerupProbe.collected, 1, "campus power-ups must be collectible");
    assert.ok(powerupProbe.energy > 50, "energy power-ups must restore energy");
    assert.equal(powerupProbe.remaining, 0, "collected power-ups must leave the active world");
    const collisionProbe = await page.evaluate(() => window.__runnerSmoke.probeObstacle({ action: "jump", jump: 0 }));
    assert.equal(collisionProbe.hit, true, "a mistimed jump must register an obstacle collision");
    assert.ok(Math.abs(collisionProbe.energy - 68) < 0.02, "a standard obstacle collision must apply the expected energy penalty, allowing the frame energy drain");
    for (const vehicleIndex of [0, 1, 2]) {
      const frontProbe = await page.evaluate(index => window.__runnerSmoke.probeCarCollision({ lane: 1, jump: 0, vehicleIndex: index }), vehicleIndex);
      assert.equal(frontProbe.hit, true, "a direct front impact must register for every traffic vehicle type");
      assert.equal(frontProbe.impactType, "front", "a grounded collision must use the direct-front reaction");
      assert.equal(frontProbe.impactAnimation, "fall", "a direct front collision must play Shoulder Hit And Fall");
      assert.equal(frontProbe.speed, 0, "a direct front collision must stop Jay and the road immediately");
      assert.equal(frontProbe.thrown, false, "a direct front collision must not use the airborne throw");
      assert.equal(frontProbe.vehicleVisible, true, "the vehicle must remain visible after a direct collision");
      assert.ok(frontProbe.safeGap > 0.05, "Jay's body must remain fully clear of the vehicle after impact");
      assert.ok(frontProbe.hitDuration >= frontProbe.fallClipDuration, "Game Over must wait for the complete fall animation");

      const airborneProbe = await page.evaluate(index => window.__runnerSmoke.probeCarCollision({ lane: 1, jump: 1, vehicleIndex: index }), vehicleIndex);
      assert.equal(airborneProbe.hit, true, "a jumping collision must register for every traffic vehicle type");
      assert.equal(airborneProbe.impactType, "airborne", "a jumping collision must use a separate airborne reaction");
      assert.equal(airborneProbe.impactAnimation, "jump", "an airborne collision must not reuse the direct shoulder-hit clip");
      assert.equal(airborneProbe.speed, 0, "an airborne vehicle impact must stop road movement");
      assert.equal(airborneProbe.thrown, true, "a jumping collision must launch Jay into a distinct throw trajectory");
      assert.ok(airborneProbe.throwHeight > 1, "the airborne vehicle impact must visibly lift Jay");
      assert.ok(airborneProbe.throwZ > 2, "the airborne impact must throw Jay toward the camera");
      assert.equal(airborneProbe.vehicleVisible, true, "the vehicle must remain visible after an airborne collision");
    }
    for (const jump of [0, 1]) {
      const obstacleProbe = await page.evaluate(value => window.__runnerSmoke.probeVehicleObstacle({ jump: value }), jump);
      assert.equal(obstacleProbe.pendingFinish, true, "a vehicle obstacle collision must lead to game over");
      assert.equal(obstacleProbe.impactType, jump > 0 ? "airborne" : "front", "vehicle obstacle impact type must depend on Jay's airborne state");
      assert.equal(obstacleProbe.speed, 0, "vehicle obstacle impact must stop the game world immediately");
      assert.equal(obstacleProbe.remaining, 1, "the collided vehicle obstacle must remain in the world");
      assert.equal(obstacleProbe.holdInfinite, true, "the collided vehicle must not be removed during its impact animation");
      assert.ok(obstacleProbe.hitTimer >= obstacleProbe.clipDuration, "vehicle obstacle Game Over must wait for the impact clip");
    }
    const bossProbe = await page.evaluate(() => window.__runnerSmoke.probeBoss());
    assert.equal(bossProbe.active, true, "semester boss must activate at its distance threshold");
    assert.equal(bossProbe.label, "FINAL EXAMS", "semester eight must select the final-exams boss");
    assert.equal(bossProbe.queued, 3, "boss challenge must queue all three attacks");
    const bossClearProbe = await page.evaluate(() => window.__runnerSmoke.probeBossClear());
    assert.equal(bossClearProbe.cleared, 1, "clearing the boss must advance its cleared count");
    assert.equal(bossClearProbe.coins, 125, "semester-eight boss reward must be awarded");
    assert.ok(Math.abs(bossClearProbe.energy - 52) < 0.01, "boss victory must restore energy, allowing the frame energy drain");
    await page.waitForTimeout(6000);
    assert.equal(await world.getAttribute("data-jay-run-phase"), "loop", "Jay must remain in the endless run loop after the forward approach finishes");
    const controlRunStarted = await page.evaluate(() => {
      if (!window.__runnerSmoke.state().active) return window.__runnerSmoke.restart();
      return true;
    });
    assert.equal(controlRunStarted, true, "the browser control checks must begin with an active run");
    await page.waitForFunction(() => window.__runnerSmoke.state().active && !window.__runnerSmoke.state().paused, null, { timeout: 3000 });
    assert.equal(await page.evaluate(() => window.__runnerSmoke.holdSafeRun()), true, "the restarted control run must be held safe");

    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 0, null, { timeout: 2500 });
    await page.waitForFunction(() => {
      const world = document.querySelector("#three-world");
      return world && Number.isFinite(Number(world.dataset.jayLean));
    }, null, { timeout: 2500 });
    assert.ok(Number.isFinite(Number((await world.evaluate(node => node.dataset.jayImpact)))), "impact response telemetry should be available");
    const cameraImpact = await page.evaluate(() => window.__runnerSmoke.probeImpactCamera());
    assert.ok(Math.abs(cameraImpact.impact.shakeX) > 0.01, "a hit must retain a visible horizontal camera shake");
    assert.ok(Math.abs(cameraImpact.impact.shakeY) > 0.005, "a hit must retain a visible vertical camera shake");
    assert.ok(Math.abs((cameraImpact.impact.world - cameraImpact.impact.base) - cameraImpact.impact.shakeX) < 0.00002, "camera shake must remain a temporary offset from its stable tracking position");
    assert.ok(Math.abs(cameraImpact.recovered.world - cameraImpact.recovered.base) < 0.00002, "camera must return exactly to its stable tracking position after impact");
    assert.ok(Math.abs(cameraImpact.recovered.base - cameraImpact.impact.base) < 0.02, "camera tracking base must not inherit the impact shake");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(100);
    assert.equal((await page.evaluate(() => window.__runnerSmoke.state().lane)), 0, "left movement must clamp at the left lane");
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 1, null, { timeout: 2500 });
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 2, null, { timeout: 2500 });
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);
    assert.equal((await page.evaluate(() => window.__runnerSmoke.state().lane)), 2, "right movement must clamp at the right lane");

    const swipe = async (x1, x2, y = 420) => page.evaluate(({ x1, x2, y }) => {
      const target = document.querySelector("#game");
      const makeTouch = (x) => new Touch({ identifier: 7, target, clientX: x, clientY: y });
      target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, changedTouches: [makeTouch(x1)] }));
      target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [makeTouch(x2)] }));
    }, { x1, x2, y });
    await swipe(300, 100);
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 1, null, { timeout: 2500 });
    await swipe(100, 300);
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 2, null, { timeout: 2500 });
    await swipe(100, 300);
    await page.waitForTimeout(100);
    assert.equal((await page.evaluate(() => window.__runnerSmoke.state().lane)), 2, "touch swipes must clamp at the right lane");
    await swipe(300, 100);
    await page.waitForFunction(() => window.__runnerSmoke.state().lane === 1, null, { timeout: 2500 });

    await page.keyboard.press("ArrowUp");
    // Confirm input state before checking the renderer output below.
    await page.waitForFunction(() => window.__runnerSmoke.state().jump > 0, null, { timeout: 2500 });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "jump", null, { timeout: 8000 }).catch(async error => {
      const diagnostic = await page.evaluate(() => ({
        state: window.__runnerSmoke.state(),
        activeAnimation: document.querySelector("#three-world")?.dataset.activeAnimation,
        rendererReady: document.querySelector("#three-world")?.dataset.rendererReady,
        overlayOpen: document.querySelector("#game")?.classList.contains("open"),
        visibility: document.visibilityState
      }));
      throw new Error(`${error.message}; jump diagnostics: ${JSON.stringify(diagnostic)}`);
    });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "run", null, { timeout: 8000 });

    await page.keyboard.press("ArrowDown");
    await page.waitForFunction(() => window.__runnerSmoke.state().slide > 0, null, { timeout: 2500 });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "slide", null, { timeout: 8000 });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.activeAnimation === "run", null, { timeout: 8000 });

    await page.locator("#pause").click();
    await page.waitForFunction(() => document.querySelector("#pause-modal")?.classList.contains("show"), null, { timeout: 2000 });
    assert.equal(await page.evaluate(() => window.__runnerSmoke.state().paused), true, "pause must stop the simulation");
    await page.locator("#resume").click();
    await page.waitForFunction(() => !window.__runnerSmoke.state().paused, null, { timeout: 2000 });
    await page.evaluate(() => window.__runnerSmoke.endRun(20));
    await page.waitForFunction(() => document.querySelector("#result-modal")?.classList.contains("show"), null, { timeout: 2000 });
    assert.equal(await page.locator("#result-title").textContent(), "YOU GRADUATED!", "finishing the eighth semester must unlock graduation");
    const graduationSave = await page.evaluate(() => JSON.parse(localStorage.getItem("semester-survival-runner-3d-v1")));
    assert.equal(graduationSave.semester, 9, "graduation must persist the alumni semester");
    assert.equal(graduationSave.graduated, true, "graduation status must persist");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#three-world")?.dataset.rendererReady === "true", null, { timeout: 60000 });
    await page.locator('[data-page="journey"]').first().click();
    assert.equal(await page.locator("#semester-grid .semester-card").count(), 8, "the journey must display all eight semesters");
    assert.equal(await page.locator("#semester-grid .semester-card:not(.locked)").count(), 8, "all semesters must remain cleared after reload");
    assert.equal(await page.evaluate(() => window.__runnerSmoke.restart()), true, "the fall-animation check must begin with a fresh active run");
    await page.waitForFunction(() => window.__runnerSmoke.state().active && !window.__runnerSmoke.state().paused, null, { timeout: 3000 });
    const initialRunState = await page.evaluate(() => window.__runnerSmoke.state());
    const fallInfo = await page.evaluate(() => window.__runnerSmoke.forceVehicleFall());
    assert.ok(fallInfo.clipDuration > 0, "the authored fall clip must have a measurable duration");
    await page.waitForFunction(() => document.querySelector("#result-modal")?.classList.contains("show"), null, { timeout: 30000 }).catch(async error => {
      const diagnostic = await page.evaluate(() => ({
        state: window.__runnerSmoke.state(),
        activeAnimation: document.querySelector("#three-world")?.dataset.activeAnimation,
        rendererReady: document.querySelector("#three-world")?.dataset.rendererReady,
        resultModal: document.querySelector("#result-modal")?.classList.contains("show"),
        visibility: document.visibilityState
      }));
      throw new Error(`${error.message}; fall diagnostics: ${JSON.stringify(diagnostic)}`);
    });
    assert.equal(await page.evaluate(() => window.__runnerSmoke.state().fallFinished), true, "Game Over must not appear until the full fall clip has finished");
    await page.locator("#retry").click();
    await page.waitForFunction(() => window.__runnerSmoke.state().active && !document.querySelector("#result-modal")?.classList.contains("show"), null, { timeout: 3000 });
    await page.waitForFunction(() => window.__runnerSmoke.state().animationClip === "run", null, { timeout: 3000 });
    const restartedState = await page.evaluate(() => window.__runnerSmoke.state());
    assert.ok(restartedState.distance < 5, "Run It Back must reset distance to the starting area, allowing a small head start and the first rendered frames");
    assert.equal(restartedState.lane, 1, "Run It Back must reset Jay to the centre lane");
    assert.ok(Math.abs(restartedState.energy - 100) < 0.01, "Run It Back must restore full starting energy before normal frame drain");
    assert.equal(restartedState.runApproachCompleted, initialRunState.runApproachCompleted, "Run It Back must reset the character animation timeline");
    await page.waitForFunction(() => window.__runnerSmoke.state().distance > 0, null, { timeout: 3000 });
    assert.deepEqual(pageErrors, [], "browser runtime should not throw page errors");
  } finally {
    await browser.close();
  }
});
