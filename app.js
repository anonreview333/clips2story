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

/** Visible workflow section (not collapsible); use for main steps 1–7 on the home panel. */
function createWorkflowStep({ title, subtitle, content }) {
  const wrap = el(
    "div",
    "rounded-xl border border-surface-border bg-surface-raised/25 p-4 space-y-3"
  );
  wrap.appendChild(el("p", "text-sm font-semibold text-white", title));
  if (subtitle) {
    wrap.appendChild(el("p", "text-sm text-slate-400", subtitle));
  }
  wrap.appendChild(content);
  return wrap;
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
 * Infer GitHub owner/repo from a *.github.io URL so raw media URLs work for any fork or account.
 * - Project site: https://owner.github.io/repo-name/… → owner/repo-name
 * - User/org root site: https://owner.github.io/… → owner/owner.github.io
 */
function inferGitHubPagesRepo() {
  const host = window.location.hostname;
  if (!host.endsWith(".github.io")) return null;
  const owner = host.slice(0, -".github.io".length);
  if (!owner) return null;
  const segments = window.location.pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && !/\.html?$/i.test(first)) {
    return { owner, repo: first };
  }
  return { owner, repo: `${owner}.github.io` };
}

/** Default branch for GitHub-hosted media (must match where demo assets live). */
const GITHUB_PAGES_MEDIA_BRANCH = "main";

/**
 * Direct LFS CDN URL (Git LFS blobs are not on raw.githubusercontent.com as bytes).
 * Used for <video> only: github.com/.../raw/... 302 chains break range/metadata requests.
 */
function githubPagesMediaUrl(gh, encodedRepoRelativePath) {
  const o = encodeURIComponent(gh.owner);
  const r = encodeURIComponent(gh.repo);
  return `https://media.githubusercontent.com/media/${o}/${r}/${GITHUB_PAGES_MEDIA_BRANCH}/${encodedRepoRelativePath}`;
}

function githubPagesRawRedirectUrl(gh, encodedRepoRelativePath) {
  const o = encodeURIComponent(gh.owner);
  const r = encodeURIComponent(gh.repo);
  return `https://github.com/${o}/${r}/raw/${GITHUB_PAGES_MEDIA_BRANCH}/${encodedRepoRelativePath}`;
}

/**
 * Extensions tracked in Git LFS (.gitattributes). On GitHub Pages the site origin
 * serves LFS pointer stubs, not real bytes — load these from media.githubusercontent.com.
 */
function isGitHubLfsMediaPath(cleaned) {
  return /\.(mp4|webm|mov|m4v|ogv|png)$/i.test(cleaned);
}

/**
 * GitHub Pages does not serve Git LFS objects from the Pages origin; it serves the tiny LFS pointer file.
 * When deployed under github.io, point at GitHub-hosted URLs instead of same-origin ./…
 *
 * - LFS (mp4, png per .gitattributes): media.githubusercontent.com/…/media/…
 * - Other assets: github.com/…/raw/… (302 → raw.githubusercontent.com)
 */
function resolveMediaPath(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const cleaned = path.replace(/^[./]+/, "");
  // Encode per-segment so spaces/unicode in filenames resolve correctly,
  // while preserving "/" path separators.
  const encoded = cleaned
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const isGitHubPages = window.location.hostname.endsWith("github.io");
  if (!isGitHubPages) return `./${encoded}`;
  const gh = inferGitHubPagesRepo();
  if (!gh) return `./${encoded}`;
  if (isGitHubLfsMediaPath(cleaned)) return githubPagesMediaUrl(gh, encoded);
  return githubPagesRawRedirectUrl(gh, encoded);
}

/** Wire <video> to a repo-relative MP4 via <source type="video/mp4"> (helps with GitHub octet-stream). */
function setVideoMp4FromRepoPath(vid, repoRelativePath) {
  if (!vid || !repoRelativePath) return;
  const url = resolveMediaPath(repoRelativePath);
  vid.replaceChildren();
  const source = document.createElement("source");
  source.src = url;
  source.type = "video/mp4";
  vid.appendChild(source);
  try {
    vid.load();
  } catch {
    // ignore
  }
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

function buildFramesGrid(
  videoPath,
  { startIndex = 1, count = 12, objectFit = "cover" } = {}
) {
  if (!videoPath) return null;
  const parts = String(videoPath).replace(/^[./]+/, "").split("/");
  if (parts.length < 3) return null;
  const genre = parts[0];
  const id = parts[1];
  const filename = parts[parts.length - 1];
  const base = filename.replace(/\.mp4$/i, "");
  const framesBase = `${genre}/${id}/frames/${base}`;

  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";

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
    img.className = `aspect-video w-full rounded-md border border-surface-border/60 bg-black ${fitClass}`;
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
    const btn = document.createElement("a");
    btn.href = hrefForPage(g.id);
    btn.dataset.genre = g.id;
    const base =
      "block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors no-underline ";
    const active =
      "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40";
    const inactive = "text-slate-400 hover:bg-white/5 hover:text-slate-200";
    btn.className = base + (g.id === activeId ? active : inactive);
    if (isMobile) btn.classList.add("shrink-0");
    else btn.classList.add("w-full", "text-left");
    btn.textContent = g.label;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      onSelect(g.id);
    });
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

  const pages = [
    { id: "home", label: "Home" },
    { id: "figures", label: "Figures" },
    ...genres,
  ];
  for (const g of pages) {
    mobile.appendChild(mkBtn(g, true));
    desktop.appendChild(mkBtn(g, false));
  }
}

function tableMark(yes) {
  const span = el(
    "span",
    `inline-block text-center text-lg font-semibold ${yes ? "text-emerald-400" : "text-red-400"}`,
    yes ? "✓" : "✗"
  );
  span.setAttribute("aria-label", yes ? "Yes" : "No");
  return span;
}

function normalizeFigureImages(images) {
  const list = Array.isArray(images) ? images : [images];
  return list.map((item) =>
    typeof item === "string" ? { src: item, maxWidthClass: "max-w-full" } : item
  );
}

function createFigureCard({ images, alt, caption }) {
  const card = el(
    "figure",
    "rounded-2xl border border-surface-border bg-surface-raised/30 p-4 shadow-xl shadow-black/20 sm:p-6"
  );
  const stack = el("div", "space-y-4");
  for (const { src, maxWidthClass = "max-w-full" } of normalizeFigureImages(images)) {
    const img = document.createElement("img");
    img.src = resolveMediaPath(src);
    img.alt = alt;
    img.loading = "lazy";
    img.className = `mx-auto block h-auto w-full ${maxWidthClass} rounded-lg border border-surface-border/60 bg-black/20`;
    stack.appendChild(img);
  }
  card.appendChild(stack);
  if (caption) {
    card.appendChild(
      el(
        "figcaption",
        "mt-4 text-sm leading-relaxed text-slate-300 sm:text-[0.9375rem]",
        caption
      )
    );
  }
  return card;
}

function createFiguresSection(title, content) {
  const section = el("section", "space-y-4");
  section.appendChild(el("h2", "text-lg font-semibold text-white sm:text-xl", title));
  section.appendChild(content);
  return section;
}

const RELATED_METHODS_ROWS = [
  { model: "MovieClip (Bose et al., 2023)", values: [true, false, true, false, false, false, false, false] },
  { model: "A2Summ (He et al., 2023)", values: [true, false, true, false, false, true, false, false] },
  { model: "LfVS (Argaw et al., 2024)", values: [true, false, true, false, false, true, false, false] },
  { model: "TaleSumm (Singh et al., 2024)", values: [true, false, true, false, false, true, false, false] },
  { model: "VideoXUM (Lin et al., 2023b)", values: [true, false, true, false, false, false, false, true] },
  { model: "LAVE (Wang et al., 2024)", values: [true, false, true, false, true, true, true, false] },
  { model: "TeaserGen (Xu et al., 2024)", values: [true, false, true, false, false, true, true, true] },
  { model: "REGen (Xu et al., 2025)", values: [true, false, true, false, false, true, true, true] },
  { model: "LLM-grounded (Lian et al., 2023)", values: [false, true, false, false, true, false, true, false] },
  { model: "Vidmento (Yeh et al., 2026)", values: [true, true, true, false, true, false, true, false] },
  { model: "VideoPoet (Kondratyuk et al., 2023)", values: [true, true, true, false, true, false, true, false] },
  {
    model: "Clips2Story (Ours)",
    values: [true, false, false, true, true, true, true, true],
    connNarrNote: true,
    highlight: true,
  },
];

const RELATED_METHODS_COLUMNS = [
  "Summ./Edit.",
  "Gen.",
  "Ord.",
  "Unord.",
  "Keyword guided",
  "Clip retr.",
  "Narr. ord.",
  "Conn. narr.",
];

function renderRelatedMethodsTable() {
  const scroll = el(
    "div",
    "-mx-1 overflow-x-auto rounded-xl border border-surface-border bg-surface-raised/25"
  );
  const table = document.createElement("table");
  table.className = "w-full min-w-[52rem] border-collapse text-sm";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.className = "border-b border-surface-border bg-surface-raised/80";

  const modelTh = document.createElement("th");
  modelTh.scope = "col";
  modelTh.className =
    "sticky left-0 z-20 min-w-[11rem] border-r border-surface-border bg-surface-raised px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300";
  modelTh.textContent = "Model";
  headRow.appendChild(modelTh);

  for (const col of RELATED_METHODS_COLUMNS) {
    const th = document.createElement("th");
    th.scope = "col";
    th.className =
      "px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400";
    th.textContent = col;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of RELATED_METHODS_ROWS) {
    const tr = document.createElement("tr");
    tr.className = row.highlight
      ? "border-b border-surface-border bg-cyan-500/10"
      : "border-b border-surface-border/70";

    const modelTd = document.createElement("td");
    modelTd.className =
      "sticky left-0 z-10 border-r border-surface-border bg-surface-raised px-3 py-2.5 text-sm font-medium text-white";
    if (row.highlight) modelTd.classList.add("bg-cyan-950/40");
    modelTd.textContent = row.model;
    tr.appendChild(modelTd);

    row.values.forEach((yes, i) => {
      const td = document.createElement("td");
      td.className = "px-2 py-2.5 text-center";
      if (row.connNarrNote && i === row.values.length - 1 && yes) {
        const wrap = el("span", "inline-flex items-center justify-center gap-0.5");
        wrap.appendChild(tableMark(true));
        wrap.appendChild(el("span", "text-emerald-400/90 text-xs font-medium", "*"));
        td.appendChild(wrap);
      } else {
        td.appendChild(tableMark(yes));
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  scroll.appendChild(table);

  const wrap = el("div", "space-y-3");
  wrap.appendChild(scroll);
  wrap.appendChild(
    el(
      "p",
      "text-sm leading-relaxed text-slate-300 sm:text-[0.9375rem]",
      "Table 1. Comparison of Clips2Story with related methods. Unlike existing baselines, our approach operates on an unordered pool of video clips and supports keyword-guided clip retrieval, narrative ordering, and connective narration. Here, Summ. = summarization, Edit. = editing, Gen. = generation, Ord. = ordered, Unord. = unordered, retr. = retrieval, Narr. = narrative, Conn. = connective, and narr. = narration. *Achieved via the Clips2Story-ND pipeline."
    )
  );
  return wrap;
}

function renderFiguresPanel() {
  const wrap = el("div", "space-y-12");

  wrap.appendChild(
    el("h1", "text-2xl font-semibold tracking-tight text-white sm:text-3xl", "Extended Figures")
  );

  wrap.appendChild(
    createFiguresSection(
      "Related Methods Comparison",
      renderRelatedMethodsTable()
    )
  );

  wrap.appendChild(
    createFiguresSection(
      "Pipeline Overview",
      createFigureCard({
        images: "plots/1.png",
        alt: "Clips2Story-ND pipeline overview",
        caption:
          "Figure 1. Overview of the Clips2Story-ND pipeline. The pipeline consists of three stages: Stage 1 performs shot-level multimodal analysis to extract textual descriptors from raw video materials; Stage 2 takes a user-specified keyword as input; and Stage 3 retrieves keyword-conditioned clips from the video pool. The user-specified keyword and the textual descriptors of the retrieved clips are then provided to the LLM prompt to generate a storyboard featuring interweaving selected video clips and generated narrations.",
      })
    )
  );

  wrap.appendChild(
    createFiguresSection(
      "Dataset Construction",
      createFigureCard({
        images: "plots/2.png",
        alt: "Dataset construction process",
        caption:
          "Figure 2. Illustration of the dataset construction process. The original input video is processed into two distinct candidate pools: a fine-grained clip-level setting and a grouped scene-level setting.",
      })
    )
  );

  wrap.appendChild(
    createFiguresSection(
      "Qualitative Storyboard Examples",
      createFigureCard({
        images: "plots/3.png",
        alt: "Qualitative storyboard examples",
        caption:
          "Figure 3. Qualitative examples of storyboards generated by Clips2Story-ND. The timestamp below each clip denotes the original start time of the clip in the source video. This demonstrates both keyword-aligned visual selection and successful temporal reconstruction from a completely shuffled clip pool.",
      })
    )
  );

  wrap.appendChild(
    createFiguresSection(
      "Keyword Relevance and Coverage",
      createFigureCard({
        images: "plots/4.png",
        alt: "Keyword relevance and keyword coverage density plots",
        caption:
          "Figure 4. Density distributions of mean keyword relevance and keyword coverage. The retrieval stage concentrates the candidate pool toward the target keyword, and both Clips2Story variants effectively generate storyboards with higher semantic alignment than the original source video.",
      })
    )
  );

  const quant = el("section", "space-y-8");
  quant.appendChild(
    el("h2", "text-lg font-semibold text-white sm:text-xl", "Quantitative Results")
  );

  const sceneLevel = el("div", "space-y-4");
  sceneLevel.appendChild(
    el("h3", "text-base font-semibold text-slate-200", "Scene-level setting")
  );
  sceneLevel.appendChild(
    createFigureCard({
      images: [
        { src: "plots/5.1.png", maxWidthClass: "max-w-2xl sm:max-w-3xl" },
        { src: "plots/5.2.png", maxWidthClass: "max-w-full" },
      ],
      alt: "Scene-level quantitative results",
      caption:
        "Figure 5. Top: Distribution of generated storyboard durations across baselines and proposed pipelines, evaluated under the scene-level setting. Bottom: Comparison of CLIPScore, VTGHLS, KR, and KC@τ for REGen, Clips2Story-NF, and Clips2Story-ND across five video genres under the scene-level setting. Error bars represent 95% confidence intervals.",
    })
  );
  quant.appendChild(sceneLevel);

  const clipLevel = el("div", "space-y-4");
  clipLevel.appendChild(
    el("h3", "text-base font-semibold text-slate-200", "Clip-level setting")
  );
  clipLevel.appendChild(
    createFigureCard({
      images: [
        { src: "plots/6.1.png", maxWidthClass: "max-w-2xl sm:max-w-3xl" },
        { src: "plots/6.2.png", maxWidthClass: "max-w-full" },
      ],
      alt: "Clip-level quantitative results",
      caption:
        "Figure 6. Top: Distribution of generated storyboard durations across baselines and proposed pipelines, evaluated under the clip-level setting. Bottom: Comparison of CLIPScore, VTGHLS, KR, and KC@τ for REGen, Clips2Story-NF, and Clips2Story-ND across five video genres under the clip-level setting. Error bars represent 95% confidence intervals.",
    })
  );
  quant.appendChild(clipLevel);

  wrap.appendChild(quant);
  return wrap;
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

  const figures = document.createElement("div");
  figures.id = "genre-panel-figures";
  figures.dataset.genrePanel = "figures";
  figures.className = "genre-panel hidden space-y-6 pb-16";
  figures.appendChild(renderFiguresPanel());
  container.appendChild(figures);

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
        setVideoMp4FromRepoPath(vid, set.sourceLocal);
        originalSection.appendChild(vid);
      } else if (set.youtubeEmbed) {
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
        setVideoMp4FromRepoPath(vid, src);
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

function buildValidPageIds(genres) {
  return new Set(["home", "figures", ...genres.map((g) => g.id)]);
}

function readPageIdFromUrl(validPageIds, { hash = location.hash } = {}) {
  const fromQuery = new URLSearchParams(location.search).get("page");
  if (fromQuery && validPageIds.has(fromQuery)) return fromQuery;

  const raw = String(hash || "").replace(/^#/, "").trim();
  if (!raw) return "home";
  const id = decodeURIComponent(raw);
  return validPageIds.has(id) ? id : "home";
}

function hrefForPage(pageId) {
  const base = `${location.pathname}${location.search}`;
  return pageId === "home" ? base : `${base}#${encodeURIComponent(pageId)}`;
}

function syncUrlToPage(pageId, { replace = false } = {}) {
  const target = hrefForPage(pageId);
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (target === current) return;

  if (pageId === "home") {
    if (replace) history.replaceState({ page: "home" }, "", target);
    else history.pushState({ page: "home" }, "", target);
    return;
  }

  // Hash-only updates are the most reliable on GitHub Pages static hosting.
  if (replace) {
    history.replaceState({ page: pageId }, "", `#${encodeURIComponent(pageId)}`);
  } else {
    location.hash = pageId;
  }
}

function setActiveGenre(genreId) {
  document.querySelectorAll("[data-genre-panel]").forEach((el) => {
    el.classList.toggle("hidden", el.dataset.genrePanel !== genreId);
  });
  const active =
    "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/40";
  const inactive = "text-slate-400 hover:bg-white/5 hover:text-slate-200";
  const navClass = (on, isMobile) =>
    "block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors no-underline " +
    (isMobile ? "shrink-0 " : "w-full text-left ") +
    (on ? active : inactive);

  document.querySelectorAll("#genre-tabs-mobile a[data-genre]").forEach((btn) => {
    btn.className = navClass(btn.dataset.genre === genreId, true);
  });
  document.querySelectorAll("#genre-tabs-desktop a[data-genre]").forEach((btn) => {
    btn.className = navClass(btn.dataset.genre === genreId, false);
  });
}

function initPageRouting(genres, { initialHash = location.hash } = {}) {
  const validPageIds = buildValidPageIds(genres);

  const showPage = (pageId, { updateUrl = false, replace = false } = {}) => {
    const id = validPageIds.has(pageId) ? pageId : "home";
    setActiveGenre(id);
    if (updateUrl) syncUrlToPage(id, { replace });
    window.scrollTo({ top: 0, behavior: "smooth" });
    return id;
  };

  window.addEventListener("hashchange", () => {
    showPage(readPageIdFromUrl(validPageIds));
  });

  window.addEventListener("popstate", () => {
    const fromState = history.state?.page;
    const id =
      fromState && validPageIds.has(fromState)
        ? fromState
        : readPageIdFromUrl(validPageIds);
    showPage(id);
  });

  const navigateToPage = (pageId) => {
    showPage(pageId, { updateUrl: true, replace: false });
  };

  const initialPage = readPageIdFromUrl(validPageIds, { hash: initialHash });
  showPage(initialPage);
  syncUrlToPage(initialPage, { replace: true });

  return navigateToPage;
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
      const [shots, entities, background, captions, asr, ragPool, promptText, stage1, stage2, siteData] =
        await Promise.all([
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

      const doc2Set = siteData?.genres
        ?.find((g) => g.id === "documentary")
        ?.sets?.find((s) => String(s.id) === "2");

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
      if (doc2Set?.sourceLocal) {
        const vid = document.createElement("video");
        vid.className = "h-full w-full object-contain bg-black";
        vid.controls = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = "metadata";
        setVideoMp4FromRepoPath(vid, doc2Set.sourceLocal);
        vid.title = "Input video (documentary, 2)";
        vWrap.appendChild(vid);
      } else if (doc2Set?.youtubeEmbed) {
        const iframe = document.createElement("iframe");
        iframe.className = "h-full w-full";
        iframe.src = doc2Set.youtubeEmbed;
        iframe.title = "Input video (documentary, 2)";
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        );
        iframe.loading = "lazy";
        vWrap.appendChild(iframe);
      }
      step1.appendChild(vWrap);
      steps.appendChild(
        createWorkflowStep({
          title: "1) Input Video",
          subtitle: "Example source video used for the pipeline.",
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
        createWorkflowStep({
          title: "2) Shot Detection  — ~1 min",
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
        el(
          "p",
          "text-sm font-semibold text-slate-200",
          `Top ${topShotIds.length} shots`
        )
      );
      step3.appendChild(metadataBlockForShots(topShotIds));
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
        createWorkflowStep({
          title: "3) Metadata Collection — ~15 min",
          content: step3,
        })
      );

      // Step 4
      const step4 = el("div", "space-y-4");
      const expl = el("p", "text-sm text-slate-300");
      expl.textContent =
        "We start with all shots, then filter to the subset selected for the retrieval pool.";
      step4.appendChild(expl);

      step4.appendChild(
        renderKeyframeGridWithRemainder({
          title: `All keyframes (${shotIds.length})`,
          shotIds,
          previewCount: 24,
        })
      );
      step4.appendChild(
        renderKeyframeGridWithRemainder({
          title: `Filtered keyframes (${filtered.length})`,
          shotIds: filtered,
          previewCount: 24,
        })
      );
      steps.appendChild(
        createWorkflowStep({
          title: "4) Keyword-Based Clip Retrieval — ~1 min",
          content: step4,
        })
      );

      // Step 5
      const step5 = el("div", "space-y-3");
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
        createWorkflowStep({
          title: "5) LLM Prompt Example",
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
        createWorkflowStep({
          title: "6) LLM Timeline Output — ~1 min",
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
        createWorkflowStep({
          title: "7) Narration–Visual Matching (Clips2Story-ND Only) — ~20 min",
          content: step7,
        })
      );

      // Step 8 — all ND frames for Documentary 2 / Human–Dog Interaction (no fold)
      const step8 = el(
        "div",
        "rounded-xl border border-surface-border bg-surface-raised/25 p-4 space-y-3"
      );
      step8.appendChild(
        el(
          "p",
          "text-sm font-semibold text-white",
          "8) Generated Video and Frames"
        )
      );
      step8.appendChild(
        el(
          "p",
          "text-sm text-slate-300"
        )
      );
      const ndHumanDogVideo = "documentary/2/05_human_dog_interaction_ours.mp4";
      const ndVideo = document.createElement("video");
      ndVideo.className =
        "w-full max-w-3xl overflow-hidden rounded-lg border border-surface-border/80 bg-black aspect-video object-contain shadow-inner";
      ndVideo.controls = true;
      ndVideo.muted = true;
      ndVideo.playsInline = true;
      ndVideo.preload = "metadata";
      setVideoMp4FromRepoPath(ndVideo, ndHumanDogVideo);
      step8.appendChild(ndVideo);
      const framesGrid = buildFramesGrid(ndHumanDogVideo, {
        startIndex: 1,
        count: 40,
        objectFit: "contain",
      });
      if (framesGrid) step8.appendChild(framesGrid);
      steps.appendChild(step8);

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
  const initialHash = window.__INITIAL_HASH__ || location.hash;

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

  const validPageIds = buildValidPageIds(genres);
  const initialPage = readPageIdFromUrl(validPageIds, { hash: initialHash });

  let navigateToPage = () => {};
  buildGenreButtons(genres, initialPage, (id) => navigateToPage(id));
  navigateToPage = initPageRouting(genres, { initialHash });

  document.getElementById("app").classList.remove("hidden");
}

main();
