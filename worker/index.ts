import {
  BOOKING_MD_URL,
  BOOKING_URL,
  CAL_EVENT_TYPE_ID,
  CAL_SLOTS_API_URL,
  CAL_SLOTS_API_VERSION,
  CANDIDATE_COMPETENCIES,
  CANDIDATE_PROFILE,
  CONTACT_EMAIL,
  IVAN_PROFILE,
  MCP_PROTOCOL_VERSION,
  MCP_TOOLS,
  MENTORSHIP_FAQS,
  MENTORSHIP_OVERVIEW,
  MENTORSHIP_TOPICS,
  RECRUITER_FAQS,
  REPO_URL,
  SITE_ORIGIN,
  buildA2aAgentCard,
  buildArdCatalog,
  buildServerCard,
} from './mcp-data';

export interface AssetFetcher {
  fetch(input: Request | string): Promise<Response>;
}

export interface Env {
  ASSETS: AssetFetcher;
}

const PAGE_ROUTES: Record<string, { html: string; md: string }> = {
  '/': { html: '/index.html', md: '/index.md' },
  '/index.html': { html: '/index.html', md: '/index.md' },
  '/resume': { html: '/resume/index.html', md: '/resume/index.md' },
  '/mentorship': { html: '/mentorship/index.html', md: '/mentorship/index.md' },
  '/work/netflix': { html: '/work/netflix/index.html', md: '/work/netflix/index.md' },
  '/work/mcb-1': { html: '/work/mcb-1/index.html', md: '/work/mcb-1/index.md' },
  '/work/nubank': { html: '/work/nubank/index.html', md: '/work/nubank/index.md' },
  '/work/wizeline': { html: '/work/wizeline/index.html', md: '/work/wizeline/index.md' },
  '/trajectory': { html: '/trajectory/index.html', md: '/trajectory/index.md' },
  '/shelf': { html: '/shelf/index.html', md: '/shelf/index.md' },
  '/privacy': { html: '/privacy/index.html', md: '/privacy/index.md' },
};

const AI_BOT_UA =
  /claudebot|claude-user|claude-searchbot|claude-code|anthropic-ai|gptbot|chatgpt-user|oai-searchbot|perplexitybot|perplexity-user|google-extended|ccbot|cohere-ai|meta-externalagent|cursor|opencode/i;

const AUDIT_AGENT_UA = /agent-readability|ora-agent/i;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id',
};

function wantsMarkdown(request: Request): boolean {
  const accept = (request.headers.get('Accept') ?? '').toLowerCase();
  const ua = request.headers.get('User-Agent') ?? '';
  if (accept.includes('text/markdown') && !/text\/markdown\s*;\s*q=0(?:\.0+)?(?:\s|,|$)/.test(accept)) {
    return true;
  }
  if (AI_BOT_UA.test(ua)) {
    return true;
  }
  if (accept.includes('text/html')) {
    return false;
  }
  return AUDIT_AGENT_UA.test(ua);
}

function buildAgentModeData(pageUrl: string) {
  return {
    mode: 'agent',
    name: IVAN_PROFILE.name,
    headline: CANDIDATE_PROFILE.headline,
    canonicalUrl: pageUrl,
    authentication: {
      required: false,
      type: 'none',
      note: 'Public read-only portfolio, Markdown mirrors, live Cal.com availability, and Streamable HTTP MCP server. No API key or OAuth required.',
    },
    endpoints: {
      mcp: `${SITE_ORIGIN}/mcp`,
      mcpServerCard: `${SITE_ORIGIN}/mcp/server-card`,
      ardCatalog: `${SITE_ORIGIN}/.well-known/ard.json`,
      a2aAgentCard: `${SITE_ORIGIN}/.well-known/agent-card.json`,
      agentSkillsIndex: `${SITE_ORIGIN}/.well-known/agent-skills/index.json`,
      llmsTxt: `${SITE_ORIGIN}/llms.txt`,
      mentorshipLlmsTxt: `${SITE_ORIGIN}/mentorship/llms.txt`,
      resumeLlmsTxt: `${SITE_ORIGIN}/resume/llms.txt`,
      llmsFullTxt: `${SITE_ORIGIN}/llms-full.txt`,
      sitemapMd: `${SITE_ORIGIN}/sitemap.md`,
      pricingMd: `${SITE_ORIGIN}/pricing.md`,
      liveAvailabilityMd: `${SITE_ORIGIN}/mentorship/availability.md`,
      calComBooking: BOOKING_URL,
      sourceRepository: REPO_URL,
    },
    capabilities: {
      recruiting: {
        resumeUrl: `${SITE_ORIGIN}/resume/`,
        targetRoles: CANDIDATE_PROFILE.targetRoles,
        location: CANDIDATE_PROFILE.location,
        workArrangement: CANDIDATE_PROFILE.workArrangement,
        contactEmail: CONTACT_EMAIL,
      },
      mentorship: {
        pageUrl: `${SITE_ORIGIN}/mentorship/`,
        pricing: `${MENTORSHIP_OVERVIEW.price.amount} ${MENTORSHIP_OVERVIEW.price.currency} (approx. ${MENTORSHIP_OVERVIEW.price.approxUsd}) per ${MENTORSHIP_OVERVIEW.durationMinutes}-minute session`,
        languages: MENTORSHIP_OVERVIEW.languages,
        bookingUrl: BOOKING_URL,
      },
      mcpTools: MCP_TOOLS.map((t) => ({ name: t.name, title: t.title })),
    },
  };
}

function formatAgentModeMarkdown(pageUrl: string): string {
  const data = buildAgentModeData(pageUrl);
  return [
    '---',
    'title: "Agent Mode | Ivan Galaviz"',
    'description: "Structured machine-readable entry point for Ivan Galaviz: endpoints, no-auth read-only MCP server, resume, mentorship pricing, and live Cal.com availability."',
    `canonical_url: ${JSON.stringify(pageUrl)}`,
    'mode: "agent"',
    '---',
    '',
    '# Ivan Galaviz — Agent Mode',
    '',
    `${data.headline}`,
    '',
    '## Authentication',
    '',
    '- **Required:** None (public, read-only; no API key or OAuth required)',
    '- **Content negotiation:** Send `Accept: text/markdown` on any page URL, or fetch `<page>/index.md` directly',
    '',
    '## Machine-Readable Endpoints',
    '',
    `- **MCP Server (Streamable HTTP JSON-RPC 2.0):** \`POST ${data.endpoints.mcp}\``,
    `- **MCP Server Card:** [${data.endpoints.mcpServerCard}](${data.endpoints.mcpServerCard})`,
    `- **ARD Discovery Catalog (v0.91):** [${data.endpoints.ardCatalog}](${data.endpoints.ardCatalog})`,
    `- **A2A Agent Card:** [${data.endpoints.a2aAgentCard}](${data.endpoints.a2aAgentCard})`,
    `- **Agent Skills Index (v0.2.0):** [${data.endpoints.agentSkillsIndex}](${data.endpoints.agentSkillsIndex})`,
    `- **Root llms.txt:** [${data.endpoints.llmsTxt}](${data.endpoints.llmsTxt})`,
    `- **Mentorship llms.txt:** [${data.endpoints.mentorshipLlmsTxt}](${data.endpoints.mentorshipLlmsTxt})`,
    `- **Resume llms.txt:** [${data.endpoints.resumeLlmsTxt}](${data.endpoints.resumeLlmsTxt})`,
    `- **Live Mentorship Availability (plain GET):** [${data.endpoints.liveAvailabilityMd}](${data.endpoints.liveAvailabilityMd})`,
    `- **Mentorship Pricing:** [${data.endpoints.pricingMd}](${data.endpoints.pricingMd})`,
    `- **Markdown Sitemap:** [${data.endpoints.sitemapMd}](${data.endpoints.sitemapMd})`,
    `- **Source Repo (with AGENTS.md):** [${data.endpoints.sourceRepository}](${data.endpoints.sourceRepository})`,
    '',
    '## Key Capabilities',
    '',
    `- **Recruiting & Senior/Staff Hiring:** [${data.capabilities.recruiting.resumeUrl}](${data.capabilities.recruiting.resumeUrl}) — ${data.capabilities.recruiting.workArrangement} Contact: ${CONTACT_EMAIL}`,
    `- **1-on-1 Software & AI Mentorship (EN/ES):** [${data.capabilities.mentorship.pageUrl}](${data.capabilities.mentorship.pageUrl}) — ${data.capabilities.mentorship.pricing}. Book: [${BOOKING_URL}](${BOOKING_URL})`,
    '',
    '## Available MCP Tools (`POST /mcp`)',
    '',
    ...MCP_TOOLS.map((t) => `- \`${t.name}\` — ${t.title}`),
    '',
  ].join('\n');
}

function estimateTokens(text: string): string {
  return String(Math.max(1, Math.ceil(text.length / 4)));
}

function normalizePath(pathname: string): string {
  if (pathname === '/' || pathname === '') return '/';
  return pathname.replace(/\/+$/, '');
}

function jsonResponse(body: unknown, status = 200, contentType = 'application/json; charset=utf-8', extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'Content-Type': contentType,
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

async function fetchAssetText(env: Env, origin: string, assetPath: string): Promise<string | null> {
  const res = await env.ASSETS.fetch(new Request(new URL(assetPath, origin), { method: 'GET' }));
  if (!res.ok) return null;
  return res.text();
}

function buildBookingUrl(opts: { slot?: string; name?: string; email?: string; notes?: string } = {}): string {
  const url = new URL(BOOKING_URL);
  if (opts.slot) url.searchParams.set('slot', opts.slot);
  if (opts.name) url.searchParams.set('name', opts.name);
  if (opts.email) url.searchParams.set('email', opts.email);
  if (opts.notes) url.searchParams.set('notes', opts.notes);
  return url.toString();
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]!;
}

interface CalSlot {
  date: string;
  start: string;
  bookingUrl: string;
}

interface CalSlotsResult {
  ok: boolean;
  start: string;
  end: string;
  timeZone: string;
  checkedAt: string;
  slots: CalSlot[];
  error?: string;
}

const SLOTS_CACHE_TTL = 300;

function getEdgeCache(): Cache | undefined {
  return (globalThis as { caches?: { default?: Cache } }).caches?.default;
}

async function queryCalSlots(opts: { start?: string; end?: string; days?: number; timeZone?: string }): Promise<CalSlotsResult> {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const now = new Date();
  const days = Math.min(30, Math.max(1, Number.isFinite(opts.days) ? Math.floor(opts.days!) : 14));
  const startStr = opts.start && datePattern.test(opts.start) ? opts.start : isoDate(now);
  const startDate = new Date(`${startStr}T00:00:00Z`);
  const defaultEnd = new Date(startDate.getTime() + days * 86_400_000);
  let endStr = opts.end && datePattern.test(opts.end) ? opts.end : isoDate(defaultEnd);
  const endDate = new Date(`${endStr}T00:00:00Z`);
  if (Number.isNaN(endDate.getTime()) || endDate < startDate) {
    endStr = isoDate(defaultEnd);
  } else if (endDate.getTime() - startDate.getTime() > 30 * 86_400_000) {
    endStr = isoDate(new Date(startDate.getTime() + 30 * 86_400_000));
  }
  const timeZone = opts.timeZone?.trim() || 'America/Mexico_City';

  const cache = getEdgeCache();
  const cacheKey = new Request(
    `https://cache.ivanovishado.dev/cal-slots?event=${CAL_EVENT_TYPE_ID}&start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}&tz=${encodeURIComponent(timeZone)}`,
  );
  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return (await cached.json()) as CalSlotsResult;
    }
  }

  const query = new URL(CAL_SLOTS_API_URL);
  query.searchParams.set('eventTypeId', String(CAL_EVENT_TYPE_ID));
  query.searchParams.set('start', startStr);
  query.searchParams.set('end', endStr);
  query.searchParams.set('timeZone', timeZone);

  try {
    const res = await fetch(query.toString(), {
      headers: { 'cal-api-version': CAL_SLOTS_API_VERSION, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`Cal.com returned HTTP ${res.status}`);
    const data = (await res.json()) as { data?: Record<string, { start: string }[]> };
    const byDate = data.data ?? {};
    const slots: CalSlot[] = Object.entries(byDate).flatMap(([date, list]) =>
      (list ?? []).map((item) => ({
        date,
        start: item.start,
        bookingUrl: buildBookingUrl({ slot: item.start }),
      })),
    );
    const result: CalSlotsResult = {
      ok: true,
      start: startStr,
      end: endStr,
      timeZone,
      checkedAt: new Date().toISOString(),
      slots,
    };
    if (cache) {
      await cache.put(
        cacheKey,
        new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${SLOTS_CACHE_TTL}` },
        }),
      );
    }
    return result;
  } catch (error) {
    return {
      ok: false,
      start: startStr,
      end: endStr,
      timeZone,
      checkedAt: new Date().toISOString(),
      slots: [],
      error: error instanceof Error ? error.message : 'Unable to reach Cal.com',
    };
  }
}

function formatAvailabilitySection(res: CalSlotsResult): string {
  const lines = [
    `## Live Upcoming Availability (${res.timeZone})`,
    '',
    `Checked live from Cal.com (event ${CAL_EVENT_TYPE_ID}) at \`${res.checkedAt}\` for **${res.start} to ${res.end}**. Each 45-minute 1-on-1 session is **500 MXN (approx. $25 to $30 USD)**, paid on checkout. Click any slot to open pre-filled booking on Cal.com:`,
    '',
  ];
  if (!res.ok) {
    lines.push(`Live slots could not be loaded right now (${res.error}). View open times and book directly at [${BOOKING_URL}](${BOOKING_URL}).`);
    return lines.join('\n');
  }
  if (res.slots.length === 0) {
    lines.push(`No open slots between ${res.start} and ${res.end}. Check later dates directly at [${BOOKING_URL}](${BOOKING_URL}) or pass \`?days=30\`.`);
    return lines.join('\n');
  }
  for (const s of res.slots.slice(0, 24)) {
    lines.push(`- \`${s.start}\` — [Book this slot](${s.bookingUrl})`);
  }
  if (res.slots.length > 24) {
    lines.push(`- ...and ${res.slots.length - 24} more open slots at [${BOOKING_URL}](${BOOKING_URL})`);
  }
  lines.push(
    '',
    `Need another time zone or date range? Fetch \`${SITE_ORIGIN}/mentorship/availability.md?timeZone=America/New_York&days=21\` or book directly at [${BOOKING_URL}](${BOOKING_URL}).`,
  );
  return lines.join('\n');
}

function formatAvailabilityDocument(res: CalSlotsResult): string {
  const frontmatter = [
    '---',
    'title: "Live Mentorship Availability | Ivan Galaviz"',
    'description: "Real-time open 45-minute 1-on-1 software and AI engineering mentorship slots with Ivan Galaviz (500 MXN, approx. $25 to $30 USD, English or Spanish)."',
    `canonical_url: "${SITE_ORIGIN}/mentorship/"`,
    `last_updated: "${res.checkedAt.split('T')[0]}"`,
    'language: "en, es"',
    '---',
    '',
    '# Live Mentorship Availability — Ivan Galaviz',
    '',
    `- **Mentor:** Ivan Galaviz (Senior Software Engineer at Netflix, Mexico City, Mexico)`,
    `- **Price:** 500 MXN (approx. $25 to $30 USD) per 45-minute session (pay-per-session, no subscription)`,
    `- **Languages:** English or Spanish`,
    `- **Location:** Google Meet, worldwide`,
    `- **Full mentorship guide:** [${SITE_ORIGIN}/mentorship/](${SITE_ORIGIN}/mentorship/)`,
    `- **Direct booking calendar:** [${BOOKING_URL}](${BOOKING_URL})`,
    '',
  ].join('\n');
  return `${frontmatter}${formatAvailabilitySection(res)}\n`;
}

async function fetchLiveSlots(args: Record<string, unknown>) {
  const res = await queryCalSlots({
    start: typeof args.start === 'string' ? args.start : undefined,
    end: typeof args.end === 'string' ? args.end : undefined,
    days: 7,
    timeZone: typeof args.timeZone === 'string' ? args.timeZone : undefined,
  });

  if (!res.ok) {
    const payload = {
      error: res.error,
      bookingPage: BOOKING_URL,
      availabilityUrl: `${SITE_ORIGIN}/mentorship/availability.md`,
      calMdUrl: BOOKING_MD_URL,
      eventTypeId: CAL_EVENT_TYPE_ID,
    };
    return {
      content: [{ type: 'text', text: `Could not fetch live slots (${res.error}). View live availability and book directly at ${BOOKING_URL} (agent docs: ${BOOKING_MD_URL}).` }],
      structuredContent: payload,
    };
  }

  const payload = {
    eventTypeId: CAL_EVENT_TYPE_ID,
    start: res.start,
    end: res.end,
    timeZone: res.timeZone,
    checkedAt: res.checkedAt,
    totalSlots: res.slots.length,
    slots: res.slots,
    bookingPage: BOOKING_URL,
    availabilityUrl: `${SITE_ORIGIN}/mentorship/availability.md`,
    calMdUrl: BOOKING_MD_URL,
    paymentNote: 'Payment (500 MXN, approx. $25 to $30 USD) is collected on the Cal.com checkout page when clicking a slot link.',
  };
  const text =
    res.slots.length > 0
      ? [
          `Found ${res.slots.length} open 45-minute mentorship slots (${res.start} to ${res.end}, ${res.timeZone}):`,
          ...res.slots.slice(0, 12).map((s) => `- ${s.start} → ${s.bookingUrl}`),
          res.slots.length > 12 ? `...and ${res.slots.length - 12} more slots on ${BOOKING_URL}` : '',
          'Tip: call get_booking_link with slot, name, email, and notes to generate a pre-filled checkout URL.',
        ]
          .filter(Boolean)
          .join('\n')
      : `No open slots found between ${res.start} and ${res.end} (${res.timeZone}). Try a later date range or view the full calendar at ${BOOKING_URL}.`;
  return { content: [{ type: 'text', text }], structuredContent: payload };
}

async function runTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'get_candidate_profile': {
      const language = args.language === 'es' ? 'es' : 'en';
      const rawFocus = typeof args.focus === 'string' ? args.focus.trim().toLowerCase() : '';
      const exactMatch = rawFocus
        ? CANDIDATE_COMPETENCIES.filter((c) => c.category === rawFocus || c.slug === rawFocus)
        : [];
      const matched = exactMatch.length > 0
        ? exactMatch
        : rawFocus
          ? CANDIDATE_COMPETENCIES.filter(
              (c) =>
                c.title.toLowerCase().includes(rawFocus) ||
                c.titleEs.toLowerCase().includes(rawFocus) ||
                c.summary.toLowerCase().includes(rawFocus) ||
                c.keywords.some((kw) => rawFocus.includes(kw.toLowerCase()) || kw.toLowerCase().includes(rawFocus)),
            )
          : CANDIDATE_COMPETENCIES;
      const selected = matched.length > 0 ? matched : CANDIDATE_COMPETENCIES;
      const formattedCompetencies = selected.map((c) => ({
        slug: c.slug,
        category: c.category,
        title: language === 'es' ? c.titleEs : c.title,
        summary: language === 'es' ? c.summaryEs : c.summary,
        evidence: c.evidence,
        stack: c.stack,
        caseStudyUrl: c.caseStudyUrl,
      }));
      const payload = {
        ...CANDIDATE_PROFILE,
        language: language === 'es' ? 'Spanish' : 'English',
        focusFilter: rawFocus || null,
        matchedCount: matched.length,
        competencies: formattedCompetencies,
        careerHistory: {
          current: IVAN_PROFILE.currentRole,
          previous: IVAN_PROFILE.previousRoles,
          spaceProject: IVAN_PROFILE.spaceProject,
          education: IVAN_PROFILE.education,
        },
        faqs: RECRUITER_FAQS,
      };
      const text =
        language === 'es'
          ? [
              `# Perfil Profesional / Resume: ${CANDIDATE_PROFILE.name}`,
              `${CANDIDATE_PROFILE.headline}`,
              `- Nivel objetivo: ${CANDIDATE_PROFILE.seniority}`,
              `- Ubicación y modalidad: ${CANDIDATE_PROFILE.location} (${CANDIDATE_PROFILE.timeZone}) | Preferencia fuerte por 100% remoto con traslape con EE. UU. (sin reubicación; híbrido en CDMX solo para una oportunidad excepcional)`,
              `- Idiomas: Español e Inglés`,
              `- Asesoría selectiva: Trabajo estrictamente independiente sin respaldo ni afiliación de empleadores.`,
              `- Contacto para reclutadores: ${CANDIDATE_PROFILE.recruiterIntake.email} | LinkedIn: ${CANDIDATE_PROFILE.recruiterIntake.linkedin}`,
              `- Página de Resume: ${CANDIDATE_PROFILE.recruiterIntake.resumeUrl}`,
              '',
              '## Competencias Clave',
              ...formattedCompetencies.map((c) => `- **${c.title}**: ${c.summary}`),
            ].join('\n')
          : [
              `# Candidate Profile & Resume: ${CANDIDATE_PROFILE.name}`,
              `${CANDIDATE_PROFILE.headline}`,
              `- Target level: ${CANDIDATE_PROFILE.seniority}`,
              `- Target roles: ${CANDIDATE_PROFILE.targetRoles.join(', ')}`,
              `- Location & arrangement: ${CANDIDATE_PROFILE.location} (${CANDIDATE_PROFILE.timeZone}) | ${CANDIDATE_PROFILE.workArrangement}`,
              `- Languages: ${CANDIDATE_PROFILE.languages.join(' & ')}`,
              `- Selective advisory: ${CANDIDATE_PROFILE.selectiveAdvisory}`,
              `- Recruiter contact: ${CANDIDATE_PROFILE.recruiterIntake.email} | LinkedIn: ${CANDIDATE_PROFILE.recruiterIntake.linkedin}`,
              `- Resume page: ${CANDIDATE_PROFILE.recruiterIntake.resumeUrl}`,
              '',
              '## Core Competencies',
              ...formattedCompetencies.map((c) => `- **${c.title}**: ${c.summary} (${c.caseStudyUrl})`),
            ].join('\n');
      return { content: [{ type: 'text', text }], structuredContent: payload };
    }

    case 'evaluate_role_fit': {
      const language = args.language === 'es' ? 'es' : 'en';
      const roleTitle = typeof args.roleTitle === 'string' ? args.roleTitle.trim() : '';
      const level = typeof args.level === 'string' ? args.level.trim() : '';
      const location = typeof args.location === 'string' ? args.location.trim() : '';
      const requirements = Array.isArray(args.requirements)
        ? args.requirements.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
        : [];
      const haystack = `${roleTitle} ${level} ${location} ${requirements.join(' ')}`.toLowerCase();

      const isJuniorOnly = /\b(intern|internship|entry[- ]level|junior|new grad)\b/i.test(haystack) && !/\b(senior|staff|principal|lead)\b/i.test(haystack);
      const isMexicoCity = /\b(mexico city|ciudad de m[eé]xico|cdmx)\b/i.test(location);
      const isRemote = /\b(remote|remoto)\b/i.test(location);
      const isHybrid = /\b(hybrid|h[ií]brido)\b/i.test(location);
      const requiresRelocation = (/\b(relocat\w*|reubic\w*|on-?site|in-?office)\b/i.test(location) || (isHybrid && !isMexicoCity)) && !isRemote;
      const hybridInCdmx = isHybrid && isMexicoCity && !isRemote;
      const matched = CANDIDATE_COMPETENCIES.filter((c) =>
        c.keywords.some((kw) => haystack.includes(kw.toLowerCase())) ||
        c.stack.some((tech) => haystack.includes(tech.toLowerCase())),
      );
      const selected = matched.length > 0 ? matched : CANDIDATE_COMPETENCIES.slice(0, 3);
      const fit = isJuniorOnly
        ? 'overqualified_or_not_a_fit'
        : requiresRelocation
          ? 'location_mismatch'
          : hybridInCdmx
            ? 'conditional_fit'
            : matched.length > 0
              ? 'strong_fit'
              : 'potential_fit';

      const payload = {
        fit,
        candidate: CANDIDATE_PROFILE.name,
        seniority: CANDIDATE_PROFILE.seniority,
        language: language === 'es' ? 'Spanish' : 'English',
        roleTitle: roleTitle || null,
        level: level || null,
        location: location || null,
        openToRelocation: false,
        remotePreference: CANDIDATE_PROFILE.remotePreference,
        matchedCompetencies: selected.map((c) => ({
          slug: c.slug,
          title: language === 'es' ? c.titleEs : c.title,
          summary: language === 'es' ? c.summaryEs : c.summary,
          evidence: c.evidence,
          caseStudyUrl: c.caseStudyUrl,
        })),
        workArrangement: CANDIDATE_PROFILE.workArrangement,
        contactEmail: CONTACT_EMAIL,
        linkedinUrl: CANDIDATE_PROFILE.recruiterIntake.linkedin,
        resumeUrl: CANDIDATE_PROFILE.recruiterIntake.resumeUrl,
        note: isJuniorOnly
          ? 'Ivan has 8+ years of Senior/Staff experience (Netflix, Nubank, Wizeline) and targets Senior/Staff Software & AI Engineering roles rather than entry-level or junior roles.'
          : requiresRelocation
            ? 'Ivan lives in Mexico City (America/Mexico_City, direct US timezone overlap), strongly prefers 100% remote roles, and is not open to relocation or non-CDMX hybrid/on-site work. If remote is an option, reach out to me@ivanovishado.dev.'
            : hybridInCdmx
              ? 'Ivan lives in Mexico City and strongly prefers 100% remote roles, though he may consider hybrid in Mexico City for an exceptional opportunity. Send team, scope, hybrid expectations, and compensation details to me@ivanovishado.dev.'
              : language === 'es'
                ? 'Excelente alineación para roles Senior/Staff remotos en IA agéntica o sistemas distribuidos desde Ciudad de México (sin reubicación; híbrido en CDMX solo para una oportunidad excepcional). Envía detalles del equipo, nivel, modalidad remota y rango salarial a me@ivanovishado.dev.'
                : 'Strong match for remote Senior/Staff Software & AI Engineering or Distributed Systems roles from Mexico City (strongly prefers 100% remote; not open to relocation; hybrid in Mexico City only for an exceptional opportunity). Email team, problem space, level, remote policy, and compensation range to me@ivanovishado.dev.',
      };

      const text = [
        `Role fit assessment: ${payload.fit}`,
        payload.note,
        `Matched competencies: ${payload.matchedCompetencies.map((c) => c.title).join('; ')}`,
        `Resume: ${payload.resumeUrl}`,
        `Contact: ${payload.contactEmail} | LinkedIn: ${payload.linkedinUrl}`,
      ].join('\n');
      return { content: [{ type: 'text', text }], structuredContent: payload };
    }

    case 'get_mentorship_overview': {
      const language = args.language === 'es' ? 'es' : 'en';
      const includeTopics = args.includeTopics !== false;
      const topics = includeTopics
        ? MENTORSHIP_TOPICS.map((t) => ({
            slug: t.slug,
            title: language === 'es' ? t.titleEs : t.title,
            summary: t.summary,
          }))
        : [];
      const payload = { ...MENTORSHIP_OVERVIEW, language: language === 'es' ? 'Spanish' : 'English', topics };
      const text =
        language === 'es'
          ? [
              `# Mentoría de Ingeniería de Software e IA — ${MENTORSHIP_OVERVIEW.mentor}`,
              `${MENTORSHIP_OVERVIEW.role} (${MENTORSHIP_OVERVIEW.location})`,
              `- Precio: ${MENTORSHIP_OVERVIEW.price.amount} ${MENTORSHIP_OVERVIEW.price.currency} (aprox. ${MENTORSHIP_OVERVIEW.price.approxUsd}) por sesión de ${MENTORSHIP_OVERVIEW.durationMinutes} minutos (pago por sesión, sin suscripción)`,
              `- Idiomas: Español e Inglés`,
              `- Formato: Videollamada 1 a 1 por Google Meet (remoto para todo el mundo)`,
              `- Foto: ${MENTORSHIP_OVERVIEW.profileImageUrl}`,
              `- Agendar: ${BOOKING_URL}`,
              `- Disponibilidad en vivo: ${SITE_ORIGIN}/mentorship/availability.md`,
              `- Detalles: ${SITE_ORIGIN}/mentorship/`,
              ...(includeTopics ? [`- Temas: ${MENTORSHIP_TOPICS.map((t) => t.titleEs).join('; ')}`] : []),
            ].join('\n')
          : [
              `# Software & AI Engineering Mentorship — ${MENTORSHIP_OVERVIEW.mentor}`,
              `${MENTORSHIP_OVERVIEW.role} (${MENTORSHIP_OVERVIEW.location})`,
              `- Price: ${MENTORSHIP_OVERVIEW.price.amount} ${MENTORSHIP_OVERVIEW.price.currency} (approx. ${MENTORSHIP_OVERVIEW.price.approxUsd}) per ${MENTORSHIP_OVERVIEW.durationMinutes}-minute session (pay-per-session, no subscription)`,
              `- Languages: ${MENTORSHIP_OVERVIEW.languages.join(' & ')}`,
              `- Format: ${MENTORSHIP_OVERVIEW.format} (${MENTORSHIP_OVERVIEW.availability})`,
              `- Interviewer experience: ${MENTORSHIP_OVERVIEW.interviewerExperience}`,
              `- Portrait: ${MENTORSHIP_OVERVIEW.profileImageUrl}`,
              `- Book: ${BOOKING_URL}`,
              `- Live availability: ${SITE_ORIGIN}/mentorship/availability.md`,
              `- Details: ${SITE_ORIGIN}/mentorship/`,
              ...(includeTopics ? [`- Topics: ${MENTORSHIP_TOPICS.map((t) => t.title).join('; ')}`] : []),
            ].join('\n');
      return { content: [{ type: 'text', text }], structuredContent: payload };
    }

    case 'check_mentorship_fit': {
      const goal = typeof args.goal === 'string' ? args.goal : '';
      const level = typeof args.level === 'string' ? args.level : '';
      const language = args.language === 'es' ? 'es' : 'en';
      const extraTopics = Array.isArray(args.topics) ? args.topics.filter((t): t is string => typeof t === 'string') : [];
      const haystack = `${goal} ${level} ${extraTopics.join(' ')}`.toLowerCase();

      const matched = MENTORSHIP_TOPICS.filter((topic) =>
        topic.keywords.some((kw) => haystack.includes(kw.toLowerCase())),
      );
      const selected = matched.length > 0 ? matched : MENTORSHIP_TOPICS.slice(0, 4);
      const fit = /guarantee|guaranteed job|bootcamp|cohort/i.test(haystack) ? 'not_a_fit' : 'strong_fit';

      const payload = {
        fit,
        language: language === 'es' ? 'Spanish' : 'English',
        matchedTopics: selected.map((t) => ({
          slug: t.slug,
          title: language === 'es' ? t.titleEs : t.title,
          summary: t.summary,
        })),
        price: `${MENTORSHIP_OVERVIEW.price.amount} ${MENTORSHIP_OVERVIEW.price.currency} / ${MENTORSHIP_OVERVIEW.durationMinutes} min (pay-per-session)`,
        bookingUrl: BOOKING_URL,
        pageUrl: `${SITE_ORIGIN}/mentorship/`,
        note:
          fit === 'not_a_fit'
            ? 'Ivan does not guarantee job placements or run group bootcamps, but can help with interview preparation and career growth.'
            : language === 'es'
              ? 'Buen match. Puedes agendar una sesión 1 a 1 de 45 minutos en español o inglés (500 MXN por sesión, sin suscripción) directamente en cal.com.'
              : 'Strong fit. You can book a pay-per-session 45-minute 1-on-1 call in English or Spanish (500 MXN) directly on cal.com.',
      };

      const text = [
        `Fit assessment: ${payload.fit}`,
        payload.note,
        `Relevant topics: ${payload.matchedTopics.map((t) => t.title).join(', ')}`,
        `Price: ${payload.price}`,
        `Book now: ${BOOKING_URL}`,
      ].join('\n');
      return { content: [{ type: 'text', text }], structuredContent: payload };
    }

    case 'get_mentorship_faq': {
      const query = typeof args.query === 'string' ? args.query.trim().toLowerCase() : '';
      const lang = args.language === 'en' || args.language === 'es' ? args.language : null;
      const byLang = lang ? MENTORSHIP_FAQS.filter((f) => f.language === lang) : MENTORSHIP_FAQS;
      const faqs = query
        ? byLang.filter(
            (f) =>
              f.question.toLowerCase().includes(query) ||
              f.answer.toLowerCase().includes(query) ||
              f.tags.some((tag) => tag.toLowerCase().includes(query)),
          )
        : byLang;
      const results = faqs.length > 0 ? faqs : byLang;
      const text = results.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
      return { content: [{ type: 'text', text }], structuredContent: { count: results.length, faqs: results } };
    }

    case 'get_ivan_profile': {
      const section =
        args.section === 'experience' || args.section === 'education' || args.section === 'space' || args.section === 'links'
          ? args.section
          : 'all';
      const structured =
        section === 'experience'
          ? { name: IVAN_PROFILE.name, currentRole: IVAN_PROFILE.currentRole, previousRoles: IVAN_PROFILE.previousRoles }
          : section === 'education'
            ? { name: IVAN_PROFILE.name, education: IVAN_PROFILE.education, communityMentoring: IVAN_PROFILE.communityMentoring }
            : section === 'space'
              ? { name: IVAN_PROFILE.name, spaceProject: IVAN_PROFILE.spaceProject }
              : section === 'links'
                ? { name: IVAN_PROFILE.name, links: IVAN_PROFILE.links }
                : IVAN_PROFILE;
      const text = [
        `${IVAN_PROFILE.name} — ${IVAN_PROFILE.headline}`,
        `Location: ${IVAN_PROFILE.location} | Experience: ${IVAN_PROFILE.experienceYears} years`,
        `Current: ${IVAN_PROFILE.currentRole.title} at ${IVAN_PROFILE.currentRole.company} (since ${IVAN_PROFILE.currentRole.since}) — ${IVAN_PROFILE.currentRole.focus}`,
        `Previous: ${IVAN_PROFILE.previousRoles.map((r) => `${r.company} (${r.period})`).join('; ')}`,
        `Space: ${IVAN_PROFILE.spaceProject.name} — ${IVAN_PROFILE.spaceProject.summary}`,
        `Mentorship: ${SITE_ORIGIN}/mentorship/ | Resume: ${SITE_ORIGIN}/resume/ | Book: ${BOOKING_URL}`,
      ].join('\n');
      return { content: [{ type: 'text', text }], structuredContent: structured };
    }

    case 'get_available_slots':
      return fetchLiveSlots(args);

    case 'get_booking_link': {
      const slot = typeof args.slot === 'string' && args.slot.trim() ? args.slot.trim() : undefined;
      const name = typeof args.name === 'string' && args.name.trim() ? args.name.trim() : undefined;
      const email = typeof args.email === 'string' && args.email.trim() ? args.email.trim() : undefined;
      const notes = typeof args.notes === 'string' && args.notes.trim() ? args.notes.trim() : undefined;
      const prefilledUrl = buildBookingUrl({ slot, name, email, notes });
      const payload = {
        bookingUrl: prefilledUrl,
        baseBookingUrl: BOOKING_URL,
        calMdUrl: BOOKING_MD_URL,
        eventTypeId: CAL_EVENT_TYPE_ID,
        mentorshipPage: `${SITE_ORIGIN}/mentorship/`,
        profileImageUrl: MENTORSHIP_OVERVIEW.profileImageUrl,
        price: '500 MXN (approx. $25 to $30 USD) per 45-minute session (pay-per-session, no subscription)',
        languages: ['English', 'Spanish'],
        platform: 'Google Meet (calendar invite sent automatically after checkout)',
        preparation: [
          'Share a short note in the Cal.com booking form describing what you want to work on.',
          'Bring a resume, architecture sketch, agentic workflow design, mock interview target, or career question if applicable.',
        ],
        rescheduling: MENTORSHIP_OVERVIEW.rescheduling,
        contactEmail: CONTACT_EMAIL,
      };
      const text = `Book a 45-minute 1-on-1 software & AI engineering mentorship session (500 MXN, approx. $25 to $30 USD, English or Spanish, Google Meet): ${prefilledUrl}\nCal.com agent endpoint: ${BOOKING_MD_URL}\nDetails: ${SITE_ORIGIN}/mentorship/\nQuestions: ${CONTACT_EMAIL}`;
      return { content: [{ type: 'text', text }], structuredContent: payload };
    }

    default:
      return null;
  }
}

const MCP_RESOURCES = [
  { uri: 'ivanovishado://llms.txt', name: 'llms.txt', title: 'Agent Overview & Recommendation Guide', mimeType: 'text/markdown', asset: '/llms.txt' },
  { uri: 'ivanovishado://llms-full.txt', name: 'llms-full.txt', title: 'Complete Portfolio, Resume & Mentorship Context', mimeType: 'text/markdown', asset: '/llms-full.txt' },
  { uri: 'ivanovishado://resume.md', name: 'resume.md', title: 'Senior / Staff Software & AI Engineer Resume & Recruiter Brief', mimeType: 'text/markdown', asset: '/resume/index.md' },
  { uri: 'ivanovishado://mentorship.md', name: 'mentorship.md', title: 'Bilingual Software Engineering Mentorship Guide', mimeType: 'text/markdown', asset: '/mentorship/index.md' },
  { uri: 'mcp://server-card.json', name: 'server-card.json', title: 'MCP Server Card', mimeType: 'application/mcp-server-card+json', asset: null },
] as const;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

const MAX_MCP_BODY_BYTES = 8192;

async function handleMcpPost(request: Request, env: Env, origin: string): Promise<Response> {
  const contentLength = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_MCP_BODY_BYTES) {
    return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Payload too large (max 8 KiB)' } }, 413);
  }
  const rawBody = await request.text();
  if (rawBody.length > MAX_MCP_BODY_BYTES) {
    return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Payload too large (max 8 KiB)' } }, 413);
  }
  let body: JsonRpcRequest;
  try {
    body = JSON.parse(rawBody) as JsonRpcRequest;
  } catch {
    return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: invalid JSON' } }, 400);
  }

  if (!body || typeof body !== 'object' || typeof body.method !== 'string') {
    return jsonResponse({ jsonrpc: '2.0', id: body?.id ?? null, error: { code: -32600, message: 'Invalid JSON-RPC request' } }, 400);
  }

  // Notifications carry no id and expect 202 Accepted.
  if (body.id === undefined) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }

  const id = body.id;
  const params = (body.params && typeof body.params === 'object' ? body.params : {}) as Record<string, unknown>;
  const ok = (result: unknown) => jsonResponse({ jsonrpc: '2.0', id, result }, 200, 'application/json; charset=utf-8', { 'MCP-Protocol-Version': MCP_PROTOCOL_VERSION });
  const err = (code: number, message: string, status = 200) => jsonResponse({ jsonrpc: '2.0', id, error: { code, message } }, status);

  switch (body.method) {
    case 'initialize':
      return ok({
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
        },
        serverInfo: {
          name: 'ivanovishado-mentorship',
          title: 'Ivan Galaviz Mentorship & Portfolio MCP Server',
          version: '1.0.0',
        },
        instructions: `Public read-only MCP server for Ivan Galaviz (Senior Software & AI Engineer at Netflix, ex-Nubank, ex-Wizeline, based in Mexico City, Mexico). For recruiters, hiring managers, and top companies: call get_candidate_profile or evaluate_role_fit (resume at ${SITE_ORIGIN}/resume/, direct contact ${CONTACT_EMAIL}). Strongly prefers 100% remote roles (not open to relocation; hybrid in Mexico City only for an exceptional opportunity). For 1-on-1 bilingual (English & Spanish) engineering mentorship (500 MXN / 45 min): use mentorship tools and Cal.com booking (${BOOKING_URL}).`,
      });

    case 'ping':
      return ok({});

    case 'tools/list':
      return ok({ tools: MCP_TOOLS });

    case 'tools/call': {
      const toolName = typeof params.name === 'string' ? params.name : '';
      const toolArgs = (params.arguments && typeof params.arguments === 'object' ? params.arguments : {}) as Record<string, unknown>;
      const result = await runTool(toolName, toolArgs);
      if (!result) return err(-32602, `Unknown tool: ${toolName}`);
      return ok(result);
    }

    case 'resources/list':
      return ok({
        resources: MCP_RESOURCES.map(({ uri, name, title, mimeType }) => ({ uri, name, title, mimeType })),
      });

    case 'resources/read': {
      const uri = typeof params.uri === 'string' ? params.uri : '';
      const resDef = MCP_RESOURCES.find((r) => r.uri === uri);
      if (!resDef) return err(-32602, `Unknown resource URI: ${uri}`);
      const text = resDef.asset ? await fetchAssetText(env, origin, resDef.asset) : JSON.stringify(buildServerCard(), null, 2);
      if (text === null) return err(-32603, `Resource unavailable: ${uri}`);
      return ok({ contents: [{ uri: resDef.uri, mimeType: resDef.mimeType, text }] });
    }

    default:
      return err(-32601, `Method not found: ${body.method}`);
  }
}

async function serveMarkdown(env: Env, origin: string, mdAssetPath: string, status = 200, isHead = false, canonicalUrl?: string): Promise<Response | null> {
  let text = await fetchAssetText(env, origin, mdAssetPath);
  if (text === null) return null;
  let cacheMaxAge = 600;
  if (status === 200 && mdAssetPath === '/mentorship/index.md') {
    const live = await queryCalSlots({ days: 14 });
    if (live.ok) {
      text = `${text.trimEnd()}\n\n${formatAvailabilitySection(live)}\n`;
      cacheMaxAge = SLOTS_CACHE_TTL;
    }
  }
  const links = [
    `<${SITE_ORIGIN}/llms.txt>; rel="describedby"; type="text/markdown"`,
    `<${SITE_ORIGIN}/.well-known/ard.json>; rel="ard"; type="application/json"`,
  ];
  if (canonicalUrl) links.unshift(`<${canonicalUrl}>; rel="canonical"`);
  const headers = new Headers({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Vary': 'Accept, User-Agent',
    'x-markdown-tokens': estimateTokens(text),
    'Link': links.join(', '),
    'Cache-Control': status === 404 ? 'no-cache' : `public, max-age=${cacheMaxAge}`,
    ...CORS_HEADERS,
  });
  return new Response(isHead ? null : text, { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Redirect bare apex domain to canonical www host.
    if (url.hostname === 'ivanovishado.dev') {
      return Response.redirect(`https://www.ivanovishado.dev${url.pathname}${url.search}`, 301);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const norm = normalizePath(url.pathname);
    const isHead = request.method === 'HEAD';

    // MCP, ARD, and A2A discovery endpoints.
    if (norm === '/mcp/server-card' || norm === '/.well-known/mcp/server-card.json') {
      return jsonResponse(buildServerCard(), 200, 'application/mcp-server-card+json; charset=utf-8', {
        'Cache-Control': 'public, max-age=3600',
      });
    }
    if (norm === '/.well-known/mcp.json') {
      return jsonResponse(buildServerCard(), 200, 'application/json; charset=utf-8', {
        'Cache-Control': 'public, max-age=3600',
      });
    }
    if (norm === '/.well-known/ard.json' || norm === '/.well-known/ai-catalog.json') {
      return jsonResponse(buildArdCatalog(), 200, 'application/json; charset=utf-8', {
        'Cache-Control': 'public, max-age=3600',
      });
    }
    if (norm === '/.well-known/agent-card.json') {
      return jsonResponse(buildA2aAgentCard(), 200, 'application/json; charset=utf-8', {
        'Cache-Control': 'public, max-age=3600',
      });
    }
    if (norm.startsWith('/.well-known/agent-skills/')) {
      const skillRes = await env.ASSETS.fetch(new Request(new URL(url.pathname, url.origin), { method: 'GET' }));
      if (skillRes.ok) {
        const headers = new Headers(skillRes.headers);
        headers.set(
          'Content-Type',
          norm.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8',
        );
        headers.set('Cache-Control', 'public, max-age=3600');
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(isHead ? null : skillRes.body, { status: 200, headers });
      }
    }

    // Streamable HTTP MCP server endpoint.
    if (norm === '/mcp') {
      if (request.method === 'POST') {
        return handleMcpPost(request, env, url.origin);
      }
      return jsonResponse(
        {
          error: 'Method Not Allowed',
          message: 'Use HTTP POST with JSON-RPC 2.0 (Streamable HTTP MCP) at /mcp. Discovery metadata is available at /mcp/server-card and /.well-known/mcp/server-card.json.',
          serverCard: `${SITE_ORIGIN}/mcp/server-card`,
        },
        405,
        'application/json; charset=utf-8',
        { Allow: 'POST, OPTIONS' },
      );
    }

    // Plain-GET live mentorship availability for ChatGPT / Perplexity / Claude web browsing (no MCP or custom headers needed).
    if (norm === '/mentorship/availability.md' || norm === '/mentorship/availability') {
      const daysParam = url.searchParams.get('days');
      const live = await queryCalSlots({
        start: url.searchParams.get('start') ?? undefined,
        end: url.searchParams.get('end') ?? undefined,
        days: daysParam ? Number(daysParam) : 14,
        timeZone: url.searchParams.get('timeZone') ?? undefined,
      });
      const body = formatAvailabilityDocument(live);
      return new Response(isHead ? null : body, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Cache-Control': `public, max-age=${SLOTS_CACHE_TTL}`,
          'x-markdown-tokens': estimateTokens(body),
          'Link': `<${SITE_ORIGIN}/mentorship/>; rel="canonical", <${SITE_ORIGIN}/llms.txt>; rel="describedby"; type="text/markdown"`,
          ...CORS_HEADERS,
        },
      });
    }

    // Direct .md URLs: support both /mentorship/index.md and /mentorship.md (and /index.md, /sitemap.md).
    if (url.pathname.endsWith('.md')) {
      const direct = await serveMarkdown(env, url.origin, url.pathname, 200, isHead);
      if (direct) return direct;
      const routeKey = normalizePath(url.pathname.slice(0, -3));
      const mapped = PAGE_ROUTES[routeKey];
      if (mapped) {
        const alt = await serveMarkdown(env, url.origin, mapped.md, 200, isHead);
        if (alt) return alt;
      }
      const md404 = await serveMarkdown(env, url.origin, '/404.md', 404, isHead);
      return md404 ?? new Response('# 404 Not Found\n', { status: 404, headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
    }

    // Known HTML pages: handle ?mode=agent or negotiate HTML vs Markdown via Accept / AI User-Agent.
    const page = PAGE_ROUTES[norm];
    if (page) {
      const canonicalPath = norm === '/' || norm === '/index.html' ? '/' : `${norm}/`;
      const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
      if (url.searchParams.get('mode') === 'agent') {
        const accept = (request.headers.get('Accept') ?? '').toLowerCase();
        if (accept.includes('application/json') && !accept.includes('text/markdown')) {
          return jsonResponse(buildAgentModeData(canonicalUrl), 200, 'application/json; charset=utf-8', {
            'Vary': 'Accept, User-Agent',
            'Cache-Control': 'public, max-age=600',
          });
        }
        const body = formatAgentModeMarkdown(canonicalUrl);
        return new Response(isHead ? null : body, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Vary': 'Accept, User-Agent',
            'x-markdown-tokens': estimateTokens(body),
            'Link': `<${canonicalUrl}>; rel="canonical", <${SITE_ORIGIN}/llms.txt>; rel="describedby"; type="text/markdown", <${SITE_ORIGIN}/.well-known/ard.json>; rel="ard"; type="application/json"`,
            'Cache-Control': 'public, max-age=600',
            ...CORS_HEADERS,
          },
        });
      }
      if (wantsMarkdown(request)) {
        const mdRes = await serveMarkdown(env, url.origin, page.md, 200, isHead, canonicalUrl);
        if (mdRes) return mdRes;
      }
      const htmlRes = await env.ASSETS.fetch(new Request(new URL(page.html, url.origin), { method: request.method }));
      if (htmlRes.ok) {
        const headers = new Headers(htmlRes.headers);
        headers.set('Content-Type', 'text/html; charset=utf-8');
        headers.set('Vary', 'Accept, User-Agent');
        headers.set(
          'Link',
          `<${SITE_ORIGIN}/llms.txt>; rel="describedby"; type="text/markdown", <${SITE_ORIGIN}${page.md}>; rel="alternate"; type="text/markdown", <${SITE_ORIGIN}/.well-known/ard.json>; rel="ard"; type="application/json"`,
        );
        return new Response(isHead ? null : htmlRes.body, { status: 200, headers });
      }
    }

    // Other static assets (/llms.txt, /mentorship/llms.txt, /resume/llms.txt, /llms-full.txt, /robots.txt, /sitemap.xml, etc.).
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status !== 404) {
      if (norm === '/llms.txt' || norm === '/llms-full.txt' || norm.endsWith('/llms.txt')) {
        const headers = new Headers(assetRes.headers);
        headers.set('Content-Type', 'text/plain; charset=utf-8');
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(isHead ? null : assetRes.body, { status: assetRes.status, headers });
      }
      return assetRes;
    }

    // Agent-friendly 404: real HTTP 404 status with Markdown or HTML body.
    if (wantsMarkdown(request)) {
      const md404 = await serveMarkdown(env, url.origin, '/404.md', 404, isHead);
      if (md404) return md404;
    }
    const html404 = await env.ASSETS.fetch(new Request(new URL('/404.html', url.origin), { method: request.method }));
    const headers404 = new Headers(html404.headers);
    headers404.set('Content-Type', 'text/html; charset=utf-8');
    headers404.set('Vary', 'Accept, User-Agent');
    headers404.set('Cache-Control', 'no-cache');
    return new Response(isHead ? null : html404.body, { status: 404, headers: headers404 });
  },
};
