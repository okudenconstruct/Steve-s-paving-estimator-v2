# Paving Calculator Application Specification

> **Purpose of this document:** This is the authoritative technical specification for a Claude Project instance tasked with (1) researching and curating external data sources for crew labor/equipment rate breakdowns, material pricing, production rates, and benchmark data; and (2) generating precise, implementation-ready coding instructions for issues and improvements in this codebase. All data research should be shaped to fit the exact data structures, naming conventions, file locations, and calculation patterns described here.

> **Current version:** 4.1 | **Date:** 2026-03-07

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack & File Map](#2-technology-stack--file-map)
3. [Architecture: Tiered Model](#3-architecture-tiered-model)
4. [Data Layer (Tier 0)](#4-data-layer-tier-0)
5. [Model Layer (Tier 0-2)](#5-model-layer-tier-0-2)
6. [Calculation Engine (Tier 3-6)](#6-calculation-engine-tier-3-6)
7. [Indirect Costs & Markups (Tier 4)](#7-indirect-costs--markups-tier-4)
8. [Analysis & Confidence (Tier 5)](#8-analysis--confidence-tier-5)
9. [UI Layer](#9-ui-layer)
10. [Current Data: What Exists and What's Missing](#10-current-data-what-exists-and-whats-missing)
11. [Known Issues (Audit Items 1-7)](#11-known-issues-audit-items-1-7)
12. [Data Research Requirements](#12-data-research-requirements)
13. [Coding Instruction Format Requirements](#13-coding-instruction-format-requirements)

---

## 1. Project Overview

### What the App Does
A paving cost estimator for asphalt contractors. Users input area (SY), depth (inches), and select production rates for up to 7 activity types. The app calculates crew days, material tonnage, trucking requirements, and rolls everything up through a full cost waterfall (Direct Cost -> General Conditions -> Home Office OH -> Fee/Profit -> Escalation -> Bonds & Insurance -> Contingency -> Total Estimated Cost).

### Operating Modes
- **Parking Lot** (default): Smaller scale, confined access, lower production rates. No safety crew.
- **Roadway**: Larger scale, open access, higher production rates. Includes safety/traffic control crew cost.

### Activity Types (7 total)
| Key | Description | Quantity UOM | Rate UOM | Has Materials | Has Trucking |
|-----|-------------|-------------|----------|---------------|-------------|
| `excavation` | Subgrade removal | CY | CY/day | No | Yes (loose CY) |
| `fine_grading` | Grading to elevation | SY | SY/day | No | No |
| `dga_base` | Dense Graded Aggregate base | CY | CY/day | DGA by ton | Yes (CY) |
| `milling` | Cold milling existing asphalt | SY | SY/day | No | Yes (RAP tons) |
| `paving_base` | 19mm HMA base course | SY | SY/day | 19mm HMA by ton | Yes (tons w/ waste) |
| `paving_surface` | 9.5mm HMA surface course | SY | SY/day | 9.5mm HMA by ton | Yes (tons w/ waste) |
| `tack_coat` | Tack coat between lifts | SY | SY/day | Tack by gallon | No |

---

## 2. Technology Stack & File Map

**Platform:** Capacitor 8 hybrid mobile app. Web assets in `www/` directory. Pure static HTML/CSS/JS with ES modules. No build step, no framework, no bundler.

### Complete File Inventory

```
www/
  index.html                          <- Single-page UI (all inputs, outputs, panels)
  css/styles.css                      <- All styling
  js/
    main.js                           <- App controller: wires UI to models/engine
    data/
      constants.js                    <- Physical constants, material prices, shift constants
      paving-defaults.js              <- All trade data: crews, rates, benchmarks, thresholds, configs
      uom.js                          <- Unit of measure definitions
    models/
      Resource.js                     <- Tier 0.1: Individual labor/equipment/material resource
      ProductionRate.js               <- Tier 0.2: Output rate per crew per time unit
      Quantity.js                     <- Tier 0.3: Measured scope with waste/contingency
      TimeUnit.js                     <- Tier 0.4: Work calendar configuration
      ProductivityFactor.js           <- Tier 1.2: 10-modifier composite productivity multiplier
      Crew.js                         <- Tier 1.3: Named crew composition (labor + equipment)
      Activity.js                     <- Tier 1: Work activity (the fundamental estimating object)
      WorkPackage.js                  <- Tier 2: WBS grouping of activities
      Estimate.js                     <- Top-level: Container for all tiers
      IndirectCosts.js                <- Tier 4: GC, OH, Fee, Escalation, B&I, Contingency
      RiskRegister.js                 <- Tier 5.1: Risk items with probability/impact
    engine/
      Calculator.js                   <- Tier 6.2: 11-phase calculation pipeline
      Scheduler.js                    <- Tier 3: CPM scheduler (forward/backward pass, float)
      ThreeTier.js                    <- Conservative/Standard/Aggressive production model
      ShiftOptimizer.js               <- Shift buffer zone snap-to-increment with hustle detection
      ClusterEngine.js                <- Crew clustering for shared mobilization + safety cost
      Confidence.js                   <- 4-component weighted confidence scoring
      AnalysisEngine.js               <- 11-rule deterministic analysis (warnings/info)
      CalendarDuration.js             <- Day-by-day timeline from CPM schedule + weather
      MonteCarlo.js                   <- PERT-Beta probabilistic simulation (not yet in UI)
    validation/
      Validator.js                    <- 11-check validation suite
    storage/
      EstimateStore.js                <- localStorage CRUD with versioning
    ui/
      Renderer.js                     <- DOM update orchestration from calc results
      ExportService.js                <- 4 export modes: Quick, Full, JSON, Print
```

---

## 3. Architecture: Tiered Model

The app follows an estimating rubric with explicit tier hierarchy:

```
Tier 0:  Data atoms     (Resource, ProductionRate, Quantity, TimeUnit, UOM)
Tier 1:  Work activity  (Activity = Quantity + Crew + ProductionRate + ProductivityFactor)
Tier 2:  WBS grouping   (WorkPackage aggregation)
Tier 3:  Schedule       (CPM: forward pass, backward pass, float, critical path)
Tier 4:  Economics       (IndirectCosts: GC, OH, Fee, Escalation, B&I, Contingency)
Tier 5:  Analysis        (Confidence scoring, AnalysisEngine, Validator, RiskRegister, MonteCarlo)
Tier 6:  Integration     (Calculator pipeline, Export, Storage)
```

### Core Axioms (enforced in code)
1. **Axiom 1:** Every cost derives from `quantity x rate x time`
2. **Axiom 2:** Quantities are always gross (net x waste x design contingency)
3. **Axiom 3:** Collective Exhaustion (all scope must appear)
4. **Axiom 4:** Project duration derived from CPM, never assumed
5. **Axiom 5:** Time-dependent indirect costs use concurrent schedule duration (from CPM), not sum of activity durations
6. **Axiom 6:** Every rate has a verifiable source
7. **Axiom 7:** Every estimate carries uncertainty (contingency required)

---

## 4. Data Layer (Tier 0)

### 4.1 Physical Constants (`constants.js`)

```javascript
CONSTANTS = {
    HMA_DENSITY: 145,        // lbs/ft3, compacted HMA
    DGA_DENSITY: 1.9,        // tons/CY, compacted DGA
    SOIL_DENSITY: 1.5,       // tons/CY, excavated soil
    RAP_DENSITY: 130,        // lbs/ft3, loose RAP
    TRUCK_CY: 16,            // CY per tri-axle dump (dirt/aggregate)
    TRUCK_TONS: 22,          // tons per tri-axle dump (HMA/material)
    WORKDAY_HOURS: 8,
    WORKDAY_MINUTES: 480,
    HMA_FACTOR: 0.0575,      // tons per SY-inch
    RAP_FACTOR: 0.04875,     // tons per SY-inch
    CY_PER_SY_INCH: 1/324,
}
```

### 4.2 Material Prices (`constants.js`)

```javascript
MATERIAL_PRICES = {
    hma_9_5_64: 61.06,       // $/TON surface course
    hma_19_64: 58.06,        // $/TON base course
    hma_9_5_76: 68.41,       // $/TON polymer surface
    hma_19_76: 65.41,        // $/TON polymer base
    dga: 20.25,              // $/TON
    tack_std: 3.75,          // $/GAL
    tack_64: 4.25,           // $/GAL
    tack_76: 6.50,           // $/GAL
    disposal_asphalt: 7.50,  // $/TON
    disposal_concrete: 7.50, // $/TON
    disposal_mixed: 25.00,   // $/TON
    milling_teeth: 0.15,     // $/SY
    plant_open_weekday: 1500,
    plant_open_sunday: 3500,
    plant_open_silo: 400,
}
```

These prices are sourced from regional supplier quotes dated January 2025.

### 4.3 Crew Data (`paving-defaults.js` -- CREW_DATA)

**THIS IS THE CRITICAL DATA GAP.** Each crew has only a composite hourly rate with no labor/equipment breakdown:

```javascript
CREW_DATA = {
    BHOEX:  { rate: 203.65, people: 3,  desc: 'Backhoe Excavation' },
    DGAFG:  { rate: 241.00, people: 4,  desc: 'DGA/Fine Grade w/ Grader' },
    DGAST:  { rate: 184.00, people: 4,  desc: 'DGA/Fine Grade w/ Dozer' },
    FLEX3:  { rate: 200.78, people: 3,  desc: 'Flex Pave Crew 3-Man' },
    FLEX5:  { rate: 271.48, people: 5,  desc: 'Flex Pave Crew 5-Man' },
    PV8:    { rate: 400.75, people: 8,  desc: 'Paving Crew 8-Man' },
    PV10:   { rate: 471.85, people: 10, desc: 'Paving Crew 10-Man' },
    ML7:    { rate: 648.83, people: 8,  desc: 'Milling Crew 7ft' },
    COMBO:  { rate: 564.28, people: 11, desc: 'Mill + Pave Combo' },
    TACK:   { rate:  61.35, people: 1,  desc: 'Tack Coat' },
    MOBL:   { rate: 297.25, people: 2,  desc: 'Mobilization (2 Lowboys)' },
    MOBS:   { rate: 188.73, people: 1,  desc: 'Mobilization (1 Lowboy)' },
    SAFE:   { rate: 130.39, people: 1,  desc: 'Safety / Traffic Control' },
}
```

**What is needed:** For each crew, a breakdown like:

```javascript
// EXAMPLE of target format (does NOT exist yet):
BHOEX_DETAILED: {
    rate: 203.65,          // total composite (must match sum)
    people: 3,
    desc: 'Backhoe Excavation',
    laborComponents: [
        { role: 'Backhoe Operator', count: 1, rate: XX.XX },
        { role: 'Laborer', count: 2, rate: XX.XX },
    ],
    equipmentComponents: [
        { role: 'Backhoe (Cat 320 class)', count: 1, rate: XX.XX },
    ],
}
```

The labor component rates should be **fully burdened** (base wage + benefits + taxes, but NOT insurance/WC which are handled separately in IndirectCosts.bondsInsurance).

The equipment component rates should be **ownership + operating cost per hour** (depreciation + maintenance + fuel, consistent with Caterpillar Performance Handbook or Blue Book methodology).

### 4.4 Crew Auto-Selection Thresholds

Crews are auto-selected based on total job area (SY):

```javascript
CREW_THRESHOLDS = {
    paving: [
        { maxSY: 200,      crew: 'FLEX3' },   // 3-person flex crew
        { maxSY: 1000,     crew: 'FLEX5' },   // 5-person flex crew
        { maxSY: 5000,     crew: 'PV8' },     // 8-person full crew
        { maxSY: Infinity, crew: 'PV10' },    // 10-person production crew
    ],
    milling:      [{ maxSY: Infinity, crew: 'ML7' }],
    excavation:   [{ maxSY: Infinity, crew: 'BHOEX' }],
    fine_grading: [{ maxSY: Infinity, crew: 'DGAFG' }],
    dga_base:     [{ maxSY: Infinity, crew: 'DGAFG' }],
    tack_coat:    [{ maxSY: Infinity, crew: 'TACK' }],
}
```

### 4.5 Production Rates

**Flat defaults** (`PRODUCTION_RATES`): One rate per activity per mode. Rarely used directly.

**Tiered suggestions** (`SUGGESTED_RATES`): Multi-tier rates keyed by quantity range with optional depth factors. Example:

```javascript
SUGGESTED_RATES.parking_lot.milling = {
    tiers: [
        { maxQty: 1000, rate: 2000 },    // SY/day
        { maxQty: 3000, rate: 3000 },
        { maxQty: 6000, rate: 4000 },
        { maxQty: 12000, rate: 5000 },
        { maxQty: Infinity, rate: 6000 },
    ],
    depthBreaks: [
        { maxDepth: 2.0, factor: 1.00 },  // thin: baseline
        { maxDepth: 3.0, factor: 0.80 },  // thick: 80% of baseline
        { maxDepth: Infinity, factor: 0.65 }, // very thick
    ],
}
```

Sources documented inline: WisDOT, AZDOT, MS DOT, CAT handbook, MnDOT NRRA research.

### 4.6 Benchmarks -- Unit Cost Ranges

```javascript
BENCHMARKS.parking_lot = {
    excavation:     { p25: 12.00, median: 18.00, p75: 28.00, n: 0,   basis: 'derived', unit: 'CY' },
    fine_grading:   { p25: 0.77,  median: 0.92,  p75: 1.12,  n: 507, basis: 'empirical', unit: 'SY' },
    dga_base:       { p25: 35.00, median: 50.00, p75: 70.00, n: 0,   basis: 'derived', unit: 'CY' },
    milling:        { p25: 2.95,  median: 3.64,  p75: 4.58,  n: 516, basis: 'empirical', unit: 'SY' },
    paving_base:    { p25: 22.31, median: 28.10, p75: 35.26, n: 162, basis: 'empirical', unit: 'SY' },
    paving_surface: { p25: 10.30, median: 11.09, p75: 12.25, n: 163, basis: 'empirical', unit: 'SY' },
    tack_coat:      { p25: 0.15,  median: 0.22,  p75: 0.35,  n: 0,   basis: 'derived', unit: 'SY' },
}
```

Note: `n: 0` entries are derived estimates, not from bid data. Roadway benchmarks are all derived (n=0).

---

## 5. Model Layer (Tier 0-2)

### 5.1 Resource (`Resource.js`)

```javascript
class Resource {
    id: string          // 'L-001', 'E-001', 'M-001'
    name: string        // 'Paver Operator', 'Backhoe'
    type: ResourceType  // 'labor' | 'equipment' | 'material' | 'subcontract'
    unitId: string      // 'HR', 'TON', 'GAL'
    costRate: number    // $/unit (fully burdened for labor)
    costStructure: {}   // optional breakdown of costRate
    source: string
    sourceRank: number  // 1-5 (company historical = best)
}
```

Currently, Resource objects are only created for **materials** in `main.js`. Labor and equipment resources are NOT instantiated because CREW_DATA uses composite rates.

### 5.2 Crew (`Crew.js`)

```javascript
class Crew {
    id: string
    name: string
    laborComponents: [{ resource: Resource, count: number }]     // EMPTY in practice
    equipmentComponents: [{ resource: Resource, count: number }] // EMPTY in practice
    _compositeRate: number                                        // ALWAYS used instead

    get isDetailed()        // false -- always returns false currently
    get laborCostPerHour()  // returns compositeRate when !isDetailed (100% to "labor")
    get equipmentCostPerHour() // returns 0 when !isDetailed (0% to "equipment")
    get hourlyCost()        // compositeRate
}
```

**Critical:** `Crew.fromCrewData(code, crewData)` -- the factory used by auto-selection -- always creates a composite crew. The detailed pathway (`laborComponents`/`equipmentComponents`) exists in the model but is never populated by any data source.

### 5.3 ProductivityFactor (`ProductivityFactor.js`)

10 modifier categories, each a multiplier where 1.0 = reference conditions:

| Key | Label | Range | Default |
|-----|-------|-------|---------|
| siteAccess | Site Access / Congestion | 0.50-1.00 | 1.00 |
| weather | Weather / Climate | 0.60-1.00 | 1.00 |
| terrain | Altitude / Terrain | 0.70-1.00 | 1.00 |
| specComplexity | Specification Complexity | 0.60-1.00 | 1.00 |
| learningCurve | Repetition / Learning Curve | 1.00-1.20 | 1.00 |
| overtimeShift | Overtime / Shift Inefficiency | 0.75-1.00 | 1.00 |
| crewExperience | Crew Skill / Experience | 0.70-1.15 | 1.00 |
| materialHandling | Material Handling Distance | 0.70-1.00 | 1.00 |
| regulatorySafety | Regulatory / Safety Overhead | 0.60-1.00 | 1.00 |
| tradeStacking | Trade Stacking / Concurrent | 0.60-1.00 | 1.00 |

**Composite = product of all 10 modifiers.**

Four presets map to the UI's complexity dropdown:
- `roadway`: all 1.0 (composite = 1.0)
- `simple`: siteAccess=0.92, specComplexity=0.92 (composite ~0.85)
- `standard`: siteAccess=0.85, specComplexity=0.82 (composite ~0.70)
- `complex`: siteAccess=0.75, specComplexity=0.73 (composite ~0.55)

### 5.4 Activity (`Activity.js`)

The fundamental estimating object. Key derived values:

```
adjustedProductionRate = productionRate.outputQty * productivityFactor.composite
duration = ceil(quantity.grossQuantity / adjustedProductionRate * 2) / 2  // rounds to 0.5 day
laborCost = duration * crew.laborCostPerDay(8)
equipmentCost = duration * crew.equipmentCostPerDay(8)  // ALWAYS $0 currently
materialCost = sum(grossQty * quantityPerOutputUnit * resource.costRate)
mobilizationCost = mobilization.included ? mobilization.cost : 0
directCost = laborCost + equipmentCost + materialCost + mobilizationCost
unitCost = directCost / grossQuantity  // for benchmarking (excludes mob)
```

### 5.5 Estimate (`Estimate.js`)

Top-level container holding:
- `activities[]` - All 7 activity instances
- `indirectCosts` - IndirectCosts instance
- `riskRegister` - RiskRegister instance
- `jobMode` - 'parking_lot' | 'roadway'
- `shiftSettings` - { stdShift: 8, maxShift: 12 }
- `weatherDays` - Calendar weather contingency
- `travelHours` - One-way travel for mobilization
- `clusterMode` - boolean
- `scopeAssumptions` - Scope checklist state
- `reviewerNotes` - Reviewer comment fields

---

## 6. Calculation Engine (Tier 3-6)

### 6.1 Calculator Pipeline (`Calculator.js`)

11-phase sequential pipeline:

```
Phase 1:  Activity-level trucking calculations
Phase 2:  Three-tier production (conservative/standard/aggressive)
Phase 3:  CPM Scheduling (forward pass, backward pass, float, critical path)
Phase 4:  Aggregate costs (sum labor, equipment, material, trucking, mob across activities)
Phase 5:  Cluster mobilization + safety crew cost
Phase 6:  Indirect costs (using CPM project duration for time-dependent items)
Phase 7:  Confidence scoring (4-component weighted)
Phase 8:  Unit cost reasonableness check (benchmark flags)
Phase 9:  Job analysis (11-rule engine)
Phase 10: Calendar duration (day-by-day timeline + weather)
Phase 11: Final totals assembly
```

**Important:** After Calculator runs, `main.js` runs `calculateWithTruckingOverrides()` which patches trucking results for activities that use non-standard quantities (e.g., loose CY for excavation, RAP tons for milling). This then recalculates indirect costs, confidence, and analysis.

### 6.2 CPM Scheduler (`Scheduler.js`)

Full critical path method implementation:
- Topological sort (Kahn's algorithm)
- Forward pass: ES/EF with FS/SS/FF/SF dependency types + lag
- Backward pass: LS/LF
- Float calculation: TF = LS - ES, FF = min(succ.ES) - EF
- Project duration = max(EF) across all activities

Default dependency chain:
```
EXC-001 -> FG-001 -> DGA-001 -> PAVE-001 (base) -> TACK-001 -> PAVE-002 (surface)
                                 MILL-001 -> PAVE-001
```

### 6.3 ClusterEngine (`ClusterEngine.js`)

Groups co-deployable activities for shared mobilization:

```
Earthwork cluster:  excavation + fine_grading + dga_base     -> MOBS (1 lowboy, $188.73/hr)
Milling cluster:    milling                                    -> MOBL (2 lowboys, $297.25/hr)
Paving cluster:     paving_base + paving_surface + tack_coat  -> MOBL (2 lowboys, $297.25/hr)
Combo cluster:      (auto-detected when both milling + paving active)  -> MOBL
```

**Mobilization formula:** `mobCost = 2 trips * travelHours * mobCrewRate`

**Safety crew (roadway only):** `safetyCost = maxProjectDuration * 8 * SAFE.rate ($130.39/hr)`

**Output:** `{ clusters, totalMobCost, safetyCost, totalMobAndSafety }`

### 6.4 Three-Tier Production (`ThreeTier.js` + `ShiftOptimizer.js`)

For each activity, calculates durations at three production levels:
- Conservative: 80% of adjusted rate
- Standard: 100%
- Aggressive: 120%

Each tier's raw hours are then optimized through shift snapping:
- Billing increments: [4, 6, 8, 10, 12] hours
- Hustle threshold: 0.5 hours (if overshoot <= 0.5h, snap DOWN)
- Tries standard and max shift patterns, picks minimum billed hours

---

## 7. Indirect Costs & Markups (Tier 4)

### Cost Waterfall (`IndirectCosts.calculate()`)

```
INPUT: directCost, laborCost, projectDurationDays

TIER 1: GENERAL CONDITIONS
  Time-dependent = (superintendent + fieldOffice + tempFacilities + tempConstruction) * projectDuration
  Fixed = tempConstructionLump + qcTestingLump + cleanupLump
  %-based = laborCost * (smallToolsPct + safetyPpePct) / 100
  gcTotal = Time-dependent + Fixed + %-based

TIER 2: TOTAL FIELD COST = directCost + gcTotal

TIER 3: HOME OFFICE OVERHEAD = totalFieldCost * homeOfficeOverheadPct / 100

TIER 4: FEE / PROFIT = (totalFieldCost + homeOfficeOH) * feeProfitPct / 100
  Default feeProfitPct = 15%

TIER 5: ESCALATION (if enabled)
  laborEsc = laborCost * laborRatePerYear% * projectDurationYears
  materialEsc = (directCost - laborCost) * materialRatePerYear% * projectDurationYears
  (projectDurationYears = projectDurationDays / 260)

TIER 6: BONDS & INSURANCE
  bondsCost = subtotalForBonds * bondRatePct / 100
  insuranceCost = laborCost * (glInsurancePct + wcRatePct) / 100
  regulatoryCost = permitFeesLump + prevailingWageLump

TIER 7: SUBTOTAL BEFORE CONTINGENCY = totalFieldCost + homeOfficeOH + feeProfit + escalation + B&I

TIER 8: CONTINGENCY
  unidentifiedAllowance = subtotalBeforeContingency * unidentifiedAllowancePct
  totalContingency = identifiedRisksTotal + unidentifiedAllowance  (or manualOverride)

FINAL: TOTAL ESTIMATED COST = subtotalBeforeContingency + totalContingency
```

### Important Detail: What Flows Into "laborCost" for Indirect Calcs

In `Calculator.js` line 179:
```javascript
const laborCostForIndirect = totalLaborCost + totalEquipmentCost;
```

**Both labor AND equipment are summed together** and passed as "laborCost" to IndirectCosts. This means %-based GC items (smallToolsPct, safetyPpePct) and insurance items (glInsurancePct, wcRatePct) are calculated against the combined labor+equipment total. This is a consequence of the composite rate issue -- since equipmentCost is always $0, this currently doesn't cause incorrect math, but **it will need adjustment when the labor/equipment split is implemented**.

---

## 8. Analysis & Confidence (Tier 5)

### 8.1 Confidence Score (`Confidence.js`)

Four weighted components:

| Component | Weight | Calculation |
|-----------|--------|-------------|
| Production Reliability | 35% | Cost-weighted average of RATE_CONFIDENCE scores |
| Benchmark Alignment | 30% | Fraction of activities with unit cost within P25-P75 |
| Scope Definition | 20% | Fraction of activities with quantity within QTY_RANGES |
| Data Quality | 15% | Average sample-size score (n>=30:1.0, n>=15:0.8, n>=5:0.6, n>0:0.4, n=0:0.2) |

**Composite = weighted sum of all four.**

Descriptors: >= 0.80 = HIGH, >= 0.65 = MOD-HIGH, >= 0.50 = MODERATE, < 0.50 = LOW.

### 8.2 Unit Cost Benchmark Flags (`Calculator.js`)

For each active activity with unitCost > 0:

```
VERY_LOW:   unitCost < p25 * 0.50
LOW:        unitCost >= p25*0.50 AND < p25
IN_RANGE:   unitCost >= p25 AND <= p75
HIGH:       unitCost > p75 AND <= p75*1.50
VERY_HIGH:  unitCost > p75 * 1.50
```

### 8.3 Analysis Engine (`AnalysisEngine.js`)

11 deterministic rules generating WARNING or INFO observations:

1. Quantity vs typical range (per activity)
2. Unit cost vs benchmark (per activity) -- with specific thresholds
3. Minimum shift utilization (< 3.5 hours but billed 4)
4. Crew size vs recommended for job size
5. COMBO crew detection (milling + paving both active)
6. Overtime alert (optimized shifts > 10 hours)
7. Roadway safety crew reminder
8. Plant opening fee for small tonnage (< 100 tons HMA)
9. Mobilization cost sanity (> 15% of direct cost)
10. Systemic pricing pattern (3+ activities trending same direction)
11. Missing trucking (cycle time not set)

### 8.4 Validator (`Validator.js`)

11 validation checks (separate from AnalysisEngine):

1. Parametric cross-check (cost/SY reasonableness: $3-$80)
2. Ratio analysis (material 20-70%, labor 10-50%, trucking < 35%)
3. Scope completeness (Axiom 3)
4. Unit cost reasonableness (production rate limits)
5. Schedule-cost consistency
6. Axiom violation checks (uncertainty acknowledgment)
7. Benchmark alignment (v4.0)
8. Quantity ranges (v4.0)
9. Crew mismatch (v4.0)
10. Mobilization sanity (v4.0)
11. Roadway mode checks (v4.0)

---

## 9. UI Layer

### 9.1 App Controller (`main.js`)

**Key flow:**
1. `calculateAll()` is called on button click or auto-calc
2. `suggestAllRates()` -- auto-suggest production rates if user hasn't chosen
3. `buildEstimateFromUI()` -- reads all DOM inputs, creates Activity/Estimate objects
4. `calculateWithTruckingOverrides()` -- runs Calculator, patches trucking, recalculates everything
5. `Renderer.renderResults()` -- updates all DOM elements

**Rate input IDs:** User can enter manual crew rates (`rateCrewExc`, `rateCrewFG`, `rateCrewDGA`, `rateCrewMill`, `rateCrewBase`, `rateCrewSurf`). If zero, auto-selection kicks in.

**Mobilization inputs:** Per-activity lump sums (`mobExc`, `mobFG`, `mobDGA`, `mobMill`, `mobBase`, `mobSurf`) with toggle checkboxes (`excMob`, `fgMob`, etc.).

### 9.2 Renderer (`Renderer.js`)

Updates DOM elements by ID. Key display elements:
- Per-activity: days, trucks, truck hours, labor cost, material cost, trucking cost
- Cost summary: subtotalMaterials, subtotalLabor (includes equipment!), subtotalTrucking, subtotalMob, directCostTotal
- Indirect: gcTotal, totalFieldCost, homeOffice, feeProfit, escalation, biTotal, subtotalBeforeCont, contingency
- Grand total: bidPrice
- Unit metrics: costPerSY, costPerTon, materialsPct, laborPct
- v4.0 panels: confidence badge/bars, unit check table, analysis cards, mob/safety table, calendar timeline, Gantt chart

**Critical line 251:**
```javascript
sv('subtotalLabor', fc(results.totalLaborCost + results.totalEquipmentCost));
```
This merges equipment into the "Labor" display line.

### 9.3 ExportService (`ExportService.js`)

4 export modes:
- **Quick** (clipboard): Activity summary + bid price + calendar + confidence
- **Full** (clipboard): Complete text report with all detail sections
- **JSON** (file download): Machine-readable full export
- **Print** (window.print): Print-optimized view

The Full export DOES show Labor and Equipment as separate lines, using the values from the results object. Since equipmentCost is always $0, this currently shows "$0" for equipment.

---

## 10. Current Data: What Exists and What's Missing

### What EXISTS (usable as-is)
- Material prices with sources (HMA, DGA, tack, disposal)
- Physical constants with sources (densities, conversion factors)
- Production rate tiers with DOT source citations
- Benchmark unit costs (empirical for parking_lot paving activities; derived for everything else)
- Productivity factor model (10 modifiers with defined ranges)
- Crew auto-selection thresholds
- Default dependencies (paving sequence)
- Risk templates

### What is MISSING (needed from research)

#### Priority 1: Crew Composition Breakdowns
For each crew in CREW_DATA, need:
- Individual **labor roles** with hourly rates (fully burdened: base + benefits + payroll taxes)
- Individual **equipment items** with hourly rates (ownership + operating: depreciation + maintenance + fuel)
- Component rates must sum to the existing composite rate (or replace it with a validated total)

**Crews needing breakdown:**
| Code | Composite Rate | People | Needed Components |
|------|---------------|--------|-------------------|
| BHOEX | $203.65/hr | 3 | Operator, 2 Laborers, Backhoe |
| DGAFG | $241.00/hr | 4 | Operator, 3 Laborers, Motor Grader, Roller |
| DGAST | $184.00/hr | 4 | Operator, 3 Laborers, Dozer, Roller |
| FLEX3 | $200.78/hr | 3 | Operator, 2 Laborers, Mini Paver, Roller |
| FLEX5 | $271.48/hr | 5 | Operator, 4 Laborers, Paver, 2 Rollers |
| PV8 | $400.75/hr | 8 | Foreman, Operator, 6 Laborers, Paver, 2 Rollers |
| PV10 | $471.85/hr | 10 | Foreman, 2 Operators, 7 Laborers, Paver, 3 Rollers |
| ML7 | $648.83/hr | 8 | Foreman, Operator, 6 Laborers, Milling Machine, Skid Steer, Sweeper |
| COMBO | $564.28/hr | 11 | Mill crew + Pave crew combined |
| TACK | $61.35/hr | 1 | Operator, Distributor Truck |
| MOBL | $297.25/hr | 2 | 2 Operators, 2 Lowboy Trailers |
| MOBS | $188.73/hr | 1 | Operator, Lowboy Trailer |
| SAFE | $130.39/hr | 1 | Flagger, Arrow Board, Signs/Cones |

#### Priority 2: Roadway Benchmark Data
All roadway benchmarks have `n: 0, basis: 'derived'`. Need empirical data from:
- WisDOT FY2024/2025 Average Unit Price lists
- State DOT bid tabs
- Published cost databases (RSMeans, Richardson)

#### Priority 3: Parking Lot Benchmark Gaps
Excavation and DGA benchmarks have `n: 0, basis: 'derived'`. Need validation from:
- Historical bid data
- Published databases

#### Priority 4: Safety/Traffic Control Crew
The SAFE crew ($130.39/hr, 1 person) needs validation. Typical traffic control for roadway work may include:
- Flaggers (multiple)
- Arrow boards
- Crash trucks / TMA
- Signs and channelization devices

---

## 11. Known Issues (Audit Items 1-7)

### Issue 1: Labor vs Equipment Cost Split
**Problem:** All crew costs report as 100% labor, 0% equipment because CREW_DATA only has composite rates.
**Root cause:** `Crew.fromCrewData()` creates composite crews where `isDetailed = false`, so `laborCostPerHour` returns the full rate and `equipmentCostPerHour` returns 0.
**Files affected:** `paving-defaults.js` (data), `Crew.js` (model), `main.js` (line 260-274 selectCrew), `Renderer.js` (line 251), `Calculator.js` (line 179).
**Data needed:** Detailed crew compositions with individual labor and equipment rates.
**Code changes needed:**
1. Expand CREW_DATA to include `laborComponents` and `equipmentComponents` arrays
2. Update `Crew.fromCrewData()` to populate component arrays (or create a new factory)
3. Fix `Renderer.js` line 251 to display labor and equipment separately
4. Fix `Calculator.js` line 179 to pass only labor cost (not labor+equipment) to IndirectCosts for %-based items
5. Update `ExportService.js` to display correct split

### Issue 2: Dual Mobilization Calculation
**Problem:** Activity-level mob (user lump sums) and cluster-level mob (formula: 2 * travel * rate) are calculated independently and displayed in different sections.
**Files affected:** `Activity.js` (lines 137-140), `ClusterEngine.js` (lines 64-78), `Calculator.js` (lines 167-175, 241), `Renderer.js` (lines 261-265, 417-458).
**Resolution needed:** Define which mobilization system to use, or consolidate them with clear priority logic. Currently, activity-level mob flows into Direct Cost and cluster mob is a separate display-only section.

### Issue 3: Safety Cost Not in Waterfall
**Problem:** Safety crew cost is calculated and displayed in the Mob & Safety panel but is NOT included in any cost summary line item. It's orphaned from the waterfall.
**Files affected:** `ClusterEngine.js` (lines 81-93), `Calculator.js` (line 241).
**Resolution needed:** Route `safetyCost` into a specific waterfall line. Options: add to Direct Cost, add to General Conditions, or create a new line in the summary.

### Issue 4: Fee/Profit Has No Bounds Check
**Problem:** User can enter any markup percentage with no warning. Default is 15%.
**Files affected:** `IndirectCosts.js` (line 33), `main.js` (line 479).
**Resolution needed:** Add input validation or warning when feeProfitPct exceeds typical range (e.g., > 25%).

### Issue 5: Contingency and Confidence Are Decoupled
**Problem:** The confidence engine produces a score, and contingency is a separate user-entered percentage. There's no logic linking low confidence to a contingency recommendation.
**Files affected:** `Confidence.js`, `IndirectCosts.js` (lines 112-118), `main.js` (lines 499-504).
**Resolution needed:** Add a recommendation engine that maps confidence descriptor to a suggested contingency range, using the AACE estimate class defaults as a starting point.

### Issue 6: Benchmark Flags Without Corrective Action
**Problem:** Unit cost checks flag HIGH/LOW but don't suggest what to adjust.
**Files affected:** `Calculator.js` (lines 196-220), `AnalysisEngine.js` (lines 52-73), `Renderer.js` (lines 361-387).
**Resolution needed:** Add actionable text to each flag (e.g., "Consider increasing production rate" or "Review crew rate").

### Issue 7: No Output Integrity Checks
**Problem:** The waterfall is assembled but never validated for internal consistency.
**Files affected:** `Calculator.js` (entire Phase 11).
**Resolution needed:** Add a validation pass that checks:
- Direct Cost = sum of activity line items
- Labor + Equipment = sum of crew costs
- Production rate * days ~= quantity (within rounding)
- No duplicate cost categories

---

## 12. Data Research Requirements

When researching external data sources, structure your findings to fit these exact patterns:

### 12.1 Crew Rate Research Output Format

For each crew, provide data in this structure:

```
CREW CODE: [e.g., PV8]
TOTAL COMPOSITE RATE: $XXX.XX/hr
SOURCE(S): [publication, year, page/table]

LABOR COMPONENTS:
  [Role Name] x [count] @ $XX.XX/hr each = $XX.XX/hr
  ...
  LABOR SUBTOTAL: $XXX.XX/hr

EQUIPMENT COMPONENTS:
  [Equipment Name] x [count] @ $XX.XX/hr each = $XX.XX/hr
  ...
  EQUIPMENT SUBTOTAL: $XX.XX/hr

TOTAL: $XXX.XX/hr (must match or justify variance from current rate)
LABOR/EQUIPMENT SPLIT: XX% / XX%

RATE BASIS:
  Labor rates: [source, year, region, burden method]
  Equipment rates: [source, year, method (Blue Book/CAT/rental)]
  Adjustments: [any regional or temporal adjustments applied]
```

### 12.2 Benchmark Research Output Format

```
ACTIVITY TYPE: [e.g., excavation]
JOB MODE: [parking_lot | roadway]
UNIT: [$/CY or $/SY]

P25: $XX.XX
MEDIAN: $XX.XX
P75: $XX.XX
SAMPLE SIZE (n): XXX
BASIS: 'empirical' | 'derived'
SOURCE: [publication, year, dataset]
NOTES: [any caveats, geographic scope, time period]
```

### 12.3 Acceptable Data Sources (ranked by preference)

1. **Company historical data** -- actual bid tabs, cost reports (SourceRank 1)
2. **Published databases** -- RSMeans, Richardson, WisDOT Average Unit Prices, state DOT bid tabs (SourceRank 2)
3. **Manufacturer data** -- Caterpillar Performance Handbook, equipment rental rate guides (SourceRank 3)
4. **First principles** -- derived from physical constants and known rates (SourceRank 4)
5. **Analogous** -- comparable project data with adjustments (SourceRank 5)

### 12.4 Geographic & Temporal Context

- **Region:** Upper Midwest US (Wisconsin primary, neighboring states secondary)
- **Base year for costs:** 2025 dollars
- **Labor market:** Prevailing wage / union scale for highway-heavy work; open shop for parking lot
- **Equipment:** Owned equipment rates preferred over rental; Blue Book methodology acceptable

---

## 13. Coding Instruction Format Requirements

When generating implementation instructions for this codebase, structure them as:

### 13.1 Required Elements per Instruction Set

```
ISSUE: [Number and title]
SEVERITY: [High/Medium/Low]
FILES TO MODIFY: [exact paths from www/js/...]
FILES TO CREATE: [if any -- prefer editing existing]

PREREQUISITE DATA: [what data must be researched/curated first]

STEP-BY-STEP CHANGES:
  Step 1: [file] -- [description of change]
    FIND: [exact code to locate]
    REPLACE WITH: [exact new code]
    RATIONALE: [why this change]

  Step 2: ...

VALIDATION CRITERIA:
  - [how to verify the change works correctly]
  - [expected output/behavior]

BACKWARD COMPATIBILITY:
  - [any breaking changes and how to handle]
  - [migration path for saved data]
```

### 13.2 Code Style Rules

- ES module imports/exports (no CommonJS)
- No build step -- code must work directly in browser
- JSDoc comments on all public methods
- Explicit `Object.freeze()` for enums
- `.toJSON()` and `static fromJSON()` on all model classes
- `get` accessors for derived values
- No external dependencies (pure vanilla JS)

### 13.3 Data File Rules

- All trade data lives in `paving-defaults.js` or `constants.js`
- Physical constants have source documentation in `CONSTANT_SOURCES`
- Rates include `source` and `sourceRank` fields
- Benchmarks include `n` (sample size) and `basis` ('empirical' | 'derived')

---

*End of specification. This document should be treated as the single source of truth for the application's current state. All data research and coding instructions should reference the exact data structures, function signatures, file paths, and naming conventions defined here.*
