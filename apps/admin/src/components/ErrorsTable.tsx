import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "../lib/trpc";

interface ErrorRow {
  id: string;
  source: string;
  severity: string;
  message: string;
  stack: string | null;
  code: string | null;
  route: string | null;
  userId: string | null;
  sessionId: string | null;
  metadata: string;
  createdAt: string;
}

interface ErrorsTableProps {
  sourceFilter?: string;
  severityFilter?: string;
  search?: string;
}

const POLL_INTERVAL_MS = 5_000;

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    error: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    fatal: "bg-red-200 text-red-900",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[severity] ?? "bg-gray-100 text-gray-700"}`}>
      {severity}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    server: "bg-blue-100 text-blue-700",
    app: "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[source] ?? "bg-gray-100 text-gray-700"}`}>
      {source}
    </span>
  );
}

const columns: ColumnDef<ErrorRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Time",
    size: 160,
    cell: ({ getValue }) => {
      const val = getValue<string>();
      return val ? (
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {new Date(val).toLocaleString()}
        </span>
      ) : "-";
    },
  },
  {
    accessorKey: "source",
    header: "Source",
    size: 80,
    cell: ({ getValue }) => <SourceBadge source={getValue<string>()} />,
  },
  {
    accessorKey: "severity",
    header: "Severity",
    size: 80,
    cell: ({ getValue }) => <SeverityBadge severity={getValue<string>()} />,
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ getValue }) => {
      const msg = getValue<string>();
      return (
        <span className="text-sm text-gray-700" title={msg}>
          {msg.length > 120 ? `${msg.slice(0, 120)}...` : msg}
        </span>
      );
    },
  },
  {
    accessorKey: "route",
    header: "Route",
    size: 140,
    cell: ({ getValue }) => {
      const val = getValue<string | null>();
      return val ? (
        <span className="font-mono text-xs text-gray-600">{val}</span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    accessorKey: "code",
    header: "Code",
    size: 100,
    cell: ({ getValue }) => {
      const val = getValue<string | null>();
      return val ? (
        <span className="font-mono text-xs text-gray-600">{val}</span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
  {
    accessorKey: "userId",
    header: "User",
    size: 100,
    cell: ({ getValue }) => {
      const val = getValue<string | null>();
      return val ? (
        <span className="font-mono text-xs text-gray-600">{val.slice(0, 8)}...</span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    },
  },
];

export default function ErrorsTable({ sourceFilter, severityFilter, search }: ErrorsTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
  const [liveRows, setLiveRows] = useState<ErrorRow[]>([]);
  const latestTimestampRef = useRef<string | null>(null);
  const isPollingRef = useRef(true);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
    setLiveRows([]);
    latestTimestampRef.current = null;
  }, [sourceFilter, severityFilter, search]);

  const { data, isLoading } = trpc.admin.errors.useQuery(
    {
      page,
      pageSize,
      sourceFilter: sourceFilter as any,
      severityFilter: severityFilter as any,
      search,
    },
    { placeholderData: keepPreviousData },
  );

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Track the latest timestamp for polling
  useEffect(() => {
    const allRows = [...liveRows, ...rows];
    if (allRows.length > 0) {
      const timestamps = allRows.map((r) => r.createdAt);
      const latest = timestamps.sort().pop();
      if (latest) {
        latestTimestampRef.current = latest;
      }
    }
  }, [rows, liveRows]);

  const utils = trpc.useUtils();

  // Poll for new errors
  const pollForNew = useCallback(async () => {
    if (!latestTimestampRef.current || !isPollingRef.current || page !== 1) return;

    try {
      const result = await utils.admin.errors.fetch({
        page: 1,
        pageSize: 50,
        sourceFilter: sourceFilter as any,
        severityFilter: severityFilter as any,
        search,
        since: latestTimestampRef.current,
      });

      if (result.rows.length > 0) {
        setLiveRows((prev) => [...result.rows, ...prev]);
        setNewRowIds((prev) => {
          const next = new Set(prev);
          result.rows.forEach((r) => next.add(r.id));
          return next;
        });

        // Clear highlight after 3 seconds
        setTimeout(() => {
          setNewRowIds((prev) => {
            const next = new Set(prev);
            result.rows.forEach((r) => next.delete(r.id));
            return next;
          });
        }, 3000);
      }
    } catch {
      // Polling failure is non-critical
    }
  }, [sourceFilter, severityFilter, search, page, utils]);

  useEffect(() => {
    isPollingRef.current = true;
    const interval = setInterval(pollForNew, POLL_INTERVAL_MS);
    return () => {
      isPollingRef.current = false;
      clearInterval(interval);
    };
  }, [pollForNew]);

  // Combine live rows (prepended) with fetched rows on page 1
  const displayRows = page === 1 ? [...liveRows, ...rows] : rows;

  const table = useReactTable({
    data: displayRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { expanded },
    onExpandedChange: setExpanded as any,
    getRowCanExpand: () => true,
    manualPagination: true,
    pageCount: totalPages,
  });

  if (isLoading && rows.length === 0) {
    return <div className="text-sm text-gray-500 py-8 text-center">Loading...</div>;
  }

  if (displayRows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 py-12 text-center">
        <p className="text-sm text-gray-500">No errors found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const isNew = newRowIds.has(row.original.id);
              return (
                <Fragment key={row.id}>
                  <tr
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-500 ${
                      isNew ? "bg-sky-50" : ""
                    }`}
                    onClick={() => row.toggleExpanded()}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() && (
                    <tr>
                      <td colSpan={columns.length} className="p-0">
                        <ErrorDetail error={row.original} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
              setLiveRows([]);
              latestTimestampRef.current = null;
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="ml-4">
            {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              setLiveRows([]);
            }}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              setLiveRows([]);
            }}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorDetail({ error }: { error: ErrorRow }) {
  let parsedMetadata: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(error.metadata);
    if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
      parsedMetadata = parsed;
    }
  } catch {
    // Invalid JSON, ignore
  }

  return (
    <div className="bg-gray-50 px-8 py-4 space-y-3">
      <div>
        <span className="text-xs font-medium text-gray-500 uppercase">Full Message</span>
        <p className="text-sm text-gray-700 mt-1">{error.message}</p>
      </div>

      <div>
        <span className="text-xs font-medium text-gray-500 uppercase">Stack Trace</span>
        {error.stack ? (
          <pre className="mt-1 text-xs text-gray-600 bg-gray-100 rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
            {error.stack}
          </pre>
        ) : (
          <p className="text-sm text-gray-400 mt-1">No stack trace available</p>
        )}
      </div>

      {parsedMetadata && (
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase">Metadata</span>
          <pre className="mt-1 text-xs text-gray-600 bg-gray-100 rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono">
            {JSON.stringify(parsedMetadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
