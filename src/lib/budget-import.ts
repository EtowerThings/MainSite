export type BudgetRowInput = {
    item: string;
    price: number;
    quantity: number;
    notes: string;
    link: string;
};

function parseNumber(s: string): number {
    const t = s.trim().replace(/[$,]/g, "");
    if (!t) return 0;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : 0;
}

function parseIntSafe(s: string): number {
    const t = s.trim().replace(/[,]/g, "");
    if (!t) return 0;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : 0;
}

function splitDelimitedLine(line: string, delim: "," | "\t"): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            inQuote = !inQuote;
            continue;
        }
        if (!inQuote && c === delim) {
            out.push(cur.trim());
            cur = "";
            continue;
        }
        cur += c;
    }
    out.push(cur.trim());
    return out;
}

/**
 * Parses CSV or TSV from Excel / Sheets export. First row = headers.
 * Columns: Item, Price, Quantity, Notes, Link (flexible names).
 */
export function parseBudgetSpreadsheet(text: string): BudgetRowInput[] {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    if (lines.length === 0) return [];

    const delim: "," | "\t" =
        lines[0].includes("\t") && lines[0].split("\t").length > 1 ? "\t" : ",";

    const headers = splitDelimitedLine(lines[0], delim).map((h) =>
        h.toLowerCase().replace(/\s+/g, " ").trim()
    );

    const findIdx = (...names: string[]) => {
        for (const n of names) {
            const i = headers.findIndex((h) => h === n || h.includes(n));
            if (i >= 0) return i;
        }
        return -1;
    };

    const iitem = findIdx("item", "line item", "lineitem", "description", "product");
    const iprice = findIdx("price", "unit price", "cost", "rate", "budgeted", "budget");
    const iqty = findIdx("quantity", "qty", "count", "units");
    const inotes = findIdx("notes", "note", "comments");
    const ilink = findIdx("link", "url", "href");

    const rows: BudgetRowInput[] = [];
    for (let r = 1; r < lines.length; r++) {
        const cells = splitDelimitedLine(lines[r], delim);
        if (cells.every((c) => !c)) continue;

        const item =
            iitem >= 0
                ? (cells[iitem] || "")
                : cells[0] || "";
        const price = iprice >= 0 ? parseNumber(cells[iprice] || "0") : 0;
        const quantity = iqty >= 0 ? Math.max(0, parseIntSafe(cells[iqty] || "1") || 1) : 1;
        const notes = inotes >= 0 ? (cells[inotes] || "") : "";
        const link = ilink >= 0 ? (cells[ilink] || "") : "";

        if (!item.trim() && price === 0 && !notes.trim() && !link.trim()) continue;
        rows.push({ item, price, quantity: quantity || 1, notes, link });
    }
    return rows;
}

/** Legacy CSV columns (category, line item, budgeted, …) → new row shape. */
export function parseLegacyBudgetSpreadsheet(text: string): BudgetRowInput[] | null {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    if (lines.length === 0) return null;

    const delim: "," | "\t" =
        lines[0].includes("\t") && lines[0].split("\t").length > 1 ? "\t" : ",";
    const headers = splitDelimitedLine(lines[0], delim).map((h) =>
        h.toLowerCase().replace(/\s+/g, " ").trim()
    );
    const hasLegacy =
        headers.some((h) => h.includes("line item") || h === "lineitem") &&
        headers.some((h) => h.includes("budgeted") || h === "budget");
    if (!hasLegacy) return null;

    const findIdx = (...names: string[]) => {
        for (const n of names) {
            const i = headers.findIndex((h) => h === n || h.includes(n));
            if (i >= 0) return i;
        }
        return -1;
    };
    const icat = findIdx("category", "bucket", "account");
    const iline = findIdx("line item", "lineitem", "item", "description", "label");
    const ibud = findIdx("budgeted", "budget", "planned", "allocated");
    const inotes = findIdx("notes", "note", "comments");

    const rows: BudgetRowInput[] = [];
    for (let r = 1; r < lines.length; r++) {
        const cells = splitDelimitedLine(lines[r], delim);
        if (cells.every((c) => !c)) continue;
        const category = icat >= 0 ? (cells[icat] || "") : "";
        const lineItem = iline >= 0 ? (cells[iline] || "") : cells[0] || "";
        const budgeted = ibud >= 0 ? parseNumber(cells[ibud] || "0") : 0;
        const notes = inotes >= 0 ? (cells[inotes] || "") : "";
        const item = [category, lineItem].filter(Boolean).join(" — ") || lineItem;
        if (!item && budgeted === 0 && !notes) continue;
        rows.push({ item, price: budgeted, quantity: 1, notes, link: "" });
    }
    return rows;
}
