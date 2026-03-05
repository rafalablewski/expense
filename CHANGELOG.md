# Changelog

All notable changes to MaszkaApp will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- Stats page filters: category groups (Spożywcze/Rachunki/Jednorazowe) and shop filter
- Manual expenses now included in all statistics calculations
- Project documentation (ARCHITECTURE.md, STYLING_GUIDE.md, TEMPLATE_LAYOUT.md, FIRESTORE_SCHEMA.md)
- CHANGELOG.md for tracking development progress

### Changed
- Full app refactor: decomposed monolithic App.jsx into modular component hierarchy
- Extracted all CSS from inline styles and template literals into proper .css files
- Moved hardcoded configuration (categories, stores, FX rates) to Firestore
- Centralized state management via React Context (AppDataContext, ConfigContext)
- Extracted 27 components into dedicated files with clear folder structure

### Fixed
- Stats page now includes manual expenses in totals, averages, and monthly chart
