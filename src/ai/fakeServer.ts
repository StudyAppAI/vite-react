// Stand-in for the real server function. It waits a moment and returns
// realistic-looking data so every AI button works end to end.
// Delete this file once actions.ts calls the real server.

import type { ActionName, ActionRequests, ActionResponses, NewCard } from './types.ts'

interface PoolCard extends NewCard {
  explanation: string
}

const RECURSION: PoolCard[] = [
  {
    concept: 'Recursion',
    front: 'What is recursion?',
    back: 'A function solving a problem by calling itself on a smaller version of the same problem.',
    explanation:
      'Instead of solving the whole problem at once, the function handles one small piece and hands the rest to another call of itself. Each call works on less, until what is left is trivially easy.',
  },
  {
    concept: 'Base case',
    front: 'What is a base case?',
    back: 'The condition where a recursive function returns an answer directly without calling itself again.',
    explanation:
      'It is the stopping point. Without it the function would keep calling itself forever. For factorial, n = 0 is the base case: the answer is just 1.',
  },
  {
    concept: 'Recursive case',
    front: 'What does the recursive case of a function do?',
    back: 'It breaks the problem into a smaller input and calls the function on that input.',
    explanation:
      'For factorial(n), the recursive case is n × factorial(n − 1). Each call shrinks n by one, moving toward the base case.',
  },
  {
    concept: 'Call stack',
    front: 'What happens on the call stack during recursion?',
    back: 'Each call adds a new frame with its own variables; frames are removed as calls return.',
    explanation:
      'Every unfinished call waits on the stack. factorial(3) waits for factorial(2), which waits for factorial(1), and so on. When the deepest call returns, the waiting calls finish in reverse order.',
  },
  {
    concept: 'Stack overflow',
    front: 'What causes a stack overflow in a recursive function?',
    back: 'Too many nested calls, usually from a missing or unreachable base case.',
    explanation:
      'The call stack has limited space. If the function never reaches its base case, frames keep piling up until there is no room left and the program crashes.',
  },
  {
    concept: 'Memoization',
    front: 'How does memoization speed up recursive Fibonacci?',
    back: 'It stores each computed result so the same input is never calculated twice.',
    explanation:
      'Plain recursive Fibonacci recalculates fib(3), fib(2) and so on many times. Saving each answer the first time turns exponential work into linear work.',
  },
]

const SORTING: PoolCard[] = [
  {
    concept: 'Merge sort',
    front: 'How does merge sort work?',
    back: 'It splits the list in half, sorts each half recursively, then merges the two sorted halves.',
    explanation:
      'Sorting two small sorted lists into one is easy: repeatedly take the smaller front item. Merge sort keeps splitting until lists have one item, then merges back up.',
  },
  {
    concept: 'Merge sort',
    front: 'What is the time complexity of merge sort?',
    back: 'O(n log n) in the best, average and worst case.',
    explanation:
      'The list is halved about log n times, and each level of merging touches all n items. Multiply them and you get n log n, no matter how the input is arranged.',
  },
  {
    concept: 'Quicksort',
    front: 'What is the pivot in quicksort?',
    back: 'An element used to split the list into items smaller than it and items larger than it.',
    explanation:
      'After partitioning, the pivot is in its final sorted position. Quicksort then sorts the smaller side and the larger side separately.',
  },
  {
    concept: 'Quicksort',
    front: 'When does quicksort hit its worst case of O(n²)?',
    back: 'When the pivot is always the smallest or largest item, such as picking the first item of an already sorted list.',
    explanation:
      'A bad pivot splits the list into 0 items and n − 1 items, so each step only removes one item. That gives n levels of n work each.',
  },
  {
    concept: 'Stable sort',
    front: 'What makes a sorting algorithm stable?',
    back: 'Items with equal keys keep the same relative order they had before sorting.',
    explanation:
      'If two students both scored 90 and Ana came before Ben in the input, a stable sort keeps Ana before Ben. Merge sort is stable; standard quicksort is not.',
  },
  {
    concept: 'Insertion sort',
    front: 'Why is insertion sort fast on nearly sorted data?',
    back: 'Each item only moves a short distance, so the work is close to O(n).',
    explanation:
      'Insertion sort shifts each new item left until it fits. If the list is almost sorted, that shift is tiny for nearly every item.',
  },
]

const GENERAL: PoolCard[] = [
  {
    concept: 'Big-O notation',
    front: 'What does Big-O notation describe?',
    back: 'How an algorithm’s running time or memory grows as the input size grows.',
    explanation:
      'It ignores constants and small details and keeps only the growth rate. O(n) means doubling the input roughly doubles the work.',
  },
  {
    concept: 'Arrays',
    front: 'Why is reading an array element by index O(1)?',
    back: 'Elements sit next to each other in memory, so the address is computed directly from the index.',
    explanation:
      'The computer jumps straight to start + index × item size. It does not need to walk through the earlier elements.',
  },
  {
    concept: 'Linked lists',
    front: 'What is the main trade-off of a linked list compared to an array?',
    back: 'Fast insertion and removal at a known node, but slow O(n) access by index.',
    explanation:
      'Each node only knows the next node. To reach the 50th item you must follow 49 links, but adding a node only means changing a couple of pointers.',
  },
  {
    concept: 'Hash tables',
    front: 'What does a hash table give you on average for lookup, insert and delete?',
    back: 'O(1) time.',
    explanation:
      'A hash function turns the key into a bucket number, so the table goes straight to the right spot instead of searching through every entry.',
  },
  {
    concept: 'Stacks and queues',
    front: 'What is the difference between a stack and a queue?',
    back: 'A stack removes the newest item first (LIFO); a queue removes the oldest item first (FIFO).',
    explanation:
      'A stack is like a pile of plates: you take from the top. A queue is like a line at a store: the first person in line is served first.',
  },
  {
    concept: 'Binary search',
    front: 'What does binary search require, and how fast is it?',
    back: 'A sorted list; it runs in O(log n) time.',
    explanation:
      'Each step compares with the middle item and throws away the half that cannot contain the target. Halving 1,000 items takes only about 10 steps.',
  },
  {
    concept: 'Binary trees',
    front: 'In a binary search tree, where are smaller values stored?',
    back: 'In the left subtree of a node; larger values go in the right subtree.',
    explanation:
      'This rule holds at every node, so a search can decide left or right at each step, just like binary search on a sorted list.',
  },
  {
    concept: 'Graphs',
    front: 'What is the difference between BFS and DFS?',
    back: 'BFS explores neighbors level by level using a queue; DFS goes as deep as possible first using a stack or recursion.',
    explanation:
      'BFS finds the shortest path in an unweighted graph because it reaches nearby nodes first. DFS is simpler for exploring every path or detecting cycles.',
  },
]

const ALL = [...RECURSION, ...SORTING, ...GENERAL]

function poolFor(title: string): PoolCard[] {
  const t = title.toLowerCase()
  if (t.includes('recurs')) return [...RECURSION, ...GENERAL, ...SORTING]
  if (t.includes('sort')) return [...SORTING, ...GENERAL, ...RECURSION]
  return [...GENERAL, ...RECURSION, ...SORTING]
}

function stripExplanation({ front, back, concept }: PoolCard): NewCard {
  return { front, back, concept }
}

function pickNewCards(title: string, existingFronts: string[], count: number): NewCard[] {
  const used = new Set(existingFronts)
  const picked = poolFor(title)
    .filter((c) => !used.has(c.front))
    .slice(0, count)
    .map(stripExplanation)

  // When the sample cards run out, make simple numbered ones.
  let n = existingFronts.length + picked.length + 1
  while (picked.length < count) {
    picked.push({
      concept: title,
      front: `Key idea ${n} from ${title}: what is it?`,
      back: `A sample answer for key idea ${n}. Real cards will come from your uploaded files.`,
    })
    n++
  }
  return picked
}

function explain(front: string, back: string): string {
  const known = ALL.find((c) => c.front === front)
  if (known) return known.explanation
  return `The question asks: “${front}” The answer is: ${back} A good way to remember it is to say the answer in your own words and connect it to an example from class.`
}

function lesson(title: string) {
  return {
    title: `${title}: Visual Lesson`,
    sections: [
      {
        title: 'Section 1: The core ideas',
        concepts: [
          { heading: 'What it is', paragraph: `An overview of the main idea in ${title}.` },
          { heading: 'How it works', paragraph: 'A step-by-step walk-through with a visual.' },
        ],
      },
      {
        title: 'Section 2: Putting it to work',
        concepts: [
          { heading: 'Worked example', paragraph: 'A traced example from start to finish.' },
          { heading: 'Common mistakes', paragraph: 'What usually goes wrong and how to avoid it.' },
        ],
      },
    ],
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fakeServer<A extends ActionName>(
  action: A,
  content: ActionRequests[A],
): Promise<ActionResponses[A]> {
  await wait(900 + Math.random() * 700)

  // Each branch returns the response shape for its own action.
  switch (action) {
    case 'makeFlashcards': {
      const { title } = content as ActionRequests['makeFlashcards']
      return { cards: pickNewCards(title, [], 8) } as ActionResponses[A]
    }
    case 'addMoreFlashcards': {
      const { title, existingFronts } = content as ActionRequests['addMoreFlashcards']
      return { cards: pickNewCards(title, existingFronts, 5) } as ActionResponses[A]
    }
    case 'explainCard': {
      const { front, back } = content as ActionRequests['explainCard']
      return { explanation: explain(front, back) } as ActionResponses[A]
    }
    case 'generateLesson': {
      const { title } = content as ActionRequests['generateLesson']
      return { lesson: lesson(title) } as ActionResponses[A]
    }
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}
