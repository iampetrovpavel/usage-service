import { useState, useEffect, Fragment } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { keepPreviousData } from "@tanstack/react-query";
import { trpc } from "../lib/trpc";

interface UsageSessionRow {
  sessionId: string | null;
  userId: string;
  totalCost: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  apiCallCount: number;
  createdAt: string;
}

interface UsageDetailRow {
  id: string;
  model: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  characters: number;
  audioDurationMs: number;
  cost: string;
  createdAt: Date | string;
}

const columns: ColumnDef<UsageSessionRow>[] = [
  {
    accessorKey: "userId",
    header: "User ID",
    cell: ({ getValue }) => {
      const val = getValue<string>();
      return (
        <span className="font-mono text-xs" title={val}>
          {val.slice(0, 8)}...
        </span>
      );
    },
  },
  {
    accessorKey: "sessionId",
    header: "Session ID",
    cell: ({ getValue }) => {
      const val = getValue<string | null>();
      return val ? (
        <span className="font-mono text-xs">{val.slice(0, 8)}...</span>
      ) : (
        <span className="text-gray-400 italic">No session</span>
      );
    },
  },
  {
    accessorKey: "totalCost",
    header: "Total Cost",
    cell: ({ getValue }) => `$${Number(getValue<string>()).toFixed(4)}`,
  },
  {
    accessorKey: "totalInputTokens",
    header: "Input Tokens",
    cell: ({ getValue }) => getValue<number>().toLocaleString(),
  },
  {
    accessorKey: "totalOutputTokens",
    header: "Output Tokens",
    cell: ({ getValue }) => getValue<number>().toLocaleString(),
  },
  {
    accessorKey: "apiCallCount",
    header: "API Calls",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ getValue }) => {
      const val = getValue<string>();
      return val ? new Date(val).toLocaleString() : "-";
    },
  },
];

export default function UsageSessionsTable({ userIdFilter }: { userIdFilter: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [userIdFilter]);

  const { data, isLoading } = trpc.admin.usageSessions.useQuery(
    { page, pageSize, userIdFilter: userIdFilter || undefined },
    { placeholderData: keepPreviousData }
  );

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const table = useReactTable({
    data: rows,
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

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 py-12 text-center">
        <p className="text-sm text-gray-500">No usage data found</p>
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
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => row.toggleExpanded()}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr>
                    <td colSpan={columns.length} className="p-0">
                      <SessionDetail sessionId={row.original.sessionId} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
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
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {[10, 20, 50].map((size) => (
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

function SessionDetail({ sessionId }: { sessionId: string | null }) {
  const { data, isLoading } = trpc.admin.usageBySession.useQuery({ sessionId });

  if (isLoading) {
    return <div className="px-12 py-4 text-sm text-gray-500">Loading details...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="px-12 py-4 text-sm text-gray-400">No detail rows</div>;
  }

  return (
    <div className="bg-gray-50 px-8 py-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 uppercase tracking-wider">
            <th className="px-3 py-2 text-left font-medium">Model</th>
            <th className="px-3 py-2 text-left font-medium">Operation</th>
            <th className="px-3 py-2 text-left font-medium">Input Tokens</th>
            <th className="px-3 py-2 text-left font-medium">Output Tokens</th>
            <th className="px-3 py-2 text-left font-medium">Characters</th>
            <th className="px-3 py-2 text-left font-medium">Audio Duration (ms)</th>
            <th className="px-3 py-2 text-left font-medium">Cost</th>
            <th className="px-3 py-2 text-left font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row: UsageDetailRow) => (
            <tr key={row.id} className="border-t border-gray-200">
              <td className="px-3 py-2 text-gray-700 font-mono">{row.model}</td>
              <td className="px-3 py-2 text-gray-700">{row.operation}</td>
              <td className="px-3 py-2 text-gray-700">{row.inputTokens.toLocaleString()}</td>
              <td className="px-3 py-2 text-gray-700">{row.outputTokens.toLocaleString()}</td>
              <td className="px-3 py-2 text-gray-700">{row.characters.toLocaleString()}</td>
              <td className="px-3 py-2 text-gray-700">{row.audioDurationMs.toLocaleString()}</td>
              <td className="px-3 py-2 text-gray-700">${Number(row.cost).toFixed(6)}</td>
              <td className="px-3 py-2 text-gray-700">
                {new Date(row.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
