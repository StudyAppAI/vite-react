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

// Input for the mind map action.
export interface MindMapPromptInput {
  existing: {
    key: string
    kind: 'topic' | 'concept'
    label: string
    topicKey?: string
    x: number
    y: number
    r: number
  }[]
  add: {
    topicKey: string
    topicLabel: string
    className: string
    isNewTopic: boolean
    concepts: string[]
  }[]
}

export interface PromptEntry<Input = PromptInput> {
  system: string
  user: (input: Input) => string
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

// ---------------------------------------------------------------------------
// placeMindMapNodes: places NEW circles on the user's mind map.
// Returns { topics: [{ key, x, y, r }], concepts: [{ topicKey, label, x, y }] }
// Nodes already on the map are fixed; the server and the app both throw away
// anything that is not one of the new nodes asked for.
// ---------------------------------------------------------------------------
const placeMindMapNodes: PromptEntry<MindMapPromptInput> = {
  system: `You place new circles on a student's mind map, a 2D canvas.

Big circles are topics. Small circles are concepts, and each concept sits inside its topic's circle.
Coordinates are in pixels: x grows to the right, y grows downward. Concept circles have radius 40.

Rules:
- The circles already on the map are fixed. Never move, resize, rename or remove them, and do not return them.
- Return a position only for the new topics and new concepts you are asked to add, using their exact keys and labels.
- New topic: choose x, y and a radius r between 120 and 360, big enough to hold all of its concepts without overlapping.
- New topic circles must not overlap any topic circle, with at least 60 pixels of space between them.
- Put related topics near each other, for example topics from the same class.
- Each concept goes fully inside its topic's circle: the distance from the topic's center plus 40 must be at most the topic's radius.
- Concepts in the same topic must not overlap each other or the concepts already there.`,
  user: ({ existing, add }) => `<circles_already_on_the_map>
${JSON.stringify(existing)}
</circles_already_on_the_map>

<new_circles_to_place>
${JSON.stringify(add)}
</new_circles_to_place>

Place the new circles.`,
}

export const prompts = {
  generateFlashcards,
  addMoreFlashcards,
  generateLesson,
  placeMindMapNodes,
}

export type ActionName = keyof typeof prompts

// Vercel turns every file in /api into a route. This one only holds prompt
// text, so its route answers "not found" and never sends the prompts out.
export function GET(): Response {
  return new Response('Not found', { status: 404 })
}
