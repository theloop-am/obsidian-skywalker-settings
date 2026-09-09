# Security policy

## Supported versions

Fixes go into the next release. Older releases are not maintained separately.

## Reporting a vulnerability

Report it privately, through GitHub's private vulnerability reporting:
<https://github.com/theloop-am/obsidian-skywalker-settings/security/advisories/new>.

If that is unavailable to you, open an issue asking for a private channel and leave the details out
of it.

Include the plugin version, the Obsidian version, the platform, and how to reproduce it. A report is
reviewed before anything is disclosed publicly; when a fix is released, the advisory says who
reported it unless you would rather it did not.

## What this plugin can reach

It makes no network requests. It opens exactly the two files you choose in the logo settings, and
only to ask Obsidian for the address it serves them from; it reads nothing else in your vault.
Everything else it does is drawing: a canvas for the starfield, elements for the life calendar, and
two CSS variables on `body`.

Your settings, including the date of birth the calendar counts from, are stored in `data.json`
inside the plugin's folder. A stored file is read back as untrusted input — every value is checked
against the range or the list it belongs to before anything is drawn from it.

Released files carry build provenance, so a copy can be traced back to the workflow run that
produced it.
