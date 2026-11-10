// POST /api/generate
// Headers: Authorization: Bearer <token from /api/login>
// Body:    { action, className, folderName, text, existingFronts? }
//      or  { action: "placeMindMapNodes", existing, add }
//
// Checks the token, picks the prompt for the action from prompts.ts, asks
// Claude for JSON in a fixed shape, checks that JSON, and returns it.

import Anthropic from '@anthropic-ai/sdk'
import { ConfigError, json, verifyToken } from './_lib/auth.js'
import { prompts, type ActionName, type MindMapPromptInput, type PromptInput } from './prompts.js'

const MODEL = 'claude-sonnet-5-5'

// ---------- JSON shapes Claude must return ----------

const flashcardsSchema = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          front: { type: 'string' },
          back: { type: 'string' },
          concept: { type: 'string' },
        },
        required: ['front', 'back', 'concept'],
        additionalProperties: false,
      },
    },
  },
  required: ['cards'],
  additionalProperties: false,
}

const lessonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
          paragraphs: { type: 'array', items: { type: 'string' } },
        },
        required: ['heading', 'paragraphs'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'sections'],
  additionalProperties: false,
}

const mindMapSchema = {
  type: 'object',
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          r: { type: 'number' },
        },
        required: ['key', 'x', 'y', 'r'],
        additionalProperties: false,
      },
    },
    concepts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topicKey: { type: 'string' },
          label: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
        },
        required: ['topicKey', 'label', 'x', 'y'],
        additionalProperties: false,
      },
    },
  },
  required: ['topics', 'concepts'],
  additionalProperties: false,
}

const schemas: Record<ActionName, Record<string, unknown>> = {
  generateFlashcards: flashcardsSchema,
  addMoreFlashcards: flashcardsSchema,
  generateLesson: lessonSchema,
  placeMindMapNodes: mindMapSchema,
}

// ---------- Checking Claude's JSON ----------

class BadOutput extends Error {}

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

function checkCards(data: unknown) {
  const cards = (data as { cards?: unknown })?.cards
  if (!Array.isArray(cards)) throw new BadOutput('no cards list')
  const clean = cards
    .filter((c) => isText(c?.front) && isText(c?.back))
    .map((c) => ({
      front: String(c.front).trim(),
      back: String(c.back).trim(),
      concept: isText(c.concept) ? String(c.concept).trim() : '',
    }))
  if (clean.length === 0) throw new BadOutput('no usable cards')
  return { cards: clean }
}

function checkLesson(data: unknown) {
  const lesson = data as { title?: unknown; sections?: unknown }
  if (!isText(lesson?.title) || !Array.isArray(lesson.sections)) {
    throw new BadOutput('lesson is missing its title or sections')
  }
  const sections = lesson.sections
    .filter((s) => isText(s?.heading) && Array.isArray(s?.paragraphs))
    .map((s) => ({
      heading: String(s.heading).trim(),
      paragraphs: (s.paragraphs as unknown[]).filter(isText).map((p) => p.trim()),
    }))
    .filter((s) => s.paragraphs.length > 0)
  if (sections.length === 0) throw new BadOutput('lesson has no usable sections')
  return { lesson: { title: lesson.title.trim(), sections } }
}

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// Keeps only the new circles that were asked for. Anything else, including
// any attempt to move a circle already on the map, is dropped.
function checkMindMap(data: unknown, input: MindMapPromptInput) {
  const out = data as { topics?: unknown; concepts?: unknown }
  if (!Array.isArray(out?.topics) || !Array.isArray(out?.concepts)) {
    throw new BadOutput('mind map is missing its topics or concepts')
  }
  const newTopicKeys = new Set(input.add.filter((a) => a.isNewTopic).map((a) => a.topicKey))
  const wanted = new Set(
    input.add.flatMap((a) => a.concepts.map((c) => `${a.topicKey}\n${c.toLowerCase()}`)),
  )

  const topics = []
  const seenTopics = new Set<string>()
  for (const t of out.topics) {
    if (!newTopicKeys.has(t?.key) || seenTopics.has(t.key)) continue
    if (!isNumber(t.x) || !isNumber(t.y) || !isNumber(t.r)) continue
    seenTopics.add(t.key)
    topics.push({ key: String(t.key), x: t.x, y: t.y, r: clamp(t.r, 100, 400) })
  }

  const concepts = []
  const seenConcepts = new Set<string>()
  for (const c of out.concepts) {
    if (!isText(c?.label) || !isNumber(c.x) || !isNumber(c.y)) continue
    const id = `${c.topicKey}\n${c.label.toLowerCase()}`
    if (!wanted.has(id) || seenConcepts.has(id)) continue
    seenConcepts.add(id)
    concepts.push({ topicKey: String(c.topicKey), label: c.label, x: c.x, y: c.y })
  }
  return { topics, concepts }
}

function readMindMapInput(body: Record<string, unknown>): MindMapPromptInput | null {
  const existing = Array.isArray(body.existing) ? body.existing : null
  const add = Array.isArray(body.add) ? body.add : null
  if (!existing || !add || add.length === 0) return null
  return {
    existing: existing
      .filter((n) => isText(n?.key) && isText(n?.label) && isNumber(n?.x) && isNumber(n?.y))
      .map((n) => ({
        key: n.key,
        kind: n.kind === 'concept' ? 'concept' : 'topic',
        label: n.label,
        topicKey: isText(n.topicKey) ? n.topicKey : undefined,
        x: n.x,
        y: n.y,
        r: isNumber(n.r) ? n.r : 40,
      })),
    add: add
      .filter((a) => isText(a?.topicKey) && isText(a?.topicLabel))
      .map((a) => ({
        topicKey: a.topicKey,
        topicLabel: a.topicLabel,
        className: isText(a.className) ? a.className : '',
        isNewTopic: a.isNewTopic === true,
        concepts: Array.isArray(a.concepts) ? a.concepts.filter(isText) : [],
      })),
  }
}

// ---------- Handler ----------

export async function POST(request: Request): Promise<Response> {
  try {
    const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!token || !verifyToken(token)) {
      return json(
        { error: 'Your access code isn’t active. Sign out and create your account again with a valid code.' },
        401,
      )
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ConfigError('ANTHROPIC_API_KEY is not set on the server.')
    }

    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return json({ error: 'The request was not valid.' }, 400)
    }

    const action = body.action as ActionName
    if (!(action in prompts)) return json({ error: 'Unknown action.' }, 400)

    let system: string
    let userMessage: string
    let mindMapInput: MindMapPromptInput | null = null
    if (action === 'placeMindMapNodes') {
      mindMapInput = readMindMapInput(body)
      if (!mindMapInput) return json({ error: 'There is nothing new to add to the mind map.' }, 400)
      system = prompts.placeMindMapNodes.system
      userMessage = prompts.placeMindMapNodes.user(mindMapInput)
    } else {
      if (!isText(body.text)) return json({ error: 'This folder has no text to send.' }, 400)
      const input: PromptInput = {
        className: isText(body.className) ? body.className : 'Untitled class',
        folderName: isText(body.folderName) ? body.folderName : 'Untitled folder',
        text: body.text,
        existingFronts: Array.isArray(body.existingFronts) ? body.existingFronts.filter(isText) : [],
      }
      system = prompts[action].system
      userMessage = prompts[action].user(input)
    }

    const client = new Anthropic() // reads ANTHROPIC_API_KEY
    const message = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system,
        messages: [{ role: 'user', content: userMessage }],
        output_config: { format: { type: 'json_schema', schema: schemas[action] } },
      })
      .finalMessage()

    if (message.stop_reason === 'refusal') {
      return json({ error: 'Claude declined to work with this content.' }, 422)
    }
    if (message.stop_reason === 'max_tokens') {
      return json({ error: 'The answer was too long to finish. Try a folder with less content.' }, 502)
    }

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      throw new BadOutput('response was not JSON')
    }
    if (mindMapInput) return json(checkMindMap(data, mindMapInput))
    return json(action === 'generateLesson' ? checkLesson(data) : checkCards(data))
  } catch (e) {
    if (e instanceof ConfigError) return json({ error: `Server setup problem: ${e.message}` }, 500)
    if (e instanceof BadOutput) {
      return json({ error: `Claude’s answer wasn’t in the expected format (${e.message}). Try again.` }, 502)
    }
    if (e instanceof Anthropic.AuthenticationError) {
      return json({ error: 'Server setup problem: ANTHROPIC_API_KEY was rejected.' }, 500)
    }
    if (e instanceof Anthropic.RateLimitError) {
      return json({ error: 'Claude is busy right now. Wait a minute and try again.' }, 429)
    }
    if (e instanceof Anthropic.BadRequestError) {
      return json({ error: `Claude couldn’t take this request: ${e.message}` }, 400)
    }
    if (e instanceof Anthropic.APIError) {
      return json({ error: 'Claude had a problem answering. Try again in a moment.' }, 502)
    }
    console.error(e)
    return json({ error: 'Something went wrong on the server. Try again.' }, 500)
  }
}
