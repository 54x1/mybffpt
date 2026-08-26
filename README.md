# myBudget Forecaster

**Finances Personally Tailored** — a free, open-source, privacy-first personal budget tracker that runs entirely in your browser.

[![Licence: AGPL v3](https://img.shields.io/badge/Licence-AGPL%20v3-blue.svg)](LICENSE)

Take control of your finances by importing your bank statements or adding transactions manually. There's no account, no server, and no tracking — your data stays on your device.

---

## ℹ️ About

myBudget Forecaster (`mybffpt`) is a client-side Vue 3 app for tracking, categorising, and forecasting personal spending. Import CSV statements from major Australian banks (or add transactions by hand), tag and categorise them, and explore your finances through interactive charts and forecasts.

## 🔒 Privacy First

All your data is stored privately and securely on your device (browser local storage) — nothing is uploaded to a server. See the in-app **About → Security & Privacy FAQ** for details on data handling, encrypted share codes, and tips for staying private while using the app.

## 🏦 Bank Support

Effortlessly import from major Australian banks:

- ✅ Westpac
- ✅ NAB
- ✅ ANZ
- ✅ CommBank
- ✅ St.George
- ✅ ING
- ✅ Macquarie
- ✅ Up Bank
- ✅ UBank
- 🧪 Wise Bank — Experimental

## ✨ Key Features

- 🏷️ **Improved Custom Categories and Tags** — Search and add your own transaction categories and tags
- 🎯 **Smart Bulk Operations** — Select and edit multiple transactions
- 📊 **Advanced Analytics** — Enhanced charts and filtering
- 🔄 **Auto-Categorization** — Smart category suggestions
- 📥 **CSV Import** — Supports the major Australian banks and more
- 💾 **Auto-Recall** — Seamlessly loads local data from your browser
- 📈 **Interactive Charts and Analytics**
- 🔄 **Recurring Transaction Support**
- 🔐 **Encrypted Share Codes** — Share or back up data with optional AES-256-GCM password protection
- 🎨 **Multi-Theme Support**
- 📱 **Mobile-Responsive Design**
- 📅 **Improved Date Selection**

## 🛠️ Technical Stack

- [Vue 3](https://vuejs.org/) with TypeScript
- [DaisyUI](https://daisyui.com/) (Tailwind CSS) for styling
- [Chart.js](https://www.chartjs.org/) / [D3](https://d3js.org/) for analytics
- [Vite](https://vite.dev/) for build tooling
- [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) for testing

## 🚀 Getting Started

Requires Node.js `>=24`.

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview
```

### Testing

```bash
# Type-check
npm run type-check

# Unit tests
npm run unit
npm run unit:coverage

# End-to-end tests
npm run test:e2e
```

## 🚀 Future Features
- Add local in memory/in browser PDF support
- Improve Wise Bank support
- Improve interactive bubble map chart type
- Select all / select on page

## ♿ Accessibility

mybffpt targets WCAG 2.1 AA. See [ACCESSIBILITY.md](ACCESSIBILITY.md) for what's covered, known limitations, and how to report an issue.

## 🧾 Licence

This program is free software, licensed under the **GNU Affero General Public License v3.0 or later** (AGPL-3.0-or-later). See [LICENSE](LICENSE) for the full text. It comes with ABSOLUTELY NO WARRANTY.

- You may use, study, modify, and redistribute this software under the terms of the AGPL-3.0.
- If you distribute this software (modified or not), you must make the complete corresponding source code available under the same licence.
- If you run a modified version of this software on a server and let users interact with it over a network, you must offer those users access to the modified source code (AGPL §13).

Corresponding source: <https://github.com/54x1/mybffpt>
