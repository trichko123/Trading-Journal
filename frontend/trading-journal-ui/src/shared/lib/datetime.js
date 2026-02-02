export function parseCreatedAt(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "string") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

export function formatDate(value) {
    const d = parseCreatedAt(value);
    if (!d) return "-";
    return d.toLocaleString();
}

export function toIsoString(value) {
    const d = parseCreatedAt(value);
    return d ? d.toISOString() : "";
}

export function toDateTimeLocalValue(value) {
    const d = parseCreatedAt(value);
    if (!d) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toIsoFromLocal(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function getDateRangeFromPreset(preset) {
    const now = new Date();
    if (preset === "today") {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return { start, end };
    }
    if (preset === "week") {
        const day = now.getDay();
        const diffToMonday = (day + 6) % 7;
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
        return { start, end };
    }
    if (preset === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    }
    if (preset === "year") {
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start, end };
    }
    return { start: null, end: null };
}

export function matchesDatePreset(dateValue, preset, customFrom, customTo) {
    if (preset === "all") return true;
    const createdAt = parseCreatedAt(dateValue);
    if (!createdAt) return false;
    if (preset === "custom") {
        if (customFrom) {
            const from = new Date(customFrom);
            from.setHours(0, 0, 0, 0);
            if (createdAt < from) return false;
        }
        if (customTo) {
            const to = new Date(customTo);
            to.setHours(23, 59, 59, 999);
            if (createdAt > to) return false;
        }
        return true;
    }
    const range = getDateRangeFromPreset(preset);
    if (range.start && createdAt < range.start) return false;
    if (range.end && createdAt > range.end) return false;
    return true;
}

export function formatDuration(startValue, endValue) {
    const start = parseCreatedAt(startValue);
    const end = parseCreatedAt(endValue);
    if (!start || !end) return "-";
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return "-";
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours || days) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    return parts.join(" ");
}
