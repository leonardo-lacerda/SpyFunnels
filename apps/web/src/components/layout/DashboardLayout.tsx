import { Navigate, Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ContextPanel } from "./ContextPanel";
import { CommandPalette } from "../ui/CommandPalette";
import { useAuthStore } from "../../store/auth";

export function DashboardLayout() {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(29,78,216,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(180,83,9,0.08),transparent_28%),linear-gradient(180deg,#fcfbf8,#f3efe7)]" />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
      <ContextPanel />
      <CommandPalette />
    </div>
  );
}
