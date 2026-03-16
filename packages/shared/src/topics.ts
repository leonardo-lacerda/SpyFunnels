export const TOPICS = {
  TARGET_CREATED: "target.created",
  CRAWL_REQUESTED: "crawl.requested",
  CRAWL_PAGE_CAPTURED: "crawl.page.captured",
  CRAWL_COMPLETED: "crawl.completed",
  SIMULATION_REQUESTED: "simulation.requested",
  SIMULATION_COMPLETED: "simulation.completed",
  JOURNEY_EVENT_CAPTURED: "journey.event.captured",
  STACK_DETECTION_REQUESTED: "stack-detection.requested",
  STACK_DETECTED: "stack.detected",
  EMAIL_SYNC_REQUESTED: "email-sync.requested",
  EMAIL_INGESTED: "email.ingested",
  AD_SYNC_REQUESTED: "ad-sync.requested",
  AD_INGESTED: "ad.ingested",
  FUNNEL_ANALYSIS_REQUESTED: "funnel-analysis.requested",
  FUNNEL_RECONSTRUCTED: "funnel.reconstructed",
  MONITORING_REQUESTED: "monitoring.requested",
  CHANGE_DETECTED: "change.detected",
  REPORT_GENERATION_REQUESTED: "report-generation.requested",
  REPORT_GENERATED: "report.generated",
  ALERT_TRIGGERED: "alert.triggered"
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];
