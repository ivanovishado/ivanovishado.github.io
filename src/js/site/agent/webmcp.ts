interface WebMcpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

interface ModelContextApi {
  registerTool?: (tool: WebMcpToolDefinition) => void;
}

type DocumentWithModelContext = Document & { modelContext?: ModelContextApi };
type NavigatorWithModelContext = Navigator & { modelContext?: ModelContextApi };

let registered = false;

async function callPortfolioMcp(name: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch('/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  if (!res.ok) throw new Error(`MCP request failed (${res.status})`);
  const data = (await res.json()) as { result?: unknown; error?: { message?: string } };
  if (data.error) throw new Error(data.error.message ?? 'MCP tool error');
  return data.result ?? {};
}

export function initWebMcp(): void {
  if (registered) return;
  const modelContext =
    (document as DocumentWithModelContext).modelContext ??
    (navigator as NavigatorWithModelContext).modelContext;
  if (!modelContext?.registerTool) return;
  registered = true;

  const tools: WebMcpToolDefinition[] = [
    {
      name: 'get_mentorship_overview',
      description: 'Return Ivan Galaviz 1-on-1 software and AI engineering mentorship overview, pricing (500 MXN / 45 min), languages (EN/ES), and Cal.com link.',
      inputSchema: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['en', 'es'], description: 'Preferred language: en or es.' },
        },
        required: [],
      },
      annotations: { readOnlyHint: true },
      execute: (args) => callPortfolioMcp('get_mentorship_overview', args),
    },
    {
      name: 'get_available_slots',
      description: 'Fetch live open 45-minute Cal.com mentorship slots with pre-filled checkout links.',
      inputSchema: {
        type: 'object',
        properties: {
          start: { type: 'string', description: 'Start date (YYYY-MM-DD).' },
          end: { type: 'string', description: 'End date (YYYY-MM-DD).' },
          timeZone: { type: 'string', description: 'IANA time zone (e.g. America/Mexico_City, America/New_York).' },
        },
        required: [],
      },
      annotations: { readOnlyHint: true },
      execute: (args) => callPortfolioMcp('get_available_slots', args),
    },
    {
      name: 'get_candidate_profile',
      description: 'Return Ivan Galaviz Senior/Staff Software & AI Engineer resume dossier, track record, remote preference, and recruiter contact details.',
      inputSchema: {
        type: 'object',
        properties: {
          focus: { type: 'string', description: 'Optional competency filter: ai, distributed-systems, leadership, advisory.' },
          language: { type: 'string', enum: ['en', 'es'], description: 'Preferred language: en or es.' },
        },
        required: [],
      },
      annotations: { readOnlyHint: true },
      execute: (args) => callPortfolioMcp('get_candidate_profile', args),
    },
    {
      name: 'evaluate_role_fit',
      description: 'Evaluate Ivan Galaviz fit for a Senior/Staff Software or AI Engineering role based on title, skills, level, and location.',
      inputSchema: {
        type: 'object',
        properties: {
          roleTitle: { type: 'string', description: 'Target role title.' },
          requirements: { type: 'array', items: { type: 'string' }, description: 'Required skills or domains.' },
          level: { type: 'string', description: 'Seniority level (senior, staff, principal).' },
          location: { type: 'string', description: 'Location or remote arrangement.' },
          language: { type: 'string', enum: ['en', 'es'], description: 'Preferred language: en or es.' },
        },
        required: ['roleTitle'],
      },
      annotations: { readOnlyHint: true },
      execute: (args) => callPortfolioMcp('evaluate_role_fit', args),
    },
  ];

  for (const tool of tools) {
    modelContext.registerTool(tool);
  }
}
