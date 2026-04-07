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

      const buildFramesStrip = (videoPath) => {
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

        // Try a reasonable number; missing frames will auto-hide on error.
        const MAX_FRAMES = 30;
        for (let i = 1; i <= MAX_FRAMES; i++) {
          const img = document.createElement("img");
          const num = String(i).padStart(6, "0");
          img.src = resolveMediaPath(`${framesBase}/frame_${num}.png`);
          img.loading = "lazy";
          img.alt = `Frame ${i}`;
          img.className =
            "h-14 w-auto shrink-0 rounded-md border border-surface-border/60 bg-black object-cover";
          img.addEventListener("error", () => {
            // If a frame is missing, hide it to keep the strip clean.
            img.remove();
          });
          strip.appendChild(img);
        }

        return strip;
      };

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
