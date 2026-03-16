import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { intelligenceService } from "../services/intelligence";

const LIVE_REFETCH_MS = 30_000;

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["dashboard", "workspace-1"],
    queryFn: () => intelligenceService.getDashboard(),
    staleTime: 15_000,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useCompetitorsQuery() {
  return useQuery({
    queryKey: ["competitors", "workspace-1"],
    queryFn: () => intelligenceService.getCompetitors(),
    staleTime: 60_000,
  });
}

export function useCompetitorQuery(competitorId?: string) {
  return useQuery({
    queryKey: ["competitor", "workspace-1", competitorId],
    queryFn: () => intelligenceService.getCompetitor(competitorId ?? ""),
    enabled: Boolean(competitorId),
    staleTime: 60_000,
  });
}

export function useFunnelVersionsQuery(competitorId?: string) {
  return useQuery({
    queryKey: ["funnels", "workspace-1", competitorId],
    queryFn: () => intelligenceService.getFunnelVersions(competitorId ?? ""),
    enabled: Boolean(competitorId),
    staleTime: 45_000,
  });
}

export function useFlowGraphCurrentQuery(competitorId?: string) {
  return useQuery({
    queryKey: ["flow-graph", "workspace-1", competitorId, "current"],
    queryFn: () => intelligenceService.getFlowGraphCurrent(competitorId ?? ""),
    enabled: Boolean(competitorId),
    staleTime: 30_000,
    refetchInterval: LIVE_REFETCH_MS
  });
}

export function useFlowGraphVersionsQuery(competitorId?: string) {
  return useQuery({
    queryKey: ["flow-graph", "workspace-1", competitorId, "versions"],
    queryFn: () => intelligenceService.getFlowGraphVersions(competitorId ?? ""),
    enabled: Boolean(competitorId),
    staleTime: 30_000,
    refetchInterval: LIVE_REFETCH_MS
  });
}

export function useFlowGraphVersionQuery(competitorId?: string, versionId?: string | null) {
  return useQuery({
    queryKey: ["flow-graph", "workspace-1", competitorId, "version", versionId ?? "none"],
    queryFn: () => intelligenceService.getFlowGraphVersion(competitorId ?? "", versionId ?? ""),
    enabled: Boolean(competitorId && versionId),
    staleTime: 30_000
  });
}

export function useFunnelVersionQuery(funnelVersionId?: string) {
  return useQuery({
    queryKey: ["funnel-version", "workspace-1", funnelVersionId],
    queryFn: () => intelligenceService.getFunnelVersion(funnelVersionId ?? ""),
    enabled: Boolean(funnelVersionId),
    staleTime: 45_000,
  });
}

export function useLandingPagesQuery(competitorId?: string) {
  return useQuery({
    queryKey: ["landing-pages", "workspace-1", competitorId],
    queryFn: () => intelligenceService.getLandingPages(competitorId ?? ""),
    enabled: Boolean(competitorId),
    staleTime: 60_000,
  });
}

export function useAdsQuery(competitorId?: string) {
  return useQuery({
    queryKey: ["ads", "workspace-1", competitorId ?? "all"],
    queryFn: () => intelligenceService.getAds(competitorId),
    staleTime: 60_000,
  });
}

export function useEmailsQuery(competitorId?: string) {
  return useQuery({
    queryKey: ["emails", "workspace-1", competitorId ?? "all"],
    queryFn: () => intelligenceService.getEmails(competitorId),
    staleTime: 60_000,
  });
}

export function useTechnologiesQuery(competitorId?: string) {
  return useQuery({
    queryKey: ["technologies", "workspace-1", competitorId ?? "all"],
    queryFn: () => intelligenceService.getTechnologies(competitorId),
    staleTime: 60_000,
  });
}

export function useMonitoringEventsQuery(competitorId?: string) {
  return useQuery({
    queryKey: ["monitoring", "workspace-1", competitorId ?? "all", "last-7-days"],
    queryFn: () => intelligenceService.getMonitoringEvents(competitorId),
    staleTime: 10_000,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useAlertsQuery() {
  return useQuery({
    queryKey: ["alerts", "workspace-1", "last-7-days"],
    queryFn: () => intelligenceService.getAlerts(),
    staleTime: 10_000,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useReportsQuery() {
  return useQuery({
    queryKey: ["reports", "workspace-1"],
    queryFn: () => intelligenceService.getReports(),
    staleTime: 60_000,
  });
}

export function useReportQuery(reportId?: string) {
  return useQuery({
    queryKey: ["report", "workspace-1", reportId],
    queryFn: () => intelligenceService.getReport(reportId ?? ""),
    enabled: Boolean(reportId),
    staleTime: 60_000,
  });
}

export function useCreateCompetitorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: intelligenceService.createCompetitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "workspace-1"] });
      queryClient.invalidateQueries({ queryKey: ["competitors", "workspace-1"] });
    },
  });
}

export function useRunCompetitorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: intelligenceService.runCompetitor,
    onSuccess: (_, competitorId) => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "workspace-1"] });
      queryClient.invalidateQueries({ queryKey: ["competitor", "workspace-1", competitorId] });
      queryClient.invalidateQueries({ queryKey: ["monitoring", "workspace-1", competitorId] });
      queryClient.invalidateQueries({ queryKey: ["alerts", "workspace-1", "last-7-days"] });
    },
  });
}

export function useGenerateReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: intelligenceService.generateReport,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["reports", "workspace-1"] });
      queryClient.invalidateQueries({ queryKey: ["report", "workspace-1", result.reportId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "workspace-1"] });
    },
  });
}

export function useUpdateAlertStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, status }: { alertId: string; status: "open" | "reviewed" | "muted" }) =>
      intelligenceService.updateAlertStatus(alertId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts", "workspace-1", "last-7-days"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "workspace-1"] });
    },
  });
}
