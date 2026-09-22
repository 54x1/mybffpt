<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <section :id="'panel-about'" role="tabpanel" :aria-labelledby="'tab-about'"
    class="card bg-base-100 shadow-xl max-w-4xl mx-auto mt-8" tabindex="0">
    <div class="card-body">
      <h2 id="aboutHeading" class="card-title text-2xl font-bold">
        ℹ️ About
      </h2>
      <div class="divider"></div>
      <div class="prose max-w-none space-y-4">
        <h1 class="text-3xl lg:text-4xl font-bold">
          myBudget Forecaster - {{ version }}
        </h1>
        <div class="divider"></div>
        <p class="lead">
          <strong>Finances Personally Tailored</strong><br />
          Take control of your finances by importing your bank statements or
          adding transactions manually.
        </p>

        <h2 class="pt-4 text-2xl font-bold">🔒 Privacy First</h2>
        <p>All your data is stored privately and securely on your device.</p>

        <div class="divider"></div>

        <h2 class="text-2xl font-bold">🔐 Security</h2>
        <p>
          <template v-if="securityAvailable">
            <span v-if="passwordProtectionEnabled">
              Your data is <strong>encrypted</strong> on this device with a master
              password.
            </span>
            <span v-else>
              Your data is stored in <strong>plaintext</strong> on this device.
            </span>
          </template>
          <span v-else>
            Password protection isn't available in this browser context (a secure
            connection is required).
          </span>
        </p>

        <p v-if="securityAvailable" class="text-sm opacity-70">
          Manage password protection and auto-unlock from the
          <strong>⚙️ Settings</strong> menu in the top-right corner.
          <template v-if="passwordProtectionEnabled">
            Auto-unlock is currently set to
            <strong>{{
              stayUnlockedMode === 'session' ? 'this session/tab'
                : stayUnlockedMode === 'device' ? 'this device'
                  : 'ask every time'
            }}</strong>.
            <template v-if="stayUnlockedMode === 'session'">
              (Cleared when you close this tab, or after 5 minutes of inactivity.)
            </template>
            <template v-else-if="stayUnlockedMode === 'device'">
              (Persists until you turn it off. Stores your decryption key in
              plaintext in this browser.)
            </template>
            <template v-else>
              (Locks after 5 minutes of inactivity.)
            </template>
          </template>
        </p>

        <div class="divider"></div>

        <h2 class="text-2xl font-bold">🛡️ Complete Transparency</h2>
      
        <strong>Why it's safe to read your statements from myBFFPT — myBudget Forecaster?</strong>
        <ul class="list-disc pl-5 space-y-2">
          <li>
            <strong>There is no server.</strong> No backend, no account, no
            database. The app is a set of static files that run in your
            browser — there is literally nowhere for your data to be sent.
          </li>
          <li>
            <strong>The browser enforces it.</strong> A Content-Security-Policy
            of <code>default-src 'self'</code> (view this page's source) forbids
            the app from contacting any other website. Even a bug or a
            compromised dependency could not post your data anywhere — the
            browser blocks it. Open DevTools → Network while importing a
            statement: after the page has loaded you'll see zero requests.
          </li>
          <li>
            <strong>Imports are local by construction.</strong> CSV parsing,
            PDF text extraction and OCR all run on your device. The file picker
            hands the bytes straight to our parsers — no upload code exists in
            this app.
          </li>
          <li>
            <strong>The crypto is real, not homebrew.</strong> Optional
            encryption at rest uses AES-256-GCM with a PBKDF2-SHA256 key
            (600,000 iterations) via the browser's built-in Web Crypto API —
            standard, widely audited primitives.
          </li>
          <li>
            <strong>Auditable end-to-end.</strong> AGPL-3.0 open source with a
            published CycloneDX SBOM and full third-party licence notices, so
            anyone can check exactly what ships and how your data is handled
            (links at the bottom of this page).
          </li>
        </ul>

        <div class="divider"></div>

        <h2 class="text-2xl font-bold">📦 What our libraries do</h2>
        <p>
          These are the app's only runtime dependencies — what each one does,
          and whether it can talk to the network:
        </p>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <caption class="sr-only">
              Runtime libraries, their purpose, and their network access
            </caption>
            <thead>
              <tr>
                <th>Library</th>
                <th>What it does here</th>
                <th>Network access</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-semibold">Vue 3</td>
                <td>Renders the interface and keeps your data in memory while you use the app.</td>
                <td>None</td>
              </tr>
              <tr>
                <td class="font-semibold">DaisyUI / Tailwind CSS</td>
                <td>Styles everything. Compiled into our own stylesheet at build time — no CDN themes or fonts.</td>
                <td>None</td>
              </tr>
              <tr>
                <td class="font-semibold">Chart.js / vue-chartjs</td>
                <td>Draws your charts from the transactions already on this device.</td>
                <td>None</td>
              </tr>
              <tr>
                <td class="font-semibold">D3</td>
                <td>Data layouts and scales for specialised visuals (e.g. the bubble map).</td>
                <td>None</td>
              </tr>
              <tr>
                <td class="font-semibold">pdf.js (Mozilla)</td>
                <td>Parses PDF bank statements — including password-protected ones — inside your browser. Its worker runs from this site's own files.</td>
                <td>None — document bytes never leave the tab</td>
              </tr>
              <tr>
                <td class="font-semibold">Tesseract.js + English model</td>
                <td>Reads scanned (image-only) PDFs with OCR. The WASM engine and language model are self-hosted on this site, not fetched from a CDN.</td>
                <td>None — page images stay in memory on your device</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-sm opacity-70">
          Nothing else runs at runtime. Every dependency is licence-checked and
          listed in the SBOM and third-party notices linked below.
        </p>

        <div class="divider"></div>

        <h2 class="text-2xl font-bold">❓ Security &amp; Privacy FAQ</h2>

        <div class="space-y-2">
          <div class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" aria-labelledby="faqSecure" />
            <div id="faqSecure" class="collapse-title font-semibold">Is this app secure?</div>
            <div class="collapse-content text-sm">
              <p>
                myBudget Forecaster runs entirely in your browser. There is no
                backend server and no account to sign up for, so there's no
                central database of user data that could be breached. Your
                transactions, categories, and settings are kept in your
                browser's local storage on your own device and never leave it
                unless you explicitly export or share them.
              </p>
            </div>
          </div>

          <div class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" aria-labelledby="faqSendData" />
            <div id="faqSendData" class="collapse-title font-semibold">
              Does the app send my financial data anywhere?
            </div>
            <div class="collapse-content text-sm">
              <p>
                No. CSV imports, categorisation, and analytics all happen
                locally in your browser - your bank statements are never
                uploaded anywhere. The only time data moves is when
                <strong>you</strong> choose to export a file or generate a
                share code, and even then it's your device creating that data,
                not a server.
              </p>
            </div>
          </div>

          <div class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" aria-labelledby="faqOcr" />
            <div id="faqOcr" class="collapse-title font-semibold">
              You can OCR scanned PDFs — do those page images leave my device?
            </div>
            <div class="collapse-content text-sm">
              <p>
                No. Scanned pages are rendered to canvases and recognized by
                tesseract.js, an open-source OCR engine compiled to WebAssembly
                that runs entirely in your browser. The WASM runtime and English
                language model are served from this app's own origin (never a
                CDN), so the Content-Security-Policy still blocks every outside
                connection. A scanned statement imports with exactly the same
                guarantees as a text one — and you always confirm the parsed
                rows in the column mapper before anything is saved.
              </p>
            </div>
          </div>

          <div class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" aria-labelledby="faqSharing" />
            <div id="faqSharing" class="collapse-title font-semibold">
              How does sharing/exporting data work?
            </div>
            <div class="collapse-content text-sm">
              <p>
                Share codes can be optionally encrypted with a password you
                choose, using AES-256-GCM with a PBKDF2-derived key
                (600,000 iterations). The encryption happens on your device
                using the browser's built-in Web Crypto API - your password is
                never transmitted or stored anywhere. Only share codes or
                exported files with people you trust, since anyone with the
                code (and password, if set) can read the data.
              </p>
            </div>
          </div>

          <div class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" aria-labelledby="faqDataCollection" />
            <div id="faqDataCollection" class="collapse-title font-semibold">
              What data does the app collect about me?
            </div>
            <div class="collapse-content text-sm">
              <p>
                None. There's no analytics, tracking, or telemetry built into
                the app. It doesn't know who you are or what you do with it -
                everything stays on your device.
              </p>
            </div>
          </div>

          <div class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" aria-labelledby="faqPrivacyTips" />
            <div id="faqPrivacyTips" class="collapse-title font-semibold">
              How can I improve my personal privacy while using the app?
            </div>
            <div class="collapse-content text-sm">
              <ul class="list-disc pl-5 space-y-1">
                <li>
                  Use a password on any share code that contains real
                  transactions, and share the password through a different
                  channel to the code itself.
                </li>
                <li>
                  Avoid pasting share codes or exported files into public
                  places (chats, forums, tickets) - treat them like the bank
                  data they represent.
                </li>
                <li>
                  Since data lives in browser local storage, anyone with
                  access to your device/browser profile can see it - use a
                  device passcode, screen lock, or a separate browser profile
                  if you share the device with others.
                </li>
                <li>
                  Clearing your browser's site data for this app will
                  permanently delete your stored transactions, so export a
                  backup first if you want to keep them.
                </li>
                <li>
                  Because everything runs locally, using this app offline
                  (after the first load) keeps your data from ever touching
                  the network at all.
                </li>
              </ul>
            </div>
          </div>

          <div class="collapse collapse-arrow bg-base-200">
            <input type="checkbox" aria-labelledby="faqAuditable" />
            <div id="faqAuditable" class="collapse-title font-semibold">
              Is the code auditable?
            </div>
            <div class="collapse-content text-sm">
              <p>
                Yes. The app is free and open-source software (AGPL-3.0-or-later),
                so you can read exactly how your data is handled - see the
                <a class="link" href="https://github.com/54x1/mybffpt" target="_blank" rel="noopener noreferrer">source
                  code</a>.
              </p>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Show this CTA only if there are no transactions -->
        <div v-if="!hasTransactions" class="text-center mt-8">
          <button type="button" class="btn btn-primary btn-wide btn-lg" @click="$emit('start-tour')">
            Get Started Now
          </button>
        </div>

        <div v-if="!hasTransactions" class="divider"></div>

        <h2 class="text-2xl font-bold">🏦 Bank Support</h2>
        <p>Effortlessly import from major Australian banks:</p>

        <div class="grid grid-cols-1 gap-2">
          <span>✅ Westpac</span>
          <span>✅ NAB</span>
          <span>✅ ANZ</span>
          <span>✅ CommBank</span>
          <span>✅ St.George</span>
          <span>✅ ING</span>
          <span>✅ Macquarie</span>
          <span>✅ Up Bank</span>
          <span>✅ UBank</span>
          <span>🧪 Wise Bank - Experimental</span>
        </div>

        <div class="divider"></div>

        <h2 class="text-2xl font-bold">✨ Key Features</h2>

        <ul class="space-y-2">
          <li>
            🏷️ <strong>Improved Custom Categories and Tags</strong> - Search and
            add your own transaction categories and tags
          </li>
          <li>
            🎯 <strong>Smart Bulk Operations</strong> - Select and edit multiple
            transactions
          </li>
          <li>
            📊 <strong>Advanced Analytics</strong> - Enhanced charts and filtering
          </li>
          <li>
            🔄 <strong>Auto-Categorization</strong> - Smart category suggestions
          </li>
          <li>
            📥 <strong>CSV &amp; PDF Import</strong> - Major Australian banks,
            text PDFs, and in-browser OCR for scanned statements!
          </li>
          <li>
            💾 <strong>Auto-Recall</strong> - Seamlessly loads local data from
            your browser
          </li>
          <li>📈 <strong>Interactive Charts and Analytics</strong></li>
          <li>🔄 <strong>Recurring Transaction Support</strong></li>
          <li>🎨 <strong>Multi-Theme Support</strong></li>
          <li>📱 <strong>Mobile-Responsive Design-ish</strong></li>
          <li>📅 <strong>Improved Date Selection</strong></li>
        </ul>

        <div class="divider"></div>

        <h2 class="text-2xl font-bold">🚀 Future Features</h2>

        <ul class="space-y-2">
          <li>- Improve OCR accuracy across more bank statement layouts</li>
          <li>- Improve Wise Bank support</li>
          <li>- Improve interactive bubble map chart type</li>
          <li>- Improve select on page priority top </li>
        </ul>

        <div class="divider"></div>

        <h2 class="text-2xl font-bold">🛠️ Technical Stack</h2>

        <ul class="space-y-2">
          <li>Vue 3 with TypeScript</li>
          <li>DaisyUI for styling</li>
          <li>Chart.js for analytics</li>
          <li>pdf.js + tesseract.js for fully-local PDF &amp; OCR parsing</li>
        </ul>

        <div class="divider"></div>

        <h2 class="text-2xl font-bold">🧾 Licence</h2>

        <p>
          This program is free software, licensed under the
          <strong>GNU Affero General Public License v3.0 or later</strong>
          (AGPL-3.0-or-later). It comes with ABSOLUTELY NO WARRANTY.
        </p>
        <ul class="space-y-2">
          <li>
            You may use, study, modify, and redistribute this software under the
            terms of the AGPL-3.0.
          </li>
          <li>
            If you distribute this software, or run a modified version for users
            over a network, you must make the complete corresponding source code
            available under the same licence (AGPL §13).
          </li>
        </ul>
        <p>
          Source code:
          <a class="link link-primary" href="https://github.com/54x1/mybffpt" target="_blank" rel="noopener noreferrer">
            github.com/54x1/mybffpt
          </a>
          ·
          <a class="link" href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer">
            Full licence text
          </a>
          ·
          <a class="link" href="/THIRD_PARTY_LICENSES.txt" target="_blank" rel="noopener noreferrer">
            Third-party notices
          </a>
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    version: string;
    hasTransactions: boolean;
    /** M1: Web Crypto available (password protection can be offered). */
    securityAvailable?: boolean;
    /** M1: password protection currently on (master password set). */
    passwordProtectionEnabled?: boolean;
    /** Stay-unlocked mode (only meaningful when protection is on). */
    stayUnlockedMode?: "off" | "session" | "device";
  }>(),
  {
    securityAvailable: false,
    passwordProtectionEnabled: false,
    stayUnlockedMode: "off",
  }
);

defineEmits<{
  (e: "start-tour"): void;
}>();
</script>
