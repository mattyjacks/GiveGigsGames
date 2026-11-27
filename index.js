(() => {
  "use strict";

  const gamesRoot = new URL("games/", document.currentScript.src);
  const byId = (id) => document.getElementById(id);

  const grid = byId("game-grid");
  const count = byId("catalog-count");
  const error = byId("catalog-error");
  const retry = byId("catalog-retry");
  const search = byId("catalog-search");
  const sort = byId("catalog-sort");
  const activeFilters = byId("active-filters");
  const filtersToggle = byId("filters-toggle");
  const filtersPanel = byId("filters-panel");
  const filtersScrim = byId("filters-scrim");
  const filtersClose = byId("filters-close");
  const filtersCount = byId("filters-count");
  const clearFilters = byId("clear-filters");
  const applyFilters = byId("apply-filters");
  const collectionSet = byId("filter-collection");
  const inputSet = byId("filter-input");
  const modeSet = byId("filter-mode");
  const tagOptions = byId("tag-options");
  const tagSearch = byId("tag-search");
  const tagMatch = byId("tag-match");

  const rowSections = {
    recent: byId("row-recent-section"),
    favorites: byId("row-favorites-section"),
    new: byId("row-new-section"),
  };
  const rowTracks = {
    recent: byId("row-recent"),
    favorites: byId("row-favorites"),
    new: byId("row-new"),
  };
  const rowNewNote = byId("row-new-note");

  const saveFileList = byId("save-file-list");
  const saveManagerStatus = byId("save-manager-status");
  const saveFileInput = byId("save-file-input");

  const SAVE_FILE_FORMAT = "givegigsgames-save";
  const STORAGE = {
    favorites: "arcade:favorites",
    recent: "arcade:recent",
    catalog: "arcade:catalog",
    view: "arcade:view",
  };

  const state = {
    favorites: new Set(),
    recent: [],
    query: "",
    sort: "featured",
    collection: "",
    input: "",
    mode: "",
    tags: new Set(),
    tagMatch: "any",
    view: "grid",
  };

  let games = [];
  let loaded = false;
  let lastFiltersFocus = null;

  try {
    state.favorites = new Set(JSON.parse(localStorage.getItem(STORAGE.favorites) || "[]"));
    state.recent = JSON.parse(localStorage.getItem(STORAGE.recent) || "[]");
    const savedView = localStorage.getItem(STORAGE.view);
    if (savedView === "list" || savedView === "grid") state.view = savedView;
  } catch {}

  const COLLECTIONS = [
    { value: "", label: "All games" },
    { value: "favorites", label: "Favorites" },
    { value: "recent", label: "Recently played" },
    { value: "offline", label: "Downloadable" },
  ];
  const INPUTS = [
    { value: "", label: "Any" },
    { value: "touch", label: "Touch" },
    { value: "keyboard", label: "Keyboard" },
    { value: "gamepad", label: "Gamepad" },
  ];
  const MODES = [
    { value: "", label: "Any" },
    { value: "solo", label: "Solo" },
    { value: "multiplayer", label: "Multiplayer" },
  ];

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));

  const icon = (name, className = "icon") =>
    `<svg class="${className}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

  const normalizedTags = (game) => [...new Set((game.tags || []).map((tag) => String(tag).trim()).filter(Boolean))];
  const compare = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
  const playHref = (game) => `/ggg/play/${encodeURIComponent(game.slug)}`;

  // Catalog paths are either root-relative ("games/...") or relative to /games/.
  const rootUrl = (path) => {
    if (!path) return "";
    if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
    return new URL(path, `${location.origin}/`).href;
  };

  function formatPackageSize(bytes) {
    const value = Number(bytes) || 0;
    if (!value) return "";
    return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)} MB` : `${Math.max(1, Math.round(value / 1000))} KB`;
  }

  const searchTokens = (value) => String(value || "").toLowerCase().match(/[a-z0-9]+/g) || [];

  function editDistanceWithin(word, candidate, limit) {
    if (Math.abs(word.length - candidate.length) > limit) return false;
    let previous = Array.from({ length: candidate.length + 1 }, (_, index) => index);
    for (let row = 1; row <= word.length; row += 1) {
      const current = [row];
      let rowMinimum = row;
      for (let column = 1; column <= candidate.length; column += 1) {
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + (word[row - 1] === candidate[column - 1] ? 0 : 1),
        );
        rowMinimum = Math.min(rowMinimum, current[column]);
      }
      if (rowMinimum > limit) return false;
      previous = current;
    }
    return previous[candidate.length] <= limit;
  }

  function fuzzyTitleMatch(word, titleTokens) {
    // Check single title words and short joined runs so searches like "2dc"
    // can match titles displayed as "2D C".
    for (let start = 0; start < titleTokens.length; start += 1) {
      let candidate = "";
      for (let end = start; end < Math.min(titleTokens.length, start + 3); end += 1) {
        candidate += titleTokens[end];
        const limit = word.length <= 2 ? 1 : Math.min(2, Math.floor(word.length / 4));
        if (editDistanceWithin(word, candidate, limit)) return true;
      }
    }
    return false;
  }

  function searchRank(game, query) {
    if (!query) return 0;
    const title = game.title.toLowerCase();
    const normalizedTitle = title.replace(/[^a-z0-9]/g, "");
    const normalizedQuery = query.replace(/[^a-z0-9]/g, "");
    if (title === query || normalizedTitle === normalizedQuery) return 0;
    if (title.startsWith(query) || (normalizedQuery && normalizedTitle.startsWith(normalizedQuery))) return 1;
    if (title.includes(query) || (normalizedQuery && normalizedTitle.includes(normalizedQuery))) return 2;
    const terms = [game.genre, game.description, ...normalizedTags(game)].join(" ").toLowerCase();
    const words = searchTokens(query);
    if (!words.length) return Infinity;
    if (words.every((word) => `${title} ${terms}`.includes(word))) return 3;
    const titleWords = searchTokens(title);
    if (words.every((word) => fuzzyTitleMatch(word, titleWords))) return 4;
    return Infinity;
  }

  /* ------------------------------------------------------------------ *
   * Cards
   * ------------------------------------------------------------------ */

  function inputIcons(game) {
    const inputs = game.inputs || [];
    if (!inputs.length) return "";
    const labels = { touch: "Touch", keyboard: "Keyboard", gamepad: "Gamepad" };
    const icons = { touch: "touch", keyboard: "keyboard", gamepad: "gamepad" };
    return `<span class="gcard-inputs" role="img" aria-label="Input: ${inputs.map((item) => labels[item] || item).join(", ")}">${
      inputs.map((item) => icon(icons[item] || "games")).join("")
    }</span>`;
  }

  function cardHTML(game) {
    const favorite = state.favorites.has(game.slug);
    const multiplayer = (game.modes || []).includes("multiplayer");
    const size = formatPackageSize(game.packageBytes);
    const cover = game.capsule
      ? `<img src="${escapeHTML(new URL(game.capsule, gamesRoot).href)}" alt="" loading="lazy" decoding="async" width="512" height="288">`
      : "";
    const tags = normalizedTags(game);
    // Extra frames power the hover preview; only the first one is fetched up front.
    const shots = (game.featuredScreenshots || []).map((shot) => rootUrl(shot));

    // The cover is the play action; the title goes to the game's details page.
    return `
      <article class="game-card" data-slug="${escapeHTML(game.slug)}"${shots.length > 1 ? ` data-shots="${escapeHTML(JSON.stringify(shots))}"` : ""}>
        <div class="gcard-cover">
          <div class="gcard-art">
            <span class="gcard-fallback">${icon("gamepad", "icon icon-xl")}</span>
            ${cover}
            ${shots.length > 1 ? '<img class="gcard-cover-next" alt="" loading="lazy" decoding="async" width="512" height="288">' : ""}
            <a class="gcard-cover-link" href="${escapeHTML(playHref(game))}" data-launch="${escapeHTML(game.slug)}" aria-label="Play ${escapeHTML(game.title)}">
              <div class="gcard-overlay">
                <p>${escapeHTML(game.description || "")}</p>
                <div class="gcard-overlay-tags">${tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div>
              </div>
            </a>
          </div>
          <div class="gcard-controls" role="group" aria-label="${escapeHTML(game.title)} controls">
            <a class="gcard-play" href="${escapeHTML(playHref(game))}" data-launch="${escapeHTML(game.slug)}" aria-label="Play ${escapeHTML(game.title)}">${icon("play", "icon icon-sm")}</a>
            <button class="icon-btn icon-btn--raised gcard-fav${favorite ? " is-on" : ""}" type="button" data-fav="${escapeHTML(game.slug)}"
              aria-pressed="${favorite}" aria-label="${favorite ? "Remove from favorites" : "Add to favorites"}: ${escapeHTML(game.title)}"
              data-tip="${favorite ? "In favorites" : "Add to favorites"}">${icon("heart")}</button>
          </div>
        </div>
        <div class="gcard-body">
          <h3 class="gcard-title"><a href="/ggg/info/${encodeURIComponent(game.slug)}">${escapeHTML(game.title)}</a></h3>
          <p class="gcard-line">
            <span>${escapeHTML(game.genre || "Uncategorized")}</span>
            <span>${multiplayer ? "Multiplayer" : "Solo"}</span>
            ${size ? `<span>${size}</span>` : ""}
          </p>
        </div>
      </article>`;
  }

  function skeletonHTML() {
    return Array.from({ length: 8 }, () => `
      <div class="skel" aria-hidden="true">
        <div class="skel-cover"></div>
        <div class="skel-lines">
          <div class="skel-line w-60"></div>
          <div class="skel-line w-40"></div>
          <div class="skel-line"></div>
        </div>
      </div>`).join("");
  }

  /* ------------------------------------------------------------------ *
   * Featured hero
   * ------------------------------------------------------------------ */

  const hero = byId("featured");
  const heroCover = byId("hero-cover");
  const heroTitle = byId("hero-title");
  const heroBlurb = byId("hero-blurb");
  const heroMeta = byId("hero-meta");
  const heroPlay = byId("hero-play");
  const heroDetails = byId("hero-details");
  const heroDots = byId("hero-dots");
  const heroPrev = byId("hero-prev");
  const heroNext = byId("hero-next");
  const heroPause = byId("hero-pause");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let featured = [];
  let heroIndex = 0;
  let heroTimer = null;
  let heroPaused = false;

  function syncPause() {
    if (!heroPause) return;
    heroPause.setAttribute("aria-pressed", String(heroPaused));
    heroPause.setAttribute("aria-label", heroPaused ? "Resume featured rotation" : "Pause featured rotation");
    heroPause.dataset.tip = heroPaused ? "Resume" : "Pause";
    const use = heroPause.querySelector("use");
    if (use) use.setAttribute("href", heroPaused ? "#i-play" : "#i-pause");
  }

  function renderHero(index) {
    if (!featured.length) return;
    heroIndex = (index + featured.length) % featured.length;
    const game = featured[heroIndex];
    const shot = (game.featuredScreenshots || [])[0];
    heroCover.onerror = null;
    if (shot) {
      heroCover.hidden = false;
      heroCover.src = rootUrl(shot);
      heroCover.alt = `${game.title} screenshot`;
      heroCover.onerror = () => {
        heroCover.onerror = null;
        if (game.capsule) {
          heroCover.src = new URL(game.capsule, gamesRoot).href;
          heroCover.alt = `${game.title} cover art`;
          heroCover.onerror = () => {
            heroCover.hidden = true;
          };
        } else {
          heroCover.hidden = true;
        }
      };
    } else if (game.capsule) {
      heroCover.hidden = false;
      heroCover.src = new URL(game.capsule, gamesRoot).href;
      heroCover.alt = `${game.title} cover art`;
    } else {
      heroCover.hidden = true;
      heroCover.removeAttribute("src");
    }
    heroTitle.textContent = game.title;
    heroBlurb.textContent = game.description || "";
    const size = formatPackageSize(game.packageBytes);
    heroMeta.innerHTML = [
      `<span class="hero-genre">${escapeHTML(game.genre || "Featured")}</span>`,
      `<span>${icon((game.modes || []).includes("multiplayer") ? "users" : "user", "icon icon-sm")} ${(game.modes || []).includes("multiplayer") ? "Multiplayer" : "Solo"}</span>`,
      size ? `<span>${size}</span>` : "",
      `<span class="hero-inputs">${inputIcons(game)}</span>`,
    ].filter(Boolean).join("");
    heroPlay.href = playHref(game);
    heroPlay.dataset.launch = game.slug;
    heroDetails.href = `/ggg/info/${encodeURIComponent(game.slug)}`;
    heroDots.querySelectorAll("button").forEach((dot, dotIndex) => {
      dot.setAttribute("aria-current", String(dotIndex === heroIndex));
    });

    // Replay the type entrance for the new slide.
    const heroBody = hero.querySelector(".hero-body");
    if (heroBody && !reduceMotion) {
      heroBody.classList.remove("is-swap");
      void heroBody.offsetWidth;
      heroBody.classList.add("is-swap");
    }
  }

  function stopHero() {
    if (heroTimer) {
      clearInterval(heroTimer);
      heroTimer = null;
    }
  }

  function startHero() {
    stopHero();
    if (heroPaused || reduceMotion || featured.length < 2) return;
    heroTimer = setInterval(() => renderHero(heroIndex + 1), 8000);
  }

  function setupHero() {
    featured = games.filter((game) => game.featured)
      .sort((a, b) => Number(b.featuredPriority || 0) - Number(a.featuredPriority || 0))
      .slice(0, 6);
    if (!featured.length) featured = games.filter((game) => game.recommended).slice(0, 5);
    if (!featured.length) featured = games.slice(0, 3);
    hero.hidden = !featured.length;
    heroDots.innerHTML = featured.map((game, index) =>
      `<button class="hero-dot" type="button" aria-label="Show ${escapeHTML(game.title)}" aria-current="${index === 0}"></button>`).join("");
    heroDots.querySelectorAll("button").forEach((dot, index) => dot.addEventListener("click", () => {
      renderHero(index);
      startHero();
    }));
    heroPrev.addEventListener("click", () => { renderHero(heroIndex - 1); startHero(); });
    heroNext.addEventListener("click", () => { renderHero(heroIndex + 1); startHero(); });
    if (heroPause) {
      heroPause.addEventListener("click", () => {
        heroPaused = !heroPaused;
        syncPause();
        if (heroPaused) stopHero();
        else startHero();
      });
    }
    hero.addEventListener("mouseenter", stopHero);
    hero.addEventListener("mouseleave", startHero);
    hero.addEventListener("focusin", stopHero);
    hero.addEventListener("focusout", (event) => {
      if (!hero.contains(event.relatedTarget)) startHero();
    });
    renderHero(0);
    startHero();
  }

  /* ------------------------------------------------------------------ *
   * Hover previews — cycle a game's screenshots like a short clip.
   * Only the hovered card ticks, and frames load on first hover.
   * ------------------------------------------------------------------ */

  const canHoverPreview = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const preview = {
    card: null,
    timer: null,
    frame: 0,
    frames: [],
    stop() {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      if (this.card) {
        this.card.classList.remove("is-previewing");
        const img = this.card.querySelector(".gcard-cover-next");
        if (img) img.classList.remove("is-on");
      }
      this.card = null;
      this.frames = [];
      this.frame = 0;
    },
    start(card) {
      if (!canHoverPreview || reduceMotion || card === this.card) return;
      let frames = [];
      try {
        frames = JSON.parse(card.dataset.shots || "[]");
      } catch {
        frames = [];
      }
      if (!Array.isArray(frames) || frames.length < 2) return;
      const img = card.querySelector(".gcard-cover-next");
      if (!img) return;
      this.stop();
      this.card = card;
      this.frames = frames;
      this.frame = 0;
      card.classList.add("is-previewing");
      const warm = new Image();
      warm.decoding = "async";
      warm.src = frames[1];
      this.timer = setTimeout(() => this.advance(), 850);
    },
    advance() {
      const card = this.card;
      if (!card) return;
      const img = card.querySelector(".gcard-cover-next");
      if (!img) return;
      this.frame = (this.frame + 1) % this.frames.length;
      if (this.frame === 0) {
        img.classList.remove("is-on");
      } else {
        img.src = this.frames[this.frame];
        img.classList.add("is-on");
      }
      this.timer = setTimeout(() => this.advance(), 2600);
    },
  };

  function setupPreviews() {
    if (!canHoverPreview || reduceMotion) return;
    document.addEventListener("pointerover", (event) => {
      if (event.pointerType === "touch") return;
      const card = event.target.closest(".game-card");
      if (card) preview.start(card);
    });
    document.addEventListener("pointerout", (event) => {
      const card = event.target.closest(".game-card");
      if (card && card === preview.card && !card.contains(event.relatedTarget)) preview.stop();
    });
    document.addEventListener("focusin", (event) => {
      const card = event.target.closest(".game-card");
      if (card) preview.start(card);
    });
    document.addEventListener("focusout", (event) => {
      const card = event.target.closest(".game-card");
      if (card && card === preview.card && !card.contains(event.relatedTarget)) preview.stop();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) preview.stop();
    });
  }

  /* ------------------------------------------------------------------ *
   * Ticker — the library scrolling past under the hero
   * ------------------------------------------------------------------ */

  function setupTicker() {
    const track = byId("ticker-track");
    if (!track) return;
    const picks = games.filter((game, index) => index % 4 === 0).slice(0, 14);
    if (!picks.length) return;
    const item = (game) => `<span class="ticker-item">${escapeHTML(game.title)}<span class="ticker-genre">${escapeHTML(game.genre || "")}</span></span>`;
    const markup = picks.map(item).join("");
    // Two identical passes make the -50% loop seamless.
    track.innerHTML = markup + markup;
  }

  /* ------------------------------------------------------------------ *
   * Catalog filtering
   * ------------------------------------------------------------------ */

  function activeFilterCount() {
    return (state.collection ? 1 : 0) + (state.input ? 1 : 0) + (state.mode ? 1 : 0) + state.tags.size;
  }

  function filteredGames() {
    const query = state.query.trim().toLowerCase();
    const list = games.filter((game) => {
      const tags = normalizedTags(game);
      if (state.collection === "favorites" && !state.favorites.has(game.slug)) return false;
      if (state.collection === "recent" && !state.recent.includes(game.slug)) return false;
      if (state.collection === "offline" && game.runtimeType !== "static") return false;
      if (state.input && !(game.inputs || []).includes(state.input)) return false;
      if (state.mode && !(game.modes || []).includes(state.mode)) return false;
      if (!state.tags.size) return true;
      const checks = [...state.tags].map((tag) => tags.includes(tag));
      return state.tagMatch === "all" ? checks.every(Boolean) : checks.some(Boolean);
    });
    if (query) {
      return list
        .map((game) => ({ game, rank: searchRank(game, query) }))
        .filter((entry) => Number.isFinite(entry.rank))
        .sort((a, b) => a.rank - b.rank || compare(a.game.title, b.game.title))
        .map((entry) => entry.game);
    }
    return sortGames(list);
  }

  // Match site.css phone layout (< 768px). Desktop keeps the existing featured order.
  const mobileCatalogQuery = window.matchMedia("(max-width: 767px)");
  const isMobileCatalog = () => mobileCatalogQuery.matches;

  function sortGames(list) {
    const mode = state.sort;
    const preferMobile = isMobileCatalog() && mode === "featured";
    return list.sort((a, b) => {
      if (preferMobile) {
        const mobileRank = Number(b.mobilePriority || 0) - Number(a.mobilePriority || 0);
        if (mobileRank) return mobileRank;
      }
      if (mode === "featured") {
        return Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
          Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)) ||
          compare(a.title, b.title);
      }
      if (mode === "size-desc") return (Number(b.packageBytes) || 0) - (Number(a.packageBytes) || 0) || compare(a.title, b.title);
      if (mode === "genre") return compare(a.genre || "", b.genre || "") || compare(a.title, b.title);
      if (mode === "tag") return compare(normalizedTags(a).sort(compare)[0] || "", normalizedTags(b).sort(compare)[0] || "") || compare(a.title, b.title);
      if (mode === "tags-desc") return normalizedTags(b).length - normalizedTags(a).length || compare(a.title, b.title);
      if (mode === "tags-asc") return normalizedTags(a).length - normalizedTags(b).length || compare(a.title, b.title);
      return compare(a.title, b.title);
    });
  }

  function renderGrid() {
    if (!loaded) return;
    const list = filteredGames();
    count.textContent = `${list.length} ${list.length === 1 ? "game" : "games"}${activeFilterCount() || state.query ? ` of ${games.length}` : ""}`;
    grid.setAttribute("aria-busy", "false");
    grid.classList.toggle("list-view", state.view === "list");
    grid.classList.toggle("grid-view", state.view !== "list");

    if (!list.length) {
      grid.innerHTML = `
        <div class="state-box">
          <h3>No games match</h3>
          <p>Try a different search, or clear the filters to see the whole library.</p>
          <button class="btn btn-secondary" type="button" data-clear-all>Clear filters</button>
        </div>`;
    } else {
      grid.innerHTML = list.map(cardHTML).join("");
    }
    applyFilters.textContent = `Show ${list.length} ${list.length === 1 ? "result" : "results"}`;
  }

  function renderRows() {
    const bySlug = new Map(games.map((game) => [game.slug, game]));
    const recent = state.recent.map((slug) => bySlug.get(slug)).filter(Boolean).slice(0, 8);
    const favorites = games.filter((game) => state.favorites.has(game.slug)).slice(0, 8);
    const eligibleInProgress = games.filter(
      (game) => game.status === "preview" || game.status === "experimental"
    );
    const originalEight = eligibleInProgress
      .filter((game) => game.slug !== "semester-survival-3d-playable")
      .slice(0, 8);
    const semesterSurvival = eligibleInProgress.find(
      (game) => game.slug === "semester-survival-3d-playable"
    );
    const inProgress = [
      ...originalEight.slice(0, 2),
      ...(semesterSurvival ? [semesterSurvival] : []),
      ...originalEight.slice(2),
    ].slice(0, 9);

    const fill = (key, list, note) => {
      const hasItems = list.length > 0;
      rowSections[key].hidden = !hasItems;
      if (!hasItems) return;
      rowTracks[key].innerHTML = list.map(cardHTML).join("");
      if (note) note.textContent = `${list.length} build${list.length === 1 ? "" : "s"} in progress`;
    };

    fill("recent", recent);
    fill("favorites", favorites);
    fill("new", inProgress, rowNewNote);
  }

  function syncControls() {
    collectionSet.querySelectorAll("button").forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.value === state.collection)));
    inputSet.querySelectorAll("button").forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.value === state.input)));
    modeSet.querySelectorAll("button").forEach((button) =>
      button.setAttribute("aria-pressed", String(button.dataset.value === state.mode)));
    tagMatch.value = state.tagMatch;
    sort.value = state.sort;
    search.value = state.query;
    document.querySelectorAll("[data-view]").forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    tagOptions.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.checked = state.tags.has(input.value);
    });
    const filters = activeFilterCount();
    filtersCount.hidden = filters === 0;
    filtersCount.textContent = String(filters);
    filtersToggle.setAttribute("aria-label", filters ? `Filters, ${filters} active` : "Filters");
    renderActiveFilterChips();
  }

  function renderActiveFilterChips() {
    const chips = [];
    const push = (key, label) => chips.push(
      `<span class="chip">${escapeHTML(label)}<button type="button" data-remove="${key}" aria-label="Remove filter: ${escapeHTML(label)}">${icon("x", "icon icon-sm")}</button></span>`);
    const collectionLabels = { favorites: "Favorites", recent: "Recently played", offline: "Downloadable" };
    if (state.collection) push("collection", collectionLabels[state.collection] || state.collection);
    if (state.input) push("input", `Input: ${state.input}`);
    if (state.mode) push("mode", `Mode: ${state.mode}`);
    for (const tag of state.tags) push(`tag:${tag}`, tag);

    activeFilters.hidden = chips.length === 0;
    if (!chips.length) {
      activeFilters.innerHTML = "";
      return;
    }
    activeFilters.innerHTML = `${chips.join("")}<button class="btn btn-ghost btn-sm" type="button" data-clear-all>Clear all</button>`;
  }

  function renderAll() {
    syncControls();
    renderRows();
    renderGrid();
  }

  /* ------------------------------------------------------------------ *
   * Filter panel
   * ------------------------------------------------------------------ */

  function buildFilterControls() {
    const chipRow = (items, key) => items.map((item) =>
      `<button class="chip-toggle" type="button" data-value="${escapeHTML(item.value)}" aria-pressed="false">${escapeHTML(item.label)}</button>`).join("");

    collectionSet.innerHTML = chipRow(COLLECTIONS);
    inputSet.innerHTML = chipRow(INPUTS);
    modeSet.innerHTML = chipRow(MODES);

    const wire = (container, key) => container.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-value]");
      if (!button) return;
      state[key] = button.dataset.value;
      syncControls();
      renderGrid();
    });
    wire(collectionSet, "collection");
    wire(inputSet, "input");
    wire(modeSet, "mode");
    renderTagOptions();
  }

  function renderTagOptions() {
    const query = tagSearch.value.trim().toLowerCase();
    const allTags = [...new Set(games.flatMap(normalizedTags))].sort(compare);
    tagOptions.innerHTML = allTags
      .filter((tag) => tag.toLowerCase().includes(query))
      .map((tag) => `<label class="filter-tag"><input type="checkbox" value="${escapeHTML(tag)}"${state.tags.has(tag) ? " checked" : ""}>${escapeHTML(tag)}</label>`)
      .join("") || `<p class="muted-note">No tags match “${escapeHTML(tagSearch.value.trim())}”.</p>`;
  }

  function openFilters() {
    lastFiltersFocus = document.activeElement;
    filtersPanel.hidden = false;
    filtersScrim.hidden = false;
    filtersToggle.setAttribute("aria-expanded", "true");
    if (window.innerWidth < 768) document.body.style.overflow = "hidden";
    filtersClose.focus();
  }

  function closeFilters() {
    filtersPanel.hidden = true;
    filtersScrim.hidden = true;
    filtersToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (lastFiltersFocus instanceof HTMLElement) lastFiltersFocus.focus();
  }

  function clearAllFilters() {
    state.collection = "";
    state.input = "";
    state.mode = "";
    state.tags.clear();
    state.tagMatch = "any";
    tagSearch.value = "";
    renderTagOptions();
    syncControls();
    renderGrid();
  }

  function setupFilters() {
    filtersToggle.addEventListener("click", () => {
      if (filtersPanel.hidden) openFilters();
      else closeFilters();
    });
    filtersClose.addEventListener("click", closeFilters);
    filtersScrim.addEventListener("click", closeFilters);
    applyFilters.addEventListener("click", closeFilters);
    clearFilters.addEventListener("click", clearAllFilters);
    tagSearch.addEventListener("input", renderTagOptions);
    tagMatch.addEventListener("change", () => {
      state.tagMatch = tagMatch.value;
      renderTagOptions();
      renderGrid();
    });
    tagOptions.addEventListener("change", (event) => {
      const input = event.target.closest('input[type="checkbox"]');
      if (!input) return;
      if (input.checked) state.tags.add(input.value);
      else state.tags.delete(input.value);
      syncControls();
      renderGrid();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !filtersPanel.hidden) closeFilters();
    });
    activeFilters.addEventListener("click", (event) => {
      if (event.target.closest("[data-clear-all]")) {
        clearAllFilters();
        return;
      }
      const remove = event.target.closest("[data-remove]");
      if (!remove) return;
      const key = remove.dataset.remove;
      if (key === "collection") state.collection = "";
      else if (key === "input") state.input = "";
      else if (key === "mode") state.mode = "";
      else if (key.startsWith("tag:")) state.tags.delete(key.slice(4));
      syncControls();
      renderGrid();
    });
  }

  /* ------------------------------------------------------------------ *
   * Favorites, launch history, layout
   * ------------------------------------------------------------------ */

  function rememberLaunch(slug, played = true) {
    if (played) state.recent = [slug, ...state.recent.filter((item) => item !== slug)].slice(0, 20);
    try {
      localStorage.setItem(STORAGE.recent, JSON.stringify(state.recent));
      sessionStorage.setItem(STORAGE.catalog, JSON.stringify({
        version: 2,
        search: state.query,
        sort: state.sort,
        tagMatch: state.tagMatch,
        tags: [...state.tags],
        collection: state.collection,
        input: state.input,
        mode: state.mode,
        view: state.view,
        scroll: window.scrollY,
        slug,
      }));
    } catch {}
  }

  function toggleFavorite(slug) {
    const isFavorite = state.favorites.has(slug);
    if (isFavorite) state.favorites.delete(slug);
    else state.favorites.add(slug);
    try {
      localStorage.setItem(STORAGE.favorites, JSON.stringify([...state.favorites]));
    } catch {}
    const nowFavorite = !isFavorite;
    document.querySelectorAll(`[data-fav="${CSS.escape(slug)}"]`).forEach((button) => {
      const title = button.closest(".game-card")?.querySelector(".gcard-title")?.textContent?.trim() || "game";
      button.classList.toggle("is-on", nowFavorite);
      button.setAttribute("aria-pressed", String(nowFavorite));
      button.setAttribute("aria-label", `${nowFavorite ? "Remove from favorites" : "Add to favorites"}: ${title}`);
      button.dataset.tip = nowFavorite ? "In favorites" : "Add to favorites";
    });
    if (state.collection === "favorites") {
      renderGrid();
      syncControls();
    }
    renderRows();
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-clear-all]")) {
      clearAllFilters();
      return;
    }
    const favorite = event.target.closest("[data-fav]");
    if (favorite) {
      event.preventDefault();
      toggleFavorite(favorite.dataset.fav);
      return;
    }
    const launch = event.target.closest("[data-launch]");
    if (launch) rememberLaunch(launch.dataset.launch);
  });

  grid.addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement) event.target.remove();
  }, true);

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view === "list" ? "list" : "grid";
      try {
        localStorage.setItem(STORAGE.view, state.view);
      } catch {}
      syncControls();
      renderGrid();
    });
  });

  sort.addEventListener("change", () => {
    state.sort = sort.value;
    renderGrid();
  });

  const onMobileCatalogChange = () => {
    if (!loaded || state.sort !== "featured" || state.query.trim()) return;
    renderGrid();
  };
  if (typeof mobileCatalogQuery.addEventListener === "function") {
    mobileCatalogQuery.addEventListener("change", onMobileCatalogChange);
  } else if (typeof mobileCatalogQuery.addListener === "function") {
    mobileCatalogQuery.addListener(onMobileCatalogChange);
  }

  let searchTimer = null;
  search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = search.value;
      renderGrid();
    }, 90);
  });

  /* ------------------------------------------------------------------ *
   * Save backup & restore (unchanged storage keys and file format)
   * ------------------------------------------------------------------ */

  function safeFilename(value) {
    return String(value || "save").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "save";
  }

  function gameForStorageKey(key) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return games
      .filter((game) => normalizedKey.includes(game.slug.toLowerCase().replace(/[^a-z0-9]/g, "")))
      .sort((a, b) => b.slug.length - a.slug.length)[0] || null;
  }

  function downloadFile(payload, filename) {
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadSave(key, value) {
    const game = gameForStorageKey(key);
    const timestamp = new Date().toISOString();
    const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const payload = {
      format: SAVE_FILE_FORMAT,
      version: 1,
      exportedAt: timestamp,
      game: game ? { slug: game.slug, title: game.title } : null,
      storage: { type: "localStorage", key, value },
    };
    downloadFile(payload, `givegigsgames-${safeFilename(game?.slug || "browser")}-${safeFilename(key)}-${timestamp.replace(/[:.]/g, "-")}-${uniqueId}.txt`);
  }

  function downloadAllSaves() {
    try {
      const saves = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key === null || key.startsWith("arcade:")) continue;
        const value = localStorage.getItem(key);
        if (value !== null) saves.push({ type: "localStorage", key, value });
      }
      if (!saves.length) {
        saveManagerStatus.textContent = "No saves to download.";
        return;
      }
      downloadFile({ format: "givegigsgames-backup", version: 1, saves }, "givegigsgames-backup.txt");
    } catch {
      saveManagerStatus.textContent = "Browser saves could not be exported.";
    }
  }

  function renderSaveFiles() {
    saveFileList.replaceChildren();
    try {
      const entries = Array.from({ length: localStorage.length }, (_, index) => {
        const key = localStorage.key(index);
        return key === null ? null : { key, value: localStorage.getItem(key) };
      }).filter((entry) => entry && entry.value !== null && !entry.key.startsWith("arcade:"))
        .sort((a, b) => compare(gameForStorageKey(a.key)?.title || "", gameForStorageKey(b.key)?.title || "") || compare(a.key, b.key));

      saveManagerStatus.textContent = entries.length
        ? `${entries.length} browser storage ${entries.length === 1 ? "entry" : "entries"} found.`
        : "No browser save data found for this site yet.";

      for (const entry of entries) {
        const game = gameForStorageKey(entry.key);
        const row = document.createElement("div");
        row.className = "save-file-row";
        const description = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = game?.title || "Browser save data";
        const keyLabel = document.createElement("code");
        keyLabel.textContent = entry.key;
        description.append(title, keyLabel);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-secondary btn-sm";
        button.textContent = "Download .txt";
        button.addEventListener("click", () => downloadSave(entry.key, entry.value));
        row.append(description, button);
        saveFileList.append(row);
      }
    } catch {
      saveManagerStatus.textContent = "This browser does not allow access to this site's local save data.";
    }
  }

  async function restoreSaveFiles(files) {
    const parsed = [];
    const errors = [];
    for (const file of files) {
      try {
        const payload = JSON.parse(await file.text());
        const saves = payload?.version === 1 && payload.format === "givegigsgames-backup"
          ? payload.saves
          : payload?.version === 1 && payload.format === SAVE_FILE_FORMAT ? [payload.storage] : null;
        if (!Array.isArray(saves) || !saves.length || saves.some((save) =>
          save?.type !== "localStorage" || typeof save.key !== "string" ||
          !save.key.trim() || save.key.startsWith("arcade:") || typeof save.value !== "string")) {
          throw new Error("This is not a supported GiveGigsGames save file.");
        }
        for (const { key, value } of saves) parsed.push({ file, key, value });
      } catch (error) {
        errors.push(`${file.name}: ${error.message || "could not be read"}`);
      }
    }
    if (!parsed.length) {
      saveManagerStatus.textContent = errors.join(" ") || "No save files were selected.";
      return;
    }

    const dialog = byId("restore-dialog");
    const options = byId("restore-options");
    const unique = [...new Map(parsed.map((item) => [item.key, item])).values()];
    options.replaceChildren();
    const choices = [];
    try {
      for (const item of unique) {
        const exists = localStorage.getItem(item.key) !== null;
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = !exists;
        const game = gameForStorageKey(item.key);
        label.append(checkbox, ` ${game?.title || "Browser save"}, ${item.key}, ${exists ? "Replaces existing save" : "New save"}`);
        options.append(label);
        choices.push({ item, checkbox });
      }
    } catch {
      saveManagerStatus.textContent = "This browser does not allow access to this site's local save data.";
      return;
    }
    dialog.returnValue = "cancel";
    dialog.showModal();
    await new Promise((resolve) => dialog.addEventListener("close", resolve, { once: true }));
    if (dialog.returnValue !== "restore") {
      saveManagerStatus.textContent = "Restore cancelled. Existing saves were not changed.";
      return;
    }

    let restored = 0;
    for (const { item, checkbox } of choices) {
      if (!checkbox.checked) continue;
      try {
        localStorage.setItem(item.key, item.value);
        restored += 1;
      } catch (error) {
        errors.push(`${item.file.name}: could not restore (${error.message || "storage unavailable"})`);
      }
    }
    renderSaveFiles();
    const summary = `${restored} save file${restored === 1 ? "" : "s"} restored. Reload the game to apply its save.`;
    saveManagerStatus.textContent = errors.length ? `${summary} ${errors.join(" ")}` : summary;
  }

  byId("download-all-saves").addEventListener("click", downloadAllSaves);
  saveFileInput.addEventListener("change", async () => {
    const files = Array.from(saveFileInput.files || []);
    if (files.length) await restoreSaveFiles(files);
    saveFileInput.value = "";
  });

  /* ------------------------------------------------------------------ *
   * Hash navigation and boot
   * ------------------------------------------------------------------ */

  function handleHash(scroll = true) {
    const hash = location.hash.replace("#", "");
    if (hash === "favorites" || hash === "recent") {
      state.collection = hash;
      syncControls();
      renderGrid();
      if (scroll) byId("all-games").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    } else if (hash === "settings") {
      if (scroll) byId("settings").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    } else if (hash === "all-games") {
      state.collection = "";
      state.input = "";
      state.mode = "";
      state.tags.clear();
      tagSearch.value = "";
      renderTagOptions();
      syncControls();
      renderGrid();
      if (scroll) byId("all-games").scrollIntoView({ block: "start" });
    }
  }

  window.addEventListener("hashchange", () => handleHash(true));

  // The play page links back to /ggg/#all-games, so restore the last catalog view
  // for that entry point only. Storage keys and payload shape are unchanged.
  function restoreSession() {
    if (location.hash !== "#all-games") return null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE.catalog) || "null");
      if (!saved || saved.version !== 2) return null;
      state.query = typeof saved.search === "string" ? saved.search : "";
      const sortValues = [...sort.options].map((option) => option.value);
      if (sortValues.includes(saved.sort)) state.sort = saved.sort;
      state.tagMatch = saved.tagMatch === "all" ? "all" : "any";
      state.collection = ["favorites", "recent", "offline"].includes(saved.collection) ? saved.collection : "";
      state.input = ["touch", "keyboard", "gamepad"].includes(saved.input) ? saved.input : "";
      state.mode = ["solo", "multiplayer"].includes(saved.mode) ? saved.mode : "";
      state.tags = new Set((saved.tags || []).filter((tag) => typeof tag === "string"));
      if (saved.view === "list" || saved.view === "grid") state.view = saved.view;
      return saved;
    } catch {
      return null;
    }
  }

  async function loadCatalog() {
    loaded = false;
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = skeletonHTML();
    error.hidden = true;
    count.textContent = "Loading catalog…";

    try {
      let catalog = null;
      if (location.protocol === "http:" || location.protocol === "https:") {
        try {
          const response = await fetch("/games/catalog.json", { cache: "no-store" });
          if (response.ok) catalog = await response.json();
        } catch {}
      }
      if (!catalog) catalog = window.GIVEGIGSGAMES_CATALOG;
      if (!catalog || !Array.isArray(catalog.games)) throw new Error("Catalog data is missing.");
      games = catalog.games.filter((game) => !game.hiddenFromCatalog);
      loaded = true;
      setupHero();
      setupTicker();
      buildFilterControls();
      const restored = restoreSession();
      renderAll();
      renderSaveFiles();
      if (restored) {
        if (Number.isFinite(restored.scroll)) window.scrollTo({ top: restored.scroll, behavior: "instant" });
      } else {
        handleHash(false);
      }
      document.documentElement.classList.remove("is-booting");
    } catch {
      count.textContent = "";
      grid.innerHTML = "";
      grid.setAttribute("aria-busy", "false");
      error.hidden = false;
      document.documentElement.classList.remove("is-booting");
    }
  }

  retry.addEventListener("click", loadCatalog);

  setupFilters();
  setupPreviews();
  loadCatalog();
})();
