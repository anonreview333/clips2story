#!/usr/bin/env node
/**
 * Parses demo_video_links.csv and local {genre}/{id}/ directories to produce data.json.
 * Anonymous demo page — no author metadata.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "demo_video_links.csv");
const OUT_PATH = path.join(ROOT, "data.json");

const GENRES = ["documentary", "film", "lecture", "news", "vlog"];

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift();
  if (!header) return [];
  const rows = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    // genre,id,url — URL may contain commas in rare cases; split on first two commas
    const first = line.indexOf(",");
    const second = line.indexOf(",", first + 1);
    if (first === -1 || second === -1) continue;
    const genre = line.slice(0, first).trim();
    const id = line.slice(first + 1, second).trim();
    const youtube_link = line.slice(second + 1).trim();
    rows.push({ genre, id, youtube_link });
  }
  return rows;
}

function youtubeWatchToEmbed(watchUrl) {
  try {
    const u = new URL(watchUrl);
    let videoId = u.searchParams.get("v");
    if (!videoId && (u.hostname === "youtu.be" || u.hostname === "www.youtu.be")) {
      videoId = u.pathname.replace(/^\//, "").split("/")[0];
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function listMp4(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".mp4"));
}

function resolveRegen(dir, keyword, files) {
  const exact = `${keyword}_regen.mp4`;
  if (files.includes(exact)) return exact;
  const regens = files.filter((f) => /_regen\.mp4$/i.test(f));
  if (regens.length === 1) return regens[0];
  if (regens.length === 0) return null;
  // Multiple regen files: prefer one that shares numeric prefix with keyword (e.g. 04_*)
  const kwPrefix = keyword.match(/^(\d+)_/);
  if (kwPrefix) {
    const p = kwPrefix[1];
    const hit = regens.find((f) => f.startsWith(p + "_") || f.startsWith(p));
    if (hit) return hit;
  }
  return regens[0];
}

function buildSetForDir(genre, idStr, youtubeEmbed) {
  const dir = path.join(ROOT, genre, idStr);
  const files = listMp4(dir);
  const nfFiles = files.filter((f) => f.endsWith("_no_narration.mp4"));

  const sets = [];
  for (const nf of nfFiles) {
    const keyword = nf.replace(/_no_narration\.mp4$/i, "");
    const oursName = `${keyword}_ours.mp4`;
    if (!files.includes(oursName)) {
      console.warn(`[skip] ${dir}: missing ${oursName} for keyword "${keyword}"`);
      continue;
    }
    const regenName = resolveRegen(dir, keyword, files);
    if (!regenName) {
      console.warn(`[skip] ${dir}: no REGen file for keyword "${keyword}"`);
      continue;
    }

    const base = `${genre}/${idStr}`;
    sets.push({
      keyword,
      youtubeEmbed,
      local: {
        nf: `${base}/${nf}`,
        ours: `${base}/${oursName}`,
        regen: `${base}/${regenName}`,
      },
    });
  }

  return sets;
}

function main() {
  const csvRaw = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(csvRaw);

  const byGenre = {};
  for (const g of GENRES) byGenre[g] = [];

  for (const row of rows) {
    const { genre, id, youtube_link } = row;
    if (!GENRES.includes(genre)) {
      console.warn(`Unknown genre in CSV: ${genre}`);
      continue;
    }
    const embed = youtubeWatchToEmbed(youtube_link);
    if (!embed) {
      console.warn(`Could not parse YouTube URL for ${genre}/${id}`);
      continue;
    }
    const idStr = String(id);
    const sets = buildSetForDir(genre, idStr, embed);
    for (const s of sets) {
      byGenre[genre].push({ id: idStr, ...s });
    }
  }

  const payload = {
    projectTitle: "Clips2Story: Training-free Video Storyboarding and Editing using Multimodal Retrieval-Embedded Generation",
    abstractPlaceholder:
      "[Abstract text will appear here in the camera-ready version. This anonymous demo page is for double-blind review.]",
    pipeline: [
      "Multimodal retrieval aligns candidate clips with story intent without task-specific training.",
      "Embedded generation composes a coherent narrative structure from retrieved visual segments.",
      "The pipeline outputs editable storyboard timelines for comparison across baselines.",
    ],
    genres: GENRES.map((id) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      sets: byGenre[id] || [],
    })),
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${OUT_PATH}`);
}

main();
