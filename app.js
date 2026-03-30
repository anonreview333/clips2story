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
  title.textContent = "Genre";
  desktop.appendChild(title);

  for (const g of genres) {
    mobile.appendChild(mkBtn(g, true));
    desktop.appendChild(mkBtn(g, false));
  }
}

function renderGenreSections(genres) {
  const container = document.getElementById("genre-sections");
  container.innerHTML = "";

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
      heading.className =
        "text-lg font-semibold text-white sm:text-xl";
      heading.textContent = `Target Keyword: ${formatKeywordForDisplay(set.keyword)}`;

      const originalSection = document.createElement("div");
      originalSection.className = "mt-4 max-w-xs sm:max-w-sm";

      const originalLabel = document.createElement("p");
      originalLabel.className =
        "mb-2 text-xs font-medium uppercase tracking-wide text-slate-500";
      originalLabel.textContent = "Original source";

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
      originalSection.appendChild(originalLabel);
      originalSection.appendChild(iframeWrap);

      const grid = document.createElement("div");
      grid.className =
        "mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-4";

      const cols = [
        { key: "nf", label: "Clips2Story-NF", path: resolveMediaPath(set.local.nf) },
        { key: "ours", label: "Clips2Story-ND", path: resolveMediaPath(set.local.ours) },
        { key: "regen", label: "REGen", path: resolveMediaPath(set.local.regen) },
      ];

      for (const col of cols) {
        const cell = document.createElement("div");
        cell.className = "flex flex-col gap-2";
        const lab = document.createElement("p");
        lab.className =
          "text-center text-xs font-semibold uppercase tracking-wide text-slate-400";
        lab.textContent = col.label;
        const vid = document.createElement("video");
        vid.className =
          "w-full rounded-lg border border-surface-border bg-black aspect-video object-contain";
        vid.controls = true;
        vid.muted = true;
        vid.playsInline = true;
        vid.preload = "metadata";
        vid.src = col.path;
        cell.appendChild(lab);
        cell.appendChild(vid);
        grid.appendChild(cell);
      }

      block.appendChild(heading);
      block.appendChild(originalSection);
      block.appendChild(grid);
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
  document.getElementById("abstract").textContent = data.abstractPlaceholder;

  const pipe = document.getElementById("pipeline");
  pipe.innerHTML = "";
  for (const line of data.pipeline || []) {
    const li = document.createElement("li");
    li.textContent = line;
    pipe.appendChild(li);
  }

  const genres = data.genres || [];
  renderGenreSections(genres);

  const first = genres[0]?.id;
  let active = first;

  buildGenreButtons(genres, active, (id) => {
    active = id;
    setActiveGenre(id);
  });

  setActiveGenre(active);
  document.getElementById("app").classList.remove("hidden");
}

main();
