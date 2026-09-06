/**
 * Tailwind Typography class sets for markdown rendered in the app. One set of
 * element rules keeps answers and documents looking like the same product;
 * the two exports differ only in measure, face, and heading scale.
 *
 * Variants stack left to right: `prose-a:hover:` targets a hovered link,
 * whereas `hover:prose-a:` would restyle every link when the block is hovered.
 */

// Element styling shared by every markdown surface.
const ELEMENTS = [
  'prose-headings:font-display prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-ink',
  'prose-ul:pl-5 prose-ol:pl-5 prose-li:my-1 prose-li:marker:text-ink-3',
  'prose-strong:font-semibold prose-strong:text-ink prose-em:text-ink-2',
  'prose-a:text-accent prose-a:underline-offset-3 prose-a:hover:text-accent-ink',
  'prose-code:rounded prose-code:bg-paper-2 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[13px] prose-code:font-normal prose-code:text-ink prose-code:before:content-none prose-code:after:content-none',
  'prose-pre:rounded-lg prose-pre:border prose-pre:border-rule prose-pre:bg-paper-2 prose-pre:text-[13px] prose-pre:text-ink',
  'prose-blockquote:border-l-rule-strong prose-blockquote:text-ink-2 prose-blockquote:not-italic prose-blockquote:font-normal',
  'prose-hr:border-rule prose-table:text-[14px] prose-th:text-ink prose-td:text-ink',
]

/** Markdown inside a chat answer, kept close to the surrounding UI type. */
export const ANSWER_PROSE = [
  'prose max-w-none text-[15px] leading-[1.65] text-ink',
  'prose-p:my-2.5 prose-p:text-ink prose-ul:my-2 prose-ol:my-2',
  'prose-h1:text-[22px] prose-h1:mt-4 prose-h1:mb-1.5 prose-h2:text-[19px] prose-h2:mt-4 prose-h2:mb-1.5 prose-h3:text-[16px] prose-h3:mt-3 prose-h3:mb-1',
  ...ELEMENTS,
].join(' ')

/**
 * A policy document read in full. Set in the display face at reading size,
 * the way the library showed passages, with room between sections. The
 * document title is an h2 above this block, so body headings step down from it.
 */
export const DOCUMENT_PROSE = [
  'prose max-w-none font-display text-[16.5px] leading-[1.6] text-ink',
  'prose-p:my-3.5 prose-p:text-ink prose-ul:my-3 prose-ol:my-3',
  'prose-h1:text-[21px] prose-h1:mt-8 prose-h1:mb-2 prose-h2:text-[19px] prose-h2:mt-8 prose-h2:mb-2 prose-h3:text-[17px] prose-h3:mt-6 prose-h3:mb-1.5',
  'prose-headings:first:mt-0',
  ...ELEMENTS,
].join(' ')
