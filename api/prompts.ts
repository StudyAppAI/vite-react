// ============================================================================
// ALL PROMPT TEXT FOR THE APP LIVES IN THIS FILE.
//
// One entry per action. Each entry has:
//   system: instructions for Claude
//   user:   builds the message that carries the folder's content
//
// The app never sends prompt text; it sends only the action name and the
// folder's content. api/generate.ts picks the entry below for that action.
// The JSON shape Claude must return is enforced in api/generate.ts.
// ============================================================================

// Input for the flashcard and lesson actions.
export interface PromptInput {
  className: string
  folderName: string
  text: string
  existingFronts: string[]
}

export interface PromptEntry {
  system: string
  user: (input: PromptInput) => string
}

function material({ className, folderName, text }: PromptInput): string {
  return `Class: ${className}
Folder: ${folderName}

<course_material>
${text}
</course_material>`
}

// ---------------------------------------------------------------------------
// generateFlashcards: makes a new deck from the folder's content.
// Returns { cards: [{ front, back, concept }] }
// ---------------------------------------------------------------------------
const generateFlashcards: PromptEntry = {
  system: `You make study flashcards from a student's own course materials.

Read all of the material, then write flashcards that together cover every key concept in it: definitions, how processes and algorithms work, important facts, formulas, comparisons between ideas, and the lessons of worked examples.

Rules:
- One idea per card.
- front: a clear, specific question that can be answered from the material.
- back: the correct answer in 1 to 3 short sentences.
- concept: the name of the concept the card tests, in 1 to 4 words.
- Use only information supported by the material. Do not invent facts.
- Skip course logistics such as due dates, grading, and office hours.
- Make as many cards as it takes to cover the material well.`,
  user: (input) => `${material(input)}

Write the flashcards for this material.`,
}

// ---------------------------------------------------------------------------
// addMoreFlashcards: adds cards to an existing deck without repeating it.
// Returns { cards: [{ front, back, concept }] }
// ---------------------------------------------------------------------------
const addMoreFlashcards: PromptEntry = {
  system: `You add new study flashcards to a deck a student already has, using their own course materials.

Write new flashcards that cover concepts, details, or angles the existing cards miss. If the main ideas are already covered, go deeper: applications, comparisons, edge cases, and common mistakes.

Rules:
- Never repeat or reword a question that is already in the deck.
- One idea per card.
- front: a clear, specific question that can be answered from the material.
- back: the correct answer in 1 to 3 short sentences.
- concept: the name of the concept the card tests, in 1 to 4 words.
- Use only information supported by the material. Do not invent facts.
- Skip course logistics such as due dates, grading, and office hours.`,
  user: (input) => `${material(input)}

<existing_card_fronts>
${input.existingFronts.map((front) => `- ${front}`).join('\n')}
</existing_card_fronts>

Write new flashcards that do not repeat any of the existing ones.`,
}

// ---------------------------------------------------------------------------
// generateLesson: turns the folder's content into a lesson.
// Returns { title, sections: [{ heading, paragraphs: string[] }] }
// ---------------------------------------------------------------------------
const generateLesson: PromptEntry = {
  system: `You turn a student's own course materials into a clear lesson they can read to learn the topic.

Write a lesson that teaches everything important in the material, in a logical order from the basics to the harder ideas.

Rules:
- title: a short title for the lesson.
- sections: 3 to 8 sections, each covering one main idea.
- heading: a short heading for the section.
- paragraphs: 1 to 4 paragraphs of plain, friendly teaching text. Explain ideas simply and use examples from the material.
- Use only information supported by the material. Do not invent facts.
- Skip course logistics such as due dates, grading, and office hours.`,
  user: (input) => `${material(input)}

Write the lesson for this material.`,
}

export const prompts = {
  generateFlashcards,
  addMoreFlashcards,
  generateLesson,
}

export type ActionName = keyof typeof prompts

// Vercel turns every file in /api into a route. This one only holds prompt
// text, so its route answers "not found" and never sends the prompts out.
export function GET(): Response {
  return new Response('Not found', { status: 404 })
}
