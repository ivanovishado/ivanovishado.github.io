import {
  BOOKING_MD_URL,
  BOOKING_URL,
  CAL_EVENT_TYPE_ID,
  CAL_SLOTS_API_URL,
  CAL_SLOTS_API_VERSION,
  CONTACT_EMAIL,
  IVAN_PROFILE,
  MCP_PROTOCOL_VERSION,
  MCP_TOOLS,
  MENTORSHIP_FAQS,
  MENTORSHIP_OVERVIEW,
  MENTORSHIP_TOPICS,
  SITE_ORIGIN,
  buildAiCatalog,
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
  '/mentorship': { html: '/mentorship/index.html', md: '/mentorship/index.md' },
  '/work/netflix': { html: '/work/netflix/index.html', md: '/work/netflix/index.md' },
  '/work/mcb-1': { html: '/work/mcb-1/index.html', md: '/work/mcb-1/index.md' },
  '/work/nubank': { html: '/work/nubank/index.html', md: '/work/nubank/index.md' },
  '/work/wizeline': { html: '/work/wizeline/index.html', md: '/work/wizeline/index.md' },
  '/trajectory': { html: '/trajectory/index.html', md: '/trajectory/index.md' },
  '/shelf': { html: '/shelf/index.html', md: '/shelf/index.md' },
  '/privacy': { html: '/privacy/index.html', md: '/privacy/index.md' },
};

const AI_AGENT_UA =
  /claudebot|claude-user|claude-searchbot|claude-code|anthropic-ai|gptbot|chatgpt-user|oai-searchbot|perplexitybot|perplexity-user|google-extended|ccbot|cohere-ai|meta-externalagent|cursor|opencode|agent-readability|ora-agent/i;

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
  if (accept.includes('text/html')) {
    return false;
  }
  return AI_AGENT_UA.test(ua);
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

async function fetchLiveSlots(args: Record<string, unknown>) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const now = new Date();
  const startStr = typeof args.start === 'string' && datePattern.test(args.start) ? args.start : isoDate(now);
  const startDate = new Date(`${startStr}T00:00:00Z`);
  const defaultEnd = new Date(startDate.getTime() + 7 * 86_400_000);
  let endStr = typeof args.end === 'string' && datePattern.test(args.end) ? args.end : isoDate(defaultEnd);
  const endDate = new Date(`${endStr}T00:00:00Z`);
  if (Number.isNaN(endDate.getTime()) || endDate < startDate) {
    endStr = isoDate(defaultEnd);
  } else if (endDate.getTime() - startDate.getTime() > 30 * 86_400_000) {
    endStr = isoDate(new Date(startDate.getTime() + 30 * 86_400_000));
  }
  const timeZone = typeof args.timeZone === 'string' && args.timeZone.trim() ? args.timeZone.trim() : 'America/Mexico_City';

  const query = new URL(CAL_SLOTS_API_URL);
  query.searchParams.set('eventTypeId', String(CAL_EVENT_TYPE_ID));
  query.searchParams.set('start', startStr);
  query.searchParams.set('end', endStr);
  query.searchParams.set('timeZone', timeZone);

  try {
    const res = await fetch(query.toString(), {
      headers: { 'cal-api-version': CAL_SLOTS_API_VERSION, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Cal.com returned HTTP ${res.status}`);
    const data = (await res.json()) as { data?: Record<string, { start: string }[]> };
    const byDate = data.data ?? {};
    const slots = Object.entries(byDate).flatMap(([date, list]) =>
      (list ?? []).map((item) => ({
        date,
        start: item.start,
        bookingUrl: buildBookingUrl({ slot: item.start }),
      })),
    );
    const payload = {
      eventTypeId: CAL_EVENT_TYPE_ID,
      start: startStr,
      end: endStr,
      timeZone,
      totalSlots: slots.length,
      slots,
      bookingPage: BOOKING_URL,
      calMdUrl: BOOKING_MD_URL,
      paymentNote: 'Payment (500 MXN, approx. $25 to $30 USD) is collected on the Cal.com checkout page when clicking a slot link.',
    };
    const text =
      slots.length > 0
        ? [
            `Found ${slots.length} open 45-minute mentorship slots (${startStr} to ${endStr}, ${timeZone}):`,
            ...slots.slice(0, 12).map((s) => `- ${s.start} → ${s.bookingUrl}`),
            slots.length > 12 ? `...and ${slots.length - 12} more slots on ${BOOKING_URL}` : '',
            'Tip: call get_booking_link with slot, name, email, and notes to generate a pre-filled checkout URL.',
          ]
            .filter(Boolean)
            .join('\n')
        : `No open slots found between ${startStr} and ${endStr} (${timeZone}). Try a later date range or view the full calendar at ${BOOKING_URL}.`;
    return { content: [{ type: 'text', text }], structuredContent: payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach Cal.com';
    const payload = {
      error: message,
      bookingPage: BOOKING_URL,
      calMdUrl: BOOKING_MD_URL,
      eventTypeId: CAL_EVENT_TYPE_ID,
    };
    return {
      content: [{ type: 'text', text: `Could not fetch live slots (${message}). View live availability and book directly at ${BOOKING_URL} (agent docs: ${BOOKING_MD_URL}).` }],
      structuredContent: payload,
    };
  }
}

async function runTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'get_mentorship_overview': {
      const payload = { ...MENTORSHIP_OVERVIEW, topics: MENTORSHIP_TOPICS };
      const text = [
        `# Software & AI Engineering Mentorship — ${MENTORSHIP_OVERVIEW.mentor}`,
        `${MENTORSHIP_OVERVIEW.role} (${MENTORSHIP_OVERVIEW.location})`,
        `- Price: ${MENTORSHIP_OVERVIEW.price.amount} ${MENTORSHIP_OVERVIEW.price.currency} (approx. ${MENTORSHIP_OVERVIEW.price.approxUsd}) per ${MENTORSHIP_OVERVIEW.durationMinutes}-minute session (pay-per-session, no subscription)`,
        `- Languages: ${MENTORSHIP_OVERVIEW.languages.join(' & ')}`,
        `- Format: ${MENTORSHIP_OVERVIEW.format} (${MENTORSHIP_OVERVIEW.availability})`,
        `- Interviewer experience: ${MENTORSHIP_OVERVIEW.interviewerExperience}`,
        `- Portrait: ${MENTORSHIP_OVERVIEW.profileImageUrl}`,
        `- Book: ${BOOKING_URL}`,
        `- Details: ${SITE_ORIGIN}/mentorship/`,
        `- Topics: ${MENTORSHIP_TOPICS.map((t) => t.title).join('; ')}`,
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
      const faqs = query
        ? MENTORSHIP_FAQS.filter(
            (f) =>
              f.question.toLowerCase().includes(query) ||
              f.answer.toLowerCase().includes(query) ||
              f.tags.some((tag) => tag.toLowerCase().includes(query)),
          )
        : MENTORSHIP_FAQS;
      const results = faqs.length > 0 ? faqs : MENTORSHIP_FAQS;
      const text = results.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
      return { content: [{ type: 'text', text }], structuredContent: { count: results.length, faqs: results } };
    }

    case 'get_ivan_profile': {
      const text = [
        `${IVAN_PROFILE.name} — ${IVAN_PROFILE.headline}`,
        `Location: ${IVAN_PROFILE.location} | Experience: ${IVAN_PROFILE.experienceYears} years`,
        `Current: ${IVAN_PROFILE.currentRole.title} at ${IVAN_PROFILE.currentRole.company} (since ${IVAN_PROFILE.currentRole.since}) — ${IVAN_PROFILE.currentRole.focus}`,
        `Previous: ${IVAN_PROFILE.previousRoles.map((r) => `${r.company} (${r.period})`).join('; ')}`,
        `Space: ${IVAN_PROFILE.spaceProject.name} — ${IVAN_PROFILE.spaceProject.summary}`,
        `Mentorship: ${SITE_ORIGIN}/mentorship/ | Book: ${BOOKING_URL}`,
      ].join('\n');
      return { content: [{ type: 'text', text }], structuredContent: IVAN_PROFILE };
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
  { uri: 'ivanovishado://llms-full.txt', name: 'llms-full.txt', title: 'Complete Portfolio & Mentorship Context', mimeType: 'text/markdown', asset: '/llms-full.txt' },
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
        instructions: `Public read-only MCP server for Ivan Galaviz (Netflix Senior Software Engineer, Guadalajara, Mexico). Use these tools to answer questions about his 1-on-1 bilingual (English & Spanish) software engineering mentorship (500 MXN / 45 min), evaluate mentee fit, read FAQs, and provide the direct Cal.com booking link (${BOOKING_URL}).`,
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
  const text = await fetchAssetText(env, origin, mdAssetPath);
  if (text === null) return null;
  const links = [`<${SITE_ORIGIN}/llms.txt>; rel="describedby"; type="text/markdown"`];
  if (canonicalUrl) links.unshift(`<${canonicalUrl}>; rel="canonical"`);
  const headers = new Headers({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Vary': 'Accept, User-Agent',
    'x-markdown-tokens': estimateTokens(text),
    'Link': links.join(', '),
    'Cache-Control': status === 404 ? 'no-cache' : 'public, max-age=600',
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

    // MCP discovery endpoints.
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
    if (norm === '/.well-known/ai-catalog.json') {
      return jsonResponse(buildAiCatalog(), 200, 'application/json; charset=utf-8', {
        'Cache-Control': 'public, max-age=3600',
      });
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

    // Known HTML pages: negotiate HTML vs Markdown via Accept / AI User-Agent.
    const page = PAGE_ROUTES[norm];
    if (page) {
      const canonicalPath = norm === '/' || norm === '/index.html' ? '/' : `${norm}/`;
      const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
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
          `<${SITE_ORIGIN}/llms.txt>; rel="describedby"; type="text/markdown", <${SITE_ORIGIN}${page.md}>; rel="alternate"; type="text/markdown"`,
        );
        return new Response(isHead ? null : htmlRes.body, { status: 200, headers });
      }
    }

    // Other static assets (/llms.txt, /llms-full.txt, /robots.txt, /sitemap.xml, etc.).
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status !== 404) {
      if (norm === '/llms.txt' || norm === '/llms-full.txt') {
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
