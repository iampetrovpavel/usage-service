import { useState, useEffect } from "react";
import ErrorsTable from "./ErrorsTable";

export default function ErrorsPage() {
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Errors</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor application errors in real-time</p>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        >
          <option value="">All Sources</option>
          <option value="server">Server</option>
          <option value="app">App</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        >
          <option value="">All Severities</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="fatal">Fatal</option>
        </select>
        <input
          type="text"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm w-72 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>
      <ErrorsTable
        sourceFilter={sourceFilter || undefined}
        severityFilter={severityFilter || undefined}
        search={debouncedSearch || undefined}
      />
    </div>
  );
}
