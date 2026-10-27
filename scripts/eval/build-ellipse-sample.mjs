// Build the evaluation sample from the ELLIPSE corpus (see eval/data/README.md).
//
//   node scripts/eval/build-ellipse-sample.mjs <path to ELLIPSE_Final_github_train.csv>
//
// Picks 30 essays, five from each of six bands of the human Overall score, so
// the set isn't all mid-range. The pick is deterministic: within a band,
// essays are ordered by a SHA-256 of a fixed salt and their id. Only the id,
// the prompt name, the text and the seven human scores are kept. The corpus's
// demographic and text-statistics columns are dropped.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PER_BAND = 5;
const SALT = "markwise-eval-v1";
const SCORE_COLUMNS = ["Overall", "Cohesion", "Syntax", "Vocabulary", "Phraseology", "Grammar", "Conventions"];
const BANDS = [
  { label: "1-2", test: (score) => score <= 2 },
  { label: "2.5", test: (score) => score === 2.5 },
  { label: "3", test: (score) => score === 3 },
  { label: "3.5", test: (score) => score === 3.5 },
  { label: "4", test: (score) => score === 4 },
  { label: "4.5-5", test: (score) => score >= 4.5 },
];

/** RFC 4180 CSV: quoted fields may hold commas, doubled quotes and newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.filter((cells) => cells.length === header.length).map((cells) => Object.fromEntries(header.map((name, index) => [name, cells[index]])));
}

const source = process.argv[2];
if (!source) {
  console.error("Usage: node scripts/eval/build-ellipse-sample.mjs <path to ELLIPSE_Final_github_train.csv>");
  process.exit(1);
}

const rows = parseCsv(readFileSync(source, "utf8"));
const rank = (id) => createHash("sha256").update(`${SALT}:${id}`).digest("hex");
const essays = BANDS.flatMap((band) =>
  rows
    .filter((row) => band.test(Number(row.Overall)))
    .sort((a, b) => rank(a.text_id_kaggle).localeCompare(rank(b.text_id_kaggle)))
    .slice(0, PER_BAND)
    .map((row) => ({
      id: row.text_id_kaggle,
      band: band.label,
      prompt: row.prompt,
      text: row.full_text.replace(/\r\n?/g, "\n").trim(),
      scores: Object.fromEntries(SCORE_COLUMNS.map((name) => [name.toLowerCase(), Number(row[name])])),
    }))
);

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "eval", "data", "ellipse-sample.json");
writeFileSync(out, `${JSON.stringify({ salt: SALT, perBand: PER_BAND, essays }, null, 2)}\n`);
console.log(`Wrote ${essays.length} essays from ${rows.length} rows to ${path.relative(process.cwd(), out)}.`);
