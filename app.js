/**
 * Anonymous demo UI — loads data.json only. No external author metadata.
 */

/** Strip numeric prefix, underscores → spaces, title case (e.g. 05_human_dog → Human Dog). */
function formatKeywordForDisplay(keyword) {
  const raw = keyword.replace(/^\d+_/, "").replace(/_/g, " ").trim();
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function codeInline(text) {
  const c = el("code", "rounded bg-surface-raised px-1 py-0.5 text-slate-200");
  c.textContent = text;
  return c;
}

function createDetails({ title, subtitle, open = false, content }) {
  const d = document.createElement("details");
  d.open = open;
  d.className =
    "group rounded-xl border border-surface-border bg-surface-raised/25";

  const s = document.createElement("summary");
  s.className =
    "cursor-pointer list-none select-none px-4 py-3 hover:bg-white/5";

  const row = el("div", "flex items-start justify-between gap-4");
  const left = el("div", "min-w-0");
  left.appendChild(el("p", "text-sm font-semibold text-white", title));
  if (subtitle) {
    left.appendChild(el("p", "mt-1 text-xs text-slate-400", subtitle));
  }
  const chevron = el(
    "span",
    "mt-0.5 shrink-0 text-slate-400 transition-transform group-open:rotate-90",
    "›"
  );
  row.appendChild(left);
  row.appendChild(chevron);
  s.appendChild(row);

  const body = el("div", "px-4 pb-4 pt-1");
  body.appendChild(content);
  d.appendChild(s);
  d.appendChild(body);
  return d;
}

function jsonToLines(value) {
  try {
    return JSON.stringify(value, null, 2).split("\n");
  } catch {
    return [String(value)];
  }
}

function renderFoldedCodeBlock(lines, { previewLines = 40 } = {}) {
  const wrap = el("div", "space-y-3");
  const mkPre = (subset) => {
    const pre = el(
      "pre",
      "whitespace-pre-wrap break-words rounded-lg border border-surface-border/70 bg-black/30 p-3 text-xs leading-relaxed text-slate-200"
    );
    pre.textContent = subset.join("\n");
    return pre;
  };

  if (lines.length <= previewLines) {
    wrap.appendChild(mkPre(lines));
    return wrap;
  }

  wrap.appendChild(mkPre(lines.slice(0, previewLines)));
  const rest = el("div");
  rest.appendChild(mkPre(lines.slice(previewLines)));
  wrap.appendChild(
    createDetails({
      title: `Show remaining ${lines.length - previewLines} lines`,
      open: false,
      content: rest,
    })
  );
  return wrap;
}

function renderCodeBlock(lines) {
  const pre = el(
    "pre",
    "whitespace-pre-wrap break-words rounded-lg border border-surface-border/70 bg-black/30 p-3 text-xs leading-relaxed text-slate-200"
  );
  pre.textContent = lines.join("\n");
  return pre;
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return await res.json();
}

async function fetchText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return await res.text();
}

/**
 * GitHub Pages does not serve Git LFS objects from the Pages origin; it serves the tiny LFS pointer file.
 * When deployed under github.io, rewrite repo-relative media paths to a GitHub-hosted raw download URL.
 */
function resolveMediaPath(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const cleaned = path.replace(/^[./]+/, "");
  const isGitHubPages = window.location.hostname.endsWith("github.io");
  if (!isGitHubPages) return `./${cleaned}`;
  // This URL redirects to media.githubusercontent.com and serves the actual LFS object.
  return `https://github.com/anonreview333/clips2story/raw/main/${cleaned}`;
}

function buildFramesStrip(videoPath, { startIndex = 1, maxFrames = 30 } = {}) {
  if (!videoPath) return null;
  // videoPath is repo-relative like "vlog/1/vlog_03_teasergen.mp4"
  const parts = String(videoPath).replace(/^[./]+/, "").split("/");
  if (parts.length < 3) return null;
  const genre = parts[0];
  const id = parts[1];
  const filename = parts[parts.length - 1];
  const base = filename.replace(/\.mp4$/i, "");
  const framesBase = `${genre}/${id}/frames/${base}`;

  const strip = document.createElement("div");
  strip.className =
    "mt-2 flex gap-2 overflow-x-auto rounded-lg border border-surface-border/60 bg-black/20 p-2";
  strip.setAttribute("aria-label", "Thumbnail frames");

  for (let i = startIndex; i < startIndex + maxFrames; i++) {
    const img = document.createElement("img");
    const num = String(i).padStart(6, "0");
    img.src = resolveMediaPath(`${framesBase}/frame_${num}.png`);
    img.loading = "lazy";
    img.alt = `Frame ${i}`;
    img.className =
      "h-14 w-auto shrink-0 rounded-md border border-surface-border/60 bg-black object-cover";
    img.addEventListener("error", () => {
      img.remove();
    });
    strip.appendChild(img);
  }

  return strip;
}

function buildFramesGrid(videoPath, { startIndex = 1, count = 12 } = {}) {
  if (!videoPath) return null;
  const parts = String(videoPath).replace(/^[./]+/, "").split("/");
  if (parts.length < 3) return null;
  const genre = parts[0];
  const id = parts[1];
  const filename = parts[parts.length - 1];
  const base = filename.replace(/\.mp4$/i, "");
  const framesBase = `${genre}/${id}/frames/${base}`;

  const grid = el(
    "div",
    "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
  );
  grid.setAttribute("aria-label", "Thumbnail frames");

  for (let i = startIndex; i < startIndex + count; i++) {
    const img = document.createElement("img");
    const num = String(i).padStart(6, "0");
    img.src = resolveMediaPath(`${framesBase}/frame_${num}.png`);
    img.loading = "lazy";
    img.alt = `Frame ${i}`;
    img.className =
      "aspect-video w-full rounded-md border border-surface-border/60 bg-black object-cover";
    img.addEventListener("error", () => {
      img.remove();
    });
    grid.appendChild(img);
  }

  return grid;
}

function buildFramesGridFolded(
  videoPath,
  { previewCount = 12, maxFrames = 30 } = {}
) {
  const wrap = el("div", "space-y-3");

  const preview = buildFramesGrid(videoPath, { startIndex: 1, count: previewCount });
  if (preview) wrap.appendChild(preview);

  const remaining = Math.max(0, maxFrames - previewCount);
  if (!remaining) return wrap;

  const restHolder = el("div");
  let rendered = false;
  const details = createDetails({
    title: `Show all frames`,
    open: false,
    content: restHolder,
  });
  details.addEventListener("toggle", () => {
    if (!details.open || rendered) return;
    const full = buildFramesGrid(videoPath, { startIndex: 1, count: maxFrames });
    if (full) restHolder.appendChild(full);
    rendered = true;
  });
  wrap.appendChild(details);
  return wrap;
}

function buildGenreButtons(genres, activeId, onSelect) {
  const mkBtn = (g, isMobile) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.genre = g.id;
    const base =
      "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ";
    const active =
      "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40";
    const inactive = "text-slate-400 hover:bg-white/5 hover:text-slate-200";
    btn.className = base + (g.id === activeId ? active : inactive);
    if (isMobile) btn.classList.add("shrink-0");
    else btn.classList.add("w-full", "text-left");
    btn.textContent = g.label;
    btn.addEventListener("click", () => onSelect(g.id));
    return btn;
  };

  const mobile = document.getElementById("genre-tabs-mobile");
  const desktop = document.getElementById("genre-tabs-desktop");
  mobile.innerHTML = "";
  desktop.innerHTML = "";
  const title = document.createElement("p");
  title.className =
    "mb-2 hidden text-xs font-semibold uppercase tracking-wider text-slate-500 lg:block";
  title.textContent = "Pages";
  desktop.appendChild(title);

  const pages = [{ id: "home", label: "Home" }, ...genres];
  for (const g of pages) {
    mobile.appendChild(mkBtn(g, true));
    desktop.appendChild(mkBtn(g, false));
  }
}

function renderGenreSections(genres) {
  const container = document.getElementById("genre-sections");
  container.innerHTML = "";

  const home = document.createElement("div");
  home.id = "genre-panel-home";
  home.dataset.genrePanel = "home";
  home.className = "genre-panel hidden space-y-6 pb-16";
  home.appendChild(renderHomePanel());
  container.appendChild(home);

  for (const g of genres) {
    const wrap = document.createElement("div");
    wrap.id = `genre-panel-${g.id}`;
    wrap.dataset.genrePanel = g.id;
    wrap.className = "genre-panel hidden space-y-16 pb-16";

    if (g.sets.length === 0) {
      const empty = document.createElement("p");
      empty.className = "text-slate-500";
      empty.textContent = "No examples in this category.";
      wrap.appendChild(empty);
      container.appendChild(wrap);
      continue;
    }

    for (const set of g.sets) {
      const block = document.createElement("article");
      block.className =
        "rounded-2xl border border-surface-border bg-surface-raised/30 p-4 shadow-xl shadow-black/20 sm:p-6";

      const heading = document.createElement("h2");
      heading.className = "text-lg font-semibold text-white sm:text-xl";
      heading.textContent = `Source video`;

      const originalSection = document.createElement("div");
      originalSection.className = "mt-4 max-w-xs sm:max-w-sm";

      const originalLabel = document.createElement("p");
      originalLabel.className =
        "mb-2 text-xs font-medium uppercase tracking-wide text-slate-500";
      originalLabel.textContent = "Original source";

      originalSection.appendChild(originalLabel);
      if (set.sourceLocal) {
        const vid = document.createElement("video");
        vid.className =
          "w-full overflow-hidden rounded-lg border border-surface-border/80 bg-black aspect-video object-contain shadow-inner";
        vid.controls = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = "metadata";
        vid.src = resolveMediaPath(set.sourceLocal);
        originalSection.appendChild(vid);
      } else {
        const iframeWrap = document.createElement("div");
        iframeWrap.className =
          "overflow-hidden rounded-lg border border-surface-border/80 bg-black aspect-video w-full shadow-inner";
        const iframe = document.createElement("iframe");
        iframe.className = "h-full w-full";
        iframe.src = set.youtubeEmbed;
        iframe.title = "Original source video";
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        );
        iframe.loading = "lazy";
        iframeWrap.appendChild(iframe);
        originalSection.appendChild(iframeWrap);
      }

      const mkVideoCell = (label, src) => {
        const cell = document.createElement("div");
        cell.className = "flex flex-col gap-2";
        const lab = document.createElement("p");
        lab.className =
          "text-center text-xs font-semibold uppercase tracking-wide text-slate-400";
        lab.textContent = label;
        const vid = document.createElement("video");
        vid.className =
          "w-full rounded-lg border border-surface-border bg-black aspect-video object-contain";
        vid.controls = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = "metadata";
        vid.src = resolveMediaPath(src);
        cell.appendChild(lab);
        cell.appendChild(vid);
        const strip = buildFramesStrip(src);
        if (strip) cell.appendChild(strip);
        return cell;
      };

      const mkKeywordBlock = (kw) => {
        const wrap = document.createElement("section");
        wrap.className = "mt-10 space-y-3";
        const h = document.createElement("p");
        h.className = "text-sm font-semibold text-slate-200";
        h.textContent = `Target Keyword: ${formatKeywordForDisplay(kw.keyword)}`;
        const grid = document.createElement("div");
        grid.className = "grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-4";
        grid.appendChild(mkVideoCell("Clips2Story-NF", kw.local?.nf));
        grid.appendChild(mkVideoCell("Clips2Story-ND", kw.local?.ours));
        wrap.appendChild(h);
        wrap.appendChild(grid);
        return wrap;
      };

      const mkFixedBlock = (fixed) => {
        const wrap = document.createElement("section");
        wrap.className = "mt-10 space-y-3";
        const h = document.createElement("p");
        h.className = "text-sm font-semibold text-slate-200";
        h.textContent = "Baselines";
        const grid = document.createElement("div");
        grid.className = "grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-4";
        grid.appendChild(mkVideoCell("A2Summ", fixed?.a2summ));
        grid.appendChild(mkVideoCell("TeaserGen", fixed?.teasergen));
        grid.appendChild(mkVideoCell("REGen", fixed?.regen));
        wrap.appendChild(h);
        wrap.appendChild(grid);
        return wrap;
      };

      block.appendChild(heading);
      block.appendChild(originalSection);
      for (const kw of set.keywords || []) block.appendChild(mkKeywordBlock(kw));
      block.appendChild(mkFixedBlock(set.fixed));
      wrap.appendChild(block);
    }

    container.appendChild(wrap);
  }
}

function setActiveGenre(genreId) {
  document.querySelectorAll("[data-genre-panel]").forEach((el) => {
    el.classList.toggle("hidden", el.dataset.genrePanel !== genreId);
  });
  const active =
    "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40";
  const inactive = "text-slate-400 hover:bg-white/5 hover:text-slate-200";
  document.querySelectorAll("#genre-tabs-mobile button").forEach((btn) => {
    const on = btn.dataset.genre === genreId;
    btn.className =
      "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0 " +
      (on ? active : inactive);
  });
  document.querySelectorAll("#genre-tabs-desktop button").forEach((btn) => {
    const on = btn.dataset.genre === genreId;
    btn.className =
      "w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
      (on ? active : inactive);
  });
}

function youtubeWatchToEmbed(watchUrl) {
  try {
    const u = new URL(watchUrl);
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
  } catch {
    // ignore
  }
  return watchUrl;
}

function parseCsvRow(csvText, predicate) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const header = lines[0].split(",").map((s) => s.trim());
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((s) => s.trim());
    const row = Object.fromEntries(header.map((h, idx) => [h, parts[idx]]));
    if (predicate(row)) return row;
  }
  return null;
}

function renderKeyframeGrid({ title, shotIds, size = "sm" }) {
  const card = el("div", "space-y-3");
  card.appendChild(el("p", "text-sm font-semibold text-slate-200", title));
  const grid = el(
    "div",
    "grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
  );

  const imgClass =
    size === "lg"
      ? "aspect-video w-full rounded-lg border border-surface-border bg-black object-cover"
      : "aspect-video w-full rounded-md border border-surface-border/70 bg-black object-cover";

  for (const shotId of shotIds) {
    const cell = el("div", "space-y-2");
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = `${shotId} keyframe`;
    img.className = imgClass;
    img.src = resolveMediaPath(`example/keyframes/${shotId}/frame_0.jpg`);
    img.addEventListener("error", () => cell.remove());
    cell.appendChild(img);
    const cap = el(
      "p",
      "truncate text-[11px] font-medium text-slate-400",
      shotId
    );
    cell.appendChild(cap);
    grid.appendChild(cell);
  }

  card.appendChild(grid);
  return card;
}

function renderKeyframeGridWithRemainder({
  title,
  shotIds,
  previewCount = 24,
  size = "sm",
}) {
  const wrap = el("div", "space-y-3");
  const head = el("div", "flex flex-wrap items-baseline justify-between gap-2");
  head.appendChild(el("p", "text-sm font-semibold text-slate-200", title));
  head.appendChild(el("p", "text-xs text-slate-500", `${shotIds.length} shots`));
  wrap.appendChild(head);

  const preview = shotIds.slice(0, previewCount);
  const rest = shotIds.slice(previewCount);
  wrap.appendChild(renderKeyframeGrid({ title: "Preview", shotIds: preview, size }));

  if (rest.length) {
    const restHolder = el("div");
    let rendered = false;
    const details = createDetails({
      title: `Show remaining ${rest.length} keyframes`,
      subtitle: "Expands to render the rest of the thumbnails.",
      open: false,
      content: restHolder,
    });
    details.addEventListener("toggle", () => {
      if (!details.open || rendered) return;
      restHolder.appendChild(
        renderKeyframeGrid({ title: "Remaining keyframes", shotIds: rest, size })
      );
      rendered = true;
    });
    wrap.appendChild(details);
  }

  return wrap;
}

function renderHomePanel() {
  const wrap = el("div", "space-y-6");

  const intro = el(
    "div",
    "rounded-2xl border border-surface-border bg-surface-raised/30 p-5 shadow-xl shadow-black/20"
  );
  intro.appendChild(
    el(
      "h2",
      "text-lg font-semibold text-white sm:text-xl",
      "End-to-end workflow demo"
    )
  );
  const p = el(
    "p",
    "mt-2 max-w-4xl text-sm leading-relaxed text-slate-300"
  );
  p.append(
    "This page walks through a single example from input video → shots → metadata → retrieval pool → prompt → LLM timeline → narration–visual matching."
  );
  intro.appendChild(p);
  wrap.appendChild(intro);

  const steps = el("div", "space-y-4");
  const loading = el(
    "p",
    "text-sm text-slate-400",
    "Loading workflow data…"
  );
  steps.appendChild(loading);
  wrap.appendChild(steps);

  (async () => {
    try {
      const [csvText, shots, entities, background, captions, asr, ragPool, promptText, stage1, stage2, siteData] =
        await Promise.all([
          fetchText("./demo_video_links.csv"),
          fetchJson("./example/shots/shots.json"),
          fetchJson("./example/entities/entities.json"),
          fetchJson("./example/background/background.json"),
          fetchJson("./example/captions/captions.json"),
          fetchJson("./example/asr/asr.json"),
          fetchJson(
            "./example/plan_inputs/rag_stage1_pool_none_05_human_dog_interaction.json"
          ),
          fetchText("./example/prompt/05_human_dog_interaction.txt"),
          fetchJson("./example/plans/stage1/none/05_human_dog_interaction.json"),
          fetchJson("./example/plans/stage2/none/05_human_dog_interaction.json"),
          fetchJson("./data.json"),
        ]);

      const row = parseCsvRow(
        csvText,
        (r) => r.genre === "documentary" && r.id === "2"
      );
      const youtubeEmbed = youtubeWatchToEmbed(row?.youtube_link || "");

      const shotIds = Array.isArray(shots)
        ? shots.map((s) => s.shot_id).filter(Boolean)
        : [];

      const TOP_SHOTS = 6;
      const topShotIds = shotIds.slice(0, TOP_SHOTS);
      const restShotIds = shotIds.slice(TOP_SHOTS);

      const summarizeEntities = (v) => {
        const arr = v?.[0]?.entities || [];
        const names = arr.map((e) => e?.name).filter(Boolean);
        return names.length ? names.join(", ") : "";
      };
      const summarizeBackground = (v) => v?.[0]?.background?.label || "";
      const summarizeCaption = (v) => v?.[0]?.caption || "";
      const summarizeAsr = (v) => {
        const segs = Array.isArray(v) ? v : [];
        const texts = segs
          .slice(0, 3)
          .map((s) => s?.text)
          .filter(Boolean);
        return texts.join(" ");
      };

      const metadataBlockForShots = (ids) => {
        const list = el("div", "space-y-3");
        for (const id of ids) {
          const card = el(
            "div",
            "rounded-xl border border-surface-border/70 bg-black/20 p-4"
          );
          const h = el("div", "flex flex-wrap items-center gap-2");
          h.appendChild(
            el("p", "text-sm font-semibold text-white", id)
          );
          h.appendChild(
            el(
              "p",
              "text-xs text-slate-500",
              "caption • background • entities • ASR"
            )
          );
          card.appendChild(h);

          const dl = el("div", "mt-3 grid gap-3 md:grid-cols-2");
          const item = (label, value) => {
            const b = el("div");
            b.appendChild(
              el(
                "p",
                "text-[11px] font-semibold uppercase tracking-wide text-slate-500",
                label
              )
            );
            b.appendChild(
              el(
                "p",
                "mt-1 text-sm leading-relaxed text-slate-200",
                value || "—"
              )
            );
            return b;
          };
          dl.appendChild(item("Caption", summarizeCaption(captions[id])));
          dl.appendChild(item("Background", summarizeBackground(background[id])));
          dl.appendChild(item("Entities", summarizeEntities(entities[id])));
          dl.appendChild(item("ASR", summarizeAsr(asr[id])));
          card.appendChild(dl);
          list.appendChild(card);
        }
        return list;
      };

      const selectedShotIds = new Set(
        (ragPool?.clips || []).map((c) => c?.shot_id).filter(Boolean)
      );
      const filtered = shotIds.filter((id) => selectedShotIds.has(id));

      const promptLines = promptText.split(/\r?\n/);
      const startIdx = promptLines.findIndex((l) =>
        l.trim().startsWith("AVAILABLE CLIPS (UNORDERED POOL)")
      );
      const taskIdx = promptLines.findIndex((l) => l.trim() === "TASK");
      const clipStartIdx =
        startIdx >= 0 ? startIdx + 1 : 0;
      const clipBulletIdxs = [];
      const clipEndExclusive =
        taskIdx >= 0 ? taskIdx : promptLines.length;
      for (let i = clipStartIdx; i < clipEndExclusive; i++) {
        if (/^\s*-\s*clip_id=/.test(promptLines[i])) clipBulletIdxs.push(i);
      }
      const keepClips = 3;
      const cutoffLine =
        clipBulletIdxs.length > keepClips ? clipBulletIdxs[keepClips] : -1;

      // Show: everything up to the first 2–3 clip examples, plus everything from TASK onward.
      // Collapse: only the remaining clip list between those points.
      const promptPreview = (() => {
        if (cutoffLine > 0 && taskIdx > cutoffLine) {
          return [...promptLines.slice(0, cutoffLine), ...promptLines.slice(taskIdx)];
        }
        return promptLines;
      })();
      const promptRest =
        cutoffLine > 0 && taskIdx > cutoffLine
          ? promptLines.slice(cutoffLine, taskIdx)
          : [];

      steps.innerHTML = "";

      // Step 1
      const step1 = el("div", "space-y-3");
      const vWrap = el(
        "div",
        "overflow-hidden rounded-xl border border-surface-border bg-black aspect-video w-full shadow-inner"
      );
      const iframe = document.createElement("iframe");
      iframe.className = "h-full w-full";
      iframe.src = youtubeEmbed;
      iframe.title = "Input video (documentary, 2)";
      iframe.setAttribute("allowfullscreen", "");
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      );
      iframe.loading = "lazy";
      vWrap.appendChild(iframe);
      step1.appendChild(vWrap);
      steps.appendChild(
        createDetails({
          title: "1) Input Video",
          subtitle: "Example YouTube source video used for the pipeline.",
          open: true,
          content: step1,
        })
      );

      // Step 2
      const step2 = el("div", "space-y-3");
      step2.appendChild(
        el(
          "p",
          "text-sm text-slate-300",
          "Shot detection produces a list of temporal segments."
        )
      );
      const previewShots = shots.slice(0, TOP_SHOTS);
      const restShots = shots.slice(TOP_SHOTS);
      step2.appendChild(
        renderFoldedCodeBlock(jsonToLines(previewShots), { previewLines: 80 })
      );
      if (restShots.length) {
        step2.appendChild(
          createDetails({
            title: `Show remaining ${restShots.length} shots`,
            subtitle: "Folded to keep the page readable.",
            open: false,
            content: renderFoldedCodeBlock(jsonToLines(restShots), {
              previewLines: 80,
            }),
          })
        );
      }
      steps.appendChild(
        createDetails({
          title: "2) Shot Detection",
          open: false,
          content: step2,
        })
      );

      // Step 3
      const step3 = el("div", "space-y-4");
      step3.appendChild(
        el(
          "p",
          "text-sm text-slate-300",
          "For each shot, we collect multimodal metadata (entities, background, captions, and ASR segments)."
        )
      );
      step3.appendChild(
        createDetails({
          title: `Top ${topShotIds.length} shots`,
          open: true,
          content: metadataBlockForShots(topShotIds),
        })
      );
      if (restShotIds.length) {
        step3.appendChild(
          createDetails({
            title: `Remaining ${restShotIds.length} shots`,
            subtitle: "Same metadata fields, folded for length.",
            open: false,
            content: metadataBlockForShots(restShotIds),
          })
        );
      }
      steps.appendChild(
        createDetails({
          title: "3) Metadata Collection",
          open: false,
          content: step3,
        })
      );

      // Step 4
      const step4 = el("div", "space-y-4");
      const expl = el("p", "text-sm text-slate-300");
      expl.textContent =
        "We start with all shot keyframes, then filter to the subset selected for the retrieval pool.";
      step4.appendChild(expl);

      step4.appendChild(
        createDetails({
          title: `All keyframes (${shotIds.length})`,
          open: false,
          content: renderKeyframeGridWithRemainder({
            title: "All keyframes",
            shotIds,
            previewCount: 24,
          }),
        })
      );
      step4.appendChild(
        createDetails({
          title: `Filtered keyframes (${filtered.length})`,
          open: true,
          content: renderKeyframeGridWithRemainder({
            title: "Filtered keyframes",
            shotIds: filtered,
            previewCount: 24,
          }),
        })
      );
      steps.appendChild(
        createDetails({
          title: "4) Keyword-Based Clip Retrieval",
          open: false,
          content: step4,
        })
      );

      // Step 5
      const step5 = el("div", "space-y-3");
      step5.appendChild(
        el(
          "p",
          "text-sm text-slate-300"
        )
      );
      step5.appendChild(
        renderCodeBlock(promptPreview)
      );
      if (promptRest.length) {
        const remainingClipCount = Math.max(
          0,
          clipBulletIdxs.length - keepClips
        );
        step5.appendChild(
          createDetails({
            title: `Show remaining clips (${remainingClipCount} more)`,
            open: false,
            content: renderCodeBlock(promptRest),
          })
        );
      }
      steps.appendChild(
        createDetails({
          title: "5) LLM Prompt Example",
          open: false,
          content: step5,
        })
      );

      // Step 6
      const step6 = el("div", "space-y-3");
      step6.appendChild(
        el(
          "p",
          "text-sm text-slate-300",
          "The initial narration + clip timeline JSON."
        )
      );
      step6.appendChild(renderFoldedCodeBlock(jsonToLines(stage1), { previewLines: 90 }));
      steps.appendChild(
        createDetails({
          title: "6) LLM Timeline Output",
          open: false,
          content: step6,
        })
      );

      // Step 7
      const step7 = el("div", "space-y-3");
      step7.appendChild(
        el(
          "p",
          "text-sm text-slate-300",
          "Narration to visual matching and outputs a final timeline."
        )
      );
      step7.appendChild(
        renderFoldedCodeBlock(jsonToLines(stage2), { previewLines: 120 })
      );
      steps.appendChild(
        createDetails({
          title: "7) Narration–Visual Matching (Clips2Story-ND Only)",
          open: false,
          content: step7,
        })
      );

      steps.appendChild(renderFinalFramesComparisonSection(siteData));
    } catch (e) {
      steps.innerHTML = "";
      const err = el(
        "div",
        "rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"
      );
      err.appendChild(
        el("p", "text-sm font-semibold text-amber-200", "Failed to load workflow demo data.")
      );
      err.appendChild(
        el(
          "p",
          "mt-2 text-sm text-slate-300",
          "Make sure you are serving the folder over HTTP (not opening index.html directly)."
        )
      );
      err.appendChild(
        el("p", "mt-2 text-xs text-slate-400", String(e?.message || e))
      );
      steps.appendChild(err);
    }
  })();

  return wrap;
}

function renderFinalFramesComparisonSection(siteData) {
  const outer = el(
    "div",
    "mt-8 rounded-2xl border border-surface-border bg-surface-raised/20 p-5 shadow-xl shadow-black/10"
  );
  outer.appendChild(
    el("h3", "text-base font-semibold text-white", "Final generated frames comparison")
  );
  outer.appendChild(
    el(
      "p",
      "mt-2 max-w-4xl text-sm leading-relaxed text-slate-300",
      "Compare the final output frames across models and keywords for each source video."
    )
  );

  const genres = siteData?.genres || [];
  const stack = el("div", "mt-4 space-y-4");
  let firstVideo = true;

  for (const g of genres) {
    for (const set of g.sets || []) {
      const title = `${g.label} • Video ${set.id}`;
      const content = el("div", "space-y-5");

      const modelBlock = (modelName, keyAccessor) => {
        const block = el("div", "space-y-3");
        block.appendChild(
          el(
            "p",
            "text-sm font-semibold text-slate-200",
            `Model: ${modelName}`
          )
        );

        for (const kw of set.keywords || []) {
          const keywordLabel = formatKeywordForDisplay(kw.keyword || "");
          const videoPath = keyAccessor(kw);
          const frames = el("div", "space-y-2");
          const grid = buildFramesGrid(videoPath, { startIndex: 1, count: 30 });
          if (grid) frames.appendChild(grid);

          block.appendChild(
            createDetails({
              title: keywordLabel || "Keyword",
              open: true,
              content: frames,
            })
          );
        }

        return block;
      };

      content.appendChild(modelBlock("Clips2Story-NF", (kw) => kw?.local?.nf));
      content.appendChild(modelBlock("Clips2Story-ND", (kw) => kw?.local?.ours));

      stack.appendChild(
        createDetails({
          title,
          open: firstVideo,
          content,
        })
      );
      firstVideo = false;
    }
  }

  outer.appendChild(stack);
  return outer;
}

async function main() {
  let data;
  try {
    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch {
    document.getElementById("load-error").classList.remove("hidden");
    return;
  }

  document.getElementById("project-title").textContent = data.projectTitle;

  const genres = data.genres || [];
  renderGenreSections(genres);

  const first = "home";
  let active = first;

  buildGenreButtons(genres, active, (id) => {
    active = id;
    setActiveGenre(id);
  });

  setActiveGenre(active);
  document.getElementById("app").classList.remove("hidden");
}

main();
