import { useCallback, useEffect, useMemo, useState } from "react";

export default function usePagination({ totalItems, pageSize, initialPage = 1 }) {
    const [currentPage, setCurrentPage] = useState(initialPage);

    const totalPages = useMemo(() => Math.ceil(totalItems / pageSize), [totalItems, pageSize]);

    const paginationItems = useMemo(() => {
        if (totalPages <= 1) return [];
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const items = [1];
        const start = Math.max(2, currentPage - 2);
        const end = Math.min(totalPages - 1, currentPage + 2);
        if (start > 2) items.push("ellipsis-start");
        for (let i = start; i <= end; i += 1) {
            items.push(i);
        }
        if (end < totalPages - 1) items.push("ellipsis-end");
        items.push(totalPages);
        return items;
    }, [currentPage, totalPages]);

    useEffect(() => {
        let nextPage = currentPage;
        if (totalPages === 0) {
            nextPage = 1;
        } else if (currentPage > totalPages) {
            nextPage = totalPages;
        }
        if (nextPage === currentPage) return undefined;
        const timeoutId = setTimeout(() => setCurrentPage(nextPage), 0);
        return () => clearTimeout(timeoutId);
    }, [currentPage, totalPages]);

    const goToPage = useCallback((page) => {
        setCurrentPage(page);
    }, []);

    const nextPage = useCallback(() => {
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
    }, [totalPages]);

    const prevPage = useCallback(() => {
        setCurrentPage((prev) => Math.max(1, prev - 1));
    }, []);

    return {
        currentPage,
        setCurrentPage,
        totalPages,
        paginationItems,
        goToPage,
        nextPage,
        prevPage,
    };
}
