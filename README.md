# Paving Estimating Calculator 2.0

A research-backed paving project estimator for excavation, milling, DGA placement, and asphalt paving calculations with integrated trucking logistics.

![Calculator Preview](preview.png)

## Features

- **Six Phase Estimation**: Excavation, Fine Grading, DGA Base, Milling, Base Course, Surface Course
- **Research-Backed Formulas**: All calculations validated against DOT standards and industry sources
- **Parking Lot Modifiers**: Adjustable complexity factors for non-roadway applications
- **Waste & Swell Factors**: Configurable material waste and excavation swell percentages
- **Trucking Calculations**: Automatic fleet sizing based on cycle times and production rates
- **Project Summary**: Aggregated totals across all phases
- **Export Function**: Copy results to clipboard for easy transfer to estimates

## Quick Start

1. Visit: `https://okudenconstruct.github.io/paving-calculator/`
2. Enter area (SY) and depth (inches) for each applicable phase
3. Select production rates appropriate for your site conditions
4. Enter truck cycle times (round-trip + load/unload)
5. Review outputs and project summary

## Material Densities Used

| Material | Density | Source |
|----------|---------|--------|
| HMA (compacted) | 145 lbs/ft³ | Asphalt Institute |
| DGA (compacted) | 1.9 tons/CY | Industry standard |
| RAP (loose milled) | 130 lbs/ft³ | FHWA |
| Excavated soil | 1.5 tons/CY | Caterpillar |

## Production Rates

Production rates are based on Wisconsin DOT's 2022 Production Rate Table, with modifiers for parking lot conditions:

| Activity | DOT Range | Typical | Unit |
|----------|-----------|---------|------|
| Excavation (truck) | 250 - 1,300 | 600 | CY/day |
| Milling (thin <2") | 8,500 - 25,000 | 17,000 | SY/day |
| Milling (thick 2"+) | 8,000 - 20,000 | 14,000 | SY/day |
| HMA Paving | 700 - 1,800 | 1,300 | tons/day |
| Base Course | 350 - 1,300 | 700 | tons/day |

### Parking Lot Modifiers

| Complexity | Modifier | Description |
|------------|----------|-------------|
| Simple | 0.85× | Large retail, minimal obstacles, good access |
| Standard | 0.70× | Typical commercial, moderate obstacles |
| Complex | 0.55× | Dense obstacles, tight spaces, extensive hand work |
| Roadway | 1.0× | DOT standard rates (baseline) |

## Key Formulas

### Asphalt Tonnage
```
Tons = Area(SY) × Depth(in) × 0.0575
```
Derived from: 145 lbs/ft³ ÷ 27 ft³/CY ÷ 12 in/ft × 9 ft²/SY

### Volume (Cubic Yards)
```
CY = Area(SY) × Depth(in) ÷ 324
```
Where 324 = 9 ft²/SY × 36 in/yd

### RAP (Milled Asphalt) Tonnage
```
Tons = Area(SY) × Depth(in) × 0.04875
```
Based on 130 lbs/ft³ loose RAP density

### Truck Fleet Sizing
```
Loads/day = Daily output ÷ truck capacity
Trucks needed = (Loads × Cycle time) ÷ 480 minutes
Truck hours = Trucks × Days × 8 hours
```

## Trucking Assumptions

- **Tri-axle (dirt/DGA)**: 16 CY capacity
- **Tri-axle (HMA)**: 22 tons capacity
- **Workday**: 480 minutes (8 hours)
- **Efficiency factor**: Adjustable 85-100%

## Adjustment Factors

### Excavation Swell (Caterpillar)
| Soil Type | Swell % |
|-----------|---------|
| Sand/Gravel | 10-15% |
| Common earth | 20-30% |
| Clay | 30-40% |

### Material Waste
- Asphalt: 5-10% (7% typical)
- Aggregate: 5-10% (7% typical)

## Sources & References

1. **Wisconsin DOT** - Production Rate Table (December 2022)
2. **Asphalt Institute** - HMA density and mix design specifications
3. **FHWA** - RAP density and recycling guidelines (FHWA-HRT-11-021)
4. **Caterpillar** - Material density tables and swell factors
5. **NJDOT** - Standard Specifications for Road and Bridge Construction

## Local Development

Simply open `index.html` in a browser. No build process required.

## License

MIT License - Feel free to use and modify for your estimating needs.

## Contributing

Issues and pull requests welcome. Please cite sources for any formula changes.

---

*Built for American Asphalt Solutions by Steve | January 2026*
