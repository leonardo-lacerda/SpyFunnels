import React, { Suspense } from "react";
import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { RouteErrorBoundary } from "./components/layout/RouteErrorBoundary";

const Login = React.lazy(() => import("./pages/Login").then((module) => ({ default: module.Login })));
const Dashboard = React.lazy(() => import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })));
const Competitors = React.lazy(() => import("./pages/Competitors").then((module) => ({ default: module.Competitors })));
const NewCompetitorPage = React.lazy(() => import("./pages/competitor/NewCompetitorPage").then((module) => ({ default: module.NewCompetitorPage })));
const CompetitorWorkspace = React.lazy(() => import("./pages/competitor/CompetitorWorkspace").then((module) => ({ default: module.CompetitorWorkspace })));
const CompetitorOverviewPage = React.lazy(() => import("./pages/competitor/CompetitorOverviewPage").then((module) => ({ default: module.CompetitorOverviewPage })));
const CompetitorFunnelsPage = React.lazy(() => import("./pages/competitor/CompetitorFunnelsPage").then((module) => ({ default: module.CompetitorFunnelsPage })));
const FunnelVersionPage = React.lazy(() => import("./pages/competitor/FunnelVersionPage").then((module) => ({ default: module.FunnelVersionPage })));
const CompetitorPagesPage = React.lazy(() => import("./pages/competitor/CompetitorPagesPage").then((module) => ({ default: module.CompetitorPagesPage })));
const CompetitorAdsPage = React.lazy(() => import("./pages/competitor/CompetitorAdsPage").then((module) => ({ default: module.CompetitorAdsPage })));
const CompetitorEmailsPage = React.lazy(() => import("./pages/competitor/CompetitorEmailsPage").then((module) => ({ default: module.CompetitorEmailsPage })));
const CompetitorTechnologiesPage = React.lazy(() => import("./pages/competitor/CompetitorTechnologiesPage").then((module) => ({ default: module.CompetitorTechnologiesPage })));
const CompetitorMonitoringPage = React.lazy(() => import("./pages/competitor/CompetitorMonitoringPage").then((module) => ({ default: module.CompetitorMonitoringPage })));
const Monitoring = React.lazy(() => import("./pages/Monitoring").then((module) => ({ default: module.Monitoring })));
const Alerts = React.lazy(() => import("./pages/Alerts").then((module) => ({ default: module.Alerts })));
const Reports = React.lazy(() => import("./pages/Reports").then((module) => ({ default: module.Reports })));
const ReportBuilderPage = React.lazy(() => import("./pages/reports/ReportBuilderPage").then((module) => ({ default: module.ReportBuilderPage })));
const ReportDetailPage = React.lazy(() => import("./pages/reports/ReportDetailPage").then((module) => ({ default: module.ReportDetailPage })));
const Settings = React.lazy(() => import("./pages/Settings").then((module) => ({ default: module.Settings })));
const ProfileSettingsPage = React.lazy(() => import("./pages/settings/ProfileSettingsPage").then((module) => ({ default: module.ProfileSettingsPage })));
const WorkspaceSettingsPage = React.lazy(() => import("./pages/settings/WorkspaceSettingsPage").then((module) => ({ default: module.WorkspaceSettingsPage })));
const AlertSettingsPage = React.lazy(() => import("./pages/settings/AlertSettingsPage").then((module) => ({ default: module.AlertSettingsPage })));
const IntegrationsSettingsPage = React.lazy(() => import("./pages/settings/IntegrationsSettingsPage").then((module) => ({ default: module.IntegrationsSettingsPage })));
const TeamSettingsPage = React.lazy(() => import("./pages/settings/TeamSettingsPage").then((module) => ({ default: module.TeamSettingsPage })));

const queryClient = new QueryClient();

function SuspenseFrame({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500/20 border-t-brand-500" />
            <span className="text-sm font-medium text-text-secondary">Carregando módulo do espaço de trabalho...</span>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <SuspenseFrame><Login /></SuspenseFrame>,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/",
    element: <DashboardLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <SuspenseFrame><Dashboard /></SuspenseFrame> },
      { path: "competitors", element: <SuspenseFrame><Competitors /></SuspenseFrame> },
      { path: "competitors/new", element: <SuspenseFrame><NewCompetitorPage /></SuspenseFrame> },
      {
        path: "competitors/:competitorId",
        element: <SuspenseFrame><CompetitorWorkspace /></SuspenseFrame>,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: "overview", element: <SuspenseFrame><CompetitorOverviewPage /></SuspenseFrame> },
          { path: "funnels", element: <SuspenseFrame><CompetitorFunnelsPage /></SuspenseFrame> },
          { path: "funnels/:funnelVersionId", element: <SuspenseFrame><FunnelVersionPage /></SuspenseFrame> },
          { path: "pages", element: <SuspenseFrame><CompetitorPagesPage /></SuspenseFrame> },
          { path: "ads", element: <SuspenseFrame><CompetitorAdsPage /></SuspenseFrame> },
          { path: "emails", element: <SuspenseFrame><CompetitorEmailsPage /></SuspenseFrame> },
          { path: "technologies", element: <SuspenseFrame><CompetitorTechnologiesPage /></SuspenseFrame> },
          { path: "monitoring", element: <SuspenseFrame><CompetitorMonitoringPage /></SuspenseFrame> },
        ],
      },
      { path: "monitoring", element: <SuspenseFrame><Monitoring /></SuspenseFrame> },
      { path: "alerts", element: <SuspenseFrame><Alerts /></SuspenseFrame> },
      { path: "reports", element: <SuspenseFrame><Reports /></SuspenseFrame> },
      { path: "reports/new", element: <SuspenseFrame><ReportBuilderPage /></SuspenseFrame> },
      { path: "reports/:reportId", element: <SuspenseFrame><ReportDetailPage /></SuspenseFrame> },
      {
        path: "settings",
        element: <SuspenseFrame><Settings /></SuspenseFrame>,
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          { path: "profile", element: <SuspenseFrame><ProfileSettingsPage /></SuspenseFrame> },
          { path: "workspace", element: <SuspenseFrame><WorkspaceSettingsPage /></SuspenseFrame> },
          { path: "alerts", element: <SuspenseFrame><AlertSettingsPage /></SuspenseFrame> },
          { path: "integrations", element: <SuspenseFrame><IntegrationsSettingsPage /></SuspenseFrame> },
          { path: "team", element: <SuspenseFrame><TeamSettingsPage /></SuspenseFrame> },
        ],
      },
    ],
  },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
