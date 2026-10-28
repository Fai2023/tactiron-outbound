/**
 * Operations & Technical Console UI
 * Enhanced Enterprise Modern Light Aesthetic (Linear / Stripe style)
 * Clean monochrome palette, zero green card highlights, unified text colors throughout.
 * Served at /console
 */

export function getConsoleHtml(): string {
  return `<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-50">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tactiron Operations Console</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          boxShadow: {
            'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
            'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
            'subtle': '0 0 0 1px rgba(0, 0, 0, 0.05)',
          }
        }
      }
    }
  </script>

  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      letter-spacing: -0.011em;
      color: #0f172a; /* Unified primary text color slate-900 */
    }
    code, pre { font-family: 'JetBrains Mono', monospace; }

    /* Custom sleek scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    /* Micro-interactions */
    .btn-press {
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-press:active {
      transform: scale(0.98);
    }

    /* Toast animation */
    @keyframes toastSlideIn {
      from {
        transform: translateY(1rem) scale(0.96);
        opacity: 0;
      }
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
    .toast-animate-in {
      animation: toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-slate-200 selection:text-slate-900">

  <!-- ================= TOP NAVIGATION BAR (Linear / Stripe Clean Enterprise) ================= -->
  <header class="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
    <div class="flex items-center space-x-4">
      <!-- Brand Icon -->
      <div class="relative flex items-center justify-center">
        <div class="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm ring-1 ring-black/10">
          <i class="fa-solid fa-tower-broadcast text-sm text-slate-200"></i>
        </div>
        <span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-slate-600 rounded-full ring-2 ring-white"></span>
      </div>

      <div>
        <div class="flex items-center space-x-2.5">
          <span class="font-extrabold text-base text-slate-900 tracking-tight">Tactiron Outbound Ops Console</span>
          <span class="text-slate-300">/</span>
          <span id="systemStatusBadge" class="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-900 font-semibold flex items-center gap-1.5 transition-all">
            <span class="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse"></span>
            <span>Active</span>
          </span>
        </div>
        <div class="text-[11px] text-slate-500 font-medium">Headless AI Sales &amp; Dispatch Automation</div>
      </div>
    </div>

    <!-- Review Mode & Emergency Controls -->
    <div class="flex items-center space-x-3">
      <div class="hidden sm:flex items-center space-x-2 bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-lg text-xs shadow-xs">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        <span class="text-slate-500 font-medium">Safety Gate:</span>
        <span class="font-semibold text-slate-900">Month 1 (100% Pre-Dispatch QA)</span>
      </div>

      <button id="killSwitchBtn" onclick="toggleKillSwitch()" class="btn-press px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 bg-white text-slate-900 border border-slate-300 hover:bg-slate-100 shadow-xs cursor-pointer">
        <i class="fa-solid fa-power-off text-xs text-slate-700"></i>
        <span id="killSwitchText">Emergency Stop</span>
      </button>
    </div>
  </header>

  <!-- ================= MAIN CONTAINER ================= -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Clean Sidebar Navigation -->
    <aside class="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-3.5 select-none shadow-xs">
      <div class="space-y-4">
        <!-- Section: Overview -->
        <div>
          <div class="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telemetry</div>
          <nav class="space-y-0.5">
            <button onclick="switchTab('dashboard')" id="nav-dashboard" class="tab-btn w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-slate-900 bg-slate-100/90 border border-slate-200/80 shadow-xs">
              <i class="fa-solid fa-chart-pie w-4 text-slate-700 text-center"></i>
              <span>Overview &amp; KPIs</span>
            </button>
          </nav>
        </div>

        <!-- Section: Lead Engine -->
        <div>
          <div class="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prospect Discovery</div>
          <nav class="space-y-0.5">
            <button onclick="switchTab('apollo')" id="nav-apollo" class="tab-btn w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-slate-600 hover:text-slate-900 hover:bg-slate-50">
              <i class="fa-solid fa-magnifying-glass w-4 text-slate-400 text-center"></i>
              <span>Apollo Lead Discovery</span>
            </button>

            <button onclick="switchTab('csv-import')" id="nav-csv-import" class="tab-btn w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-slate-600 hover:text-slate-900 hover:bg-slate-50">
              <i class="fa-solid fa-file-csv w-4 text-slate-400 text-center"></i>
              <span>Apollo CSV Import</span>
            </button>
          </nav>
        </div>

        <!-- Section: AI Intelligence & Lab -->
        <div>
          <div class="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Guardrails &amp; Channels</div>
          <nav class="space-y-0.5">
            <button onclick="switchTab('simulator')" id="nav-simulator" class="tab-btn w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-slate-600 hover:text-slate-900 hover:bg-slate-50">
              <i class="fa-solid fa-vial-circle-check w-4 text-slate-400 text-center"></i>
              <span>Reply &amp; Guardrail Lab</span>
            </button>

            <button onclick="switchTab('whatsapp')" id="nav-whatsapp" class="tab-btn w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-slate-600 hover:text-slate-900 hover:bg-slate-50">
              <i class="fa-brands fa-whatsapp w-4 text-slate-500 text-center"></i>
              <span class="flex-1 text-left">WhatsApp AI Live</span>
              <span class="text-[9px] bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.2 rounded font-bold">24H</span>
            </button>
          </nav>
        </div>

        <!-- Section: Infrastructure -->
        <div>
          <div class="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engine &amp; CRM</div>
          <nav class="space-y-0.5">
            <button onclick="switchTab('automation')" id="nav-automation" class="tab-btn w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-slate-600 hover:text-slate-900 hover:bg-slate-50">
              <i class="fa-solid fa-gears w-4 text-slate-400 text-center"></i>
              <span>Automation Settings</span>
            </button>

            <button onclick="switchTab('handovers')" id="nav-handovers" class="tab-btn w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-slate-600 hover:text-slate-900 hover:bg-slate-50">
              <i class="fa-solid fa-address-book w-4 text-slate-400 text-center"></i>
              <span>Odoo CRM Handovers</span>
            </button>

            <button onclick="switchTab('compliance')" id="nav-compliance" class="tab-btn w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition text-slate-600 hover:text-slate-900 hover:bg-slate-50">
              <i class="fa-solid fa-scale-balanced w-4 text-slate-400 text-center"></i>
              <span>Compliance &amp; Policy</span>
            </button>
          </nav>
        </div>
      </div>

      <!-- Live Integration Ping Card (Clean Neutral) -->
      <div class="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 text-xs space-y-2 shadow-xs">
        <div class="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Connected Systems</span>
          <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        </div>
        <div class="space-y-1.5 text-[11px]">
          <div class="flex items-center justify-between text-slate-700">
            <span class="flex items-center gap-1.5"><i class="fa-solid fa-database text-[10px] text-slate-400"></i> Odoo CRM:</span>
            <span class="text-slate-900 font-semibold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-slate-600"></span> Connected</span>
          </div>
          <div class="flex items-center justify-between text-slate-700">
            <span class="flex items-center gap-1.5"><i class="fa-solid fa-envelope text-[10px] text-slate-400"></i> Smartlead:</span>
            <span class="text-slate-900 font-semibold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-slate-600"></span> Ready</span>
          </div>
          <div class="flex items-center justify-between text-slate-700">
            <span class="flex items-center gap-1.5"><i class="fa-brands fa-whatsapp text-[10px] text-slate-400"></i> WhatsApp:</span>
            <span class="text-slate-900 font-semibold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-slate-600"></span> Native Active</span>
          </div>
          <div class="flex items-center justify-between text-slate-700 border-t border-slate-200/60 pt-1.5">
            <span class="flex items-center gap-1.5"><i class="fa-solid fa-brain text-[10px] text-slate-400"></i> Classifier:</span>
            <span class="text-slate-900 font-semibold font-mono text-[10px]">Claude 3.5</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- ================= MAIN WORKSPACE ================= -->
    <main class="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/70">

      <!-- ================= TAB 1: OVERVIEW & KPIS ================= -->
      <section id="tab-dashboard" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4">
          <div>
            <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">System Performance &amp; Operational Health</h2>
            <p class="text-xs text-slate-500 mt-0.5">Pipeline throughput, compliance enforcement, and human handover response targets.</p>
          </div>
          <button onclick="loadKpis()" class="btn-press self-start sm:self-auto px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 shadow-xs flex items-center gap-1.5">
            <i class="fa-solid fa-rotate-right text-xs text-slate-400"></i>
            <span>Refresh Telemetry</span>
          </button>
        </div>

        <!-- Metric Cards Grid (Zero green card highlights, clean unified monochrome) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Card 1 -->
          <div class="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all">
            <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Leads Handed Over</span>
              <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <i class="fa-solid fa-handshake text-xs"></i>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span id="metric-handovers" class="text-3xl font-extrabold text-slate-900 tracking-tight">0</span>
              <span class="text-xs text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold">To Sales Reps</span>
            </div>
            <p class="mt-2 text-xs text-slate-500 leading-relaxed">Synced to Odoo CRM with full 6-item pack</p>
          </div>

          <!-- Card 2 -->
          <div class="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all">
            <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Missed Escalations</span>
              <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <i class="fa-solid fa-circle-check text-xs"></i>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span id="metric-missed" class="text-3xl font-extrabold text-slate-900 tracking-tight">0</span>
              <span class="text-xs text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold">On Target (0)</span>
            </div>
            <p class="mt-2 text-xs text-slate-500 leading-relaxed">Zero missed SLA triggers across all channels</p>
          </div>

          <!-- Card 3 -->
          <div class="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all">
            <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Outreach Permitted</span>
              <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <i class="fa-solid fa-shield-halved text-xs"></i>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span id="metric-permitted" class="text-3xl font-extrabold text-slate-900 tracking-tight">100%</span>
              <span class="text-xs text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold">Passed Gates</span>
            </div>
            <p class="mt-2 text-xs text-slate-500 leading-relaxed">Verified lawful basis &amp; zero suppression conflicts</p>
          </div>

          <!-- Card 4 -->
          <div class="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all">
            <div class="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Min Fleet Size</span>
              <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <i class="fa-solid fa-truck-front text-xs"></i>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span id="metric-teamsize" class="text-3xl font-extrabold text-slate-900 tracking-tight">20+</span>
              <span class="text-xs text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold">Vehicles / Staff</span>
            </div>
            <p class="mt-2 text-xs text-slate-500 leading-relaxed">Operational qualification threshold enforced</p>
          </div>
        </div>

        <!-- SLA Response Targets Table (Clean Neutral Cards) -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-card">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <i class="fa-regular fa-clock text-slate-400 text-sm"></i> Response Target SLAs (AI-to-Human Handover Rules)
            </h3>
            <span class="text-[11px] text-slate-500 font-medium">From approved handover protocol</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div class="border border-slate-200 bg-slate-50/50 p-4 rounded-xl space-y-2 shadow-xs">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Urgent Priority
                </span>
                <span class="text-xs bg-slate-200/70 text-slate-900 px-2.5 py-0.5 rounded-full border border-slate-300 font-bold">&lt; 1 Hour</span>
              </div>
              <h4 class="font-bold text-slate-900 text-sm">Demo / Meeting Requests</h4>
              <p class="text-xs text-slate-600 leading-relaxed">Highest-priority buying signal. Sales rep contacts within 1 hour; AI dispatches one verified holding reply.</p>
            </div>

            <div class="border border-slate-200 bg-slate-50/50 p-4 rounded-xl space-y-2 shadow-xs">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Standard Priority
                </span>
                <span class="text-xs bg-slate-200/70 text-slate-900 px-2.5 py-0.5 rounded-full border border-slate-300 font-bold">&lt; 4 Hours</span>
              </div>
              <h4 class="font-bold text-slate-900 text-sm">Pricing, Contracts, SLAs &amp; Partners</h4>
              <p class="text-xs text-slate-600 leading-relaxed">AI is strictly barred from quoting prices. AI dispatches holding message; sales rep prepares custom quotation.</p>
            </div>

            <div class="border border-slate-200 bg-slate-50/50 p-4 rounded-xl space-y-2 shadow-xs">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Compliance Route
                </span>
                <span class="text-xs bg-slate-200/70 text-slate-900 px-2.5 py-0.5 rounded-full border border-slate-300 font-bold">&lt; 1 Business Day</span>
              </div>
              <h4 class="font-bold text-slate-900 text-sm">Legal Threats, GDPR &amp; Complaints</h4>
              <p class="text-xs text-slate-600 leading-relaxed">Direct escalation to Compliance Officer (not sales). AI sends no sales outreach and suppresses email.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= TAB 2: APOLLO LEAD DISCOVERY ================= -->
      <section id="tab-apollo" class="space-y-6 hidden">
        <div class="border-b border-slate-200/80 pb-4">
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Apollo ICP Lead Discovery</h2>
          <p class="text-xs text-slate-500 mt-0.5">Filter and search Apollo.io by target market, industry, and role with verified phone numbers, company dispatch lines, and compliance routing.</p>
        </div>

        <!-- Filter Form -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-5 shadow-card">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <!-- 1. Target Markets / Countries (Select or Type) -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">1. Target Market / Country</label>
                <span class="text-[10px] text-slate-400 font-medium">Select or Type</span>
              </div>
              <div class="space-y-1.5 text-xs text-slate-700 bg-slate-50/80 border border-slate-200 rounded-lg p-3 max-h-44 overflow-y-auto">
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="country" value="United Arab Emirates" checked class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>United Arab Emirates (GCC)</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="country" value="Saudi Arabia" checked class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>Saudi Arabia (GCC)</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="country" value="Kenya" checked class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>Kenya (East Africa)</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="country" value="Egypt" class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>Egypt (North Africa)</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="country" value="Qatar" class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>Qatar (GCC)</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="country" value="Germany" class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>Germany (Strict Opt-In Test)</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="country" value="United Kingdom" class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>United Kingdom (Europe)</span>
                </label>
              </div>
              <input type="text" id="apolloCustomMarkets" placeholder="Type custom countries (e.g. Oman, Kuwait, South Africa)..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none transition">
            </div>

            <!-- 2. Target Industry (Select or Type) -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">2. Industry</label>
                <span class="text-[10px] text-slate-400 font-medium">Select or Type</span>
              </div>
              <div class="space-y-1.5 text-xs text-slate-700 bg-slate-50/80 border border-slate-200 rounded-lg p-3 max-h-44 overflow-y-auto">
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="industry" value="Logistics and Transportation" checked class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>Logistics &amp; Transportation</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="industry" value="Freight & Cargo" checked class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>Freight &amp; Cargo Services</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="industry" value="Security & Guarding" class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>Security &amp; Guarding Fleet</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="industry" value="Courier & Delivery" class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>Courier &amp; Last-Mile Delivery</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="industry" value="Construction & Mining" class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>Construction &amp; Mining Fleet</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer hover:text-slate-900">
                  <input type="checkbox" name="industry" value="Transportation" class="rounded border-slate-300 text-slate-900 focus:ring-0">
                  <span>Transportation &amp; Spedition</span>
                </label>
              </div>
              <input type="text" id="apolloCustomIndustries" placeholder="Type custom industries (e.g. Utilities, Aviation Ground)..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none transition">
            </div>

            <!-- 3. Target Job Roles / Positions (Select or Type) -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">3. Job Role / Position</label>
                <span class="text-[10px] text-slate-400 font-medium">Select or Type</span>
              </div>
              <!-- Role Quick-select Chips -->
              <div class="flex flex-wrap gap-1">
                <button type="button" onclick="toggleApolloRole('Operations Director')" class="btn-press px-2 py-0.5 rounded-md text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition font-medium">+ Ops Director</button>
                <button type="button" onclick="toggleApolloRole('Fleet Manager')" class="btn-press px-2 py-0.5 rounded-md text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition font-medium">+ Fleet Mgr</button>
                <button type="button" onclick="toggleApolloRole('Dispatch Manager')" class="btn-press px-2 py-0.5 rounded-md text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition font-medium">+ Dispatch Mgr</button>
                <button type="button" onclick="toggleApolloRole('Head of Logistics')" class="btn-press px-2 py-0.5 rounded-md text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition font-medium">+ Logistics Head</button>
                <button type="button" onclick="toggleApolloRole('Transport Manager')" class="btn-press px-2 py-0.5 rounded-md text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition font-medium">+ Transport Mgr</button>
              </div>
              <textarea id="apolloTitles" rows="4" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none transition leading-relaxed">Operations Director
Fleet Manager
Dispatch Manager
Head of Logistics
Transport Manager</textarea>
              <span class="text-[11px] text-slate-400">One role per line or click chips above</span>
            </div>
          </div>

          <!-- Secondary Criteria: Team Size & Page -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Minimum Fleet / Team Size</label>
              <input type="number" id="apolloMinTeam" value="20" class="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none transition">
              <span class="text-[11px] text-slate-400">Excel qualification threshold is 20+</span>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Batch Size Per Page</label>
              <input type="number" id="apolloPerPage" value="10" max="50" class="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
              <span class="text-[11px] text-slate-400">Maximum 50 records per query batch</span>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span class="text-xs text-slate-500">Leads are extracted with direct contact phone, company dispatch line, and evaluated by the Compliance Router.</span>
            <button onclick="runApolloDiscovery()" id="btnApolloSearch" class="btn-press px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <i class="fa-solid fa-magnifying-glass text-xs"></i>
              <span>Discover &amp; Pipeline from Apollo</span>
            </button>
          </div>
        </div>

        <!-- Discovery Results -->
        <div id="apolloResultsContainer" class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-card hidden">
          <!-- Results Header & Stats -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wide">Apollo Discovery Results</h3>
              <p class="text-[11px] text-slate-500">Extracted contact coordinates, direct phone numbers, and automated compliance &amp; qualification classification. Discovered leads remain in local storage for campaign queuing and CSV export without being sent to Odoo CRM.</p>
            </div>
            <div id="apolloResultStats" class="text-xs text-slate-700 flex items-center gap-2"></div>
          </div>

          <!-- Actions Bar: Select All & Push to Campaign + Export to CSV -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/90 border border-slate-200 rounded-lg p-3 gap-3 text-xs">
            <div class="flex items-center space-x-3 text-slate-700">
              <label class="flex items-center space-x-2 cursor-pointer font-semibold text-slate-900">
                <input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAllLeads(this.checked)" class="rounded border-slate-300 text-slate-900 focus:ring-0">
                <span>Select All (<span id="apolloSelectedCount" class="font-bold text-slate-900">0</span> selected)</span>
              </label>
              <span class="text-slate-300">|</span>
              <button type="button" onclick="selectOnlyEligibleLeads()" class="text-[11px] text-slate-800 hover:text-slate-900 font-semibold underline">Select Eligible Only</button>
              <button type="button" onclick="toggleSelectAllLeads(false)" class="text-[11px] text-slate-500 hover:text-slate-700 underline">Clear</button>
            </div>

            <div class="flex items-center space-x-2">
              <button type="button" onclick="pushSelectedToCampaign()" id="btnPushCampaign" class="btn-press px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5">
                <i class="fa-solid fa-paper-plane text-xs"></i>
                <span id="btnPushCampaignText">Select All &amp; Push to Campaign</span>
              </button>

              <button type="button" onclick="exportApolloResultsCsv()" id="btnExportCsv" class="btn-press px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5">
                <i class="fa-solid fa-file-arrow-down text-xs"></i>
                <span>Export to CSV</span>
              </button>
            </div>
          </div>

          <!-- Live Alert Banner for Actions -->
          <div id="apolloActionAlert" class="hidden p-3.5 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 text-slate-900 flex items-center justify-between">
            <span id="apolloActionAlertText"></span>
            <button type="button" onclick="this.parentElement.classList.add('hidden')" class="text-slate-400 hover:text-slate-600 ml-2">&times;</button>
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-lg">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th class="p-3 w-8 text-center">
                    <span class="sr-only">Select</span>
                  </th>
                  <th class="p-3 font-bold">Company</th>
                  <th class="p-3 font-bold">Job Role / Position</th>
                  <th class="p-3 font-bold">Name</th>
                  <th class="p-3 font-bold">Email</th>
                  <th class="p-3 font-bold">Phone Number</th>
                  <th class="p-3 font-bold">Company Phone</th>
                  <th class="p-3 font-bold">Country</th>
                  <th class="p-3 font-bold">Industry</th>
                  <th class="p-3 font-bold">Classification</th>
                </tr>
              </thead>
              <tbody id="apolloResultsTbody" class="divide-y divide-slate-100 bg-white"></tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ================= TAB 3: APOLLO CSV IMPORT ================= -->
      <section id="tab-csv-import" class="space-y-6 hidden">
        <div class="border-b border-slate-200/80 pb-4">
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Apollo CSV Batch Importer</h2>
          <p class="text-xs text-slate-500 mt-0.5">Import saved searches and exported lists from your Apollo seats directly into the pipeline.</p>
        </div>

        <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-card">
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Paste Apollo Export CSV Text</label>
            <textarea id="csvTextInput" rows="8" placeholder="First Name,Last Name,Title,Company,Email,Email Status,# Employees,Country,Website..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none transition leading-relaxed"></textarea>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <button onclick="loadSampleCsv()" class="text-xs text-slate-800 hover:text-slate-900 underline font-medium text-left">Load Sample Apollo CSV Template</button>
              <span class="text-slate-300">|</span>
              <a href="/leads/export?format=csv" download class="text-xs text-slate-800 hover:text-slate-900 underline font-medium flex items-center gap-1">
                <i class="fa-solid fa-file-arrow-down text-[10px]"></i>
                <span>Download All Ingested Leads (CSV)</span>
              </a>
            </div>
            <button onclick="submitCsvImport()" id="btnSubmitCsv" class="btn-press px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-2">
              <i class="fa-solid fa-cloud-arrow-up text-xs"></i>
              <span>Import &amp; Process CSV</span>
            </button>
          </div>

          <div id="csvResultBox" class="mt-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs hidden"></div>
        </div>
      </section>

      <!-- ================= TAB 4: SIMULATOR & GUARDRAIL LAB ================= -->
      <section id="tab-simulator" class="space-y-6 hidden">
        <div class="border-b border-slate-200/80 pb-4">
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Inbound Reply & Guardrail Testing Lab</h2>
          <p class="text-xs text-slate-500 mt-0.5">Test how prospect responses are classified, scan for the 7 Excel guardrail keywords, and inspect the Odoo Handover Pack.</p>
        </div>

        <!-- Quick Scenario Buttons (Monochrome Slate) -->
        <div class="space-y-2">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Preset Scenario Quick-Fill:</span>
          <div class="flex flex-wrap gap-2">
            <button onclick="fillSimulator('Hi, we have 45 fleet vehicles in Dubai. Can you schedule a demo tomorrow at 2 PM?')" class="btn-press px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-900 rounded-lg text-xs font-semibold shadow-xs">
              Demo Request (&lt; 1h SLA)
            </button>
            <button onclick="fillSimulator('Please send me a quote and pricing sheet for 50 handheld devices.')" class="btn-press px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-900 rounded-lg text-xs font-semibold shadow-xs">
              Pricing Keyword Guardrail (&lt; 4h SLA)
            </button>
            <button onclick="fillSimulator('We are a telecom reseller in Nairobi interested in distributor margins.')" class="btn-press px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-900 rounded-lg text-xs font-semibold shadow-xs">
              Partner Inquiry (&lt; 4h SLA)
            </button>
            <button onclick="fillSimulator('This email violates GDPR. My lawyer will contact your company.')" class="btn-press px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-900 rounded-lg text-xs font-semibold shadow-xs">
              Legal/GDPR Escalation (&lt; 24h SLA)
            </button>
            <button onclick="fillSimulator('Please remove me from your list. Unsubscribe immediately.')" class="btn-press px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-900 rounded-lg text-xs font-semibold shadow-xs">
              Opt-Out / Unsubscribe (Auto Suppress)
            </button>
          </div>
        </div>

        <!-- Simulator Form & Output Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-card">
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-envelope-open-text text-slate-400"></i> Simulated Inbound Message
            </h3>
            
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label class="block text-slate-500 font-medium">Company Name</label>
                <input id="simCompany" value="Gulf Logistics Fleet LLC" class="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
              </div>
              <div>
                <label class="block text-slate-500 font-medium">Country</label>
                <select id="simCountry" class="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
                  <option value="AE">UAE (GCC)</option>
                  <option value="SA">Saudi Arabia (GCC)</option>
                  <option value="KE">Kenya (Africa)</option>
                  <option value="DE">Germany (Europe)</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-500 font-medium">Contact Email</label>
                <input id="simEmail" value="operations@gulflogistics.ae" class="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
              </div>
              <div>
                <label class="block text-slate-500 font-medium">Fleet / Team Size</label>
                <input id="simTeamSize" type="number" value="45" class="mt-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-medium text-slate-700">Reply Message Text</label>
              <textarea id="simReplyText" rows="4" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none transition">Can we get a demo tomorrow at 2 PM for our 45 drivers?</textarea>
            </div>

            <button onclick="runSimulation()" id="btnRunSim" class="btn-press w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-2 cursor-pointer">
              <i class="fa-solid fa-play text-xs"></i>
              <span>Execute Reply &amp; Classification Test</span>
            </button>
          </div>

          <!-- Simulator Analysis Output (Clean Neutral) -->
          <div id="simOutputBox" class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-card text-xs">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span class="text-xs font-bold text-slate-900 uppercase tracking-wider">Classification &amp; Handover Decision</span>
              <span id="simBadge" class="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">Ready</span>
            </div>

            <div id="simEmptyNotice" class="text-center py-12 text-slate-400 text-xs">
              <i class="fa-solid fa-flask text-2xl text-slate-300 block mb-2"></i>
              Click "Execute Reply &amp; Classification Test" to inspect decisions.
            </div>

            <div id="simResultsContent" class="space-y-3 hidden">
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span class="text-slate-500 block text-[11px] font-medium">Reply Category:</span>
                  <span id="simCategory" class="font-bold text-slate-900 text-xs"></span>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span class="text-slate-500 block text-[11px] font-medium">SLA Response Target:</span>
                  <span id="simSla" class="font-bold text-slate-900 text-xs"></span>
                </div>
              </div>

              <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span class="text-slate-500 block text-[11px] font-medium">Guardrail Keyword Scan:</span>
                <div id="simKeywords" class="font-mono text-slate-900 font-semibold"></div>
              </div>

              <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span class="text-slate-500 block text-[11px] font-medium">Approved Holding Reply (If dispatched):</span>
                <p id="simHoldingReply" class="text-slate-800 italic"></p>
              </div>

              <div class="space-y-1">
                <span class="text-slate-500 block text-[11px] font-semibold">Odoo Handover Pack Description (Generated for Sales):</span>
                <pre id="simHandoverPackPreview" class="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] max-h-40 overflow-y-auto whitespace-pre-wrap font-mono"></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= TAB: AUTOMATION SETTINGS ================= -->
      <section id="tab-automation" class="space-y-6 hidden">
        <div class="border-b border-slate-200/80 pb-4">
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Automation Settings</h2>
          <p class="text-xs text-slate-500 mt-0.5">Configure outbound automation schedules, dispatch rules, retry logic, and campaign cadence parameters.</p>
        </div>

        <!-- Live Dispatch Worker & Queue Monitor Card (Clean Neutral) -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-card">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-slate-600 animate-pulse"></span>
                <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Scheduled Queue Worker (node-cron)</h3>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">Automated batch dispatch runner evaluating approved windows, daily caps, and retry cadence.</p>
            </div>

            <div class="flex items-center gap-2">
              <label class="flex items-center space-x-1.5 cursor-pointer text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                <input type="checkbox" id="chkForceWindow" class="rounded border-slate-300 text-slate-900 focus:ring-0">
                <span class="text-[11px] font-medium">Bypass Window for Test</span>
              </label>

              <button type="button" onclick="triggerBatchNow()" id="btnTriggerBatch" class="btn-press px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5">
                <i class="fa-solid fa-bolt text-xs text-slate-300"></i>
                <span>Trigger Batch Run Now</span>
              </button>
            </div>
          </div>

          <!-- 4 Worker Status Badges (Zero green highlights, clean unified text) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div class="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Window Status</span>
              <div id="workerWindowBadge" class="flex items-center gap-1.5 font-bold text-slate-900">
                <span class="w-2 h-2 rounded-full bg-slate-600"></span>
                <span id="workerWindowText">Checking...</span>
              </div>
              <p id="workerWindowDetail" class="text-[11px] text-slate-500">Loading timezone time...</p>
            </div>

            <div class="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Sent Cap</span>
              <div class="flex items-baseline gap-1.5 font-bold text-slate-900">
                <span id="workerSentToday" class="text-lg text-slate-900">0</span>
                <span class="text-xs text-slate-500">/ <span id="workerDailyCap">50</span> Max</span>
              </div>
              <p id="workerRemainingCapacity" class="text-[11px] text-slate-600 font-medium">50 sends remaining today</p>
            </div>

            <div class="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Queue Backlog</span>
              <div class="flex items-baseline gap-1.5 font-bold text-slate-900">
                <span id="workerPendingCount" class="text-lg text-slate-900">0</span>
                <span class="text-xs text-slate-500">Pending</span>
              </div>
              <p id="workerRetryingCount" class="text-[11px] text-slate-600 font-medium">0 retrying due to backoff</p>
            </div>

            <div class="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Runner Cadence</span>
              <div class="flex items-baseline gap-1.5 font-bold text-slate-900">
                <span id="workerCadenceInterval" class="text-lg text-slate-900">Every 15m</span>
              </div>
              <p class="text-[11px] text-slate-500">Automated node-cron scheduler</p>
            </div>
          </div>

          <!-- Alert / Batch Run Output Notification -->
          <div id="workerBatchAlert" class="hidden p-3.5 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 text-slate-900 flex items-center justify-between">
            <span id="workerBatchAlertText"></span>
            <button type="button" onclick="this.parentElement.classList.add('hidden')" class="text-slate-400 hover:text-slate-600 ml-2">&times;</button>
          </div>
        </div>

        <!-- Dispatch Schedule -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-card">
          <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <i class="fa-regular fa-clock text-slate-400"></i> Dispatch Schedule
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">Sending Window Start</label>
              <input id="autoSendStart" type="time" value="08:00" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
            </div>
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">Sending Window End</label>
              <input id="autoSendEnd" type="time" value="18:00" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
            </div>
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">Timezone</label>
              <select id="autoTimezone" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
                <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</option>
                <option value="Asia/Riyadh">Asia/Riyadh (AST, UTC+3)</option>
                <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET, UTC+1)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">Send Days</label>
              <div class="flex flex-wrap gap-2 pt-1">
                <label class="flex items-center space-x-1.5 cursor-pointer hover:text-slate-900"><input type="checkbox" name="autoDay" value="Mon" checked class="rounded border-slate-300 text-slate-900 focus:ring-0"><span>Mon</span></label>
                <label class="flex items-center space-x-1.5 cursor-pointer hover:text-slate-900"><input type="checkbox" name="autoDay" value="Tue" checked class="rounded border-slate-300 text-slate-900 focus:ring-0"><span>Tue</span></label>
                <label class="flex items-center space-x-1.5 cursor-pointer hover:text-slate-900"><input type="checkbox" name="autoDay" value="Wed" checked class="rounded border-slate-300 text-slate-900 focus:ring-0"><span>Wed</span></label>
                <label class="flex items-center space-x-1.5 cursor-pointer hover:text-slate-900"><input type="checkbox" name="autoDay" value="Thu" checked class="rounded border-slate-300 text-slate-900 focus:ring-0"><span>Thu</span></label>
                <label class="flex items-center space-x-1.5 cursor-pointer hover:text-slate-900"><input type="checkbox" name="autoDay" value="Fri" checked class="rounded border-slate-300 text-slate-900 focus:ring-0"><span>Fri</span></label>
                <label class="flex items-center space-x-1.5 cursor-pointer hover:text-slate-900"><input type="checkbox" name="autoDay" value="Sat" class="rounded border-slate-300 text-slate-900 focus:ring-0"><span>Sat</span></label>
                <label class="flex items-center space-x-1.5 cursor-pointer hover:text-slate-900"><input type="checkbox" name="autoDay" value="Sun" class="rounded border-slate-300 text-slate-900 focus:ring-0"><span>Sun</span></label>
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">Max Emails Per Day</label>
              <input id="autoMaxPerDay" type="number" value="50" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
              <span class="text-[11px] text-slate-400">Smartlead daily cap per sending account</span>
            </div>
          </div>
        </div>

        <!-- Campaign Cadence -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-card">
          <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <i class="fa-solid fa-arrows-spin text-slate-400"></i> Campaign Cadence &amp; Follow-up
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">Follow-up Delay (Days)</label>
              <input id="autoFollowupDelay" type="number" value="3" min="1" max="30" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
              <span class="text-[11px] text-slate-400">Days between sequence steps</span>
            </div>
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">Max Sequence Steps</label>
              <input id="autoMaxSteps" type="number" value="4" min="1" max="10" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
              <span class="text-[11px] text-slate-400">Total touches before auto-closing lead</span>
            </div>
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">Batch Interval (Minutes)</label>
              <input id="autoBatchInterval" type="number" value="15" min="5" max="120" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
              <span class="text-[11px] text-slate-400">Time between processing batches</span>
            </div>
          </div>
        </div>

        <!-- Retry & Error Handling -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-card">
          <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <i class="fa-solid fa-rotate text-slate-400"></i> Retry &amp; Error Handling
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">Max Retries on Failure</label>
              <input id="autoMaxRetries" type="number" value="3" min="0" max="10" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
            </div>
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">Retry Backoff (Seconds)</label>
              <input id="autoRetryBackoff" type="number" value="60" min="10" max="600" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
            </div>
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">On Bounce Action</label>
              <select id="autoOnBounce" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
                <option value="suppress">Suppress Contact Immediately</option>
                <option value="retry_once">Retry Once, Then Suppress</option>
                <option value="flag">Flag for Manual Review</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Auto-Classification Thresholds -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-4 shadow-card">
          <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <i class="fa-solid fa-sliders text-slate-400"></i> Auto-Classification Thresholds
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">AI Confidence Threshold for Auto-Dispatch (%)</label>
              <input id="autoConfidenceThreshold" type="number" value="85" min="50" max="100" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
              <span class="text-[11px] text-slate-400">Below this threshold, replies queue for human review</span>
            </div>
            <div class="space-y-1.5">
              <label class="block text-slate-500 font-medium">Pre-Dispatch QA Mode</label>
              <select id="autoQaMode" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none transition">
                <option value="full_review">Month 1: 100% Human Review Before Dispatch</option>
                <option value="sample_review">Month 2+: 20% Sample Review</option>
                <option value="auto">Autonomous: AI Dispatches with Confidence Gate</option>
              </select>
              <span class="text-[11px] text-slate-400">Controls how much human oversight is applied</span>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex items-center justify-end gap-3">
          <span id="autoSaveStatus" class="text-xs text-slate-500 hidden">Settings saved successfully.</span>
          <button onclick="saveAutomationSettings()" class="btn-press px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition shadow-sm flex items-center gap-2 cursor-pointer">
            <i class="fa-solid fa-floppy-disk text-xs"></i>
            <span>Save Automation Settings</span>
          </button>
        </div>
      </section>

      <!-- ================= TAB 5: ODOO HANDOVERS ================= -->
      <section id="tab-handovers" class="space-y-6 hidden">
        <div class="border-b border-slate-200/80 pb-4">
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Odoo CRM Handover Inspection</h2>
          <p class="text-xs text-slate-500 mt-0.5">All warm leads and high-priority replies synchronized to Odoo CRM for sales reps.</p>
        </div>

        <div class="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
          <div class="overflow-x-auto border border-slate-200 rounded-lg">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th class="p-3 font-bold">Odoo Lead ID</th>
                  <th class="p-3 font-bold">Company</th>
                  <th class="p-3 font-bold">Contact</th>
                  <th class="p-3 font-bold">Priority</th>
                  <th class="p-3 font-bold">Status</th>
                  <th class="p-3 font-bold">Handover Time</th>
                </tr>
              </thead>
              <tbody id="handoversTbody" class="divide-y divide-slate-100 bg-white">
                <tr>
                  <td colspan="6" class="p-8 text-center text-slate-400">No leads handed over yet in this session.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- ================= TAB 6: COMPLIANCE MATRIX ================= -->
      <section id="tab-compliance" class="space-y-6 hidden">
        <div class="border-b border-slate-200/80 pb-4">
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Compliance Router &amp; Policy Matrix</h2>
          <p class="text-xs text-slate-500 mt-0.5">Deterministic jurisdiction rules, channel allowances, and keyword triggers.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-3 shadow-card">
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-key text-slate-400"></i> Mandatory Escalation Keywords (Sheet AI Guardrails)
            </h3>
            <p class="text-xs text-slate-500">Hitting any of these triggers immediate human escalation and bypasses AI response generation:</p>
            <div class="flex flex-wrap gap-1.5 pt-1">
              <span class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-900 rounded-md text-xs font-mono font-semibold">price</span>
              <span class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-900 rounded-md text-xs font-mono font-semibold">pricing</span>
              <span class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-900 rounded-md text-xs font-mono font-semibold">quote</span>
              <span class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-900 rounded-md text-xs font-mono font-semibold">contract</span>
              <span class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-900 rounded-md text-xs font-mono font-semibold">legal</span>
              <span class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-900 rounded-md text-xs font-mono font-semibold">gdpr</span>
              <span class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-900 rounded-md text-xs font-mono font-semibold">complaint</span>
              <span class="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-900 rounded-md text-xs font-mono font-semibold">lawyer</span>
            </div>
          </div>

          <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-3 shadow-card">
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-earth-americas text-slate-400"></i> Market Channel Permissions
            </h3>
            <div class="text-xs space-y-2 text-slate-800">
              <div class="flex justify-between border-b border-slate-100 pb-2">
                <span>UAE / Saudi Arabia / Kenya / Egypt:</span>
                <span class="font-semibold text-slate-900">Email &amp; LinkedIn Allowed</span>
              </div>
              <div class="flex justify-between border-b border-slate-100 pb-2">
                <span>Germany (DE):</span>
                <span class="font-semibold text-slate-900">LinkedIn Only (Cold Email Blocked: UWG §7)</span>
              </div>
              <div class="flex justify-between border-b border-slate-100 pb-2">
                <span>United Kingdom / France:</span>
                <span class="font-semibold text-slate-900">B2B Email Allowed (Legitimate Interest)</span>
              </div>
              <div class="flex justify-between pt-0.5">
                <span>WhatsApp Outreach:</span>
                <span class="font-semibold text-slate-900">Strict Prior Opt-in Only</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= TAB 8: WHATSAPP AI LIVE ================= -->
      <section id="tab-whatsapp" class="space-y-6 hidden">
        <div class="border-b border-slate-200/80 pb-4">
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Odoo Native WhatsApp AI Assistant</h2>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 uppercase tracking-wider border border-slate-200">24h Meta Window Active</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Automated inbound responses for prospect-initiated WhatsApp chats via Odoo's native Discuss channel. Strictly enforces non-price quoting guardrails and 6-part Odoo CRM lead handover.</p>
        </div>

        <!-- WhatsApp Policy Banner (Clean Neutral White/Slate Card) -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-5 space-y-3 shadow-card">
          <div class="font-bold flex items-center gap-2 text-slate-900">
            <i class="fa-brands fa-whatsapp text-slate-700 text-lg"></i>
            <span class="text-sm font-extrabold text-slate-900">Meta WhatsApp Business &amp; Odoo Handover Policy</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] pt-1">
            <div class="bg-slate-50/80 p-3 rounded-lg border border-slate-200 shadow-xs">
              <span class="font-bold block text-slate-900 mb-0.5">1. Inbound Only (Strict Opt-In)</span>
              <p class="text-slate-600 leading-relaxed">We never initiate cold WhatsApp messages. We only respond to prospect-initiated chats routed from Odoo.</p>
            </div>
            <div class="bg-slate-50/80 p-3 rounded-lg border border-slate-200 shadow-xs">
              <span class="font-bold block text-slate-900 mb-0.5">2. Same 7 Guardrails Enforced</span>
              <p class="text-slate-600 leading-relaxed">The AI never quotes pricing or negotiates terms on WhatsApp. Holding replies are sent and sales is notified.</p>
            </div>
            <div class="bg-slate-50/80 p-3 rounded-lg border border-slate-200 shadow-xs">
              <span class="font-bold block text-slate-900 mb-0.5">3. Email Outbound Auto-Suppression</span>
              <p class="text-slate-600 leading-relaxed">Active WhatsApp chats pause automated email follow-ups to avoid awkward double-contacting.</p>
            </div>
          </div>
        </div>

        <!-- Simulator & Live Feed Split -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- WhatsApp Interactive Simulator (Clean Neutral) -->
          <div class="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
              <div class="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <i class="fa-solid fa-mobile-screen text-slate-400"></i>
                <span>Simulate WhatsApp Message</span>
              </div>
              <span class="w-2 h-2 rounded-full bg-slate-600 animate-pulse"></span>
            </div>

            <div class="space-y-3 text-xs">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Prospect Name</label>
                <input id="wa-sim-name" type="text" class="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none transition" value="Ahmed Al-Mansoor">
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Phone Number (E.164)</label>
                <input id="wa-sim-phone" type="text" class="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none transition" value="+971501234567">
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Linked Email (Optional)</label>
                <input id="wa-sim-email" type="email" class="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none transition" placeholder="ahmed@fleet.ae">
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Inbound WhatsApp Message</label>
                <textarea id="wa-sim-body" rows="3" class="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none transition" placeholder="Type WhatsApp message here...">Hello, we run 45 logistics trucks in Dubai and want a quote for your Push-to-Talk devices.</textarea>
              </div>

              <div class="flex flex-wrap gap-1.5 pt-1">
                <button onclick="setWaPrompt('pricing')" class="btn-press px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-800 font-medium">Pricing Guardrail</button>
                <button onclick="setWaPrompt('demo')" class="btn-press px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-800 font-medium">Demo Request</button>
                <button onclick="setWaPrompt('legal')" class="btn-press px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-800 font-medium">GDPR / Legal</button>
              </div>

              <button onclick="sendSimulatedWhatsApp()" id="wa-sim-btn" class="btn-press w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                <i class="fa-solid fa-paper-plane text-xs"></i>
                <span>Send Inbound to AI</span>
              </button>
            </div>

            <!-- Simulation Result Card (Clean Neutral) -->
            <div id="wa-sim-result" class="hidden border border-slate-200 bg-slate-50 rounded-xl p-3.5 text-xs space-y-2.5 shadow-xs">
              <div class="font-bold text-slate-900 flex items-center justify-between">
                <span>AI Processing Outcome</span>
                <span id="wa-res-type" class="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-800 font-bold"></span>
              </div>
              <div class="text-[11px] text-slate-800 space-y-1.5">
                <div><span class="font-semibold text-slate-900">Reply Sent:</span> <span id="wa-res-reply" class="font-medium italic text-slate-800"></span></div>
                <div><span class="font-semibold text-slate-900">CRM Handover:</span> <span id="wa-res-crm" class="font-semibold text-slate-900"></span></div>
                <div><span class="font-semibold text-slate-900">Email Sequence:</span> <span class="font-semibold text-slate-800">Paused (WhatsApp Active)</span></div>
              </div>
            </div>
          </div>

          <!-- Live WhatsApp Inbound Feed (Clean Neutral) -->
          <div class="lg:col-span-2 bg-white border border-slate-200/90 rounded-xl shadow-card flex flex-col">
            <div class="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 class="font-bold text-xs uppercase tracking-wider text-slate-700">Recent WhatsApp Inbound Conversations</h3>
                <p class="text-[11px] text-slate-500">Live conversation log processed through Odoo Discuss webhook</p>
              </div>
              <button onclick="loadWhatsAppConversations()" class="btn-press px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center gap-1.5 shadow-xs">
                <i class="fa-solid fa-rotate-right text-xs text-slate-400"></i>
                <span>Refresh Feed</span>
              </button>
            </div>

            <div class="flex-1 overflow-x-auto p-4">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th class="pb-2.5 font-bold">Prospect</th>
                    <th class="pb-2.5 font-bold">Message</th>
                    <th class="pb-2.5 font-bold">AI Classification</th>
                    <th class="pb-2.5 font-bold">Reply Sent</th>
                    <th class="pb-2.5 font-bold">Meta 24h Window</th>
                    <th class="pb-2.5 font-bold">Odoo CRM</th>
                  </tr>
                </thead>
                <tbody id="wa-conversations-tbody" class="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td colspan="6" class="py-10 text-center text-slate-400 italic">No WhatsApp conversations recorded yet. Use the simulator or send a webhook to test.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>

  <!-- ================= FLOATING TOAST CONTAINER ================= -->
  <div id="toastContainer" class="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm pointer-events-none"></div>

  <!-- ================= CLIENT-SIDE LOGIC SCRIPT ================= -->
  <script>
    let isKillSwitch = false;

    // Toast Notification System (Monochrome Slate Aesthetic)
    function showToast(message, type = 'info', title = null) {
      const container = document.getElementById('toastContainer');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast-animate-in pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white/95 text-slate-900 shadow-lg backdrop-blur-md transition-all text-xs';

      const icon = '<i class="fa-solid fa-circle-info text-slate-600 text-sm mt-0.5"></i>';

      toast.innerHTML = \`
        \${icon}
        <div class="flex-1">
          \${title ? \`<div class="font-bold text-xs text-slate-900 mb-0.5">\${title}</div>\` : ''}
          <div class="text-[11px] text-slate-700 leading-relaxed">\${message}</div>
        </div>
        <button type="button" class="text-slate-400 hover:text-slate-600 ml-1 text-sm font-bold leading-none cursor-pointer" onclick="this.parentElement.remove()">&times;</button>
      \`;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => toast.remove(), 250);
      }, 4500);
    }

    function switchTab(tabId) {
      document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
      const activeSec = document.getElementById('tab-' + tabId);
      if (activeSec) activeSec.classList.remove('hidden');

      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('text-slate-900', 'bg-slate-100/90', 'border-slate-200/80', 'shadow-xs');
        btn.classList.add('text-slate-600');
        const icon = btn.querySelector('i');
        if (icon) {
          icon.classList.remove('text-slate-700');
          icon.classList.add('text-slate-400');
        }
      });

      const activeBtn = document.getElementById('nav-' + tabId);
      if (activeBtn) {
        activeBtn.classList.remove('text-slate-600');
        activeBtn.classList.add('text-slate-900', 'bg-slate-100/90', 'border-slate-200/80', 'shadow-xs');
        const icon = activeBtn.querySelector('i');
        if (icon) {
          icon.classList.remove('text-slate-400');
          icon.classList.add('text-slate-700');
        }
      }

      if (tabId === 'dashboard') loadKpis();
      if (tabId === 'handovers') loadHandovers();
      if (tabId === 'automation') loadAutomationSettings();
      if (tabId === 'whatsapp') loadWhatsAppConversations();
    }

    async function toggleKillSwitch() {
      const endpoint = isKillSwitch ? '/internal/campaigns/resume' : '/internal/campaigns/pause';
      const headers = isKillSwitch ? { 'Authorization': 'Bearer admin_authorized_token' } : {};

      try {
        const res = await fetch(endpoint, { method: 'POST', headers });
        const data = await res.json();
        isKillSwitch = data.killSwitchActive;
        updateKillSwitchUi();
        showToast(
          isKillSwitch ? 'All automated email sequences have been halted.' : 'Outbound dispatch operations restored to active status.',
          'info',
          isKillSwitch ? 'Emergency Stop Engaged' : 'Outbound Resumed'
        );
      } catch (err) {
        showToast('Failed to toggle kill switch: ' + err.message, 'error', 'Control Error');
      }
    }

    function updateKillSwitchUi() {
      const btn = document.getElementById('killSwitchBtn');
      const text = document.getElementById('killSwitchText');
      const statusBadge = document.getElementById('systemStatusBadge');

      if (isKillSwitch) {
        btn.className = "btn-press px-3.5 py-1.5 rounded-lg font-bold text-xs tracking-wider uppercase bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer";
        text.innerText = "OUTBOUND FROZEN";
        statusBadge.className = "text-xs px-2.5 py-0.5 rounded-full bg-slate-200 border border-slate-300 text-slate-900 font-bold flex items-center gap-1.5 transition-all";
        statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-900 animate-pulse"></span> ALL OUTBOUND FROZEN';
      } else {
        btn.className = "btn-press px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center gap-2 bg-white text-slate-900 border border-slate-300 hover:bg-slate-100 shadow-xs cursor-pointer";
        text.innerText = "Emergency Stop";
        statusBadge.className = "text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-900 font-semibold flex items-center gap-1.5 transition-all";
        statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse"></span> Active';
      }
    }

    async function loadKpis() {
      try {
        const res = await fetch('/internal/kpis');
        if (res.ok) {
          const data = await res.json();
          document.getElementById('metric-handovers').innerText = data.leadsHandedOverCount || 0;
          document.getElementById('metric-missed').innerText = data.missedEscalations || 0;
        }
      } catch (err) {
        console.error('Error fetching KPIs', err);
      }
    }

    let currentApolloLeads = [];

    function toggleSelectAllLeads(checked) {
      document.querySelectorAll('.apollo-lead-check').forEach(chk => {
        chk.checked = checked;
      });
      const master = document.getElementById('selectAllCheckbox');
      if (master) master.checked = checked;
      updateSelectedCount();
    }

    function selectOnlyEligibleLeads() {
      document.querySelectorAll('.apollo-lead-check').forEach(chk => {
        const idx = parseInt(chk.dataset.idx, 10);
        const lead = currentApolloLeads[idx];
        chk.checked = !!(lead && lead.complianceAllowed);
      });
      updateSelectedCount();
    }

    function updateSelectedCount() {
      const allChecks = document.querySelectorAll('.apollo-lead-check');
      const checkedBoxes = Array.from(allChecks).filter(chk => chk.checked);
      const count = checkedBoxes.length;

      const countEl = document.getElementById('apolloSelectedCount');
      if (countEl) countEl.innerText = count;

      const master = document.getElementById('selectAllCheckbox');
      if (master) {
        master.checked = allChecks.length > 0 && checkedBoxes.length === allChecks.length;
      }

      const btnText = document.getElementById('btnPushCampaignText');
      if (btnText) {
        btnText.innerText = count > 0
          ? \`Push Selected (\${count}) to Campaign\`
          : 'Select All & Push to Campaign';
      }
    }

    async function pushSelectedToCampaign() {
      if (!currentApolloLeads || currentApolloLeads.length === 0) {
        showToast('No leads available to queue. Run discovery first.', 'warning', 'No Leads');
        return;
      }

      const checkedBoxes = Array.from(document.querySelectorAll('.apollo-lead-check:checked'));
      let targetLeads = [];

      if (checkedBoxes.length > 0) {
        targetLeads = checkedBoxes.map(chk => currentApolloLeads[parseInt(chk.dataset.idx, 10)]).filter(Boolean);
      } else {
        toggleSelectAllLeads(true);
        targetLeads = [...currentApolloLeads];
      }

      if (targetLeads.length === 0) {
        showToast('No leads selected to push to campaign.', 'warning', 'Selection Empty');
        return;
      }

      const btn = document.getElementById('btnPushCampaign');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin text-xs"></i> <span>Queuing into Campaign...</span>';

      try {
        const res = await fetch('/campaigns/queue-leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignName: 'PTT Fleet Outreach & Dispatch Sequence',
            leads: targetLeads
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || 'Failed to queue campaign leads');
        }

        const queuedSet = new Set((data.queued || []).map(q => q.email.toLowerCase()));
        currentApolloLeads.forEach((lead, idx) => {
          if (queuedSet.has((lead.contactEmail || '').toLowerCase())) {
            const statusCell = document.getElementById(\`apollo-lead-status-\${idx}\`);
            if (statusCell) {
              statusCell.innerHTML = \`
                <div class="flex flex-col gap-1 items-start">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-900 border border-slate-200 font-bold">
                    <i class="fa-solid fa-paper-plane text-[9px] mr-1 text-slate-600"></i> IN CAMPAIGN
                  </span>
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                    QUEUED
                  </span>
                </div>
              \`;
            }
          }
        });

        showToast(data.message, 'success', 'Campaign Queued');
      } catch (err) {
        showToast('Campaign Push Error: ' + err.message, 'error', 'Queue Failed');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        updateSelectedCount();
      }
    }

    function exportApolloResultsCsv() {
      if (!currentApolloLeads || currentApolloLeads.length === 0) {
        showToast('No leads available to export. Run discovery first.', 'warning', 'Export Notice');
        return;
      }

      const checkedBoxes = Array.from(document.querySelectorAll('.apollo-lead-check:checked'));
      const exportList = checkedBoxes.length > 0
        ? checkedBoxes.map(chk => currentApolloLeads[parseInt(chk.dataset.idx, 10)]).filter(Boolean)
        : currentApolloLeads;

      const headers = [
        'Company',
        'Job Role / Position',
        'Contact Name',
        'Contact Email',
        'Phone Number',
        'Company Phone',
        'Country',
        'Industry',
        'Compliance Status',
        'Compliance Reason',
        'Qualification Outcome'
      ];

      const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const val = String(str).replace(/"/g, '""');
        return \`"\${val}"\`;
      };

      const rows = exportList.map(l => [
        escapeCsv(l.companyName),
        escapeCsv(l.jobTitle),
        escapeCsv(l.contactName),
        escapeCsv(l.contactEmail),
        escapeCsv(l.contactPhone),
        escapeCsv(l.companyPhone),
        escapeCsv(l.country),
        escapeCsv(l.industry),
        escapeCsv(l.complianceAllowed ? 'ALLOWED' : 'BLOCKED'),
        escapeCsv(l.complianceReason || ''),
        escapeCsv(l.qualificationOutcome || '')
      ].join(','));

      const csvContent = [headers.join(','), ...rows].join('\\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = \`apollo_leads_export_\${dateStr}.csv\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(\`Exported \${exportList.length} lead(s) to CSV (\${a.download})\`, 'success', 'Export Complete');
    }

    function showApolloAlert(msg, type) {
      showToast(msg, 'info');
    }

    function toggleApolloRole(role) {
      const textarea = document.getElementById('apolloTitles');
      const lines = textarea.value.split('\\n').map(t => t.trim()).filter(Boolean);
      const idx = lines.indexOf(role);
      if (idx >= 0) {
        lines.splice(idx, 1);
      } else {
        lines.push(role);
      }
      textarea.value = lines.join('\\n');
    }

    async function runApolloDiscovery() {
      const btn = document.getElementById('btnApolloSearch');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin text-xs"></i> <span>Discovering...</span>';

      const checkedCountries = Array.from(document.querySelectorAll('input[name="country"]:checked')).map(el => el.value);
      const customMarketsInput = document.getElementById('apolloCustomMarkets') ? document.getElementById('apolloCustomMarkets').value : '';
      const typedCountries = customMarketsInput.split(/[,\\n]+/).map(c => c.trim()).filter(Boolean);
      const selectedCountries = Array.from(new Set([...checkedCountries, ...typedCountries]));
      if (selectedCountries.length === 0) {
        selectedCountries.push('United Arab Emirates');
      }

      const checkedIndustries = Array.from(document.querySelectorAll('input[name="industry"]:checked')).map(el => el.value);
      const customIndustriesInput = document.getElementById('apolloCustomIndustries') ? document.getElementById('apolloCustomIndustries').value : '';
      const typedIndustries = customIndustriesInput.split(/[,\\n]+/).map(i => i.trim()).filter(Boolean);
      const selectedIndustries = Array.from(new Set([...checkedIndustries, ...typedIndustries]));

      const titles = document.getElementById('apolloTitles').value.split('\\n').map(t => t.trim()).filter(Boolean);
      const minEmployees = parseInt(document.getElementById('apolloMinTeam').value, 10);
      const perPage = parseInt(document.getElementById('apolloPerPage').value, 10);

      try {
        const payload = {
          countries: selectedCountries,
          titles: titles.length ? titles : undefined,
          industries: selectedIndustries.length ? selectedIndustries : undefined,
          minEmployees,
          perPage
        };

        const res = await fetch('/leads/discover/apollo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        const resultsBox = document.getElementById('apolloResultsContainer');
        const tbody = document.getElementById('apolloResultsTbody');
        const statsBox = document.getElementById('apolloResultStats');

        tbody.innerHTML = '';
        resultsBox.classList.remove('hidden');

        currentApolloLeads = data.report.leads || [];

        statsBox.innerHTML = \`
          <span class="text-slate-900 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">\${data.report.eligibleForOutreachCount} Eligible</span>
          <span class="text-slate-900 font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">\${data.report.blockedByComplianceCount} Blocked</span>
          <span class="text-slate-500 font-medium">Total: \${data.report.totalDiscovered}</span>
        \`;

        if (!data.report.leads || data.report.leads.length === 0) {
          tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-slate-400">No leads discovered matching the selected criteria.</td></tr>';
          return;
        }

        data.report.leads.forEach((l, idx) => {
          const tr = document.createElement('tr');
          tr.id = \`apollo-lead-row-\${idx}\`;
          tr.className = "hover:bg-slate-50/80 transition-colors";
          const complianceBadge = l.complianceAllowed
            ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-900 border border-slate-200 font-semibold">ALLOWED</span>'
            : \`<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-900 border border-slate-200 font-semibold">\${l.complianceReason || 'BLOCKED'}</span>\`;

          const qualificationBadge = l.qualificationOutcome === 'WARM_QUALIFIED_HAND_TO_HUMAN'
            ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-900 border border-slate-200 font-bold">WARM QUALIFIED</span>'
            : \`<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">\${l.qualificationOutcome || 'PROSPECT'}</span>\`;

          tr.innerHTML = \`
            <td class="p-3 text-center">
              <input type="checkbox" class="apollo-lead-check rounded border-slate-300 text-slate-900 focus:ring-0" data-idx="\${idx}" onchange="updateSelectedCount()">
            </td>
            <td class="p-3 font-semibold text-slate-900">\${l.companyName || '—'}</td>
            <td class="p-3 text-slate-800 font-medium">\${l.jobTitle || '—'}</td>
            <td class="p-3 text-slate-900 font-medium">\${l.contactName || '—'}</td>
            <td class="p-3 font-mono text-slate-700 text-xs">\${l.contactEmail || '—'}</td>
            <td class="p-3 font-mono text-slate-600">\${l.contactPhone || '—'}</td>
            <td class="p-3 font-mono text-slate-600">\${l.companyPhone || '—'}</td>
            <td class="p-3 font-mono font-semibold text-slate-800">\${l.country || '—'}</td>
            <td class="p-3 text-slate-700">\${l.industry || '—'}</td>
            <td class="p-3" id="apollo-lead-status-\${idx}">
              <div class="flex flex-col gap-1 items-start">
                \${complianceBadge}
                \${qualificationBadge}
              </div>
            </td>
          \`;
          tbody.appendChild(tr);
        });

        const master = document.getElementById('selectAllCheckbox');
        if (master) master.checked = false;
        updateSelectedCount();

        showToast(\`Discovered \${data.report.totalDiscovered} leads (\${data.report.eligibleForOutreachCount} eligible)\`, 'success', 'Apollo Query Complete');
      } catch (err) {
        showToast('Discovery error: ' + err.message, 'error', 'Query Failed');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass text-xs"></i> <span>Discover &amp; Pipeline from Apollo</span>';
      }
    }

    function loadSampleCsv() {
      document.getElementById('csvTextInput').value =
\`First Name,Last Name,Title,Company,Email,Email Status,# Employees,Country,Website
Zayd,Mansoor,Fleet Operations Manager,Gulf Logistics LLC,zayd@gulflogistics.ae,verified,55,United Arab Emirates,gulflogistics.ae
David,Mwangi,Head of Logistics,Kenya Cargo Services,david@kenyacargo.co.ke,verified,40,Kenya,kenyacargo.co.ke
Stefan,Bauer,Dispatch Director,Munich Fleet Gmbh,stefan@munichfleet.de,verified,80,Germany,munichfleet.de\`;
      showToast('Sample Apollo CSV loaded into input area.', 'info', 'Template Loaded');
    }

    async function submitCsvImport() {
      const csvContent = document.getElementById('csvTextInput').value.trim();
      if (!csvContent) {
        showToast('Please paste CSV content first.', 'warning', 'Empty Input');
        return;
      }

      const btn = document.getElementById('btnSubmitCsv');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin text-xs"></i> <span>Importing...</span>';

      try {
        const res = await fetch('/leads/import/apollo-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvContent })
        });
        const data = await res.json();
        const box = document.getElementById('csvResultBox');
        box.classList.remove('hidden');
        box.innerHTML = \`
          <h4 class="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
            <i class="fa-solid fa-circle-check text-slate-700"></i> CSV Processed Successfully
          </h4>
          <p class="text-slate-700">Total Rows: <b>\${data.result.totalRows}</b> &bull; Contacts Ingested: <b>\${data.result.importedContacts}</b> &bull; Companies: <b>\${data.result.importedCompanies}</b></p>
          <div class="mt-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-semibold">\${data.result.eligibleCount} Eligible for Outreach</span>
              <span class="text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-semibold">\${data.result.blockedCount} Blocked by Compliance</span>
            </div>
            <a href="/leads/export?format=csv" download class="btn-press px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-semibold text-xs rounded transition flex items-center gap-1.5">
              <i class="fa-solid fa-file-arrow-down text-[10px]"></i>
              <span>Export CSV</span>
            </a>
          </div>
        \`;
        showToast(\`Imported \${data.result.importedContacts} contacts successfully.\`, 'success', 'Import Complete');
      } catch (err) {
        showToast('CSV Import error: ' + err.message, 'error', 'Import Failed');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up text-xs"></i> <span>Import &amp; Process CSV</span>';
      }
    }

    function fillSimulator(text) {
      document.getElementById('simReplyText').value = text;
    }

    async function runSimulation() {
      const btn = document.getElementById('btnRunSim');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin text-xs"></i> <span>Processing...</span>';

      const payload = {
        companyName: document.getElementById('simCompany').value,
        country: document.getElementById('simCountry').value,
        contactEmail: document.getElementById('simEmail').value,
        teamSize: parseInt(document.getElementById('simTeamSize').value, 10),
        replyText: document.getElementById('simReplyText').value
      };

      try {
        const res = await fetch('/internal/simulate-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        document.getElementById('simEmptyNotice').classList.add('hidden');
        document.getElementById('simResultsContent').classList.remove('hidden');

        const badge = document.getElementById('simBadge');
        badge.className = "text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-slate-100 text-slate-900 border border-slate-200";
        if (data.replyClassification.replyType === 4) {
          badge.innerText = "Type 4: Demo Handover";
        } else if (data.replyClassification.replyType === 5) {
          badge.innerText = "Type 5: Pricing Escalation";
        } else if (data.replyClassification.replyType === 1) {
          badge.innerText = "Type 1: Auto-Suppressed";
        } else {
          badge.innerText = \`Type \${data.replyClassification.replyType}: \${data.replyClassification.intentName}\`;
        }

        document.getElementById('simCategory').innerText = data.replyClassification.intentName;
        document.getElementById('simSla').innerText = data.replyClassification.responseTargetHours > 0
          ? \`Within \${data.replyClassification.responseTargetHours} Hour(s)\`
          : 'Immediate Automatic Action';

        const keywordsBox = document.getElementById('simKeywords');
        if (data.replyClassification.guardrailKeywordHit) {
          keywordsBox.innerText = \`Triggered: [\${data.replyClassification.matchedKeywords.join(', ')}]\`;
          keywordsBox.className = "font-mono text-slate-900 font-semibold";
        } else {
          keywordsBox.innerText = 'No keyword trigger hit &bull; Model Intent Classification';
          keywordsBox.className = "font-mono text-slate-600 font-medium";
        }

        document.getElementById('simHoldingReply').innerText = data.replyClassification.draftHoldingReply || '(No holding reply permitted for this category)';
        document.getElementById('simHandoverPackPreview').innerText = data.handoverDescription || '(No Handover Pack generated; contact auto-suppressed)';

        showToast(\`Classified as: \${data.replyClassification.intentName}\`, 'success', 'Decision Computed');
      } catch (err) {
        showToast('Simulation error: ' + err.message, 'error', 'Simulation Failed');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-play text-xs"></i> <span>Execute Reply &amp; Classification Test</span>';
      }
    }

    async function loadHandovers() {
      try {
        const res = await fetch('/internal/handovers');
        if (res.ok) {
          const data = await res.json();
          const tbody = document.getElementById('handoversTbody');
          if (!data.leads || data.leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">No leads handed over yet in this session.</td></tr>';
            return;
          }
          tbody.innerHTML = '';
          data.leads.forEach(l => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50/80 transition-colors";
            tr.innerHTML = \`
              <td class="p-3 font-mono font-bold text-slate-900">#\${l.id}</td>
              <td class="p-3 font-semibold text-slate-900">\${l.partner_name}</td>
              <td class="p-3 text-slate-700">\${l.contact_name} (\${l.email_from})</td>
              <td class="p-3"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-bold border border-slate-200">High Priority</span></td>
              <td class="p-3 text-slate-900 font-semibold flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-700"></span> Synced to Odoo</td>
              <td class="p-3 text-slate-500 font-mono text-[11px]">\${new Date(l.updatedAt).toLocaleTimeString()}</td>
            \`;
            tbody.appendChild(tr);
          });
        }
      } catch (err) {
        console.error('Failed to load handovers', err);
      }
    }

    async function loadAutomationSettings() {
      try {
        const res = await fetch('/internal/automation/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            const s = data.settings;
            if (s.schedule) {
              if (s.schedule.sendStart) document.getElementById('autoSendStart').value = s.schedule.sendStart;
              if (s.schedule.sendEnd) document.getElementById('autoSendEnd').value = s.schedule.sendEnd;
              if (s.schedule.timezone) document.getElementById('autoTimezone').value = s.schedule.timezone;
              if (s.schedule.maxPerDay) document.getElementById('autoMaxPerDay').value = s.schedule.maxPerDay;
              if (Array.isArray(s.schedule.sendDays)) {
                document.querySelectorAll('input[name="autoDay"]').forEach(chk => {
                  chk.checked = s.schedule.sendDays.includes(chk.value);
                });
              }
            }
            if (s.cadence) {
              if (s.cadence.followupDelayDays) document.getElementById('autoFollowupDelay').value = s.cadence.followupDelayDays;
              if (s.cadence.maxSequenceSteps) document.getElementById('autoMaxSteps').value = s.cadence.maxSequenceSteps;
              if (s.cadence.batchIntervalMinutes) document.getElementById('autoBatchInterval').value = s.cadence.batchIntervalMinutes;
            }
            if (s.retry) {
              if (s.retry.maxRetries !== undefined) document.getElementById('autoMaxRetries').value = s.retry.maxRetries;
              if (s.retry.retryBackoffSeconds) document.getElementById('autoRetryBackoff').value = s.retry.retryBackoffSeconds;
              if (s.retry.onBounceAction) document.getElementById('autoOnBounce').value = s.retry.onBounceAction;
            }
            if (s.classification) {
              if (s.classification.confidenceThreshold) document.getElementById('autoConfidenceThreshold').value = s.classification.confidenceThreshold;
              if (s.classification.qaMode) document.getElementById('autoQaMode').value = s.classification.qaMode;
            }
          }

          if (data.stats) {
            updateWorkerStatsUi(data.stats, data.settings);
          }
        }
      } catch (err) {
        console.error('Failed to load automation settings', err);
      }
    }

    function updateWorkerStatsUi(stats, settings) {
      if (!stats) return;

      const windowBadge = document.getElementById('workerWindowBadge');
      const windowText = document.getElementById('workerWindowText');
      const windowDetail = document.getElementById('workerWindowDetail');

      if (stats.windowOpen) {
        windowBadge.className = 'flex items-center gap-1.5 font-bold text-slate-900';
        windowBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-700 animate-pulse"></span> <span>OPEN (Active)</span>';
        windowDetail.innerText = \`\${stats.currentDayInTz} \${stats.currentTimeInTz} (\${settings?.schedule?.timezone || 'Local'})\`;
      } else {
        windowBadge.className = 'flex items-center gap-1.5 font-bold text-slate-900';
        windowBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-400"></span> <span>CLOSED (Window Inactive)</span>';
        windowDetail.innerText = stats.windowReason || \`\${stats.currentDayInTz} \${stats.currentTimeInTz}\`;
      }

      document.getElementById('workerSentToday').innerText = stats.sentTodayCount || 0;
      document.getElementById('workerDailyCap').innerText = stats.dailyCap || 50;
      document.getElementById('workerRemainingCapacity').innerText = \`\${stats.remainingCapacityToday || 0} sends remaining today\`;

      document.getElementById('workerPendingCount').innerText = stats.pendingCount || 0;
      document.getElementById('workerRetryingCount').innerText = \`\${stats.retryingCount || 0} retrying due to backoff\`;

      const interval = settings?.cadence?.batchIntervalMinutes || 15;
      document.getElementById('workerCadenceInterval').innerText = \`Every \${interval}m\`;
    }

    async function triggerBatchNow() {
      const btn = document.getElementById('btnTriggerBatch');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin text-xs"></i> <span>Dispatching...</span>';

      const forceWindow = document.getElementById('chkForceWindow')?.checked || false;
      const alertBox = document.getElementById('workerBatchAlert');
      const alertText = document.getElementById('workerBatchAlertText');

      try {
        const res = await fetch('/internal/automation/trigger-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ forceWindow })
        });
        const data = await res.json();

        updateWorkerStatsUi(data.stats, null);

        const reasonNote = data.result.reason ? \` <i>(\${data.result.reason})</i>\` : '';
        alertBox.className = "p-3.5 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 text-slate-900 flex items-center justify-between";
        alertText.innerHTML = \`<b>Batch Executed:</b> \${data.result.sentCount} sent, \${data.result.retryingCount} retrying, \${data.result.failedCount} failed, \${data.result.skippedWindowCount} skipped (window).\${reasonNote}\`;
        alertBox.classList.remove('hidden');

        showToast(\`Batch triggered: \${data.result.sentCount} sent.\`, 'success', 'Batch Execution');
      } catch (err) {
        alertBox.className = "p-3.5 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 text-slate-900 flex items-center justify-between";
        alertText.innerText = 'Failed to execute batch: ' + err.message;
        alertBox.classList.remove('hidden');
        showToast('Failed to execute batch: ' + err.message, 'error', 'Dispatch Error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }

    async function saveAutomationSettings() {
      const statusEl = document.getElementById('autoSaveStatus');

      const settings = {
        schedule: {
          sendStart: document.getElementById('autoSendStart').value,
          sendEnd: document.getElementById('autoSendEnd').value,
          timezone: document.getElementById('autoTimezone').value,
          sendDays: Array.from(document.querySelectorAll('input[name="autoDay"]:checked')).map(el => el.value),
          maxPerDay: parseInt(document.getElementById('autoMaxPerDay').value, 10)
        },
        cadence: {
          followupDelayDays: parseInt(document.getElementById('autoFollowupDelay').value, 10),
          maxSequenceSteps: parseInt(document.getElementById('autoMaxSteps').value, 10),
          batchIntervalMinutes: parseInt(document.getElementById('autoBatchInterval').value, 10)
        },
        retry: {
          maxRetries: parseInt(document.getElementById('autoMaxRetries').value, 10),
          retryBackoffSeconds: parseInt(document.getElementById('autoRetryBackoff').value, 10),
          onBounceAction: document.getElementById('autoOnBounce').value
        },
        classification: {
          confidenceThreshold: parseInt(document.getElementById('autoConfidenceThreshold').value, 10),
          qaMode: document.getElementById('autoQaMode').value
        }
      };

      try {
        const res = await fetch('/internal/automation/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error);

        updateWorkerStatsUi(data.stats, data.settings);

        statusEl.className = "text-xs text-slate-900 font-semibold";
        statusEl.classList.remove('hidden');
        statusEl.innerText = '✅ ' + (data.message || 'Settings saved and worker reconfigured.');
        setTimeout(() => statusEl.classList.add('hidden'), 4000);

        showToast('Settings saved and worker reconfigured.', 'success', 'Saved');
      } catch (err) {
        statusEl.className = "text-xs text-slate-900 font-semibold";
        statusEl.classList.remove('hidden');
        statusEl.innerText = '❌ Failed to save: ' + err.message;
        showToast('Failed to save settings: ' + err.message, 'error', 'Save Error');
      }
    }

    function setWaPrompt(type) {
      const body = document.getElementById('wa-sim-body');
      if (type === 'pricing') {
        body.value = "Hello, what is your price per vehicle and can you send a quote?";
      } else if (type === 'demo') {
        body.value = "We have 50 delivery vans in Dubai and want to schedule a live demo next Tuesday.";
      } else if (type === 'legal') {
        body.value = "This message violates GDPR and privacy laws. I am filing a complaint with my lawyer.";
      }
    }

    async function sendSimulatedWhatsApp() {
      const btn = document.getElementById('wa-sim-btn');
      const resultBox = document.getElementById('wa-sim-result');
      const name = document.getElementById('wa-sim-name').value;
      const phone = document.getElementById('wa-sim-phone').value;
      const email = document.getElementById('wa-sim-email').value;
      const messageBody = document.getElementById('wa-sim-body').value;

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i> <span>Processing...</span>';

      try {
        const res = await fetch('/internal/whatsapp/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ partnerName: name, phone, partnerEmail: email || undefined, messageBody })
        });
        const data = await res.json();

        resultBox.classList.remove('hidden');
        document.getElementById('wa-res-type').innerText = data.classification.intentName;
        document.getElementById('wa-res-reply').innerText = data.replySent ? ('"' + data.replySent + '"') : '(No sales reply sent — routed to Compliance/Admin)';
        document.getElementById('wa-res-crm').innerText = data.handoverTriggered ? ('Created (Odoo Lead ID: ' + (data.odooLeadId || 'Auto') + ')') : 'Not required';

        loadWhatsAppConversations();
        loadKpis();

        showToast(\`WhatsApp message processed: \${data.classification.intentName}\`, 'success', 'WhatsApp AI');
      } catch (err) {
        showToast('WhatsApp simulation failed: ' + err.message, 'error', 'Simulation Error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane text-xs"></i> <span>Send Inbound to AI</span>';
      }
    }

    async function loadWhatsAppConversations() {
      try {
        const res = await fetch('/internal/whatsapp/conversations');
        const data = await res.json();
        const tbody = document.getElementById('wa-conversations-tbody');
        if (!data.conversations || data.conversations.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="py-10 text-center text-slate-400 italic">No WhatsApp conversations recorded yet. Use the simulator or send a webhook to test.</td></tr>';
          return;
        }

        tbody.innerHTML = '';
        data.conversations.forEach(c => {
          const tr = document.createElement('tr');
          tr.className = "hover:bg-slate-50/80 transition-colors";
          tr.innerHTML = \`
            <td class="py-3 font-semibold text-slate-900">
              <div>\${c.partnerName}</div>
              <div class="text-[11px] text-slate-500 font-normal font-mono">\${c.phone}</div>
            </td>
            <td class="py-3 max-w-xs truncate text-slate-800">
              "\${c.messageBody}"
            </td>
            <td class="py-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-900 border border-slate-200">
                \${c.classification.intentName}
              </span>
            </td>
            <td class="py-3 text-[11px] text-slate-800 italic max-w-xs truncate">
              \${c.replySent ? c.replySent : '<span class="text-slate-400 font-normal">None (Escalated/Suppressed)</span>'}
            </td>
            <td class="py-3">
              <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-900 border border-slate-200">
                \${c.withinMetaWindow ? 'Open (<24h)' : 'Expired'}
              </span>
            </td>
            <td class="py-3 font-semibold">
              \${c.odooLeadId ? ('<span class="text-slate-900 font-bold">Lead #' + c.odooLeadId + '</span>') : '<span class="text-slate-400 text-[11px] font-normal">None</span>'}
            </td>
          \`;
          tbody.appendChild(tr);
        });
      } catch (err) {
        console.error('Failed to load WhatsApp conversations:', err);
      }
    }

    // Initialize on load
    loadKpis();
    loadAutomationSettings();
    loadWhatsAppConversations();
  </script>
</body>
</html>`;
}
