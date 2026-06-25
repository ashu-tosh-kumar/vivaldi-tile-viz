# Security Policy

## Supported Versions

This mod only supports the latest active release version of the Vivaldi browser. As the mod relies directly on Vivaldi's internal UI structure and chrome APIs, updates are published directly to the main branch of this repository to maintain compatibility with new Vivaldi updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Security Hardening

Because Vivaldi mods execute within the browser's own UI context (`window.html` / `browser.html`), they run in a highly privileged environment. Therefore, this mod adheres to the strictest security standards to keep your browser safe:

- **Zero External Network Requests**: The mod does not make any external network calls (no `fetch`, `XMLHttpRequest`, or tracking pixels). It works entirely offline and locally on your machine.
- **Zero Dynamic Code Execution**: The codebase uses strictly static JavaScript. There is no usage of `eval()`, `new Function()`, `setTimeout(string)`, or `document.write()`.
- **Strictly Scoped Execution**: All script logic is wrapped in a strict-mode (`'use strict'`) Immediately Invoked Function Expression (IIFE). This ensures variables do not pollute the browser's global window scope or clash with other modifications.
- **Safe DOM Interactions**: The mod does not parse or insert unescaped HTML content. It uses safe DOM-manipulation techniques, such as class assignments (`classList.add` / `remove`) and CSS custom variables (`style.setProperty`) to apply styles dynamically.
- **No Page Content Access**: The mod only observes tab elements in the browser interface. It does not read, parse, or observe any data from the actual websites or page content loaded inside your tabs.

## Reporting a Vulnerability

If you discover a security vulnerability, please do not open a public issue. Instead, report it by opening a private draft security advisory in the GitHub repository or contact the project maintainer directly.
