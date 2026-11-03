# **App Name**: SLink Messenger

## Core Features:

- User Authentication: Secure user registration, login, and profile management (email, @username, phone) with PIN-based account recovery.
- Individual & Group Chats: Private one-on-one conversations, group discussions and public channels.
- Secure Message Delivery: Messages are stored in Firestore with membership-based access rules.
- Media & Expression: Images, voice messages, stickers/GIF packs and polls inside chats.
- Stories: 24-hour stories from people you talk to.
- Customizable Appearance: Material 3 light/dark theme, persisted per device, plus ru/en localization.

## Style Guidelines (Material 3, standard — not expressive):

- Palette: SLink violet (`#6C5CFF`) as primary with a lavender primary container, link teal as secondary and signal coral as tertiary.
- Surfaces: Tonal elevation via `surface`, `surface-container-low/high`, `outline-variant` roles instead of heavy shadows.
- Shape: Generous Material 3 radii — 28px for cards and dialogs, 20px for chat bubbles, 16px for list rows, full pills for buttons and chips.
- Typography: Inter, tight display headings, 11px uppercase eyebrow labels, comfortable 14–15px message text.
- Icons: lucide line icons, monochrome, placed in tonal containers (primary/secondary/tertiary containers).
- Motion: Short, purposeful transitions (200–300 ms) for messages, sheets and state layers; no bouncy/expressive motion.
- Layout: Two-pane desktop shell (list + conversation) collapsing to a single mobile pane; generous spacing and 44px+ touch targets.
