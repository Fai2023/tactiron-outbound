# Tactiron Outbound Sales Automation — Operations & User Manual

Welcome to the **Tactiron Outbound Sales Automation** Operations Manual. This guide provides step-by-step instructions for Sales Development Reps (BDRs), Account Executives, Sales Operations Managers, and Compliance Officers to operate the outbound pipeline, discover target fleet leads, test AI classification rules, configure automated dispatch schedules, and inspect CRM handovers.

---

## Table of Contents
1. [System Access & Header Navigation](#1-system-access--header-navigation)
2. [Emergency Stop (Kill Switch)](#2-emergency-stop-kill-switch)
3. [Overview & KPIs Dashboard](#3-overview--kpis-dashboard)
4. [Apollo ICP Lead Discovery](#4-apollo-icp-lead-discovery)
   - [Selecting or Typing Search Criteria](#selecting-or-typing-search-criteria)
   - [Interpreting Discovery Results](#interpreting-discovery-results)
   - [One-Click Push to Campaign](#one-click-push-to-campaign)
   - [Exporting Results to CSV](#exporting-results-to-csv)
5. [Apollo CSV Batch Importer](#5-apollo-csv-batch-importer)
6. [Reply & Guardrail Testing Lab](#6-reply--guardrail-testing-lab)
   - [The 7 Guardrail Keywords](#the-7-guardrail-keywords)
   - [The 9 Reply Categories & SLAs](#the-9-reply-categories--slas)
   - [Simulating Prospect Replies](#simulating-prospect-replies)
7. [Automation Settings & Queue Runner](#7-automation-settings--queue-runner)
   - [Dispatch Schedule & Timezone Window](#dispatch-schedule--timezone-window)
   - [Campaign Cadence & Follow-up Delays](#campaign-cadence--follow-up-delays)
   - [Retry Backoff & Bounce Policy](#retry-backoff--bounce-policy)
   - [Live Worker Monitor & Manual Batch Trigger](#live-worker-monitor--manual-batch-trigger)
8. [Odoo CRM Handover Inspection](#8-odoo-crm-handover-inspection)
   - [The 6-Item Handover Pack](#the-6-item-handover-pack)
   - [Sales Rep Responsibilities & Deadlines](#sales-rep-responsibilities--deadlines)
9. [WhatsApp AI Integration (Odoo Native)](#9-whatsapp-ai-integration-odoo-native)
   - [How WhatsApp Inbound Works via Odoo Discuss](#how-whatsapp-inbound-works-via-odoo-discuss)
   - [Meta 24-Hour Conversation Window](#meta-24-hour-conversation-window)
   - [Automatic Email Sequence Suppression](#automatic-email-sequence-suppression)
   - [Using the WhatsApp AI Live Console Tab](#using-the-whatsapp-ai-live-console-tab)
10. [Compliance Router & Market Policies](#10-compliance-router--market-policies)
11. [Troubleshooting & FAQ](#11-troubleshooting--faq)

---

## 1. System Access & Header Navigation

The Operations Console is accessible via any web browser:
* **Local Console URL**: [http://localhost:3000/console](http://localhost:3000/console) (or [http://127.0.0.1:3000/console](http://127.0.0.1:3000/console))
* **Production Console URL**: `https://<your-company-domain>/console`

> [!NOTE]
> Do not navigate to `http://0.0.0.0:3000` in desktop browsers (Chrome, Edge, Safari); modern browsers do not route `0.0.0.0` as a destination address. Always use `localhost` or `127.0.0.1`.

### Console UI Design
The console uses an **Enterprise Modern Light** aesthetic — a clean, professional white and slate interface with no colored card backgrounds. Key design elements:
* **Typography**: Plus Jakarta Sans for UI text, JetBrains Mono for code and data values.
* **Cards**: Neutral white/slate — all status indicators use monochrome slate dots.
* **Notifications**: All system alerts appear as **floating toast notifications** in the bottom-right corner — there are no browser popup dialogs.
* **Sidebar Navigation**: Four grouped sections — *Pipeline*, *Operations*, *Integrations*, and *Settings*.

### Header Elements
* **Console Brand**: `Tactiron Outbound Ops Console`
* **System Status Indicator**:
  * <span style="color:#10b981;font-weight:bold;">● Active</span> — All automation pipelines, schedulers, and webhooks are operating normally.
  * <span style="color:#ef4444;font-weight:bold;">● ALL OUTBOUND FROZEN</span> — Emergency Kill Switch is engaged; outbound sending is completely suspended.
* **Review Mode Badge**: Displays the current human-in-the-loop oversight level (e.g., `Month 1: 100% Pre-Dispatch QA`).
* **Emergency Stop Button**: Top-right toggle button to immediately freeze outbound operations.

---

## 2. Emergency Stop (Kill Switch)

The system includes a fail-safe kill switch designed to protect domain reputation and legal compliance.

### Activating the Kill Switch
1. In the top-right header, click **Emergency Stop**.
2. The button will turn bright red with the label **OUTBOUND FROZEN**.
3. **What happens immediately:**
   * All outbound email dispatches are frozen across campaigns.
   * The automated `node-cron` queue runner halts batch sends.
   * Any attempt to push leads or dispatch emails returns `403 Forbidden`.
   * Inbound reply webhooks continue to process and log, ensuring no prospect responses are lost.

### Resuming Outbound Campaigns
1. Click **OUTBOUND FROZEN**.
2. Administrative bearer authorization is verified by the backend.
3. System status returns to **Active**, and queued batch dispatches resume according to their schedule.

---

## 3. Overview & KPIs Dashboard

The **Overview & KPIs** tab (`nav-dashboard`) provides high-level metrics on pipeline performance:

* **Leads Handed Over**: Total count of warm, qualified leads synchronized into Odoo CRM with complete 6-item packs.
* **Missed Escalations**: Operational counter tracking SLA violations. **Target is strictly 0**. Any value $>0$ triggers an incident review.
* **Outreach Permitted %**: Percentage of discovered leads that successfully passed through the deterministic Compliance Router.
* **Min Fleet Size Threshold**: The Excel qualification bar (default: **20+ employees/fleet vehicles**).

### SLA Response Targets Reference Table
| Priority | Trigger Category | SLA Response Target | Action Taken |
|---|---|---|---|
| **Urgent** | Demo / Meeting Requests | **< 1 Hour** | Sales rep contacts prospect; AI dispatches 1 holding reply |
| **Standard** | Pricing, Quotes, SLAs, Contracts, Resellers | **< 4 Hours** | Sales rep prepares custom commercial quote; AI barred from quoting prices |
| **Compliance** | Legal Threats, GDPR Erasure, Complaints | **< 1 Business Day** | Escalates directly to Compliance Officer; AI sends no sales outreach |

---

## 4. Apollo ICP Lead Discovery

The **Apollo Lead Discovery** tab (`nav-apollo`) queries Apollo.io for high-probability Push-to-Talk (PTT) accounts based on your Ideal Customer Profile (ICP).

> [!IMPORTANT]
> Discovered leads are **retained locally in the outbound sales engine** and are **not sent to Odoo CRM**. Because Apollo can return thousands of cold prospects regardless of compliance status, sending all cold leads to Odoo creates CRM bloat and inefficiency. Instead, leads are readily exportable via CSV or API, and are only pushed to Odoo CRM as warm handovers (`[AI Handover]`) when a prospect engages with positive interest.

### Selecting or Typing Search Criteria
The discovery form allows you to either check preset criteria or type custom values:

1. **Target Market / Country**:
   * **Presets**: Check boxes for *United Arab Emirates (GCC)*, *Saudi Arabia (GCC)*, *Kenya (East Africa)*, *Egypt*, *Qatar*, *Germany*, *United Kingdom*.
   * **Custom Typing**: In the text input below the checkboxes, type any country name (e.g. `Oman, Kuwait, South Africa, Nigeria`). Comma and newline separated.
2. **Industry**:
   * **Presets**: Check boxes for *Logistics & Transportation*, *Freight & Cargo*, *Security & Guarding*, *Courier & Delivery*, *Construction & Mining Fleet*.
   * **Custom Typing**: In the text input, type custom industry tags (e.g. `Aviation Ground Handling, Utilities, Field Services`).
3. **Target Roles / Positions**:
   * **Quick-Select Chips**: Click `+ Ops Director`, `+ Fleet Mgr`, `+ Dispatch Mgr`, `+ Logistics Head`, or `+ Transport Mgr` to instantly add them.
   * **Textarea**: Freely type, edit, or paste target titles (one per line).
4. **Fleet Size & Batch Size**:
   * Minimum fleet/employee threshold (default `20`).
   * Batch size per page (default `10`, max `50`).

Click **Discover & Pipeline from Apollo**.

---

### Interpreting Discovery Results
The returned table displays all coordinates and automatic compliance evaluations:

| Column | Description |
|---|---|
| **Company** | Organization legal name |
| **Job Role / Position** | Decision-maker title (e.g., *Operations & Fleet Director*) |
| **Name** | Full contact name |
| **Email** | Direct verified email address |
| **Phone Number** | Direct/mobile phone number of the prospect |
| **Company Phone** | Headquarters / dispatch line phone number |
| **Country** | Two-letter ISO country code (e.g., `AE`, `SA`, `KE`, `DE`) |
| **Industry** | Business sector classification |
| **Classification** | Dual badge: **Compliance Status** (`ALLOWED` or `BLOCKED` with reason code) + **Qualification Outcome** (`WARM QUALIFIED` or `PROSPECT`) |

---

### One-Click Push to Campaign
To queue discovered leads into the automated outreach cadence:
1. Select individual checkboxes on the left, or click **Select Eligible Only** to automatically check only compliant leads.
2. Click **Select All & Push to Campaign** (or **Push Selected (N) to Campaign**).
3. The system:
   * Validates each lead through the Compliance Router.
   * Prevents non-compliant leads (e.g. cold email in Germany) from being queued.
   * Updates contact status to `IN_CAMPAIGN`.
   * Enqueues the lead into the automated `DispatchQueue` for scheduled batch sending.
   * Updates the row badge in real time to **`IN CAMPAIGN (QUEUED)`**.

### Exporting Results to CSV
Click **Export to CSV** in the action bar to instantly download a timestamped CSV file (`apollo_leads_export_YYYY-MM-DD.csv`) containing all columns, phone numbers, and compliance ratings.

---

## 5. Apollo CSV Batch Importer

The **Apollo CSV Import** tab (`nav-csv-import`) allows you to import pre-exported lists from your Apollo seats:

1. In Apollo.io, export your saved lead list.
2. Open the CSV file, copy its text, and paste it into the **Paste Apollo Export CSV Text** box.
   *(Or click **Load Sample Apollo CSV** to see the expected structure).*
3. Click **Import & Process CSV**.
4. The system automatically:
   * Normalizes company domains and contact emails.
   * Strips duplicate records.
   * Evaluates jurisdiction compliance for each contact.
   * Displays an import summary report (total rows, new companies, eligible contacts, and blocked contacts).

---

## 6. Reply & Guardrail Testing Lab

The **Reply & Guardrail Lab** tab (`nav-simulator`) allows operators to test how prospect responses will be handled **before** activating live campaigns.

### The 7 Guardrail Keywords
The system executes a deterministic substring scan for:
`price`, `pricing`, `quote`, `contract`, `legal`, `gdpr`, `complaint`, `lawyer`

> [!IMPORTANT]
> If **any** of these keywords appear in a prospect reply, the system **immediately halts AI generation**, triggers human sales/compliance escalation, and drafts an approved holding message.

### The 9 Reply Categories & SLAs
1. **Type 1: Unsubscribe / Opt-out** — Immediate auto-suppression across all systems.
2. **Type 2: Out of Office / Referral** — Automatic acknowledgment, asks for referred colleague once.
3. **Type 3: Simple Factual Question** — Answers only from approved push-to-talk product knowledge base.
4. **Type 4: Demo / Meeting Request** — Highest-priority sales signal (<1h SLA handover).
5. **Type 5: Pricing / Commercial Terms** — Human sales takeover (<4h SLA). AI is strictly barred from quoting prices.
6. **Type 6: Partner / Reseller Inquiry** — Wholesale / distributor handover (<4h SLA).
7. **Type 7: Legal Threat / GDPR / Complaint** — Direct Compliance Officer escalation (<24h SLA).
8. **Type 8: C-Level / Buying Committee** — Multi-threaded account escalation (<4h SLA).
9. **Type 9: Low Confidence / Uncertain** — Failsafe fallback to human sales representative (<4h SLA).

### Simulating Prospect Replies
1. Click any of the **Preset Scenario Quick-Fill** buttons (e.g. *Demo Request*, *Pricing Keyword*, *Legal/GDPR*), or enter custom text.
2. Click **Execute Reply & Classification Test**.
3. Inspect the output panel on the right:
   * **Reply Category & SLA**: Identified category and exact response countdown.
   * **Guardrail Keyword Scan**: Shows matched keywords in red, or confirms clean pass.
   * **Approved Holding Reply**: Displays the pre-approved holding text dispatched to the prospect.
   * **Odoo Handover Pack Description**: Full markdown text generated for the sales rep in Odoo CRM.

---

## 7. Automation Settings & Queue Runner

The **Automation Settings** tab (`nav-automation`) configures the background `node-cron` queue runner.

### Live Worker Monitor Card
At the top of the settings page:
* **Window Status**: Displays whether the sending window is currently `OPEN` or `CLOSED` based on the local time in the selected timezone.
* **Today's Sent Cap**: Real-time counter of sent emails vs. daily limit (e.g., `1 / 50 Max`).
* **Queue Backlog**: Tracks `Pending` and `Retrying` jobs waiting for dispatch.
* **Runner Cadence**: Frequency of cron batch evaluations (e.g., `Every 15m`).
* **Trigger Batch Run Now**: Allows an operator to manually trigger an immediate queue run. Check **Bypass Window for Test** to test sending outside approved hours.

### Configuration Sections
* **Dispatch Schedule**:
  * **Sending Window Start & End**: Set active operating hours (e.g. `08:00` to `18:00`).
  * **Timezone**: Select target timezone (`Asia/Dubai`, `Asia/Riyadh`, `Africa/Nairobi`, `Europe/Berlin`, `UTC`).
  * **Send Days**: Check active weekdays (e.g. Mon–Fri).
  * **Max Emails Per Day**: Daily sending volume limit per account (default `50`).
* **Campaign Cadence & Follow-up**:
  * **Follow-up Delay**: Number of days to wait between sequence steps (default `3` days).
  * **Max Sequence Steps**: Total touchpoints before closing sequence (default `4` steps).
  * **Batch Interval**: Minutes between automated cron executions (default `15` min).
* **Retry & Error Handling**:
  * **Max Retries**: Retries before marking a job `FAILED` (default `3`).
  * **Retry Backoff**: Base delay in seconds with exponential increase (`60`s).
  * **On Bounce Action**: `Suppress Contact Immediately`, `Retry Once`, or `Flag for Review`.
* **Auto-Classification Thresholds**:
  * **AI Confidence Gate**: Confidence % required for autonomous replies (default `85%`).
  * **QA Review Mode**: `Month 1: 100% Pre-Dispatch QA`, `Month 2+: 20% Sample Review`, or `Autonomous`.

Click **Save Automation Settings** to apply changes to the live worker in real time.

---

## 8. Odoo CRM Handover Inspection

The **Odoo CRM Handovers** tab (`nav-handovers`) displays all warm prospects and commercial inquiries that have been synchronized to Odoo CRM (`crm.lead`).

### High-Signal Odoo Pipeline Architecture

To maximize CRM efficiency and prevent bloat from thousands of unverified or non-compliant Apollo contacts, **cold leads are not sent to Odoo CRM**. They remain stored locally in the outbound sales engine where they can be exported to CSV or queued into outreach campaigns.

Odoo CRM exclusively receives **Warm Handovers** (`[AI Handover]`) with priority set between `1` (Normal) and `3` (Urgent):

| Lead Type | System Location | Name Prefix | Priority | When Created |
|---|---|---|---|---|
| **Cold Sourced Lead** | Outbound Sales Engine (Exportable CSV) | — | — | On Apollo discovery or CSV import |
| **Warm Handover** | Odoo CRM (`crm.lead`) | `[AI Handover]` | `1`–`3` (High/Urgent) | When prospect replies warmly or books demo |

This keeps your sales team focused strictly on actionable, high-intent opportunities in Odoo CRM while maintaining complete exportability for cold leads.

### The 6-Item Handover Pack
Every handover synced to Odoo contains the complete 6-item pack inside the lead description:

1. **Full Message Thread**: Complete transcript of every outbound touchpoint and inbound prospect reply.
2. **Company & Role Details**: Company legal name, domain, country, fleet size, contact name, email, and job title.
3. **Channel Permissions & Lawful Basis**: Verification of lawful basis (Legitimate Interest / Prior Consent) with timestamp.
4. **Qualification Score & Rationale**: Breakdown of why the account qualified (Fleet Size $\ge 20$, target fleet role, intent signal).
5. **Suggested Next Step**: Contextual recommendation for the sales rep (e.g. *"Schedule 20-min PTT device demo for 45 vehicles; send calendar invite"*).
6. **Risk Flags**: Warnings for pricing discussions, competitive mentions, or strict local rules.

### Sales Rep Responsibilities
* **Urgent Handovers (Demo Requests)**: Rep must contact the prospect by phone or email within **1 hour**.
* **Standard Handovers (Pricing / Contract / Reseller)**: Rep must review custom pricing requirements and contact prospect within **4 hours**.
* **Compliance Handovers**: Reps do **not** contact prospect; Compliance Officer takes sole ownership.

---

## 9. WhatsApp AI Integration (Odoo Native)

The system features native integration with Odoo's WhatsApp module (`discuss.channel`) to intelligently manage prospect-initiated inbound chats.

### How WhatsApp Inbound Works via Odoo Discuss
1. When a prospect clicks our official WhatsApp link or messages our verified number, Odoo's WhatsApp connector creates a conversation channel (`discuss.channel`).
2. An automated Odoo server webhook posts the message to `/webhooks/odoo/whatsapp`.
3. The engine passes the message through the **exact same 7 safety guardrails** and **9 reply classification categories** used for email replies.
4. If approved, an instant conversational holding reply is dispatched via Odoo JSON-RPC back to Meta's Cloud API:
   > *"Thanks for reaching out! Our team will be with you shortly. 🙏"*
5. High-intent replies (Demo, Pricing, Reseller, Partner) create an immediate `crm.lead` in Odoo tagged with `[WHATSAPP]` and the appropriate SLA priority.

### Meta 24-Hour Conversation Window
Under Meta's WhatsApp Business Policy, a business has **24 hours** from the prospect's last message to respond freely without requiring approved template fees:
* The system tracks this window automatically (`withinMetaWindow: true`).
* If a conversation reaches $< 4$ hours before expiry, it flags an urgency alert (`metaWindowUrgent: true`) so sales reps can reply before the free window closes.

### Automatic Email Sequence Suppression
To avoid the awkward scenario where a prospect is actively chatting on WhatsApp while simultaneously receiving automated cold emails:
* As soon as a WhatsApp message is received, the prospect's phone number and email are flagged as **actively conversing on WhatsApp**.
* Any pending automated email touches scheduled in the Dispatch Queue for this contact are immediately marked as `SUPPRESSED`.
* Attempting to queue this contact into a new email sequence will block them with the reason `BLOCKED_ACTIVE_WHATSAPP_CONVERSATION`.

### Using the WhatsApp AI Live Console Tab
Navigate to **WhatsApp AI Live** (`nav-whatsapp`) in the Operations Console:
* **Interactive Simulator**: Test any simulated WhatsApp message (e.g. asking for pricing, requesting a live trial, or legal queries) to verify guardrails, holding replies, and CRM synchronization.
* **Live Inbound Feed**: View recent WhatsApp conversations, AI classification intents, sent holding responses, and 24h Meta window countdown timers.

---

## 10. Compliance Router & Market Policies

The **Compliance & Policy** tab (`nav-compliance`) details the deterministic rules applied to every contact:

* **United Arab Emirates (AE) & Saudi Arabia (SA)**:
  * Cold B2B email and LinkedIn outreach are permitted under commercial legitimate interest.
  * Outreach must include a clear, immediate one-click opt-out mechanism.
* **Kenya (KE) & Egypt (EG)**:
  * B2B commercial outreach permitted for enterprise fleet and logistics decision-makers.
* **Germany (DE)**:
  * **Cold B2B Email is Strictly Prohibited** (German Act Against Unfair Competition, UWG §7).
  * The Compliance Router automatically **blocks all cold emails** to German domains and routes outreach exclusively to **LinkedIn**.
* **United Kingdom (GB) & France (FR)**:
  * B2B email permitted under Legitimate Interest Assessment (LIA) with mandatory suppression check.
* **WhatsApp Outreach**:
  * **Zero Cold WhatsApp Sending**. Strictly requires prior documented opt-in or prospect initiation.

---

## 11. Troubleshooting & FAQ

#### Q: Why are my queued leads not sending immediately?
**A:** Check the **Live Worker Monitor Card** in the Automation Settings tab:
1. If the **Window Status** shows `CLOSED (Window Inactive)`, the current local time in the selected timezone is outside the configured `08:00 - 18:00` window or today is not a checked send day.
2. If the **Today's Sent Cap** shows `50 / 50 Max`, the daily allowance has been reached. It will reset when the date rolls over.
3. If you need to test immediately, click **Bypass Window for Test** and click **Trigger Batch Run Now**.

#### Q: What happens if a prospect replies asking for "pricing"?
**A:** The reply hits the `price`/`pricing` guardrail keyword. The AI is strictly barred from replying with numbers or quotes. It dispatches a pre-approved holding reply (*"I will connect you with our commercial team for customized fleet pricing"*), creates an Odoo lead with a `< 4 Hour` SLA deadline, and notifies the assigned sales representative.

#### Q: How does the system handle WhatsApp queries if someone asks for a demo?
**A:** The inbound WhatsApp message is classified as `DEMO_OR_MEETING_REQUEST`. The AI immediately sends a holding reply confirming our commercial team will contact them, opens an urgent lead in Odoo CRM (`priority: '3'`), sets a 1-hour SLA timer, and pauses all pending outbound emails to that prospect.

#### Q: How do I know if an email address is suppressed?
**A:** If a prospect unsubscribes or an email bounces, their contact status is permanently marked as `SUPPRESSED`. Any subsequent discovery, import, or campaign dispatch will automatically block outreach to that email address.

---

*Tactiron Outbound Sales Automation Engine &bull; Operations &amp; Engineering Team*
