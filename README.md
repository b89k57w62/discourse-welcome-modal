# Discourse Welcome Modal

A Discourse theme component that shows a promotional modal on every visit, linking to a topic or an external site.

## Overview

The modal appears on every page load, to signed-in users and anonymous visitors alike. It carries one or more cards, each with an image, a headline, a description and a prominent call-to-action button.

## Features

- **Shown every visit**: No seen-state is stored, so the modal is never suppressed by a previous visit
- **Anonymous visitors included**: Signing in is not required
- **Audience targeting**: Cards can be limited to new users, returning users, or shown to everyone
- **Customizable Cards**: Display custom content cards in either grid or list layout
- **Responsive Design**: Works across desktop and mobile devices

## How It Works

1. On every page load the component reads its settings and renders the cards that match the visitor.
2. Signed-in visitors are split into "new" and "returning" by comparing their registration date with `feature_enabled_date`.
3. Anonymous visitors match neither group, so they only see cards set to `both`.
4. Dismissing the modal hides it for the rest of that page load; the next visit shows it again.

## Configuration

### Settings

- `enabled`: Master switch for the component
- `feature_enabled_date`: Cut-off date (YYYY-MM-DD) that splits new users from returning users
- `card_layout`: Display cards in "grid" or "list" format
- `card_content`: Configure custom cards with content and actions

### Card actions

`action` accepts a Discourse route (`/t/12345`, `/categories`) or a full external URL (`https://example.com`). External links open in a new tab; only `http:` and `https:` are allowed.

### Customization

The modal title and close button text come from the theme's locale files (`locales/en.yml`, `locales/zh_CN.yml`) and can be overridden per site from the theme's translations panel.

### Admin preview

Append `?show-welcome-modal=true` to any URL to preview the modal even while the component is disabled, and `&user-type=new|returning` to preview a specific audience.

## Development

Visibility rules live in `javascripts/discourse/lib/welcome-modal-visibility.js` as pure functions, covered by unit tests:

```
npm install
npm test
```

## Installation

1. Add this theme component to your Discourse instance
2. Configure the settings in your admin panel
3. Customize the card content and layout as needed

**Author**: Noah Lovell
**Version**: 0.0.1
