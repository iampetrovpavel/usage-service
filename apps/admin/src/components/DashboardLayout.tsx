import { useState } from "react";
import { useSetAtom } from "jotai";
import { adminTokenAtom } from "../lib/atoms";
import UsagePage from "./UsagePage";
import ErrorsPage from "./ErrorsPage";

type Page = "usage" | "errors";

const NAV_ITEMS: Array<{ id: Page; label: string; icon: string }> = [
  {
    id: "usage",
    label: "Usage",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    id: "errors",
    label: "Errors",
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  },
];

export default function DashboardLayout() {
  const setToken = useSetAtom(adminTokenAtom);
  const [activePage, setActivePage] = useState<Page>("usage");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <span className="text-lg font-bold text-gray-900">Usage Service</span>
          <span className="text-xs text-gray-500 ml-1">Admin</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? "bg-sky-50 text-sky-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={() => setToken(null)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-md hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-gray-50">
        {activePage === "usage" && <UsagePage />}
        {activePage === "errors" && <ErrorsPage />}
      </main>
    </div>
  );
}
