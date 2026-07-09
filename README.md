# NCEC AI Platform — Enterprise Document Intelligence

A production-ready **demo dashboard** prepared by **Spark Technologies** for the **National Center for Environmental Compliance (NCEC)**. It covers the full **Phase 1 — AI Knowledge Platform** scope from the July 2026 discovery meeting, with bilingual (English / Arabic) UI, role-based access, and interactive workflows powered by illustrative demo data.

> **Demo notice:** This is a front-end demonstration. AI responses, document processing, and exports are simulated client-side. In production, each module connects to on-premise services (local LLMs, vector store, OCR engine, LDAP).

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Deployment](#deployment)
3. [Demo Login](#demo-login)
4. [Scope Coverage](#scope-coverage)
5. [Technology Stack](#technology-stack)
6. [Application Routes](#application-routes)
7. [Role-Based Access Control](#role-based-access-control)
8. [Architecture & Flow Diagrams](#architecture--flow-diagrams)
9. [Module Workflows](#module-workflows)
10. [Dashboard KPIs](#dashboard-kpis)
11. [Knowledge Base Document Types](#knowledge-base-document-types)
12. [Local AI Model Registry](#local-ai-model-registry)
13. [Project Structure](#project-structure)
14. [Build & Quality Checks](#build--quality-checks)

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (default http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Lint
npm run lint
```

**Requirements:** Node.js 18+ (20+ recommended), npm 9+

---

## Deployment

The app uses **HashRouter** (`/#/…`), so it deploys as a static site with no server-side routing configuration required.

### Build output

| Artifact | Path | Size (approx.) |
|----------|------|----------------|
| Entry HTML | `dist/index.html` | ~0.7 KB |
| Styles | `dist/assets/*.css` | ~48 KB (gzip ~9 KB) |
| JavaScript bundle | `dist/assets/*.js` | ~945 KB (gzip ~274 KB) |

### Vercel (recommended)

A `vercel.json` is included. Connect the repository to Vercel — it auto-detects Vite:

| Setting | Value |
|---------|-------|
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Framework | Vite |

```bash
# Optional: deploy via Vercel CLI
npx vercel --prod
```

### Netlify

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Publish directory | `dist` |

### Nginx (on-premise)

```nginx
server {
    listen 80;
    server_name ncec-ai.internal;
    root /var/www/ncec-ai-platform/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Docker (static serve)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Deployment readiness checklist

| Check | Status |
|-------|--------|
| `npm run build` passes (TypeScript + Vite) | ✅ |
| `npm run lint` passes | ✅ |
| HashRouter — no SSR / API dependency | ✅ |
| Session auth via `sessionStorage` | ✅ |
| `vercel.json` included | ✅ |
| `.gitignore` excludes `node_modules`, `dist` | ✅ |
| Bilingual RTL/LTR support | ✅ |
| All 19 scope modules represented | ✅ |

---

## Demo Login

Sign in at `/#/login`. Any password is accepted in demo mode.

| Persona | Email | Role ID | Role |
|---------|-------|---------|------|
| Ahmed Al-Khalidi | a.khalidi@ncec.gov.sa | ROLE-01 | Super Admin |
| Khalid Al-Shehri | k.shehri@ncec.gov.sa | ROLE-02 | Department Manager |
| Sara Al-Otaibi | s.otaibi@ncec.gov.sa | ROLE-03 | Reviewer |
| Mona Al-Harbi | m.harbi@ncec.gov.sa | ROLE-04 | Legal Team |
| Fahad Al-Dossary | f.dossary@ncec.gov.sa | ROLE-05 | Technical Team |
| Noura Al-Qahtani | n.qahtani@ncec.gov.sa | ROLE-06 | Environmental Team |
| James Carter | j.carter@consultant.ext | ROLE-07 | External Consultant |
| Guest Viewer | viewer@ncec.gov.sa | ROLE-08 | Read Only |

Default demo password: `NCEC-demo-2026`

---

## Scope Coverage

All 19 Phase 1 modules from the NCEC discovery meeting are implemented in the demo UI:

| # | Scope Module | App Route | Key Capabilities |
|---|--------------|-----------|------------------|
| 1 | Central Knowledge Base | `/knowledge-base` | Upload PDF/DOCX/XLS, indexing, metadata |
| 2 | AI Document Assistant | `/assistant` | NL chat, citations, page refs, KB scope toggle |
| 3 | Arabic Document Intelligence | `/assistant`, `/ocr`, `/search` | Arabic OCR, semantic search, RTL UI |
| 4 | Environmental Study Analysis | `/environmental-studies` | 500+ page EIA review, exec summary, reports |
| 5 | Regulatory & Legal AI | `/regulatory` | Conflict detection, clause comparison, drafting |
| 6 | Document Generation | `/generation` | Regulations, policies, memos — DOCX/PDF export |
| 7 | Document Review | `/review` | Completeness, compliance, readiness scoring |
| 8 | Recommendation Engine | `/recommendations` | Approve / reject / revise with confidence |
| 9 | AI Legal Assistant | `/legal-assistant` | Legal Q&A, clause explanation, case lookup |
| 10 | Data Analysis | `/data-analysis` | Excel/CSV upload, trends, anomalies, forecast |
| 11 | Search Engine | `/search` | Semantic, keyword, hybrid search with filters |
| 12 | Workflow Automation | `/workflows` | Review, approval, assignment, status tracking |
| 13 | RBAC | `/admin` | 8 roles, module + action permissions |
| 14 | Security | `/admin` | On-premise, audit logs, encryption, AD/LDAP |
| 15 | AI Model Requirements | `/admin` | Local LLM registry (Ollama/vLLM) |
| 16 | OCR Module | `/ocr` | Arabic/English scanned docs, tables, forms |
| 17 | Knowledge Management | `/knowledge-base`, `/admin` | Indexing, versioning, related docs |
| 18 | Dashboard | `/` | KPIs, alerts, charts, role-adaptive views |
| 19 | Administration | `/admin` | Users, departments, models, backup/restore |

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Build tool | Vite | 8.x |
| UI framework | React | 19.x |
| Language | TypeScript | 6.x |
| Styling | Tailwind CSS | 4.x |
| Routing | React Router (HashRouter) | 7.x |
| Charts | Recharts | 3.x |
| Icons | Lucide React | 1.x |
| Linting | Oxlint | 1.x |
| Document export | Client-side OOXML (DOCX) + print-to-PDF | — |

---

## Application Routes

| Group | Route | Page Component |
|-------|-------|----------------|
| Auth | `/login` | `Login.tsx` |
| Overview | `/` | `Dashboard.tsx` |
| AI Workspace | `/assistant` | `DocAssistant.tsx` |
| AI Workspace | `/legal-assistant` | `LegalAssistant.tsx` |
| AI Workspace | `/search` | `SearchPage.tsx` |
| AI Workspace | `/data-analysis` | `DataAnalysis.tsx` |
| Documents | `/knowledge-base` | `KnowledgeBase.tsx` |
| Documents | `/environmental-studies` | `EnvStudies.tsx` |
| Documents | `/regulatory` | `RegulatoryAI.tsx` |
| Documents | `/generation` | `DocGeneration.tsx` |
| Documents | `/review` | `DocReview.tsx` |
| Documents | `/ocr` | `OCRPage.tsx` |
| Operations | `/recommendations` | `Recommendations.tsx` |
| Operations | `/workflows` | `Workflows.tsx` |
| Administration | `/admin` | `Admin.tsx` |

---

## Role-Based Access Control

### Permission flags

| Permission | Description |
|------------|-------------|
| `upload` | Upload documents to knowledge base |
| `chat` | Use AI assistants (document + legal) |
| `generate` | Generate documents from templates |
| `approve` | Approve workflows and recommendations |
| `admin` | Access Admin & Security module |

### Role × Permission matrix

| Role | ID | Upload | Chat | Generate | Approve | Admin | Modules |
|------|----|--------|------|----------|---------|-------|---------|
| Super Admin | ROLE-01 | ✅ | ✅ | ✅ | ✅ | ✅ | All 14 |
| Department Manager | ROLE-02 | ✅ | ✅ | ✅ | ✅ | ❌ | 13 |
| Reviewer | ROLE-03 | ✅ | ✅ | ✅ | ❌ | ❌ | 9 |
| Legal Team | ROLE-04 | ✅ | ✅ | ✅ | ❌ | ❌ | 9 |
| Technical Team | ROLE-05 | ✅ | ✅ | ❌ | ❌ | ❌ | 7 |
| Environmental Team | ROLE-06 | ✅ | ✅ | ❌ | ❌ | ❌ | 8 |
| External Consultant | ROLE-07 | ❌ | ✅ | ❌ | ❌ | ❌ | 4 |
| Read Only | ROLE-08 | ❌ | ❌ | ❌ | ❌ | ❌ | 3 |

### RBAC enforcement points

| Layer | Mechanism | File |
|-------|-----------|------|
| Route guard | Redirect to `/login` if unauthenticated | `Layout.tsx` |
| Module guard | `AccessGate` blocks unauthorized routes | `Layout.tsx` |
| Sidebar filter | Nav items filtered by `role.modules` | `Layout.tsx` |
| Action gating | Buttons/inputs check `role.perms` | Per-page components |
| Role switcher | Header dropdown for live RBAC preview | `Layout.tsx` |

---

## Architecture & Flow Diagrams

### 1. On-Premise System Architecture

```mermaid
flowchart TB
    subgraph Users["NCEC Users"]
        U1[Department Staff]
        U2[Legal Team]
        U3[Environmental Reviewers]
        U4[External Consultants]
    end

    subgraph Frontend["NCEC AI Platform — Web UI"]
        UI[React SPA<br/>Bilingual EN/AR]
        RBAC[Role-Based Access Control]
        DASH[Management Dashboard]
    end

    subgraph OnPrem["On-Premise Infrastructure — Air-Gapped"]
        API[API Gateway / App Server]
        LLM[Local LLM Cluster<br/>Ollama / vLLM]
        VDB[(Vector Database<br/>Embeddings BGE-M3)]
        DOC[(Document Store<br/>PDF · DOCX · XLS)]
        OCR[Arabic OCR Engine]
        LDAP[Active Directory / LDAP]
        AUDIT[(Audit Log Store)]
    end

    U1 & U2 & U3 & U4 --> UI
    UI --> RBAC --> API
    API --> LLM
    API --> VDB
    API --> DOC
    API --> OCR
    API --> LDAP
    API --> AUDIT
    DASH --> API
```

### 2. Authentication & Session Flow

```mermaid
sequenceDiagram
    actor User
    participant Login as Login Page
    participant RoleCtx as RoleContext
    participant Storage as sessionStorage
    participant Layout as Layout Guard
    participant Dashboard as Dashboard

    User->>Login: Select demo persona + Sign In
    Login->>RoleCtx: login(demoUser)
    RoleCtx->>Storage: Persist user JSON
    RoleCtx->>RoleCtx: Set roleId from user.roleId
    Login->>Dashboard: navigate("/")
    Layout->>RoleCtx: Check user !== null
    alt Authenticated
        Layout->>Dashboard: Render Outlet
    else Not authenticated
        Layout->>Login: Navigate to /login
    end
    User->>Layout: Sign Out
    Layout->>RoleCtx: logout()
    RoleCtx->>Storage: Remove session
    Layout->>Login: Navigate to /login
```

### 3. Document Ingestion & Indexing Pipeline

```mermaid
flowchart LR
    A[Upload Document<br/>PDF · DOCX · XLS] --> B{File Type?}
    B -->|Scanned PDF| C[Arabic OCR Engine]
    B -->|Native digital| D[Text Extraction]
    C --> E[Structured Text + Tables]
    D --> E
    E --> F[Metadata Extraction<br/>Title · Date · Dept · Tags]
    F --> G[Chunking & Embedding<br/>BGE-M3]
    G --> H[(Vector Index)]
    F --> I[(Document Store)]
    H --> J[Knowledge Base<br/>Searchable]
    I --> J
    J --> K[Dashboard KPI<br/>Total Documents ↑]
```

### 4. AI Document Assistant — RAG Q&A Flow

```mermaid
flowchart TD
    Q[User Question<br/>AR or EN] --> S{Search Scope}
    S -->|Entire KB| H[Hybrid Search<br/>Semantic + Keyword]
    S -->|Current doc| D[Single-doc retrieval]
    H --> R[Top-K Chunks<br/>with page numbers]
    D --> R
    R --> L[Local LLM<br/>Falcon-180B / Jais-30B]
    L --> A[Grounded Answer<br/>zero hallucination policy]
    A --> C[Citation Cards<br/>doc · page · excerpt]
    C --> V{User clicks citation?}
    V -->|Yes| M[Source Viewer Modal<br/>full passage highlighted]
    V -->|No| Q
```

### 5. Environmental Study Analysis Workflow

```mermaid
flowchart TD
    UP[Upload EIA Study<br/>500+ pages] --> OCR[OCR if scanned]
    OCR --> PARSE[Section extraction<br/>Baseline · Impacts · Mitigation]
    PARSE --> REG[Compare vs Regulations<br/>Art. 14 checklist]
    REG --> GAP{Missing sections?}
    GAP -->|Yes| FLAG[Flag gaps + risks<br/>Dashboard alert]
    GAP -->|No| SCORE[Compliance score]
    FLAG --> REC[Recommendation<br/>Revise / Reject]
    SCORE --> REC2[Recommendation<br/>Approve / Conditional]
    REC & REC2 --> GEN[Generate Reports]
    GEN --> ES[Executive Summary<br/>DOCX download]
    GEN --> RR[Review Report<br/>DOCX download]
```

### 6. Regulatory Conflict Detection Flow

```mermaid
flowchart LR
    subgraph Input
        R1[Regulation A<br/>Executive Reg. 45/2025]
        R2[Procedure B<br/>Air Quality v3.2]
    end
    R1 & R2 --> PARSE[Clause-level parsing<br/>hierarchy aware]
    PARSE --> CMP[Semantic comparison]
    CMP --> DET{Conflict?}
    DET -->|Yes| MOD[Impact Analysis Modal<br/>side-by-side clauses]
    DET -->|No| OK[Harmonized ✓]
    MOD --> HARM[Suggest harmonized wording]
    HARM --> DRAFT[Draft updated procedure]
    DRAFT --> WF[Workflow → Legal approval]
```

### 7. Document Generation Workflow

```mermaid
flowchart TD
    START[Select document type<br/>Regulation · Policy · Memo · Report] --> TPL[Choose NCEC template<br/>NCEC-DM-01 etc.]
    TPL --> INPUT[Define subject + scope<br/>+ reference documents]
    INPUT --> REF[Add grounding sources<br/>modal picker]
    REF --> GEN[AI drafts in template format<br/>AR or EN]
    GEN --> PREVIEW[Preview generated draft]
    PREVIEW --> EXP{Export?}
    EXP -->|DOCX| DX[Client-side OOXML<br/>download .docx]
    EXP -->|PDF| PDF[Print-ready view<br/>Save as PDF]
    PREVIEW --> REV[Send to Document Review]
```

### 8. Document Review Workflow

```mermaid
flowchart TD
    SUB[Submit document for review<br/>title · type · department] --> QUEUE[Processing queue]
    QUEUE --> AI[AI Review Engine]
    AI --> CHK1[Completeness check]
    AI --> CHK2[Compliance vs standards]
    AI --> CHK3[Inconsistency detection]
    AI --> CHK4[Missing clauses]
    CHK1 & CHK2 & CHK3 & CHK4 --> SCORE[Readiness score 0–100]
    SCORE --> SUG[Correction suggestions<br/>alternative wording]
    SUG --> DEC{Outcome}
    DEC -->|Pass| APP[Ready for approval workflow]
    DEC -->|Fail| RET[Return for revision]
```

### 9. Recommendation Engine Flow

```mermaid
flowchart TD
    CASE[Permit / Study / Report case] --> EVIDENCE[Gather supporting references<br/>regulations · studies · policies]
    EVIDENCE --> AI[AI Analysis<br/>confidence scoring]
    AI --> REC{Recommendation}
    REC --> APP[✅ Recommend Approval]
    REC --> REJ[❌ Recommend Rejection]
    REC --> REV[🔄 Recommend Revision]
    APP & REJ & REV --> REASON[Explain reasoning<br/>+ citation list]
    REASON --> HUMAN[Human decision required<br/>AI never decides]
    HUMAN --> WF[Workflow Automation<br/>tracks final decision]
```

### 10. Enterprise Search Flow

```mermaid
flowchart LR
    Q[Search query<br/>AR / EN] --> MODE{Search mode}
    MODE -->|Semantic| EMB[Embedding similarity<br/>BGE-M3]
    MODE -->|Keyword| KW[Full-text index]
    MODE -->|Hybrid| HYB[Combined ranking]
    EMB & KW & HYB --> FILT[Filters<br/>type · dept · date · tags]
    FILT --> RES[Ranked results<br/>relevance score]
    RES --> CLK{Click result?}
    CLK -->|Yes| FULL[Full content modal<br/>highlighted snippet]
    CLK -->|No| Q
```

### 11. OCR Processing Pipeline

```mermaid
flowchart TD
    IN[Scanned PDF / Image<br/>Arabic or English] --> QUEUE[OCR Queue]
    QUEUE --> DET[Layout detection<br/>text · tables · forms]
    DET --> AR{Arabic content?}
    AR -->|Yes| AR_OCR[Arabic OCR Engine<br/>RTL + diacritics]
    AR -->|No| EN_OCR[English OCR Engine]
    AR_OCR & EN_OCR --> STRUCT[Structured output<br/>text + tables + metadata]
    STRUCT --> INDEX[Index into Knowledge Base]
    INDEX --> SEARCH[Available in Enterprise Search]
```

### 12. Deployment Pipeline

```mermaid
flowchart LR
    SRC[Source Code<br/>Git repository] --> CI[CI: npm ci]
    CI --> BUILD[npm run build<br/>tsc + vite]
    BUILD --> LINT[npm run lint]
    LINT --> DIST[dist/ static assets]
    DIST --> DEPLOY{Target}
    DEPLOY -->|Vercel| V[Vercel CDN<br/>vercel.json]
    DEPLOY -->|Netlify| N[Netlify CDN]
    DEPLOY -->|On-premise| NG[Nginx / Docker<br/>internal network]
    V & N & NG --> USER[NCEC Users<br/>/#/login]
```

---

## Module Workflows

### Interactive demo features by module

| Module | Interactive Features |
|--------|---------------------|
| Dashboard | Clickable KPI cards → navigate to module; Live alerts → impact analysis modal; KB pie chart → category details |
| AI Document Assistant | KB scope toggle; citation links → source viewer with full passage |
| Enterprise Search | Click result → full content modal |
| Environmental Studies | Executive Summary / Review Report → DOCX download |
| Regulatory & Legal AI | Full comparison → side-by-side conflict modal |
| Document Generation | Add references modal; DOCX + PDF export |
| Document Review | Review Document form → progress → readiness score |
| Admin & Security | Add User modal; View as role preview modal |
| All KPI cards | Sparkline charts on hover across modules |

---

## Dashboard KPIs

| KPI | Default Value | Click navigates to |
|-----|---------------|-------------------|
| Total Documents | 11,440 | `/knowledge-base` |
| AI Queries Today | 2,463 | `/assistant` |
| Active Users | 284 | `/admin` |
| Searches / Week | 23.4K | `/search` |
| Processing Queue | 47 | `/ocr` |
| Reviews Completed | 1,208 | `/review` |
| Active Workflows | 36 | `/workflows` |
| Model Accuracy | 96.2% | `/admin` |

KPI visibility adapts per role (e.g., Read Only sees fewer cards).

---

## Knowledge Base Document Types

| Type | Count | Share | Recent Uploads (demo) |
|------|-------|-------|----------------------|
| Regulations | 3,120 | 27.3% | 48 |
| Environmental Studies | 1,840 | 16.1% | 23 |
| Policies & SOPs | 2,260 | 19.8% | 31 |
| Legal Documents | 1,470 | 12.8% | 19 |
| Technical Manuals | 980 | 8.6% | 12 |
| Circulars & Other | 1,770 | 15.5% | 27 |
| **Total** | **11,440** | **100%** | **160** |

---

## Local AI Model Registry

| Model | Purpose | Latency (demo) | Load |
|-------|---------|----------------|------|
| Falcon-180B (AR/EN) | Document QA & drafting | 1.2s | 68% |
| Jais-30B Arabic | Arabic legal reasoning | 0.9s | 54% |
| BGE-M3 Embeddings | Semantic search & RAG | 0.1s | 41% |
| Arabic OCR Engine | Scanned docs & tables | 2.4s | 77% |

All models run locally — **zero external API calls**.

---

## Project Structure

```
ncec-ai-platform/
├── public/                  # Static assets (favicon, icons)
├── src/
│   ├── App.tsx              # Routes (HashRouter)
│   ├── main.tsx             # Entry point
│   ├── index.css            # Tailwind + theme variables
│   ├── i18n.tsx             # EN/AR translations + RTL
│   ├── roles.tsx            # RBAC roles, demo users, auth context
│   ├── components/
│   │   ├── Layout.tsx       # Sidebar, header, route guard
│   │   └── ui.tsx           # KpiCard, Card, Modal, Button, charts
│   ├── pages/               # One page per module (14 pages)
│   └── utils/
│       └── docExport.ts     # Client-side DOCX/PDF export
├── vercel.json              # Vercel deployment config
├── vite.config.ts
├── package.json
└── README.md
```

---

## Build & Quality Checks

```bash
# Full production verification
npm run build && npm run lint && npm run preview
```

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Local development with HMR |
| `build` | `tsc -b && vite build` | Type-check + production bundle |
| `preview` | `vite preview` | Serve `dist/` locally |
| `lint` | `oxlint` | Static analysis |

---

## Key Design Principles

| Principle | Implementation |
|-----------|----------------|
| On-premise first | No cloud AI APIs; local LLM narrative throughout UI |
| Citation-first AI | Every answer links to source doc + page number |
| Human-in-the-loop | Recommendation engine advises — never auto-decides |
| Bilingual | Full EN/AR with RTL layout via `document.documentElement.dir` |
| Modular | Each of 19 scope areas maps to a dedicated page |
| RBAC | 8 roles with module routes + 5 action permissions |

---

**Prepared by Spark Technologies for NCEC — July 2026 Discovery Meeting**
