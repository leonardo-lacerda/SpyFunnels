const stageLabels: Record<string, string> = {
  ad: "Anúncio",
  landing: "Página de destino",
  "lead-magnet": "Isca digital",
  email: "Email",
  webinar: "Webinar",
  offer: "Oferta",
  checkout: "Checkout",
  upsell: "Upsell",
  "thank-you": "Obrigado",
};

const channelLabels: Record<string, string> = {
  ad: "Anúncio",
  email: "Email",
  webinar: "Webinar",
  web: "Web",
};

const confidenceLabels: Record<string, string> = {
  high: "alto",
  medium: "médio",
  low: "baixo",
};

const severityLabels: Record<string, string> = {
  critical: "crítico",
  high: "alto",
  medium: "médio",
  low: "baixo",
};

const competitorStatusLabels: Record<string, string> = {
  active: "ativo",
  syncing: "sincronizando",
  paused: "pausado",
};

const alertStatusLabels: Record<string, string> = {
  open: "aberto",
  reviewed: "revisado",
  muted: "silenciado",
  enabled: "ativo",
};

const priorityLabels: Record<string, string> = {
  "tier-1": "nível 1",
  "tier-2": "nível 2",
  "tier-3": "nível 3",
};

const tagLabels: Record<string, string> = {
  funnel: "funil",
  ads: "anúncios",
  email: "email",
  stack: "tecnologia",
  monitoring: "monitoramento",
};

const adStatusLabels: Record<string, string> = {
  new: "novo",
  active: "ativo",
  paused: "pausado",
};

const reportStatusLabels: Record<string, string> = {
  completed: "concluído",
  pending: "pendente",
  "in-progress": "em andamento",
  in_progress: "em andamento",
};

const techCategoryLabels: Record<string, string> = {
  analytics: "análises",
  marketing: "marketing",
  commerce: "comércio",
  infrastructure: "infraestrutura",
  automation: "automação",
};

const techStatusLabels: Record<string, string> = {
  new: "novo",
  removed: "removido",
  active: "ativo",
};

const emailIntentLabels: Record<string, string> = {
  welcome: "boas-vindas",
  nurture: "nutrição",
};

const emailTagLabels: Record<string, string> = {
  offer: "oferta",
  webinar: "webinar",
  captured: "capturado",
};

const pageStatusLabels: Record<string, string> = {
  active: "ativo",
  testing: "em teste",
  archived: "arquivado",
};

const groupModeLabels: Record<string, string> = {
  stage: "etapa",
  channel: "canal",
};

const changeTypeLabels: Record<string, string> = {
  created: "criado",
  updated: "atualizado",
  removed: "removido",
  grouped: "agrupado",
  modified: "modificado",
  added: "adicionado",
};

const roleLabels: Record<string, string> = {
  owner: "proprietário",
  admin: "administrador",
  analyst: "analista",
  strategist: "estrategista",
  member: "membro",
};

const cadenceLabels: Record<string, string> = {
  "6-hour tiered cadence": "cadência escalonada de 6 horas",
  daily: "diário",
  weekly: "semanal",
  monthly: "mensal",
};

function fallbackLabel(value: string) {
  const normalized = value.replace(/[_-]/g, " ").trim();
  if (!normalized) return value;
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
}

export function formatStage(value: string) {
  return stageLabels[value] ?? fallbackLabel(value);
}

export function formatChannel(value: string) {
  return channelLabels[value] ?? fallbackLabel(value);
}

export function formatConfidence(value: string) {
  return confidenceLabels[value] ?? fallbackLabel(value);
}

export function formatSeverity(value: string) {
  return severityLabels[value] ?? fallbackLabel(value);
}

export function formatCompetitorStatus(value: string) {
  return competitorStatusLabels[value] ?? fallbackLabel(value);
}

export function formatAlertStatus(value: string) {
  return alertStatusLabels[value] ?? fallbackLabel(value);
}

export function formatPriority(value: string) {
  return priorityLabels[value] ?? fallbackLabel(value);
}

export function formatTag(value: string) {
  return tagLabels[value] ?? fallbackLabel(value);
}

export function formatAdStatus(value: string) {
  return adStatusLabels[value] ?? fallbackLabel(value);
}

export function formatReportStatus(value: string) {
  return reportStatusLabels[value] ?? fallbackLabel(value);
}

export function formatTechCategory(value: string) {
  return techCategoryLabels[value] ?? fallbackLabel(value);
}

export function formatTechStatus(value: string) {
  return techStatusLabels[value] ?? fallbackLabel(value);
}

export function formatEmailIntent(value: string) {
  return emailIntentLabels[value] ?? fallbackLabel(value);
}

export function formatEmailTag(value: string) {
  return emailTagLabels[value] ?? fallbackLabel(value);
}

export function formatPageStatus(value: string) {
  return pageStatusLabels[value] ?? fallbackLabel(value);
}

export function formatGroupMode(value: string) {
  return groupModeLabels[value] ?? fallbackLabel(value);
}

export function formatChangeType(value: string) {
  return changeTypeLabels[value] ?? fallbackLabel(value);
}

export function formatRole(value: string) {
  return roleLabels[value] ?? fallbackLabel(value);
}

export function formatCadence(value: string) {
  return cadenceLabels[value] ?? value;
}
