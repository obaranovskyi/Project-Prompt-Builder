# Project-Prompt-Builder

A web-based tool for generating structured, detailed prompts for AI coding tools such as Cursor, Lovable, Bolt.new, and v0.dev.

Select your project type, language, framework, and target tool, then work through guided phases covering requirements, tech stack, design, database, authentication, integrations, infrastructure, and constraints. The builder assembles everything into a ready-to-paste prompt tailored to your chosen AI tool's expected format and depth.

## Features

- **Guided phase sections** — covers the full project lifecycle from requirements to deployment
- **Tech ecosystem picker** — suggests related libraries based on your chosen framework
- **Target tool awareness** — adjusts prompt depth and sections for Cursor, Lovable, Bolt.new, v0.dev, and others
- **Copy as Markdown or plain text** — one-click copy in either format
- **Save & browse prompts** — persist generated prompts locally and revisit them in the Browse tab

## Usage

Open `docs/index.html` in a browser (no build step required). Select a project type from the sidebar, fill in the phase sections, and click **Copy Markdown** or **Copy Text** to grab the generated prompt.

The `project-builder/prompt.md` file contains a standalone version of the interview prompt you can paste directly into any AI assistant to run the same guided interview conversationally.