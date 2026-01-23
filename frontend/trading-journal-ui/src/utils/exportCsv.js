function resolveColumnValue(row, column) {
    if (typeof column.accessorFn === "function") {
        return column.accessorFn(row);
    }
    if (column.accessorKey) {
        return row?.[column.accessorKey];
    }
    if (column.id) {
        return row?.[column.id];
    }
    return "";
}

function toCsvValue(value) {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value.toISOString();
    return String(value);
}

function escapeCsvValue(value) {
    const text = toCsvValue(value);
    if (text === "") return "";
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
}

export function exportToCsv(filename, rows, columns) {
    if (!Array.isArray(rows)) {
        throw new Error("No rows to export.");
    }

    const header = columns.map((column) => escapeCsvValue(column.header ?? column.label ?? column.id ?? "")).join(",");
    const lines = rows.map((row) =>
        columns.map((column) => escapeCsvValue(resolveColumnValue(row, column))).join(",")
    );
    const csv = `\uFEFF${[header, ...lines].join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
