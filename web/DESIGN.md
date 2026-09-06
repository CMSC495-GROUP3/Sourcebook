# Sourcebook design tokens

The values live in `src/index.css` inside the Tailwind `@theme` block. This
file explains them. Change the CSS, then update this page.

The direction is paper and ink. Warm off-white surfaces, near-black text, and
one plum accent that appears only on the brand mark, links, and the active row
in the sidebar. Status colors carry meaning and nothing else. The chat reads
like a Q&A column with footnote-style citations rather than chat bubbles,
because the citations are what the product is judged on.

## Layout

The app is an open book. The left page is the question and its answer; the
right page is the source. Everything else is arranged to keep those two side
by side.

**Shell.** A sidebar on the left holds the primary actions (new question,
Policy Library), projects, and recent questions. On desktop it collapses to a
60px icon rail rather than disappearing, so the actions stay one click away.
On phones it is a drawer over the page with a slim top bar to open it.

**Home.** Before the first question there is no chat. The page is a reference
desk: a headline, one large question box, four example questions in two
columns, and a strip stating how many policies are indexed with category
links into the library.

**Thread.** Once a question is asked, the column becomes a Q&A article:
question in the display face, answer as prose, then a footer with the match
meter, citation chips, follow-up chips on the last answer, and the quiet
escalation link. A compact composer for follow-ups sits at the bottom.

**Source pane.** Clicking a citation chip opens the cited document beside
the answer, showing the same indexed passages the library shows. It docks as
a 400px column from 1280px up and slides over the thread below that. Escape
closes it. Switching conversations closes it.

**Refusal.** A notice, not an answer. Ochre panel with a header row (label
and match meter), the refusal text, one line explaining that nothing indexed
came close enough, and two actions inside the panel: ask People Operations,
and see what is indexed.

**Library.** Master-detail from 1024px up: a 400px list column (search,
category filter, rows) beside a reading pane. Below that the list and the
reader take turns, with a back link. The URL carries `q`, `category`, and
`source`, so a citation can deep-link to an open document.

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
| `ink` | 24% 0.014 60 | #241E19 | text, primary buttons |
| `ink-2` | 47% 0.015 60 | #615953 | secondary text, meta |
| `ink-3` | 62% 0.013 60 | #8C847E | icons, placeholders, decoration |
| `accent` | 40% 0.10 330 | #653161 | brand mark, links, active nav icon |
| `accent-ink` | 33% 0.10 330 | #501E4D | link hover, active row text, button hover |
| `accent-soft` | 94.5% 0.025 330 | #F7E7F5 | active row, focus halo, selection |
| `accent-rule` | 86% 0.05 330 | #E5C6E1 | reserved for accent borders |
| `moss` | 50% 0.10 150 | #337344 | strong retrieval match, "sent" check |
| `ochre` | 62% 0.13 72 | #B6770B | partial match dot, refusal icon |
| `ochre-ink` | 45% 0.11 72 | #7A4F06 | refusal label text |
| `ochre-soft` | 96.5% 0.03 85 | #FDF2DD | refusal panel |
| `ochre-rule` | 84% 0.09 80 | #EAC586 | refusal panel border |
| `brick` | 52% 0.16 30 | #B2392B | weak match dot, error text |
| `brick-soft` | 95.5% 0.025 30 | #FFEAE6 | reserved for error panels |

Contrast on `paper`: `ink` 15:1, `ink-2` 6.4:1, `accent` 9:1, `moss` 5.2:1,
`brick` 5.4:1. `ink-3` is 3.3:1, so it is never used for body copy, only for
icons, placeholders, and labels that repeat information shown elsewhere.

Retrieval match thresholds: 70 and above is `moss`, 40 to 69 is `ochre`,
below 40 is `brick`. These mirror the constants in `ConfidenceBadge.tsx`.

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

An open book seen from above, with a reference dot where a footnote marker
sits. The favicon is `public/favicon.svg`; the React version in
`src/components/Layout/Brand.tsx` uses theme colors. Plum on paper by
default. For print or dark contexts, swap the fill for `ink` or draw the
glyph in `accent` on `paper-3`.
