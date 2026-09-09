<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
# Contributing

- [Contributing](#contributing)
  - [Bug reports](#bug-reports)
  - [Feature requests](#feature-requests)
  - [Pull requests](#pull-requests)
  - [Working on the theme at the same time](#working-on-the-theme-at-the-same-time)
  - [Development](#development)
  - [Security issues](#security-issues)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Contributing

Thanks for wanting to help. The most useful contribution is a bug report from someone whose sky or
calendar came out wrong, with enough detail to reproduce it.

### Bug reports

Open an issue with the Obsidian version, the plugin version, your operating system, and what the
window looked like when it went wrong. Say which theme you are on: this plugin draws over the
workspace, and a theme that moves the panes around moves what it draws with them. A screenshot is
worth more here than anywhere else — most of what can go wrong is visible and hard to describe.

For anything about size or placement, say what the pane measured and on what display. A calendar
that fits at 1440 points and not at 900 is a different bug from one that never fits.

### Feature requests

Open an issue describing what you want to see and where.

This plugin owns what CSS cannot do: a real starfield, a calendar that has to be measured before it
is drawn, and vault images resolved into CSS variables. Anything a stylesheet can do belongs in the
theme, and a request to move theme work in here will be turned down — the issue is still worth
opening, so the boundary is written down somewhere public.

### Pull requests

Pull requests are welcome. To save us both from wasted work:

- **Claim the issue first.** Comment on it and wait before writing code. A change nobody agreed on
  is the one most likely to be closed.
- **Keep it narrow.** One change per pull request. A refactor bundled with a fix hides the fix.
- **`mise run check` has to pass.** It is the whole set of gates, and the pre-push hook runs it
  anyway. When a gate fails, the fix goes in the thing being measured, not in the measure.
- **Say how you verified it in Obsidian.** Automated tests cannot tell you whether a pane really
  measures what jsdom says it does. Name the version you ran against, describe the window you had
  open, and attach a screenshot for anything visible.
- **A claim about performance is measured, not assumed.** The starfield moved from elements to a
  canvas because 754 CSS animations were counted, not guessed at. If you change how it draws, say
  what you measured and on what.
- **A string the user can read goes through the dictionaries.** `src/i18n/locales/en.ts` is the
  shape every other locale is checked against, and `mise run test:strings` fails on a key that
  nothing reads or that a locale has not caught up with.
- **A class the code writes is styled in `styles.css`.** `mise run test:styles` fails in both
  directions — a class nobody styles, and a rule left behind by a class nobody writes.
- **Conventional commits.** The commit-msg hook enforces them.
- **Do not commit `main.js`.** It is built from `src/` and ignored on purpose; the release workflow
  is what produces the copy people install.
- AI assistance is fine, and unread AI output is not. Read what you send.

### Working on the theme at the same time

The plugin and the [theme](https://github.com/theloop-am/obsidian-skywalker) meet at two CSS
variables and nothing else — `--loopsk-vault-logo` and `--loopsk-banner-logo`. Renaming one is a
change to both repositories, and neither half is any use with only one side done.

### Development

```bash
mise install && mise deps       # tools, then dependencies
mise run check                  # every gate
mise run fmt                    # apply what the formatters can fix
VAULT=/path/to/vault mise run dev
```

### Security issues

Do not open an issue. See [SECURITY.md](SECURITY.md).
