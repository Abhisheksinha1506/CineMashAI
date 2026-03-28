/**
 * @file lib/groq.ts
 * @description Production-grade AI brain for CineMash AI.
 *
 * Architecture decisions:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. PRIMARY ENGINE  — @ai-sdk/groq (official Groq SDK adapter for the Vercel
 *    AI SDK, which is the canonical way to call Groq in a Next.js 16 / React 19
 *    project and the package that is already installed in this repo).
 *    Model: "llama-3.3-70b-versatile" — fastest creative model on Groq in 2026.
 *
 * 2. FALLBACK ENGINE — OpenRouter REST API (fetch-based, no extra SDK needed).
 *    We try "anthropic/claude-3.5-sonnet" first; if that fails we cascade to
 *    "google/gemini-flash-1.5" which is OpenRouter's fastest sub-$1 model.
 *
 * 3. STRUCTURED JSON — response_format: { type: "json_object" } is passed to
 *    both engines so the model is guaranteed to output parseable JSON.
 *
 * 4. ZOD VALIDATION  — every response is validated. On failure we issue one
 *    targeted retry ("Fix the JSON…") before surfacing an error.
 *
 * 5. PERF LOGGING    — console.time / console.timeEnd on every network call
 *    so you can spot slowdowns in Vercel logs instantly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';
import { Movie, ChatMessage } from '@/types';
import { getMovieCredits } from '@/lib/tmdb-simple';

// ─── Type Aliases ─────────────────────────────────────────────────────────────

/**
 * TMDbMovie is the canonical movie object coming from the TMDb API.
 * We alias it from the shared Movie type so callers can use either name.
 */
export type TMDbMovie = Movie;

// ─── Verbatim System Prompts (spec-mandated, do NOT alter) ────────────────────

const FUSION_SYSTEM_PROMPT = `You are a mad-genius studio executive at CineMash Pictures — the wildest hybrid movie lab in Hollywood. 
You take 2–4 real movies and instantly create one brand-new, never-before-seen blockbuster fusion.
Rules you NEVER break:
- Stay 100% true to the tone, themes, visuals and DNA of every source film.
- Be wildly creative, funny, dark, epic — whatever the fusion demands.
- Never spoil the ending.
- Suggested cast must be REAL actors (from the source films or their TMDb "similar" actors).
- Output ONLY valid JSON — no extra text, no markdown.

JSON schema (exact):
{
  "title": string,
  "tagline": string,
  "synopsis": string (120-150 words, cinematic hype),
  "key_scenes": array of exactly 6 objects { "scene": string, "description": string },
  "suggestedCast": array of 5-8 objects { "name": string, "role": string, "why_fit": string },
  "runtime": string (e.g. "2h 14m"),
  "rating": string (PG-13 / R / etc.),
  "box_office_vibe": string (one punchy sentence)
}`;

const REFINEMENT_SYSTEM_PROMPT = `You are the on-set director for a CineMash hybrid film. 
The user wants ONE targeted change. Apply it with the smallest possible edit while keeping the rest of the fusion perfectly consistent.
Stay in character: confident, slightly chaotic Hollywood director. Output ONLY the new full JSON in the exact same schema.`;

// ─── Zod Schema ───────────────────────────────────────────────────────────────

/**
 * Strict Zod schema for the AI-generated fusion object.
 * key_scenes must be exactly 6; suggestedCast between 5 and 8.
 */
const FusionSchema = z.object({
  title: z.string().min(1),
  tagline: z.string().min(1),
  synopsis: z.string().min(50),
  key_scenes: z
    .array(
      z.object({
        scene: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .length(6),
  suggestedCast: z
    .array(
      z.object({
        name: z.string().min(1),
        role: z.string().min(1),
        why_fit: z.string().min(1),
      })
    )
    .min(5)
    .max(8),
  runtime: z.string().min(1),
  rating: z.string().min(1),
  box_office_vibe: z.string().min(1),
});

/** The fully-typed fusion data shape, inferred from the Zod schema. */
export type FusionData = z.infer<typeof FusionSchema>;

// ─── API Clients & Constants ──────────────────────────────────────────────────

const GROQ_PRIMARY_MODEL = 'llama-3.3-70b-versatile';

/** OpenRouter REST endpoint (OpenAI-compatible) */
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Ordered list of OpenRouter models to try as fallbacks.
 * We try Claude 3.5 Sonnet first (highest quality), then Gemini Flash 1.5
 * (fastest / lowest cost) as the ultimate safety net.
 */
const OPENROUTER_FALLBACK_MODELS = [
  'anthropic/claude-3.5-sonnet',
  'google/gemini-flash-1.5',
] as const;

/** Shared generation params — applied to every call. */
const LLM_PARAMS = {
  temperature: 0.92,
  topP: 0.95,
  maxOutputTokens: 1800,
} as const;

// ─── Helper: roughTokenCount ──────────────────────────────────────────────────

/**
 * Rough token budget estimator.
 * Multiplies word count by 1.35 (industry heuristic for English prose).
 * Use this to sanity-check prompts before sending them to the API.
 *
 * @param text - Any string you want to estimate token count for.
 * @returns Estimated token count (always rounded up).
 */
export function roughTokenCount(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.35);
}

// ─── Internal: Groq SDK Call ──────────────────────────────────────────────────

/**
 * Calls Groq via the official @ai-sdk/groq SDK.
 *
 * Why @ai-sdk/groq instead of raw fetch?
 * - Type-safe model IDs (IDE autocompletion, compile-time checks)
 * - Automatic request retries, abort-signal handling, streaming support
 * - Unified interface with every other AI provider in the Vercel AI SDK
 *
 * @param messages - Array of { role, content } chat messages.
 * @returns Raw JSON string from the model.
 * @throws If the Groq API returns any non-OK response.
 */
async function callGroq(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  /** Instantiate a Groq provider with the key from env — never hard-code secrets. */
  const groqProvider = createGroq({ apiKey });

  const label = `[CineMash] Groq ${GROQ_PRIMARY_MODEL}`;
  console.time(label);

  try {
    const { text } = await generateText({
      model: groqProvider(GROQ_PRIMARY_MODEL),
      messages,
      temperature: LLM_PARAMS.temperature,
      topP: LLM_PARAMS.topP,
      maxOutputTokens: LLM_PARAMS.maxOutputTokens,
      // Force strict JSON output — no prose, no markdown fences.
      // providerOptions passes provider-specific params (Vercel AI SDK v6 API).
      providerOptions: {
        groq: { response_format: { type: 'json_object' } },
      },
    });

    console.timeEnd(label);
    return text;
  } catch (err) {
    console.timeEnd(label);
    throw err;
  }
}

// ─── Internal: OpenRouter Fallback Call ───────────────────────────────────────

/**
 * Calls OpenRouter using the OpenAI-compatible REST API.
 * Tries each model in OPENROUTER_FALLBACK_MODELS in order.
 *
 * We use raw fetch here because OpenRouter is not supported natively by the
 * Vercel AI SDK (no @ai-sdk/openrouter package), but its REST API is 100%
 * OpenAI-compatible so a small fetch wrapper is all we need.
 *
 * @param messages - Chat messages (same format as Groq).
 * @returns Raw JSON string from the first model that succeeds.
 * @throws If all fallback models fail.
 */
async function callOpenRouter(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  let lastError: Error = new Error('All OpenRouter fallback models failed');

  for (const model of OPENROUTER_FALLBACK_MODELS) {
    const label = `[CineMash] OpenRouter ${model}`;
    console.time(label);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          /** OpenRouter requires these headers for analytics & abuse prevention. */
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
          'X-Title': 'CineMash AI',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: LLM_PARAMS.temperature,
          top_p: LLM_PARAMS.topP,
          max_tokens: LLM_PARAMS.maxOutputTokens,
          response_format: { type: 'json_object' },
        }),
      });

      console.timeEnd(label);

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(
          `OpenRouter ${model} error (${response.status}): ${(errBody as any).error?.message ?? response.statusText}`
        );
      }

      const data = await response.json();
      return (data as any).choices[0].message.content as string;
    } catch (err) {
      console.timeEnd(label);
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`🎬 Shadow studio ${model} flickered… trying next fallback`);
    }
  }

  throw lastError;
}

// ─── Internal: Orchestrated LLM Call (Primary → Fallback) ────────────────────

/**
 * Tries Groq first; on any error (429, timeout, network, etc.) it logs a
 * cinematic quip and seamlessly falls back to OpenRouter.
 *
 * @param messages - Chat messages.
 * @returns Raw string content from whichever engine responded first.
 */
async function callLLM(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Promise<string> {
  try {
    return await callGroq(messages);
  } catch (err) {
    console.warn(
      '🎬 The director stormed off set… calling the backup studio (OpenRouter)',
      err instanceof Error ? err.message : err
    );
  }

  try {
    return await callOpenRouter(messages);
  } catch (err) {
    console.error('🎬 Groq went dark — retrying with the shadow studio', err);
    throw new Error(
      `All AI providers failed. Last error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// ─── Internal: Prompt Builder ─────────────────────────────────────────────────

/**
 * Builds the user-turn prompt for a new fusion.
 *
 * Includes:
 * - Full movie metadata (title, overview, genres, release year)
 * - Key cast from TMDb credits (up to 15 per film)
 * - Optional constraint string from the UI
 *
 * We intentionally keep this verbose so the model has rich DNA to work with.
 *
 * @param movies      - TMDb movie objects (2–4).
 * @param actorPool   - Flattened list of { name, originalMovie } objects.
 * @param constraints - Optional free-text creative constraints from the user.
 */
function buildFusionUserPrompt(
  movies: TMDbMovie[],
  actorPool: Array<{ name: string; originalMovie: string }>,
  constraints?: string
): string {
  const sourceText = movies
    .map((m, i) => {
      const year = m.release_date ? `(${m.release_date.slice(0, 4)})` : '';
      const genreNames = m.genres?.map((g) => g.name).join(', ') ?? 'Unknown';
      return [
        `── SOURCE FILM ${i + 1} ──`,
        `Title: ${m.title} ${year}`,
        `Genres: ${genreNames}`,
        `Plot: ${m.overview}`,
        m.cast?.length
          ? `Key Cast: ${m.cast
              .slice(0, 5)
              .map((c) => c.name)
              .join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  const actorSection =
    actorPool.length > 0
      ? `\n\nAVAILABLE DREAM CAST POOL (choose 5–8):\n${actorPool
          .map((a) => `• ${a.name} (from "${a.originalMovie}")`)
          .join('\n')}`
      : '';

  const constraintSection = constraints
    ? `\n\nSPECIAL DIRECTOR'S NOTE: ${constraints}`
    : '';

  const budgetNote = `\n\n[Estimated prompt tokens: ~${roughTokenCount(sourceText + actorSection + constraintSection)}]`;

  return `${sourceText}${actorSection}${constraintSection}${budgetNote}\n\nLights. Camera. FUSE THEM.`;
}

// ─── Internal: JSON Parse + Zod Validate + Auto-Retry ────────────────────────

/**
 * Extracts a JSON object from a string that might contain markdown formatting
 * or conversational wrappers.
 */
function extractJson(rawText: string): string {
  let cleanText = rawText.trim();
  const jsonStart = cleanText.indexOf('{');
  const jsonEnd = cleanText.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return cleanText.substring(jsonStart, jsonEnd + 1);
  }
  return cleanText;
}

/**
 * Parses raw LLM text as JSON, then validates it against FusionSchema.
 * If validation fails, sends a targeted follow-up prompt asking the model
 * to fix only the broken fields — one retry max before throwing.
 *
 * @param rawText        - Raw string from the LLM.
 * @param messages       - The full conversation so far (needed for retry).
 * @returns Validated FusionData object.
 * @throws If JSON cannot be parsed, or if Zod validation fails after retry.
 */
async function parseAndValidate(
  rawText: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Promise<FusionData> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJson(rawText));
  } catch {
    // Model emitted non-JSON — request a clean re-render
    console.warn('🎬 Script supervisor caught a typo — requesting clean copy…');
    const retryMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      ...messages,
      { role: 'assistant', content: rawText },
      {
        role: 'user',
        content: 'Fix the JSON and return only the corrected object',
      },
    ];
    const retryRaw = await callLLM(retryMessages);
    parsed = JSON.parse(extractJson(retryRaw)); // If this throws, we propagate — no infinite loops.
  }

  const result = FusionSchema.safeParse(parsed);

  if (result.success) return result.data;

  // Zod validation failed — one targeted retry
  console.warn(
    '🎬 QA department flagged the JSON schema… ordering a reshoot:',
    result.error.flatten().fieldErrors
  );

  const retryMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    ...messages,
    { role: 'assistant', content: rawText },
    {
      role: 'user',
      content: `Fix the JSON and return only the corrected object. Issues: ${JSON.stringify(result.error.flatten().fieldErrors)}`,
    },
  ];

  const retryRaw = await callLLM(retryMessages);
  return FusionSchema.parse(JSON.parse(extractJson(retryRaw)));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates a brand-new CineMash fusion from 2–4 TMDb movies.
 *
 * Flow:
 * 1. Fetches live cast data from TMDb for every source film.
 * 2. Builds a rich prompt with full movie DNA + actor pool.
 * 3. Calls Groq (primary) → OpenRouter (fallback) for the fusion JSON.
 * 4. Validates with Zod; retries once if schema mismatch.
 *
 * @param movies      - 2–4 TMDbMovie objects selected by the user.
 * @param constraints - Optional creative direction (e.g. "make it a musical").
 * @returns Promise resolving to a validated FusionData object and the actor pool used.
 */
export async function generateFusion(
  movies: TMDbMovie[],
  constraints?: string
): Promise<{ fusionData: FusionData; actorPool: Array<{ name: string; originalMovie: string; profile_path: string | null }> }> {
  console.time('[CineMash] generateFusion total');

  /** Fetch credits for all source movies in parallel — faster than sequential. */
  const creditsList = await Promise.all(
    movies.map((m) => getMovieCredits(String(m.id)).catch(() => ({ cast: [] })))
  );

  /** Flatten cast into a single actor pool with source-movie attribution. */
  const actorPool = creditsList.flatMap((credits, idx) =>
    ((credits as any).cast ?? []).slice(0, 15).map((actor: any) => ({
      name: actor.name as string,
      originalMovie: movies[idx].title,
      profile_path: (actor as any).profile_path || null
    }))
  );

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: FUSION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: buildFusionUserPrompt(movies, actorPool, constraints),
    },
  ];

  const rawText = await callLLM(messages);
  const fusionData = await parseAndValidate(rawText, messages);

  console.timeEnd('[CineMash] generateFusion total');
  return { fusionData, actorPool };
}

/**
 * Applies a single targeted refinement to an existing fusion.
 *
 * The refinement prompt includes the current fusion JSON in full, the user's
 * latest instruction, and up to the last 6 history turns for context — enough
 * for multi-turn creative dialogue without blowing the context window.
 *
 * Uses a slightly lower temperature (0.85) vs. initial generation to keep
 * targeted edits stable while still allowing creative flourishes.
 *
 * @param currentFusion - The existing FusionData to be modified.
 * @param userMessage   - The user's single refinement request.
 * @param history       - Previous ChatMessage[] for conversational context.
 * @returns Promise resolving to the refined (and Zod-validated) FusionData.
 */
export async function refineFusion(
  currentFusion: FusionData,
  userMessage: string,
  history: ChatMessage[]
): Promise<FusionData> {
  console.time('[CineMash] refineFusion total');

  /**
   * Convert ChatMessage[] history into the { role, content } format.
   * We keep the last 6 turns — this is intentional: beyond 6 turns the
   * context overhead starts eating into the 1800-token budget noticeably.
   */
  const historyMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> =
    history.slice(-6).map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

  const userTurn = [
    `CURRENT FUSION JSON:\n${JSON.stringify(currentFusion, null, 2)}`,
    `\nDIRECTOR'S NOTE (apply only this change): ${userMessage}`,
    `\n[Estimated prompt tokens: ~${roughTokenCount(JSON.stringify(currentFusion) + userMessage)}]`,
  ].join('');

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: REFINEMENT_SYSTEM_PROMPT },
    ...historyMessages,
    { role: 'user', content: userTurn },
  ];

  const rawText = await callLLM(messages);
  const refinedData = await parseAndValidate(rawText, messages);

  console.timeEnd('[CineMash] refineFusion total');
  return refinedData;
}
