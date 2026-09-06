# Sourcebook design tokens

The values live in `src/index.css` inside the Tailwind `@theme` block. This
file explains them. Change the CSS, then update this page.

The direction is paper and ink. Warm off-white surfaces, near-black text, and
one bottle-green accent on the brand mark, links, the active row, and the
filled buttons (ask, sign in, send, the pressed filter chip). Status colors carry meaning and nothing else. The chat reads
like a Q&A column with footnote-style citations rather than chat bubbles,
because the citations are what the product is judged on.

## Layout

The app is an open book. The left page is the question and its answer; the
right page is the source. Everything else is arranged to keep those two side
by side.

**Shell.** A sidebar on the left holds the primary actions (new question,
Policy Library), projects, and recent questions. On desktop it collapses to a
60px icon rail rather than disappearing, so the actions stay one click away.
On phones it is a drawer over the page with a slim top bar to open it. The
one toggle lives at the right end of the 60px header band in every state:
a double chevron to collapse or expand on desktop, an X on the drawer.
Every header band across the app (sidebar, source pane, library columns) is
60px, so the top rules line up across the spread.

**Home.** Before the first question there is no chat. The page is a reference
desk: a headline, one large question box, four example questions in two
columns, and what is indexed. When the main area is wide enough for the
source pane to dock (1160px), that last part is a facing page in the pane's
slot: a 60px header band, then a table of contents on ruled paper behind a
hairline spine 24px past the column: "What you can ask about" in the
display face, the category links, one line saying every answer cites one of
the indexed policies, and the link into the library. The book has two pages before anything is cited, and the source pane
later lands where the facing page was. Narrower than that, it is a strip
under the examples. The column does not move in either case.

**Thread.** Once a question is asked, the column becomes a Q&A article:
question in the display face, answer as prose, then a footer with the match
meter, citation chips, follow-up rows on the last answer, and the quiet
escalation link. The reading column is anchored to the left gutter, not
centred, so it never moves. The follow-up composer flows after the last
answer and pins to the bottom of the view only once the thread is taller
than the view. A new question scrolls to the top of the view; from the
second turn on, the last turn is at least a viewport tall so it can.

**Source pane.** Clicking a citation chip opens the cited document beside
the answer as the indexed passages retrieval saw, set in the display face as
quotations; it is the audit trail for the citation, and links to the library
for the document whole. It docks as a 368px column in the right margin
whenever the page is wide enough to hold gutter, column, and pane without
narrowing the column (1160px of main area), and slides over the thread
otherwise. Escape closes it. Switching conversations closes it.

**Refusal.** A notice, not an answer. Ochre panel with a header row (label
and match meter), the refusal text, one line explaining that nothing indexed
came close enough, and two actions inside the panel: ask People Operations,
and see what is indexed.

**Library.** Master-detail from 1024px up: a 400px list column (search,
category filter with an All chip, rows) beside a reading pane, both under a
shared 60px header band. The reading pane renders the document's markdown
in full, in the display face at reading size, under its title and metadata.
The first result opens on its own when the URL names no document. Below
1024px the list and the reader take turns, with a back link. The URL carries
`q`, `category`, and `source`, so a citation can deep-link to an open
document.

**Sign-in.** Two pages side by side on desktop: the left states what the
tool promises, the right is the form. They stack on phones.

## Palette

Colors are defined in oklch so lightness and chroma stay comparable across
hues. Hex values here are approximations for design tools.

| Token | oklch | Hex | Use |
| --- | --- | --- | --- |
| `paper` | 97.5% 0.008 85 | #F9F6F1 | page background |
| `paper-2` | 95% 0.011 85 | #F2EEE6 | sidebar, sunken areas, code |
| `paper-3` | 99.2% 0.004 85 | #FEFCF9 | cards, inputs, the composer |
| `rule` | 88.5% 0.012 80 | #DDD8D0 | hairlines between rows |
| `rule-strong` | 80% 0.016 80 | #C3BDB2 | input and card borders |
| `ink` | 24% 0.014 60 | #241E19 | text |
| `ink-2` | 47% 0.015 60 | #615953 | secondary text, meta |
| `ink-3` | 52% 0.013 60 | #6F6762 | icons, placeholders, short labels and hints |
| `accent` | 42% 0.09 160 | #0C5C3C | brand mark, links, active nav icon, filled buttons, pressed chip |
| `accent-ink` | 34% 0.09 160 | #004527 | link hover, active row text, filled button hover |
| `accent-soft` | 94% 0.03 160 | #DBF2E4 | active row, focus halo, selection |
| `accent-rule` | 85% 0.06 160 | #ACDAC0 | reserved for accent borders |
| `moss` | 50% 0.10 150 | #337344 | strong retrieval match, "sent" check (sits beside the accent on purpose) |
| `ochre` | 62% 0.13 72 | #B6770B | partial match dot, refusal icon |
| `ochre-ink` | 45% 0.11 72 | #7A4F06 | refusal label text |
| `ochre-soft` | 96.5% 0.03 85 | #FDF2DD | refusal panel |
| `ochre-rule` | 84% 0.09 80 | #EAC586 | refusal panel border |
| `brick` | 52% 0.16 30 | #B2392B | weak match dot, error text |
| `brick-soft` | 95.5% 0.025 30 | #FFEAE6 | reserved for error panels |

The match meter is a 112px track with a word (strong, partial, weak) and the
percentage, plus an info button whose popover explains what it measures.

Contrast on `paper`: `ink` 15:1, `ink-2` 6.4:1, `ink-3` 5.1:1, `accent` 7.5:1,
`moss` 5.2:1, `brick` 5.4:1. `ink-3` clears AA (4.5:1) for small text on every
paper in both themes; its worst case is 4.8:1, on `paper-2` in light and on
`paper-3` in dark. That makes it safe for placeholders, key hints, and short
labels; body copy still uses `ink` and `ink-2`.

Retrieval match thresholds: 70 and above is `moss`, 40 to 69 is `ochre`,
below 40 is `brick`. These mirror the constants in `ConfidenceBadge.tsx`.

## Dark

Dark keeps every relationship and inverts the ground. Surfaces are warm
charcoal, ink is warm off-white, and the accent and status colors are
lifted so they hold their contrast. Filled buttons are accent with paper
text in both themes: dark green with cream text in light, sage with
charcoal text in dark. The values live
under `:root[data-theme="dark"]` in `src/index.css`.

| Token | Dark oklch | Hex |
| --- | --- | --- |
| `paper` | 22% 0.01 60 | #1E1A16 |
| `paper-2` | 19% 0.01 60 | #17130F |
| `paper-3` | 26% 0.011 60 | #28231F |
| `rule` | 32% 0.012 60 | #38322D |
| `rule-strong` | 41% 0.013 60 | #504943 |
| `ink` | 93% 0.008 85 | #EAE7E2 |
| `ink-2` | 75% 0.01 80 | #B1ADA7 |
| `ink-3` | 65% 0.012 70 | #948E87 |
| `accent` | 78% 0.11 160 | #73CD9F |
| `accent-ink` | 86% 0.09 160 | #9CE4BD |
| `accent-soft` | 30% 0.05 160 | #143525 |
| `moss` | 72% 0.11 150 | #6FB880 |
| `ochre` | 76% 0.13 75 | #E1A447 |
| `ochre-ink` | 86% 0.1 82 | #F2CB83 |
| `ochre-soft` | 27% 0.035 80 | #2F2512 |
| `ochre-rule` | 42% 0.08 80 | #64470E |
| `brick` | 72% 0.15 30 | #F47C6B |

The theme follows the operating system until the person picks one with the
toggle (sidebar footer, rail, and sign-in page). The choice is kept in
localStorage under `theme`, and index.html applies it before the first
paint so there is no flash.

## Type

Two families, both self-hosted from `@fontsource-variable` and imported in
`src/main.tsx`.

| Role | Face | Size / line | Where |
| --- | --- | --- | --- |
| Display | Newsreader Variable 500 | 40 / 44 | empty-state heading (32 on phones) |
| Display | Newsreader Variable 500 | 32 / 36 | page titles, sign-in |
| Display | Newsreader Variable 500 | 22 / 29 | the question in a chat turn (20 on phones) |
| Display | Newsreader Variable 500 | 21 | wordmark in the sidebar |
| UI | IBM Plex Sans Variable 400 | 15 / 25 | answer body, chat input |
| UI | IBM Plex Sans Variable 400 | 14 / 21 | default |
| UI | IBM Plex Sans Variable 500 | 13.5 / 20 | sidebar rows, buttons |
| UI | IBM Plex Sans Variable 400 | 12.5 / 19 | meta, match badge, hints |
| Label | IBM Plex Sans Variable 600 | 11, +8% tracking, caps | section labels (`caps` utility) |

Inputs use 16px on phones so iOS does not zoom on focus, and 14 or 15px from
the `sm` breakpoint up. Numbers use tabular figures (`tnum` utility).

## Spacing, radius, elevation

Spacing sits on Tailwind's 4px grid. Content columns are 760px for chat and
860px for the library. Controls are 36px tall on desktop and 44px on phones.

| Radius | Where |
| --- | --- |
| 4px | chips, inline inputs |
| 6px | buttons, inputs, sidebar rows |
| 8px | refusal panel, escalation form, expanded library row |
| 12px | composer, sign-in card |

| Shadow | Value | Where |
| --- | --- | --- |
| `float` | 0 1px 2px 5%, 0 8px 24px 6% | composer, menus |
| `card` | 0 1px 2px 5%, 0 24px 48px 8% | sign-in card |
| `drawer` | 0 12px 40px 28% | phone sidebar |

Shadow colors are `ink` at the listed opacities. Nothing else casts a shadow;
hierarchy comes from hairlines and the three paper steps.

## Focus and motion

Every interactive element gets the same focus ring: a 2px `accent` outline
with 2px offset, on `:focus-visible` only. Inputs also show a 3px
`accent-soft` halo while focused.

Motion is limited to color transitions, the sidebar drawer slide, the
chevron rotation on disclosures, and the streaming caret. All of them respect
`prefers-reduced-motion`.

## The mark

The group's drawing: an open book with a ribbon rising out of it, as a
sticker with a pale outline. The blues of the original are shifted to the
green accent (cover in the deep green, ribbon in the lighter one); the
outline and shadow are untouched, so it sits on paper and on charcoal
alike. `public/icon.png` is the full-size mark the app renders through
`BrandMark`; `icon-16`, `icon-32`, and `icon-180` are the browser tab and
home-screen icons. `docs/brand/sourcebook-icon.png` is the same file and
`sourcebook-icon-original.png` is the untouched blue original.

The mark and the name are optically aligned in `Brand.tsx`, not per call
site. The ribbon rises out of the top of the square, so the book itself sits
below the centre of the image; `BrandMark` nudges up by 6% of its own height
so the book's body, not the bounding box, lands on the row's centre line and
the ribbon clears the cap height. Newsreader keeps deep descender space and
"Sourcebook" has no descenders, so with a tight line-height the letters sit
above the centre of their box; `Wordmark` nudges down by 0.12em. Both are
transforms, so they follow `size` and the font size and leave layout alone.
The pairings in use: 28px beside the 21px wordmark in the sidebar and its
rail, 24px beside 19px in the phone top bar, and 36px beside 24px on the
sign-in page.

## The ruled page

The left half of the sign-in page is ruled paper, and its text is set on
the rules. The `ruled` utility draws one hairline every 24px from the top
of the section, 21px into each slot, so a line of 16px Plex on a 24px
line-height rests on it with its descenders just crossing. Everything in
that section runs on the same 24px grid: line-heights of 24 or 48, gaps and
top padding in multiples of 24, and a small `top` nudge on the wordmark row
and the headline so each face's baseline lands 2 to 4px above its rule. The
footer is pinned to the bottom; on desktop the bottom padding is 48px plus
`mod(100svh, 24px)`, the one value that is not a multiple of 24, so the
footer's slot still starts on the grid whatever the viewport height. The
page fits without scrolling from about 660px tall. If you change the pitch,
change the utility and the section's spacing together.
