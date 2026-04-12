import type { BudgetLineRow } from "@/hooks/useFirestore";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

export type BudgetXlsxMeta = {
    title: string;
    fiscalYear: string;
    expectedAttendees: number;
};

function lineTotal(r: BudgetLineRow): number {
    const p = Number(r.price) || 0;
    const q = Number(r.quantity) || 0;
    return p * q;
}

const USD_FMT = '"$"#,##0.00';

function hrefForExport(raw: string): string | null {
    const t = raw.trim();
    if (!t) return null;
    if (/^(https?:|mailto:)/i.test(t)) return t;
    return `https://${t.replace(/^\/+/, "")}`;
}

function linkLabelForExport(raw: string): string {
    const t = raw.trim();
    if (!t) return "Link";
    if (/^mailto:/i.test(t)) return t.replace(/^mailto:/i, "").split("?")[0] || "Email";
    const h = hrefForExport(t);
    if (!h) return t.slice(0, 60);
    try {
        const u = new URL(h);
        const host = u.hostname.replace(/^www\./, "");
        return u.pathname.length > 1 ? `${host}${u.pathname}`.slice(0, 55) : host;
    } catch {
        return t.length > 55 ? `${t.slice(0, 52)}…` : t;
    }
}

/** Styled .xlsx: wide Item column, bold/color meta & headers, currency formats, clickable links. */
export async function exportBudgetXlsx(
    meta: BudgetXlsxMeta,
    rows: BudgetLineRow[],
    filenameBase: string
): Promise<void> {
    const total = rows.reduce((s, r) => s + lineTotal(r), 0);
    const attendees = Math.max(0, Math.floor(Number(meta.expectedAttendees) || 0));
    const perHead = attendees > 0 ? total / attendees : null;

    const wb = new ExcelJS.Workbook();
    wb.creator = "CODE OS";
    const ws = wb.addWorksheet("Budget", {
        properties: { defaultRowHeight: 20 },
        views: [{ state: "frozen", ySplit: 7 }],
    });

    const labelStyle: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FF475569" }, size: 10 };
    const metaTitleStyle: Partial<ExcelJS.Font> = { bold: true, size: 11, color: { argb: "FF0f172a" } };

    const pairs: [string, string | number][] = [
        ["Title", meta.title],
        ["Fiscal year / term", meta.fiscalYear],
        ["Expected attendees", attendees],
        ["Total cost", total],
        ["Cost per attendee", perHead == null ? "" : Math.round(perHead * 100) / 100],
    ];

    pairs.forEach(([label, val], i) => {
        const row = ws.getRow(i + 1);
        row.getCell(1).value = label;
        row.getCell(1).font = labelStyle;
        row.getCell(2).value = val;
        row.getCell(2).font = metaTitleStyle;
        if (label === "Total cost") {
            row.getCell(2).numFmt = USD_FMT;
            row.getCell(2).font = { bold: true, size: 12, color: { argb: "FF14532d" } };
            row.getCell(2).fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFDCFCE7" },
            };
            row.getCell(1).font = { bold: true, size: 11, color: { argb: "FF14532d" } };
        }
        if (label === "Cost per attendee" && perHead != null) {
            row.getCell(2).numFmt = USD_FMT;
            row.getCell(2).font = { bold: true, size: 11, color: { argb: "FF15803d" } };
        }
        if (label === "Expected attendees") {
            row.getCell(2).font = { bold: true, color: { argb: "FFa16207" } };
        }
    });

    const headerRowNum = 7;
    const headers = ["Item", "Price", "Quantity", "Line total", "Notes", "Link"];
    const hRow = ws.getRow(headerRowNum);
    headers.forEach((h, col) => {
        const cell = hRow.getCell(col + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: "FFCBF702" }, size: 10 };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1e293b" },
        };
        cell.alignment = {
            vertical: "middle",
            horizontal: col >= 1 && col <= 3 ? "right" : "left",
            wrapText: col === 0 || col === 4 || col === 5,
        };
    });
    hRow.height = 22;

    rows.forEach((r, idx) => {
        const rowNum = headerRowNum + 1 + idx;
        const row = ws.getRow(rowNum);
        const lt = lineTotal(r);
        const stripe = idx % 2 === 1 ? { argb: "FFF1F5F9" } : undefined;

        const c1 = row.getCell(1);
        c1.value = r.item;
        c1.font = { bold: true, color: { argb: "FF0f172a" } };
        c1.alignment = { vertical: "top", wrapText: true };
        if (stripe) c1.fill = { type: "pattern", pattern: "solid", fgColor: stripe };

        const c2 = row.getCell(2);
        c2.value = Number(r.price) || 0;
        c2.numFmt = USD_FMT;
        c2.font = { bold: true, color: { argb: "FF166534" } };
        c2.alignment = { horizontal: "right" };
        if (stripe) c2.fill = { type: "pattern", pattern: "solid", fgColor: stripe };

        const c3 = row.getCell(3);
        c3.value = Number(r.quantity) || 0;
        c3.font = { bold: true, color: { argb: "FFb45309" } };
        c3.alignment = { horizontal: "right" };
        if (stripe) c3.fill = { type: "pattern", pattern: "solid", fgColor: stripe };

        const c4 = row.getCell(4);
        c4.value = lt;
        c4.numFmt = USD_FMT;
        c4.font = { bold: true, color: { argb: "FF14532d" }, size: 11 };
        c4.alignment = { horizontal: "right" };
        if (stripe) c4.fill = { type: "pattern", pattern: "solid", fgColor: stripe };

        const c5 = row.getCell(5);
        c5.value = r.notes;
        c5.font = { italic: true, color: { argb: "FF64748b" }, size: 10 };
        c5.alignment = { vertical: "top", wrapText: true };
        if (stripe) c5.fill = { type: "pattern", pattern: "solid", fgColor: stripe };

        const c6 = row.getCell(6);
        const href = hrefForExport(r.link);
        if (href && r.link.trim()) {
            c6.value = {
                text: linkLabelForExport(r.link),
                hyperlink: href,
                tooltip: r.link.trim(),
            };
            c6.font = { underline: true, color: { argb: "FF2563eb" }, bold: true, size: 10 };
        } else {
            c6.value = "";
            c6.font = { color: { argb: "FF94a3b8" } };
        }
        c6.alignment = { vertical: "top", wrapText: true };
        if (stripe) c6.fill = { type: "pattern", pattern: "solid", fgColor: stripe };
    });

    const totalRowNum = headerRowNum + rows.length + 1;
    ws.mergeCells(totalRowNum, 1, totalRowNum, 3);
    const totalRow = ws.getRow(totalRowNum);
    totalRow.height = 24;
    for (let c = 1; c <= 6; c++) {
        const cell = totalRow.getCell(c);
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFDCFCE7" },
        };
        cell.border = {
            top: { style: "medium", color: { argb: "FF1e293b" } },
        };
    }
    totalRow.getCell(1).value = "Total cost";
    totalRow.getCell(1).font = { bold: true, size: 12, color: { argb: "FF14532d" } };
    totalRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
    totalRow.getCell(4).value = total;
    totalRow.getCell(4).numFmt = USD_FMT;
    totalRow.getCell(4).font = { bold: true, size: 13, color: { argb: "FF14532d" } };
    totalRow.getCell(4).alignment = { horizontal: "right", vertical: "middle" };

    ws.columns = [
        { width: 52 },
        { width: 14 },
        { width: 11 },
        { width: 16 },
        { width: 36 },
        { width: 44 },
    ];

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const safe = filenameBase.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 48);
    const name = `${safe || "budget"}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

/** Parse first sheet: metadata key-value rows then table with Item, Price, Quantity, Notes, Link. */
export function parseBudgetXlsxBuffer(buf: ArrayBuffer): {
    rows: BudgetLineRow[];
    expectedAttendees: number;
} {
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
    }) as unknown[][];

    let expectedAttendees = 0;
    let headerRowIndex = -1;

    const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/\s+/g, " ").trim();

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || !Array.isArray(row) || row.length === 0) continue;
        const a = norm(row[0]);
        const b = row[1];
        if (a === "expected attendees" || a === "expected attendee number") {
            const n = parseInt(String(b ?? "").replace(/\D/g, ""), 10);
            if (Number.isFinite(n)) expectedAttendees = Math.max(0, n);
            continue;
        }
        if (a === "item" || (a.includes("item") && !a.includes("line"))) {
            headerRowIndex = i;
            break;
        }
        const joined = row.map((c) => norm(c)).join("|");
        if (joined.includes("item") && joined.includes("price") && joined.includes("quantity")) {
            headerRowIndex = i;
            break;
        }
    }

    const rows: BudgetLineRow[] = [];
    if (headerRowIndex < 0) {
        return { rows, expectedAttendees };
    }

    const headerRow = data[headerRowIndex];
    if (!Array.isArray(headerRow)) return { rows, expectedAttendees };
    const header = headerRow.map((c) => norm(c));
    const col = (name: string, ...alts: string[]) => {
        const names = [name, ...alts];
        for (const n of names) {
            const j = header.findIndex((h) => h === n || h.includes(n));
            if (j >= 0) return j;
        }
        return -1;
    };

    const iItem = col("item", "description", "product");
    const iPrice = col("price", "unit price", "cost", "rate");
    const iQty = col("quantity", "qty", "count");
    const iNotes = col("notes", "note", "comments");
    const iLink = col("link", "url", "href");
    const iLineTotal = col("line total", "linetotal", "subtotal");

    const parseNum = (v: unknown) => {
        const t = String(v ?? "")
            .trim()
            .replace(/[$,]/g, "");
        const n = parseFloat(t);
        return Number.isFinite(n) ? n : 0;
    };
    const parseQty = (v: unknown) => {
        const n = parseInt(String(v ?? "").replace(/[,]/g, ""), 10);
        return Number.isFinite(n) && n >= 0 ? n : 1;
    };

    for (let r = headerRowIndex + 1; r < data.length; r++) {
        const cells = data[r];
        if (!Array.isArray(cells) || cells.every((c) => String(c ?? "").trim() === "")) continue;

        const item = String(cells[iItem >= 0 ? iItem : 0] ?? "").trim();
        const itemNorm = item.toLowerCase().replace(/\s+/g, " ").trim();
        if (itemNorm === "total cost" || itemNorm === "total") continue;

        let price = iPrice >= 0 ? parseNum(cells[iPrice]) : 0;
        let quantity = iQty >= 0 ? parseQty(cells[iQty]) : 1;
        const notes = iNotes >= 0 ? String(cells[iNotes] ?? "").trim() : "";
        const link = iLink >= 0 ? String(cells[iLink] ?? "").trim() : "";

        if (iLineTotal >= 0 && iPrice < 0 && item) {
            const lt = parseNum(cells[iLineTotal]);
            if (quantity > 0 && lt > 0) price = lt / quantity;
        }

        if (!item && price === 0 && !notes && !link) continue;
        rows.push({
            item,
            price,
            quantity: quantity || 1,
            notes,
            link,
        });
    }

    return { rows, expectedAttendees };
}
