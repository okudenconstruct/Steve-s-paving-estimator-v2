# Paving Calculator — Rubric Conformance Technical Specification

## Document Purpose
This specification maps every element of the Universal Construction Cost Estimating Rubric to a concrete implementation plan for the Paving Calculator app. The app remains **paving-focused** (not trade-universal), but its internal architecture will conform to the rubric's structural requirements.

## Constraints
- **Platform**: Capacitor hybrid app (static HTML/CSS/JS, no build step)
- **No frameworks**: Vanilla JS, no React/Vue/Angular
- **Offline-first**: All logic runs client-side, no server
- **Single trade**: Paving (excavation, grading, aggregate, milling, asphalt paving, tack coat)
- **Storage**: localStorage (no database server), with optional JSON export/import for versioning

---

## Architecture Overview

The current monolithic `index.html` (2,722 lines) will be split into a modular file structure while remaining a static web app with no build step. ES6 modules (`<script type="module">`) enable clean separation without a bundler.

### New File Structure
```
www/
├── index.html                  (Shell: HTML structure, links CSS/JS)
├── css/
│   └── styles.css              (All styles extracted from <style> blocks)
├── js/
│   ├── main.js                 (App initialization, event wiring, UI controller)
│   ├── models/
│   │   ├── Resource.js          (Tier 0.1 — Labor, Equipment, Material, Subcontract)
│   │   ├── ProductionRate.js    (Tier 0.2 — Rate with reference conditions)
│   │   ├── Quantity.js          (Tier 0.3 — Measured quantity with waste factors)
│   │   ├── TimeUnit.js          (Tier 0.4 — Work calendar configuration)
│   │   ├── Crew.js              (Tier 1.3 — Crew composition)
│   │   ├── Activity.js          (Tier 1 — Work Activity with full schema)
│   │   ├── ProductivityFactor.js (Tier 1.2 — Composite productivity multiplier)
│   │   ├── WorkPackage.js       (Tier 2 — WBS grouping)
│   │   ├── Schedule.js          (Tier 3 — Dependencies + CPM)
│   │   ├── IndirectCosts.js     (Tier 4 — GC, overhead, fee, escalation, contingency)
│   │   ├── RiskRegister.js      (Tier 5 — Risk items + Monte Carlo)
│   │   └── Estimate.js          (Top-level estimate container with version tracking)
│   ├── engine/
│   │   ├── Calculator.js        (Calculation engine — bottom-up cost derivation)
│   │   ├── Scheduler.js         (CPM engine — forward/backward pass, float)
│   │   ├── ResourceLeveler.js   (Resource histogram + conflict detection)
│   │   └── MonteCarlo.js        (Probabilistic simulation engine)
│   ├── data/
│   │   ├── paving-defaults.js   (Default crews, rates, activities for paving trade)
│   │   ├── constants.js         (Material densities, conversion factors)
│   │   └── uom.js              (Unit of measure definitions + compatibility rules)
│   ├── storage/
│   │   └── EstimateStore.js     (localStorage CRUD with versioning)
│   ├── validation/
│   │   └── Validator.js         (Rubric axiom enforcement + ratio checks)
│   └── ui/
│       ├── Renderer.js          (DOM update orchestration)
│       ├── ActivityCard.js      (Activity input/output card component)
│       ├── CostSummary.js       (Cost summary panel component)
│       ├── ScheduleView.js      (Schedule / Gantt visualization)
│       └── ExportService.js     (Export to clipboard, JSON, print)
├── fonts/                       (Existing font files, unchanged)
└── icons/                       (Existing, unchanged)
```

---

## TIER 0 — IRREDUCIBLE PRIMITIVES

### 0.1 — Resource Unit (`js/models/Resource.js`)

**Current state**: Crew rates are flat numbers (`rateCrewExc`, `rateCrewBase`, etc.) stored as single $/hr values. No resource breakdown.

**Target state**: Each resource is a typed object with full cost structure.

```javascript
// Resource types
const ResourceType = { LABOR: 'labor', EQUIPMENT: 'equipment', MATERIAL: 'material', SUBCONTRACT: 'subcontract' };

class Resource {
  constructor({ id, name, type, unit, costRate, costStructure, source }) {
    this.id = id;                    // Unique ID (e.g., "L-001")
    this.name = name;                // "Paver Operator"
    this.type = type;                // ResourceType enum
    this.unit = unit;                // UOM reference (e.g., "hr", "ton", "ea")
    this.costRate = costRate;        // $/unit (fully burdened for labor)
    this.costStructure = costStructure; // Breakdown: { baseWage, burden, fringes, perDiem } for labor
                                        // { ownershipPerHr, operatingPerHr, mobDemob } for equipment
                                        // { unitCost, freight, wasteFactor, taxRate } for material
    this.source = source;            // "Company historical" | "RS Means" | "Manufacturer" | etc.
  }
}
```

**Paving-specific default resources** (in `paving-defaults.js`):

**Labor resources**:
| ID | Name | Default $/hr |
|---|---|---|
| L-001 | Excavator Operator | configurable |
| L-002 | Laborer (General) | configurable |
| L-003 | Paver Operator | configurable |
| L-004 | Roller Operator | configurable |
| L-005 | Grader Operator | configurable |
| L-006 | Milling Machine Operator | configurable |
| L-007 | Foreman | configurable |

**Equipment resources**:
| ID | Name | Default $/hr |
|---|---|---|
| E-001 | Excavator (Cat 320 class) | configurable |
| E-002 | Skid Steer | configurable |
| E-003 | Motor Grader | configurable |
| E-004 | Plate Compactor | configurable |
| E-005 | Vibratory Roller | configurable |
| E-006 | Cold Planer/Milling Machine | configurable |
| E-007 | Asphalt Paver | configurable |
| E-008 | Breakdown Roller | configurable |
| E-009 | Finish Roller | configurable |
| E-010 | Material Transfer Vehicle | configurable |
| E-011 | Tack Distributor | configurable |
| E-012 | Tri-Axle Dump Truck | configurable |

**Material resources**:
| ID | Name | Unit | Default |
|---|---|---|---|
| M-001 | 9.5mm HMA Surface | ton | configurable |
| M-002 | 19mm HMA Base | ton | configurable |
| M-003 | DGA (Dense Graded Aggregate) | ton | configurable |
| M-004 | Tack Coat (Emulsion) | gal | configurable |

**Migration from current app**: The current flat `rateCrewExc` etc. fields become the **composite crew hourly rate** (sum of all labor + equipment resources in a crew). Users can either continue entering a single composite rate (backward compatible) or break it down into component resources for more detail.

---

### 0.2 — Production Rate (`js/models/ProductionRate.js`)

**Current state**: Dropdown selects with fixed values (e.g., excavation: 50, 100, 150... CY/day). No reference conditions documented in the data model.

**Target state**:

```javascript
class ProductionRate {
  constructor({ id, activityType, outputQty, outputUOM, perResourceCount, perTimeUnit, referenceConditions, source, sourceRank }) {
    this.id = id;
    this.activityType = activityType;     // "excavation", "milling", "paving_base", etc.
    this.outputQty = outputQty;           // e.g., 600
    this.outputUOM = outputUOM;           // "CY", "SY", "ton"
    this.perResourceCount = perResourceCount; // 1 (per crew)
    this.perTimeUnit = perTimeUnit;       // "day" (8-hr day)
    this.referenceConditions = referenceConditions; // Object describing baseline conditions
    this.source = source;                 // "WisDOT 2022", "Company historical", etc.
    this.sourceRank = sourceRank;         // 1=company, 2=published, 3=manufacturer, 4=first-principles, 5=analogous
  }
}
```

**Reference conditions object**:
```javascript
referenceConditions = {
  crewComposition: "Standard excavation crew (1 excavator, 1 operator, 2 laborers)",
  soilType: "Common earth, no rock",
  siteAccess: "Open site, unrestricted",
  weatherBand: "Dry, 40-85°F",
  specComplexity: "Standard tolerance",
  notes: "WisDOT Highway typical production; parking lot work uses complexity modifier"
}
```

**UI change**: Production rate dropdowns remain but gain an info icon that shows the reference conditions. Custom rate entry is added alongside the dropdown. A "source" badge shows the rate's provenance.

---

### 0.3 — Quantity (`js/models/Quantity.js`)

**Current state**: Area × Depth calculated inline. Waste factor applied as a global dropdown multiplier.

**Target state**:

```javascript
class Quantity {
  constructor({ netQuantity, uom, wasteFactor, designContingency, method }) {
    this.netQuantity = netQuantity;         // In-place quantity from takeoff
    this.uom = uom;                         // Unit of measure
    this.wasteFactor = wasteFactor;          // 1.05, 1.07, 1.10 etc.
    this.designContingency = designContingency || 1.0; // Additional contingency
    this.method = method;                   // "area×depth÷324" or "area×depth×0.0575" etc.
  }

  get grossQuantity() {
    return this.netQuantity * this.wasteFactor * this.designContingency;
  }
}
```

**No UI change needed** — the current waste factor dropdowns already serve this role. The data model simply wraps them formally.

---

### 0.4 — Time Unit (`js/models/TimeUnit.js`)

**Current state**: Hardcoded `WORKDAY_MINUTES: 480` (8-hr day). No calendar configuration.

**Target state**:

```javascript
class TimeUnit {
  constructor({
    hoursPerShift = 8,
    shiftsPerDay = 1,
    workDaysPerWeek = 5,
    calendarToWorkDayFactor = null,  // auto-calculated if null
    seasonalWindow = null,           // { startMonth, endMonth } for paving season
    notes = ''
  } = {}) {
    this.hoursPerShift = hoursPerShift;
    this.shiftsPerDay = shiftsPerDay;
    this.workDaysPerWeek = workDaysPerWeek;
    this.calendarToWorkDayFactor = calendarToWorkDayFactor || (workDaysPerWeek / 7);
    this.seasonalWindow = seasonalWindow;
    this.notes = notes;
  }

  get minutesPerShift() { return this.hoursPerShift * 60; }
  get hoursPerDay() { return this.hoursPerShift * this.shiftsPerDay; }
}
```

**UI addition**: A small "Work Calendar" section in Settings that shows hours/shift (default 8), days/week (default 5). Most users leave defaults; power users can configure for overtime or weekend work.

---

## TIER 1 — WORK ACTIVITY

### 1.1 — Activity Definition Schema (`js/models/Activity.js`)

**Current state**: Each activity is a block of inline calculations in `calculateAll()` (lines 2297-2528). No Activity object exists.

**Target state**: Every activity is a self-contained object:

```javascript
class Activity {
  constructor({
    id, description, wbsCode, quantity, uom,
    crew, productionRate, productivityFactor,
    materialResources, mobilization
  }) {
    this.id = id;                           // "EXC-001"
    this.description = description;         // "Excavation — Parking Lot A"
    this.wbsCode = wbsCode;               // "01.01"
    this.quantity = quantity;               // Quantity object
    this.uom = uom;                        // Must match productionRate.outputUOM
    this.crew = crew;                       // Crew object
    this.productionRate = productionRate;   // ProductionRate object
    this.productivityFactor = productivityFactor; // ProductivityFactor object
    this.materialResources = materialResources;   // [{resource, quantityPerUnit}]
    this.mobilization = mobilization;      // { included: bool, cost: number }

    // Dependency fields (Tier 3)
    this.dependencies = [];                // [{predecessorId, type, lag}]
  }

  // Derived values (Tier 1.1 table)
  get adjustedProductionRate() {
    return this.productionRate.outputQty * this.productivityFactor.composite;
  }

  get duration() {
    if (!this.adjustedProductionRate) return 0;
    return this.quantity.grossQuantity / this.adjustedProductionRate;
  }

  get laborCost() {
    return this.duration * this.crew.laborCostPerDay;
  }

  get equipmentCost() {
    return this.duration * this.crew.equipmentCostPerDay;
  }

  get materialCost() {
    let total = 0;
    for (const mr of this.materialResources) {
      total += this.quantity.grossQuantity * mr.quantityPerUnit * mr.resource.costRate;
    }
    return total;
  }

  get directCost() {
    return this.laborCost + this.equipmentCost + this.materialCost +
           (this.mobilization.included ? this.mobilization.cost : 0);
  }
}
```

**Current app's 6 activities map to**:
| Current | Activity ID | Description | UOM | Production Rate UOM |
|---|---|---|---|---|
| Excavation | EXC-001 | Earthwork Excavation | CY | CY/day |
| Fine Grading | FG-001 | Subgrade Fine Grading | SY | SY/day |
| DGA Base | DGA-001 | Dense Graded Aggregate Base | CY | CY/day |
| Milling | MILL-001 | Asphalt Milling | SY | SY/day |
| 19mm Base | PAVE-001 | HMA Base Course (19mm) | SY | SY/day |
| 9.5mm Surface | PAVE-002 | HMA Surface Course (9.5mm) | SY | SY/day |
| Tack Coat | TACK-001 | Tack Coat Application | SY | (lump — no production rate) |

---

### 1.2 — Productivity Factor Model (`js/models/ProductivityFactor.js`)

**Current state**: A single "Project Complexity" dropdown with 4 options (0.55, 0.70, 0.85, 1.0). This is a *global* modifier that acts as a crude approximation of the rubric's composite productivity factor.

**Target state**: A multi-factor model where each modifier is independently adjustable per activity (with project-level defaults):

```javascript
class ProductivityFactor {
  constructor(modifiers = {}) {
    // Each modifier is a multiplier where 1.0 = reference conditions
    this.siteAccess       = modifiers.siteAccess       ?? 1.0;  // 0.5 (very congested) to 1.0 (open)
    this.weather          = modifiers.weather           ?? 1.0;  // 0.7 (extreme) to 1.0 (ideal)
    this.terrain          = modifiers.terrain           ?? 1.0;  // 0.8 (steep/rough) to 1.0 (flat)
    this.specComplexity   = modifiers.specComplexity    ?? 1.0;  // 0.7 (tight tolerance) to 1.0 (standard)
    this.learningCurve    = modifiers.learningCurve     ?? 1.0;  // 1.0 (first time) to 1.15 (high repetition)
    this.overtimeShift    = modifiers.overtimeShift     ?? 1.0;  // 0.85 (sustained OT) to 1.0 (normal)
    this.crewExperience   = modifiers.crewExperience    ?? 1.0;  // 0.8 (novice) to 1.1 (expert)
    this.materialHandling = modifiers.materialHandling  ?? 1.0;  // 0.8 (long haul) to 1.0 (staging adjacent)
    this.regulatorySafety = modifiers.regulatorySafety  ?? 1.0;  // 0.7 (heavy compliance) to 1.0 (minimal)
    this.tradeStacking    = modifiers.tradeStacking     ?? 1.0;  // 0.7 (heavy stacking) to 1.0 (single trade)

    // Each modifier must have a basis
    this.bases = modifiers.bases || {};
  }

  get composite() {
    return this.siteAccess * this.weather * this.terrain * this.specComplexity *
           this.learningCurve * this.overtimeShift * this.crewExperience *
           this.materialHandling * this.regulatorySafety * this.tradeStacking;
  }
}
```

**Backward compatibility**: The current "Project Complexity" dropdown values map to pre-configured composite factors:
- **Roadway (1.0)**: All modifiers at 1.0
- **Simple (0.85)**: siteAccess=0.92, specComplexity=0.92 (product ≈ 0.85)
- **Standard (0.70)**: siteAccess=0.85, specComplexity=0.82 (product ≈ 0.70)
- **Complex (0.55)**: siteAccess=0.75, specComplexity=0.73 (product ≈ 0.55)

**UI**: Keep the "Project Complexity" dropdown as a **preset** selector. Add an expandable "Advanced Productivity Factors" panel that shows all 10 individual sliders. Changing the preset populates the sliders; manually adjusting any slider switches the preset to "Custom."

---

### 1.3 — Crew Composition (`js/models/Crew.js`)

**Current state**: A single "Crew Size" dropdown (person count) and a single "Crew Rate" ($/hr) per activity. No individual resource breakdown.

**Target state**:

```javascript
class Crew {
  constructor({ id, name, laborComponents, equipmentComponents }) {
    this.id = id;                   // "C-EXC-01"
    this.name = name;               // "Excavation Crew"
    this.laborComponents = laborComponents;       // [{ resource, count }]
    this.equipmentComponents = equipmentComponents; // [{ resource, count }]
  }

  get hourlyCost() {
    let total = 0;
    for (const lc of this.laborComponents) total += lc.resource.costRate * lc.count;
    for (const ec of this.equipmentComponents) total += ec.resource.costRate * ec.count;
    return total;
  }

  get laborCostPerHour() {
    return this.laborComponents.reduce((sum, lc) => sum + lc.resource.costRate * lc.count, 0);
  }

  get equipmentCostPerHour() {
    return this.equipmentComponents.reduce((sum, ec) => sum + ec.resource.costRate * ec.count, 0);
  }

  get laborCostPerDay() { return this.laborCostPerHour * 8; } // uses TimeUnit
  get equipmentCostPerDay() { return this.equipmentCostPerHour * 8; }
  get totalHeadcount() {
    return this.laborComponents.reduce((sum, lc) => sum + lc.count, 0);
  }
}
```

**Default paving crews** (in `paving-defaults.js`):
| Crew ID | Name | Labor | Equipment |
|---|---|---|---|
| C-EXC-01 | Excavation Crew | 1 Operator + 2 Laborers | 1 Excavator + 1 Skid Steer |
| C-FG-01 | Fine Grading Crew | 1 Operator + 1 Laborer | 1 Grader + 1 Compactor |
| C-DGA-01 | DGA Crew | 1 Operator + 2 Laborers | 1 Excavator + 1 Skid Steer + 1 Roller |
| C-MILL-01 | Milling Crew | 1 Operator + 3 Laborers | 1 Cold Planer + 1 Skid Steer |
| C-PAVE-01 | Paving Crew | 1 Operator + 5 Laborers | 1 Paver + 2 Rollers |
| C-PAVE-02 | Paving Crew + MTV | 1 Operator + 5 Laborers | 1 Paver + 2 Rollers + 1 MTV |

**Backward compatibility**: Users who prefer the current simplified approach can enter a single composite crew rate in a "Quick Rate" field. The system stores this as a single-resource crew. The detailed breakdown is optional but available.

---

## TIER 2 — WORK PACKAGE AND WBS AGGREGATION

### 2.1 — Work Breakdown Structure (`js/models/WorkPackage.js`)

**Current state**: No WBS. Activities are flat and independent.

**Target state**: A two-level WBS appropriate for parking lot / roadway paving:

```
Level 1: Project
├── Level 2: Earthwork
│   ├── Activity: Excavation
│   └── Activity: Fine Grading
├── Level 2: Aggregate Base
│   └── Activity: DGA Base
├── Level 2: Milling
│   └── Activity: Milling
├── Level 2: Asphalt Paving
│   ├── Activity: 19mm Base Course
│   ├── Activity: Tack Coat
│   └── Activity: 9.5mm Surface Course
└── Level 2: Mobilization / General Conditions (Tier 4)
```

```javascript
class WorkPackage {
  constructor({ id, name, wbsCode, activities, inclusions, exclusions, interfaces, assumptions }) {
    this.id = id;
    this.name = name;
    this.wbsCode = wbsCode;                 // "01", "02", "03", "04"
    this.activities = activities;             // Activity[]
    this.inclusions = inclusions || [];       // ["Excavation of existing subgrade"]
    this.exclusions = exclusions || [];       // ["Rock excavation", "Dewatering"]
    this.interfaces = interfaces || [];       // ["Grading crew follows excavation"]
    this.assumptions = assumptions || [];     // ["No rock encountered", "Dry conditions"]
  }

  get directCost() {
    return this.activities.reduce((sum, a) => sum + a.directCost, 0);
  }

  get duration() {
    // Not sum — must use schedule logic (Tier 3)
    // This returns the simple sum as a fallback; actual duration from Scheduler
    return this.activities.reduce((sum, a) => sum + a.duration, 0);
  }
}
```

### 2.2-2.3 — Scope Boundary Protocol

**UI addition**: Each Work Package card in the UI gets an expandable "Scope Notes" section with fields for Inclusions, Exclusions, Interfaces, and Assumptions. These are documentation-only fields that appear in exports and serve as the scope boundary defense the rubric requires.

**Axiom enforcement** (Mutual Exclusivity / Collective Exhaustion):
- The system enforces that each activity belongs to exactly one Work Package.
- A scope completeness checklist is generated from the default paving WBS template: "Have you estimated Excavation? Fine Grading? DGA? Milling? Base Course? Surface Course? Tack?" Each unchecked item shows a warning.

---

## TIER 3 — SCHEDULE INTEGRATION AND CRITICAL PATH

### 3.1 — Dependency Logic (`js/engine/Scheduler.js`)

**Current state**: `totalDays = excDays + fgDays + dgaDays + millDays + baseDays + surfDays` — a simple **sum** of all activity durations. This assumes fully sequential work, which is the most conservative (and usually wrong) assumption.

**Target state**: Precedence diagram with standard FS/SS/FF/SF relationships.

**Default paving schedule logic** (hardcoded as defaults, user-adjustable):

```
EXC-001 (Excavation)
  FS → FG-001 (Fine Grading)         [Physical dependency: can't grade until excavated]
    FS → DGA-001 (DGA Base)           [Physical: can't place aggregate until graded]

MILL-001 (Milling)                    [Independent of earthwork chain — can run in parallel]

DGA-001 (DGA Base)
  FS → PAVE-001 (19mm Base)           [Physical: can't pave until base placed]
    FS → TACK-001 (Tack Coat)         [Physical: tack before surface]
      FS → PAVE-002 (9.5mm Surface)   [Physical: surface after tack]

MILL-001 (Milling)
  FS → PAVE-001 (19mm Base)           [If milling is on same area as base course]
```

**Key insight**: In a typical paving project, two independent chains exist:
1. **Earthwork chain**: Excavation → Fine Grading → DGA Base
2. **Milling**: Runs independently (often a different sub)

Both chains must complete before paving starts. This means **milling and earthwork can overlap**, which current app doesn't account for. The CPM will correctly show this.

```javascript
class Scheduler {
  constructor(activities) {
    this.activities = activities;  // Activity[] with dependencies populated
    this.results = new Map();      // activityId → { ES, EF, LS, LF, TF, FF }
  }

  // Forward pass: calculate Early Start (ES) and Early Finish (EF)
  forwardPass() { /* ... */ }

  // Backward pass: calculate Late Start (LS) and Late Finish (LF)
  backwardPass() { /* ... */ }

  // Calculate float values
  calculateFloat() { /* ... */ }

  // Identify critical path
  get criticalPath() {
    return [...this.results.entries()]
      .filter(([_, r]) => r.totalFloat === 0)
      .map(([id, _]) => id);
  }

  // Project duration = max Early Finish across all activities
  get projectDuration() {
    return Math.max(...[...this.results.values()].map(r => r.earlyFinish));
  }
}
```

### 3.2 — CPM Calculation

The scheduler produces:
- **Early Start / Early Finish** for each activity (forward pass)
- **Late Start / Late Finish** (backward pass from project end)
- **Total Float** = LS - ES
- **Critical Path** = chain(s) with zero float

**UI addition**:
- **Schedule Summary** section between Production Summary and Cost Summary:
  - Shows **Project Duration** (from CPM, NOT sum of activity days — this is the major fix)
  - Shows **Critical Path** activities highlighted
  - Shows float for each activity
  - Optional: simple horizontal bar chart / Gantt showing activity timing

### 3.3 — Concurrency Analysis

**Current problem**: The app sums all activity days to get "Total Days" (line 2326-2503). If excavation takes 3 days and milling takes 2 days and they run in parallel, current app says 5 days when the answer is 3 days.

**Target**:
- **Project Duration** derived from CPM (accounts for parallelism)
- **Total Activity Days** still shown (sum of all individual durations) for labor costing
- **Resource Histogram**: For each day of the project, calculate total labor + equipment deployed
- **Shared Resource Detection**: If the same foreman or truck fleet serves multiple concurrent activities, flag it

**The "Total Days" summary stat will be renamed** to "Project Duration" and derived from CPM. A separate "Total Activity Days" or "Labor Days" remains for reference.

### 3.4 — Float and Risk

Activities with zero float are flagged in the UI as critical (red border/badge). Activities with high float are noted as schedule-flexible (can be used for crew optimization).

---

## TIER 4 — INDIRECT COSTS, MARKUPS, AND PROJECT-LEVEL ECONOMICS

### 4.1 — Indirect Cost Categories (`js/models/IndirectCosts.js`)

**Current state**: A single "Markup / Profit %" field that lumps everything together.

**Target state**: The cost summary is restructured to match the rubric's normalized structure:

```javascript
class IndirectCosts {
  constructor({
    generalConditions,    // { items: [{name, costType, amount}], subtotal }
    homeOfficeOverhead,   // { percentage, basisAmount, amount }
    feeProfit,            // { percentage, basisAmount, amount }
    escalation,           // { laborRate, materialRate, timePhased }
    bondsInsurance,       // { bondRate, insuranceRate, amount }
    regulatoryCosts,      // { permits, inspections, compliance, amount }
    contingency           // { estimateClass, identifiedRisks, unidentifiedAllowance, total }
  }) { /* ... */ }
}
```

**4.1.1 — General Conditions (Field Indirect)**

New collapsible panel: "General Conditions / Field Overhead"

| Line Item | Type | Default | Notes |
|---|---|---|---|
| Superintendent/Foreman | Time-dependent | $/day × project duration | Shared resource — NOT duplicated per activity |
| Field Office / Trailer | Time-dependent | $/day × project duration | Only if needed |
| Temporary Facilities (Sanitation, Power) | Time-dependent | $/day × project duration | |
| Temp Construction (Barricades, Signs, MOT) | Fixed + time | Lump sum + $/day | Maintenance of Traffic for roadway |
| Small Tools & Consumables | % of labor | 2-5% of labor cost | |
| Safety / PPE | % of labor | 1-3% of labor cost | |
| Quality Control / Testing | Activity-driven | $/test × # tests | Core samples, gradation tests, compaction tests |
| Cleanup / Site Restoration | Fixed | Lump sum | |

**Key implementation detail**: Superintendent cost uses **Project Duration** (from CPM), not sum of activity days. This is why Tier 3 had to come before Tier 4.

**4.1.2 — Home Office Overhead**

New input field: "Home Office Overhead %" (default: 10%, range 5-15%)
- Applied to: Direct Cost + General Conditions subtotal
- UI shows the calculated amount

**4.1.3 — Fee / Profit**

**Replaces** current "Markup / Profit %" field. Same concept, but now:
- Applied to: Total Field Cost + Home Office Overhead
- Default: 15% (matches current default)
- The rubric notes this should be risk-adjusted; we'll add a note in the UI

### 4.2 — Escalation

New collapsible panel: "Escalation" (hidden by default for short-duration projects)

| Field | Description |
|---|---|
| Project Start Date | Calendar date |
| Material Escalation Rate | %/year for materials (annual) |
| Labor Escalation Rate | %/year for labor |
| Time-Phased | Toggle: if ON, applies escalation proportionally based on when costs are incurred per schedule. If OFF, applies flat % to total. |

**For most small paving jobs (< 3 months), escalation is negligible and this section stays collapsed.**

### 4.3 — Contingency

New panel: "Contingency"

| Field | Description | Default |
|---|---|---|
| Estimate Class | Dropdown: Class 5 through Class 1 | Class 3 (10-30%) |
| Identified Risks | Sum from Risk Register (Tier 5) | $0 |
| Unidentified Risk Allowance | Percentage based on class | 10% |
| Total Contingency | Identified + Unidentified | Calculated |

### 4.4 — Bonds, Insurance, Regulatory

New panel: "Bonds & Insurance" (collapsible)

| Field | Input Type | Default |
|---|---|---|
| Performance/Payment Bond Rate | % of contract | 1.5% |
| General Liability Insurance | % of labor | Configurable |
| Workers Comp Rate | % of labor | By trade classification |
| Permit Fees | Lump sum | $0 |
| Prevailing Wage Compliance | Lump sum | $0 |

### 4.5 — Cost Summary Structure (New)

The cost summary section is restructured to match the rubric's required format:

```
DIRECT COSTS
├── Materials Subtotal
├── Labor Subtotal (by activity)
├── Equipment Subtotal (by activity)  ← NEW (currently bundled with labor)
├── Trucking Subtotal (by activity)
├── Subcontracts Subtotal ← NEW (placeholder)
├── Mobilization Subtotal
└── DIRECT COST SUBTOTAL

INDIRECT COSTS
├── General Conditions Subtotal ← NEW
└── TOTAL FIELD COST

MARKUPS
├── Home Office Overhead ← NEW (currently lumped into markup)
├── Fee / Profit ← RENAMED from "Markup"
├── Escalation ← NEW
├── Bonds & Insurance ← NEW
├── Regulatory / Compliance ← NEW
└── SUBTOTAL BEFORE CONTINGENCY

CONTINGENCY
├── Identified Risks ← NEW
├── Unidentified Allowance ← NEW
└── TOTAL CONTINGENCY

═══════════════════════════
TOTAL ESTIMATED COST (BID PRICE)
═══════════════════════════
```

**Backward compatibility**: For users who want the simple experience, "General Conditions", "Bonds/Insurance", and "Contingency" panels start collapsed at $0. The simple workflow is: enter activities → see Direct Cost → enter Markup % → get Bid Price. Identical to current behavior. Advanced users expand the additional panels.

---

## TIER 5 — UNCERTAINTY QUANTIFICATION AND VALIDATION

### 5.1 — Risk Register (`js/models/RiskRegister.js`)

New section: "Risk Register" (collapsible panel, advanced feature)

```javascript
class RiskItem {
  constructor({ id, description, probability, impactMin, impactMostLikely, impactMax, affectedWBS, riskType }) {
    this.id = id;
    this.description = description;                 // "Encounter rock during excavation"
    this.probability = probability;                  // 0.0 to 1.0 (e.g., 0.15 = 15%)
    this.impactMin = impactMin;                     // $ minimum impact
    this.impactMostLikely = impactMostLikely;       // $ most likely
    this.impactMax = impactMax;                     // $ maximum
    this.affectedWBS = affectedWBS;                 // ["01.01"] or ["01"]
    this.riskType = riskType;                       // "scope" | "production" | "pricing" | "schedule" | "external"
  }

  get expectedValue() {
    return this.probability * this.impactMostLikely;
  }
}
```

**Default paving risks** (pre-loaded as templates, user adjusts):
| Risk | Probability | Impact Range | Type |
|---|---|---|---|
| Rock encountered in excavation | 5-20% | +20% to +100% of exc cost | Scope |
| Weather delays (rain/cold) | 10-30% | +$500 to +$5,000/day | Schedule |
| Material price increase (asphalt) | 10-25% | +3% to +10% of mat cost | Pricing |
| Subgrade failure requiring undercut | 5-15% | +$5,000 to +$50,000 | Scope |
| Access restrictions (utility conflict) | 10-20% | +10% to +30% of activity cost | Production |
| Specification change order | 5-10% | +5% to +15% of direct cost | Scope |

**UI**: Simple table with Add/Remove rows. Each risk shows Expected Value. Sum of Expected Values feeds into "Identified Risks" in Contingency (Tier 4.3).

### 5.2 — Monte Carlo Simulation (`js/engine/MonteCarlo.js`)

**Advanced feature** — opt-in via a "Run Simulation" button.

Instead of single-point values, key variables get min/most-likely/max ranges:
- Production rates (already have min/max from WisDOT data)
- Material unit costs
- Activity quantities (± takeoff uncertainty)

The engine runs N iterations (default 1000), sampling from PERT-Beta distributions, and produces:
- Cumulative probability curve of total cost
- P50, P80, P90 cost values
- Tornado diagram showing which variables drive the most variance

```javascript
class MonteCarlo {
  constructor(estimate, iterations = 1000) {
    this.estimate = estimate;
    this.iterations = iterations;
  }

  // PERT-Beta distribution sampling
  samplePERT(min, mostLikely, max) { /* ... */ }

  run() {
    const results = [];
    for (let i = 0; i < this.iterations; i++) {
      // Clone estimate, replace point values with samples, recalculate
      results.push(this.runIteration());
    }
    return this.analyze(results);
  }

  analyze(results) {
    results.sort((a, b) => a - b);
    return {
      p50: results[Math.floor(results.length * 0.5)],
      p80: results[Math.floor(results.length * 0.8)],
      p90: results[Math.floor(results.length * 0.9)],
      mean: results.reduce((a, b) => a + b, 0) / results.length,
      min: results[0],
      max: results[results.length - 1],
      distribution: results
    };
  }
}
```

**UI**: A "Probabilistic Analysis" section that shows P50/P80/P90 values and a simple histogram/distribution chart (rendered with Canvas or SVG — no external charting library).

### 5.3 — Estimate Validation Checks (`js/validation/Validator.js`)

Automated checks that run on every calculation:

```javascript
class Validator {
  validate(estimate) {
    const warnings = [];

    // 1. Parametric cross-check
    const costPerSY = estimate.totalCost / estimate.totalPavedArea;
    if (costPerSY < 5 || costPerSY > 50) {
      warnings.push({
        level: 'warning',
        check: 'parametric',
        message: `Cost/SY of $${costPerSY.toFixed(2)} is outside typical range ($5-$50/SY)`
      });
    }

    // 2. Ratio analysis
    const matPct = estimate.materialsCost / estimate.directCost;
    if (matPct < 0.30 || matPct > 0.65) {
      warnings.push({
        level: 'warning',
        check: 'ratio',
        message: `Materials at ${(matPct*100).toFixed(1)}% of direct cost — typical is 30-65%`
      });
    }

    const laborPct = estimate.laborCost / estimate.directCost;
    if (laborPct < 0.15 || laborPct > 0.45) {
      warnings.push({
        level: 'warning',
        check: 'ratio',
        message: `Labor at ${(laborPct*100).toFixed(1)}% of direct cost — typical is 15-45%`
      });
    }

    // 3. Unit cost reasonableness
    // Check HMA cost per ton against typical range
    // Check production rate against DOT range

    // 4. Scope completeness
    // Check each standard paving activity has been estimated or explicitly excluded

    // 5. Schedule-cost consistency
    // Verify implied production rates match selected rates

    // 6. UOM compatibility
    // Verify all quantity UOMs match their production rate UOMs

    return warnings;
  }
}
```

**UI**: A "Validation" panel at the top of the Cost Summary that shows warning/info badges for any failed checks. Current "orange warning" system for missing cycle times is kept and extended.

---

## TIER 6 — SYSTEM ARCHITECTURE REQUIREMENTS

### 6.1 — Data Model

**Normalized structure**: Implemented via the model classes above. Resources, Crews, Activities, WorkPackages, and the Estimate are independent entities with references (by ID).

**UOM consistency** (in `js/data/uom.js`):
```javascript
const UOM = {
  SY: { id: 'SY', name: 'Square Yards', dimension: 'area' },
  CY: { id: 'CY', name: 'Cubic Yards', dimension: 'volume' },
  TON: { id: 'TON', name: 'Tons', dimension: 'mass' },
  GAL: { id: 'GAL', name: 'Gallons', dimension: 'volume' },
  HR: { id: 'HR', name: 'Hours', dimension: 'time' },
  DAY: { id: 'DAY', name: 'Days', dimension: 'time' },
  EA: { id: 'EA', name: 'Each', dimension: 'count' },
  LS: { id: 'LS', name: 'Lump Sum', dimension: 'cost' }
};

// Compatibility: production rate UOM must match quantity UOM
function checkUOMCompatibility(quantityUOM, rateOutputUOM) {
  return quantityUOM.id === rateOutputUOM.id;
}
```

**Version control** (`js/storage/EstimateStore.js`):
```javascript
class EstimateStore {
  save(estimate) {
    estimate.version = (estimate.version || 0) + 1;
    estimate.lastModified = new Date().toISOString();
    estimate.revisionHistory.push({
      version: estimate.version,
      timestamp: estimate.lastModified,
      summary: estimate.getChangeSummary()  // auto-generated
    });
    localStorage.setItem(`estimate_${estimate.id}`, JSON.stringify(estimate));
  }

  load(estimateId) { /* ... */ }

  listEstimates() {
    // Return all saved estimates with metadata
  }

  exportJSON(estimateId) {
    // Full JSON export for backup/sharing
  }

  importJSON(jsonString) {
    // Import from JSON
  }
}
```

**Separation of rate data from project data**: Resources, crews, and production rates are stored in a "Rate Library" (separate localStorage key) that persists across projects. Individual estimates reference library items by ID but can override values (flagged as overrides).

### 6.2 — Calculation Engine (`js/engine/Calculator.js`)

**Bottom-up integrity**: The calculator walks the WBS tree:
1. Calculate each Activity's costs from its primitives (Tier 1)
2. Sum into Work Packages (Tier 2)
3. Run CPM for project duration (Tier 3)
4. Calculate time-dependent indirect costs using CPM duration (Tier 4)
5. Apply markups and contingency
6. Total

```javascript
class Calculator {
  calculate(estimate) {
    // Phase 1: Activity-level calculations
    for (const activity of estimate.allActivities) {
      activity.recalculate();  // Derives duration, labor, equip, material costs
    }

    // Phase 2: Schedule
    const scheduler = new Scheduler(estimate.allActivities);
    scheduler.run();
    estimate.projectDuration = scheduler.projectDuration;
    estimate.criticalPath = scheduler.criticalPath;
    estimate.scheduleResults = scheduler.results;

    // Phase 3: Work Package aggregation
    for (const wp of estimate.workPackages) {
      wp.recalculate();
    }

    // Phase 4: Indirect costs (uses projectDuration)
    estimate.indirectCosts.calculate(estimate);

    // Phase 5: Markups
    estimate.calculateMarkups();

    // Phase 6: Contingency
    estimate.calculateContingency();

    // Phase 7: Validation
    estimate.validationWarnings = new Validator().validate(estimate);

    return estimate;
  }
}
```

**Recalculation propagation**: Any input change triggers `Calculator.calculate(estimate)` which recomputes everything end-to-end. This replaces the current monolithic `calculateAll()` function.

### 6.3 — Auditability

**Calculation transparency**: Every calculated value stores its derivation:
```javascript
// Example: activity duration
{
  value: 3.5,
  formula: "quantity / (productionRate × productivityFactor)",
  inputs: {
    quantity: { value: 245, source: "takeoff", uom: "CY" },
    productionRate: { value: 100, source: "WisDOT 2022", uom: "CY/day" },
    productivityFactor: { value: 0.70, source: "Standard complexity preset" }
  },
  calculation: "245 / (100 × 0.70) = 3.50 days"
}
```

**UI**: Clicking any calculated output shows a tooltip/popover with the derivation trace. This replaces the current static reference section with dynamic, contextual audit trails.

**Override tracking**: Any value that deviates from library default gets a visual indicator (different color, asterisk, or badge) and requires a "Reason" text field.

### 6.4 — Trade Universality (Paving-Scoped)

While remaining paving-focused, the architecture uses **data-driven configuration** rather than hardcoded logic:
- Activity types, crew templates, and production rates are defined in `paving-defaults.js`, not in the calculation engine
- The engine itself is trade-agnostic — it processes Activities, Crews, Resources, and Quantities without knowing they're about paving
- In the future, a `concrete-defaults.js` or `earthwork-defaults.js` could plug into the same engine

---

## GOVERNING AXIOMS — IMPLEMENTATION

Each axiom becomes a runtime validation check:

| # | Axiom | Implementation |
|---|---|---|
| 1 | **Atomic Derivation** | Every `directCost` traces to `quantity × rate × time`. The `Calculator` enforces this formula chain. No manual cost overrides without `override=true` flag. |
| 2 | **Mutual Exclusivity** | Each Activity belongs to exactly one WorkPackage (enforced by ID uniqueness). Validator checks for duplicate scope coverage. |
| 3 | **Collective Exhaustion** | Scope completeness checklist derived from WBS template. Missing activities generate warnings. |
| 4 | **Duration Derivation** | `projectDuration` is ALWAYS derived from `Scheduler.projectDuration` (CPM), never manually entered. Current `totalDays` sum is replaced. |
| 5 | **Concurrency Accounting** | Time-dependent costs (general conditions) use CPM `projectDuration`. Shared resources flagged. Truck fleet not double-counted across concurrent activities. |
| 6 | **Conditions Specificity** | Every `ProductionRate` carries `referenceConditions`. If conditions differ, `ProductivityFactor` must be ≠ 1.0 or validator warns. |
| 7 | **Uncertainty Acknowledgment** | Estimate must either have Monte Carlo results OR an explicit "confidence level" field. Validator warns if neither is set. |
| 8 | **Reproducibility** | All inputs are saved with the estimate. The calculation engine is deterministic. Same inputs → same outputs. JSON export captures complete state. |

---

## UI/UX CHANGES SUMMARY

### What stays the same:
- Overall dark theme aesthetic
- 6 activity cards in responsive grid
- Rate configuration panel
- SF→SY converter
- Export to clipboard
- Print functionality
- Auto-calculate mode
- Tack coat section
- Production summary
- Unit cost display

### What changes:
| Area | Current | New |
|---|---|---|
| **Total Days** | Sum of all activity days | CPM-derived project duration (with activity sum shown separately) |
| **Complexity modifier** | Single dropdown | Dropdown presets + expandable 10-factor panel |
| **Crew rates** | Single $/hr per activity | Optional breakdown into labor + equipment components |
| **Markup** | Single flat % | Structured: GC + Overhead + Fee + Escalation + Bonds + Contingency |
| **Cost summary** | 4 categories (mat/labor/truck/mob) | Full rubric structure: Direct → Indirect → Markups → Contingency |
| **Validation** | Cycle time warnings only | Comprehensive validation panel with parametric, ratio, and scope checks |

### What's new:
1. **Schedule Summary** section with CPM-derived project duration and critical path
2. **General Conditions** panel with time-dependent line items
3. **Contingency** panel with estimate class and risk-based calculation
4. **Bonds & Insurance** panel
5. **Risk Register** (advanced, collapsible)
6. **Monte Carlo** analysis (advanced, opt-in)
7. **Audit trail** tooltips on every calculated value
8. **Estimate versioning** with save/load multiple estimates
9. **JSON import/export** for full estimate portability
10. **Scope notes** (inclusions/exclusions/assumptions) per work package

---

## IMPLEMENTATION PHASES

### Phase 1: Foundation (Architecture + Tier 0 + Tier 6)
**Goal**: Refactor from monolithic HTML into modular JS architecture without changing visible behavior.
1. Extract CSS to `css/styles.css`
2. Create model classes (Resource, ProductionRate, Quantity, TimeUnit, Crew, Activity)
3. Create Calculator engine that reproduces current `calculateAll()` output exactly
4. Create EstimateStore with save/load/version
5. Wire UI to new engine
6. **Verification**: All current calculations produce identical results

### Phase 2: Tier 1 (Activity Schema + Productivity Factors)
**Goal**: Upgrade activity calculations to rubric-compliant schema.
1. Implement full Activity definition schema
2. Implement ProductivityFactor model with 10 modifier categories
3. Add preset-to-advanced expansion UI for productivity factors
4. Add optional crew composition breakdown UI
5. **Verification**: Backward-compatible with simple presets; advanced mode available

### Phase 3: Tier 2 + Tier 3 (WBS + Schedule)
**Goal**: Add work breakdown structure and CPM scheduling.
1. Implement WorkPackage grouping
2. Implement Scheduler (CPM forward/backward pass)
3. Default dependency template for paving sequence
4. Replace "Total Days" with CPM-derived "Project Duration"
5. Add Schedule Summary section to UI
6. Add scope notes fields
7. **Verification**: Project duration ≤ sum of activity days (concurrency benefit visible)

### Phase 4: Tier 4 (Indirect Costs)
**Goal**: Structured cost breakdown replacing flat markup.
1. Implement General Conditions panel (time-dependent items using CPM duration)
2. Implement Home Office Overhead, Fee/Profit (structured)
3. Implement Escalation panel
4. Implement Bonds & Insurance panel
5. Implement Contingency panel with estimate class
6. Restructure Cost Summary to rubric format
7. **Verification**: Simple workflow still works (all new panels collapsed/zero by default)

### Phase 5: Tier 5 (Uncertainty + Validation)
**Goal**: Add risk analysis and automated validation.
1. Implement Risk Register with paving-specific templates
2. Implement Monte Carlo engine
3. Implement Validator with all check types
4. Add validation warnings to UI
5. Add probabilistic analysis display
6. **Verification**: Risk-adjusted estimates produce ranges; validation catches anomalies

### Phase 6: Polish + Auditability
**Goal**: Full audit trail and export improvements.
1. Add derivation tooltips to all calculated values
2. Add override tracking and flagging
3. Enhance JSON export with full estimate state
4. Enhance text/clipboard export with new cost structure
5. Enhance print layout for new structure
6. Final axiom compliance verification

---

## BACKWARD COMPATIBILITY GUARANTEE

At every phase, the app must remain usable in "simple mode" where:
- User enters areas, depths, rates (same inputs as today)
- User sees Direct Cost + Markup % = Bid Price (same flow as today)
- All new features are opt-in via expandable/collapsible panels
- Default values for all new fields produce the same results as current app
- Saved rates from current localStorage format are auto-migrated

The rubric conformance is **additive** — it doesn't remove any current capability, it layers precision on top of the existing workflow.

---

## TECHNICAL NOTES

### No Build Step
The app continues to use ES6 modules natively (`<script type="module">`). All modern mobile browsers (and Capacitor's WebView) support this. No Webpack/Vite/Rollup needed.

### localStorage Limits
With full estimate objects including risk registers and version history, we'll need to be mindful of the ~5MB localStorage limit. Mitigation: compress old versions, offer JSON export for archival, warn when approaching limits.

### Performance
Monte Carlo (1000 iterations) with the paving model's ~7 activities should run in <100ms on a mobile device. The CPM scheduler for 7 activities is trivial. No performance concerns.

### Capacitor Compatibility
No Capacitor plugins are needed for any of this functionality. Everything runs in the WebView. The existing splash-screen and status-bar plugins are unaffected.
