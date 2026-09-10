// Pull a roster out of a PDF (Q7, Q24). Coaches hand out rosters as PDFs all
// the time — we take the text, guess jersey / name / position / class per line,
// and hand the result to the same column-mapping screen the CSV import uses.
// Anything we can't read stays blank; partial rows are fine.

export type PdfRoster = { headers: string[]; rows: string[][] };

const POSITIONS = new Set([
  "QB", "RB", "FB", "HB", "TB", "WR", "TE", "OL", "OT", "OG", "C", "LT", "LG", "RG", "RT",
  "DL", "DE", "DT", "NT", "NG", "EDGE", "LB", "MLB", "ILB", "OLB", "SAM", "MIKE", "WILL",
  "DB", "CB", "S", "SS", "FS", "NB", "ATH", "K", "P", "LS", "KR", "PR",
]);

const CLASSES: Record<string, string> = {
  FR: "FR", SO: "SO", JR: "JR", SR: "SR",
  FRESHMAN: "FR", SOPHOMORE: "SO", JUNIOR: "JR", SENIOR: "SR",
  "9": "FR", "10": "SO", "11": "JR", "12": "SR",
  "9TH": "FR", "10TH": "SO", "11TH": "JR", "12TH": "SR",
};

const HEIGHT_RE = /^(\d)\s*['’´]\s*(\d{1,2})?\s*["”]?$/;

const heightInches = (tok: string) => {
  const m = HEIGHT_RE.exec(tok);
  if (!m) return null;
  const ft = Number(m[1]);
  if (ft < 4 || ft > 7) return null;
  return ft * 12 + Number(m[2] ?? 0);
};

/** Extract the text of a PDF, one string per visual line. */
export async function pdfLines(file: File): Promise<string[]> {
  // Loaded on demand so the PDF reader never ships with the first paint.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const byRow = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const t = item.transform as number[];
      const key = Math.round(t[5] / 3); // 3pt tolerance keeps a row together
      byRow.set(key, [...(byRow.get(key) ?? []), { x: t[4], str: item.str }]);
    }
    for (const key of [...byRow.keys()].sort((a, b) => b - a)) {
      const line = byRow
        .get(key)!
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (line) lines.push(line);
    }
  }
  return lines;
}

/** Best-effort roster row from one line of PDF text. */
export function parseRosterLine(line: string): string[] | null {
  const cleaned = line.replace(/[|,;]+/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length < 3) return null;
  if (/^(roster|varsity|jv|freshman|team|no\.?|#|name|pos|class|player)\b/i.test(cleaned) && !/\d/.test(cleaned)) {
    return null; // header / banner line
  }

  const tokens = cleaned.split(" ");
  let jersey = "";
  let cls = "";
  let height = "";
  let weight = "";
  const positions: string[] = [];
  const nameParts: string[] = [];

  tokens.forEach((raw, i) => {
    // Keep periods — "R. Ogles" is a name, not a sentence.
    const tok = raw.replace(/^#/, "").replace(/[()]+/g, "").trim();
    if (!tok) return;
    const up = tok.replace(/\.$/, "").toUpperCase();

    const inches = heightInches(tok);
    if (!height && inches) {
      height = String(inches);
      return;
    }
    if (/^\d{1,3}$/.test(up)) {
      const n = Number(up);
      if (!jersey && i <= 1 && n <= 99) {
        jersey = up;
        return;
      }
      if (!weight && n >= 100 && n <= 400) {
        weight = up;
        return;
      }
      if (!cls && CLASSES[up]) {
        cls = CLASSES[up];
        return;
      }
      if (!jersey && n <= 99) {
        jersey = up;
        return;
      }
      return;
    }
    if (!cls && CLASSES[up]) {
      cls = CLASSES[up];
      return;
    }
    const parts = up.split("/").filter(Boolean);
    if (parts.length && parts.every((x) => POSITIONS.has(x))) {
      positions.push(...parts);
      return;
    }
    if (/^\d+['’]/.test(tok)) return; // stray height fragment
    if (/[A-Za-z]/.test(tok)) nameParts.push(tok.replace(/,$/, ""));
  });

  const name = nameParts.join(" ").replace(/\s+/g, " ").trim();
  if (name.replace(/[^A-Za-z]/g, "").length < 3) return null;
  // A name with nothing else attached is almost always a title or a heading,
  // not a player — take the line only when something structural came with it.
  if (!jersey && !positions.length && !cls) return null;

  return [jersey, name, positions.join("/"), cls, height, weight];
}

export const PDF_HEADERS = ["Jersey", "Name", "Position", "Class", "Height (in)", "Weight"];

/** Whole-file version: lines → rows, dropping anything that isn't a player. */
export async function readPdfRoster(file: File): Promise<PdfRoster> {
  const lines = await pdfLines(file);
  const rows = lines.map(parseRosterLine).filter((r): r is string[] => r !== null);
  return { headers: PDF_HEADERS, rows };
}
