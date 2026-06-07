# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-06-07

### Added
- Dependabot configuration added to monitor the `dev` branch for npm and GitHub Action dependency updates.
- PWA reload prompt UI that notifies users when a new version of the app is available.
- Service worker `skipWaiting` configuration to gracefully activate new updates.

### Changed
- Configured Vite PWA to use manual prompt update mode (`registerType: 'prompt'`) instead of auto update.
- Updated project requirements and Node `engines` configuration to target at least Node.js v24.

## [0.1.0] - 2026-06-07

### Added
- Number of drinks consumed added to the session summary in the History tab.
- Version number (0.1.0) added to the bottom of the ProfileSettings page.
- AI disclaimer added to the top of README.md.
- Workflow and changelog guidelines added to GEMINI.md.
