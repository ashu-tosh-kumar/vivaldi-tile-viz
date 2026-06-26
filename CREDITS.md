# Credits

We would like to thank the following tools, platforms, and collaborators for making this Vivaldi modification possible:

## Envisioning & Design

- **Visual Cues Concept**: Envisioned and structured using [Google AI Studio](https://aistudio.google.com/) to design high-contrast color palettes and contrast clash-detection behaviors.

## Development & Refinements

- **Initial Implementation**: Built by [Google Jules](https://jules.google/) to map Vivaldi's `vivExtData` parameters and build the initial DOM color mapping.
- **Enhancements & Maintenance**: Refined and tested via [Google Antigravity](https://antigravity.google/) and [Claude Code](https://claude.ai/code) inside [VS Code](https://code.visualstudio.com/), optimizing mutation observers, implementing cycle-safe color releases, and private window visual muting.

## Security & Quality Review

- **Security Audit**: Reviewed by [Qodo](https://qodo.ai/) (formerly Codium) in VS Code to identify and mitigate potential performance bottlenecks, event handler memory leaks, and DOM injection vectors.

## License

- **Open Source**: Distributed under the [MIT License](LICENSE).
