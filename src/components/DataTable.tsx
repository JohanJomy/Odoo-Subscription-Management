"use client";

import React, { useState, useMemo } from "react";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /**
   * Custom accessor or render function for the cell.
   * If not provided, row[key] will be displayed.
   */
  accessor?: (row: T) => React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  /**
   * Sort value extractor. Defaults to row[key] if not provided.
   */
  sortValue?: (row: T) => string | number | boolean | Date | null | undefined;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  className?: string;
  headerClassName?: string;
}

export type SortDirection = "asc" | "desc" | null;

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: keyof T | ((row: T) => string | number);
  title?: string;
  description?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T | string)[];
  searchFilter?: (row: T, query: string) => boolean;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (selectedRows: T[]) => void;
  onRowClick?: (row: T, index: number) => void;
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  emptyMessage?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = "id",
  title,
  description,
  searchable = true,
  searchPlaceholder = "Search records...",
  searchKeys,
  searchFilter,
  selectable = false,
  selectedRows,
  onSelectionChange,
  onRowClick,
  pagination = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  isLoading = false,
  emptyMessage = "No records found",
  toolbarActions,
  className = "",
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [internalSelected, setInternalSelected] = useState<T[]>([]);

  const isControlledSelection = selectedRows !== undefined;
  const activeSelection = isControlledSelection ? selectedRows : internalSelected;

  const getRowKey = (row: T, index: number): string | number => {
    if (typeof keyField === "function") {
      return keyField(row);
    }
    return row[keyField] !== undefined ? row[keyField] : index;
  };

  const isRowSelected = (row: T, index: number) => {
    const key = getRowKey(row, index);
    return activeSelection.some((item, idx) => getRowKey(item, idx) === key);
  };

  const handleSelectRow = (row: T, index: number) => {
    const key = getRowKey(row, index);
    let next: T[];
    if (isRowSelected(row, index)) {
      next = activeSelection.filter((item, idx) => getRowKey(item, idx) !== key);
    } else {
      next = [...activeSelection, row];
    }

    if (!isControlledSelection) {
      setInternalSelected(next);
    }
    onSelectionChange?.(next);
  };

  const handleSelectAll = (filteredRows: T[]) => {
    const allSelectedOnPage = filteredRows.every((row, idx) =>
      isRowSelected(row, idx)
    );

    let next: T[];
    if (allSelectedOnPage) {
      const pageKeys = new Set(filteredRows.map((r, i) => getRowKey(r, i)));
      next = activeSelection.filter((r, i) => !pageKeys.has(getRowKey(r, i)));
    } else {
      const currentKeys = new Set(activeSelection.map((r, i) => getRowKey(r, i)));
      const newlySelected = filteredRows.filter(
        (r, i) => !currentKeys.has(getRowKey(r, i))
      );
      next = [...activeSelection, ...newlySelected];
    }

    if (!isControlledSelection) {
      setInternalSelected(next);
    }
    onSelectionChange?.(next);
  };

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    if (sortKey !== column.key) {
      setSortKey(column.key);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else if (sortDirection === "desc") {
      setSortKey(null);
      setSortDirection(null);
    } else {
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // 1. Search Filter
  const filteredData = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return data;
    }

    const query = searchQuery.trim().toLowerCase();

    if (searchFilter) {
      return data.filter((row) => searchFilter(row, query));
    }

    return data.filter((row) => {
      const keysToSearch =
        searchKeys ||
        columns
          .filter((col) => col.key)
          .map((col) => col.key as keyof T | string);

      return keysToSearch.some((key) => {
        const val = row[key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [data, searchable, searchQuery, searchFilter, searchKeys, columns]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) {
      return filteredData;
    }

    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal = col.sortValue ? col.sortValue(a) : a[sortKey];
      let bVal = col.sortValue ? col.sortValue(b) : b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();

      if (strA < strB) return sortDirection === "asc" ? -1 : 1;
      if (strA > strB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection, columns]);

  // 3. Pagination
  const totalItems = sortedData.length;
  const totalPages = pagination ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pagination, currentPage, pageSize]);

  const allSelectedCurrentPage =
    paginatedData.length > 0 &&
    paginatedData.every((row, idx) => isRowSelected(row, idx));

  const someSelectedCurrentPage =
    paginatedData.some((row, idx) => isRowSelected(row, idx)) &&
    !allSelectedCurrentPage;

  return (
    <div
      className={`w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden ${className}`}
    >
      {/* Header & Controls Toolbar */}
      {(title || description || searchable || toolbarActions) && (
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {searchable && (
              <div className="relative min-w-[220px] max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-4.35-4.35M16.65 10.65a6 6 0 11-12 0 6 6 0 0112 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-8 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}
            {toolbarActions}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto relative">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-neutral-50/75 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
              {selectable && (
                <th scope="col" className="w-12 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={allSelectedCurrentPage}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someSelectedCurrentPage;
                      }
                    }}
                    onChange={() => handleSelectAll(paginatedData)}
                    className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 cursor-pointer"
                  />
                </th>
              )}

              {columns.map((column) => {
                const isSorted = sortKey === column.key;
                const alignClass =
                  column.align === "right"
                    ? "text-right"
                    : column.align === "center"
                    ? "text-center"
                    : "text-left";

                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={{ width: column.width }}
                    className={`px-4 py-3.5 transition-colors select-none ${alignClass} ${
                      column.headerClassName || ""
                    } ${
                      column.sortable
                        ? "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        : ""
                    }`}
                    onClick={() => handleSort(column)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        column.align === "right"
                          ? "flex-row-reverse"
                          : column.align === "center"
                          ? "justify-center"
                          : ""
                      }`}
                    >
                      <span>{column.header}</span>
                      {column.sortable && (
                        <span className="inline-flex flex-col text-neutral-400">
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <svg
                                className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M5 15l7-7 7 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            )
                          ) : (
                            <svg
                              className="w-3.5 h-3.5 opacity-40 hover:opacity-100"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 10l5-5 5 5M7 14l5 5 5-5"
                              />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
                <tr key={`loading-skeleton-${i}`} className="animate-pulse">
                  {selectable && (
                    <td className="px-4 py-4 text-center">
                      <div className="w-4 h-4 bg-neutral-200 dark:bg-neutral-800 rounded mx-auto" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={`skeleton-col-${col.key}`} className="px-4 py-4">
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              // Empty State
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-neutral-500 dark:text-neutral-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <svg
                      className="w-8 h-8 text-neutral-400 dark:text-neutral-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              paginatedData.map((row, index) => {
                const selected = isRowSelected(row, index);
                const rowKey = getRowKey(row, index);

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(row, index)}
                    className={`transition-colors ${
                      onRowClick ? "cursor-pointer" : ""
                    } ${
                      selected
                        ? "bg-blue-50/70 dark:bg-blue-950/20"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                    }`}
                  >
                    {selectable && (
                      <td
                        className="px-4 py-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleSelectRow(row, index)}
                          className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 cursor-pointer"
                        />
                      </td>
                    )}

                    {columns.map((column) => {
                      const alignClass =
                        column.align === "right"
                          ? "text-right"
                          : column.align === "center"
                          ? "text-center"
                          : "text-left";

                      let content: React.ReactNode;
                      if (column.render) {
                        content = column.render(row, index);
                      } else if (column.accessor) {
                        content = column.accessor(row);
                      } else {
                        content = row[column.key];
                      }

                      return (
                        <td
                          key={column.key}
                          className={`px-4 py-3.5 text-neutral-800 dark:text-neutral-200 ${alignClass} ${
                            column.className || ""
                          }`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer */}
      {pagination && (
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-4">
            <span>
              Showing{" "}
              <strong className="text-neutral-800 dark:text-neutral-200 font-medium">
                {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-neutral-800 dark:text-neutral-200 font-medium">
                {Math.min(currentPage * pageSize, totalItems)}
              </strong>{" "}
              of{" "}
              <strong className="text-neutral-800 dark:text-neutral-200 font-medium">
                {totalItems}
              </strong>{" "}
              records
            </span>

            {pageSizeOptions.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>

            <span className="px-2 py-1 font-medium text-neutral-700 dark:text-neutral-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
