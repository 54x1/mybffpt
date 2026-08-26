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
          </template>
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
            📥 <strong>CSV Import</strong> - Supports the 4 major Australian banks and more!
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
          <li>- Add local in memory in browser PDF support </li>
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
