import { useState, useEffect } from "react";
import UsageSessionsTable from "./UsageSessionsTable";

export default function UsagePage() {
  const [userIdFilter, setUserIdFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(userIdFilter);
    }, 400);
    return () => clearTimeout(timer);
  }, [userIdFilter]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">AI Usage</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor API costs and usage by session</p>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by user ID..."
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm w-72 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>
      <UsageSessionsTable userIdFilter={debouncedFilter} />
    </div>
  );
}
