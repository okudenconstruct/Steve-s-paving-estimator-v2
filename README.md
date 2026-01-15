# Paving Estimating Calculator 2.0

A comprehensive paving project estimator with production calculations, trucking logistics, and full cost estimation capabilities.

## Features

### Production Estimation
- **Six Phase Estimation**: Excavation, Fine Grading, DGA Base, Milling, Base Course, Surface Course
- **Research-Backed Formulas**: All calculations validated against DOT standards
- **Parking Lot Modifiers**: Adjustable complexity factors (0.55× to 1.0×)
- **Waste & Swell Factors**: Configurable material waste and excavation swell
- **Trucking Calculations**: Automatic fleet sizing based on cycle times

### Cost Estimation
- **Material Costs**: Separate pricing for 9.5mm HMA, 19mm HMA, DGA, Tack Coat
- **Labor & Equipment**: Per-phase crew rates with configurable crew sizes
- **Trucking Costs**: Hourly rate applied to calculated truck hours
- **Mobilization**: Per-phase mobilization costs with toggle controls
- **Price Index Reference**: Fields to note Fuel and AC indexes for export
- **Markup & Bid Price**: Configurable markup percentage with final bid calculation

### User Features
- **Save/Load Rates**: Store your rates locally in browser storage
- **Project Name**: Exports with your estimate
- **Auto-Calculate**: Real-time updates as you enter data
- **Export**: Copy formatted results to clipboard

## Quick Start

1. **Configure Rates**: Expand the Rate Configuration panel and enter your rates
2. **Save Rates**: Click "Save Rates" to store locally for future use
3. **Enter Project Data**: Fill in areas, depths, cycle times, and production rates
4. **Select Crew Sizes**: Choose appropriate crew sizes for each phase
5. **Toggle Mobilization**: Check/uncheck mob for each applicable phase
6. **Review Results**: Production summary and cost summary update automatically
7. **Export**: Click Export to copy results to clipboard

## Rate Configuration

### Materials
| Field | Description |
|-------|-------------|
| 9.5mm HMA ($/ton) | Surface course material |
| 19mm HMA ($/ton) | Base course material |
| DGA ($/ton) | Dense graded aggregate |
| Tack Coat ($/gal) | Tack coat material |
| Tack Rate (gal/SY) | Application rate (default 0.05) |

### Price Index Reference
- **Fuel Price Index**: Note the fuel index at bid time
- **AC Price Index**: Note the asphalt cement index at bid time

These fields are for reference only and export with your estimate. Adjust material prices to reflect expected construction-time indexes.

### Crew & Equipment Rates ($/hr)
Each phase has its own hourly rate that includes labor AND equipment:
- Excavation Crew
- Fine Grading Crew
- DGA Crew
- Milling Crew
- Base Paving Crew
- Surface Paving Crew

### Mobilization ($)
Flat cost per mobilization for each phase. Use the checkbox on each phase card to include/exclude.

## Crew Assembly Assumptions

### Excavation Crew
- Excavator (Cat 320 or similar)
- Operator + 1-2 laborers
- Skid steer for cleanup

### Fine Grading Crew
- Motor grader or skid steer
- Plate compactor / roller
- Operator + 1 laborer

### Milling Crew
- Cold planer (Wirtgen or similar)
- Skid steer for cleanup
- Operator + 2-3 laborers

### Paving Crew
- Asphalt paver
- 2 rollers (breakdown + finish)
- Material transfer vehicle (optional)
- Operator + 4-6 laborers

## Formulas

### Asphalt Tonnage
```
Tons = Area(SY) × Depth(in) × 0.0575
```

### Volume (Cubic Yards)
```
CY = Area(SY) × Depth(in) ÷ 324
```

### RAP (Milled Asphalt) Tonnage
```
Tons = Area(SY) × Depth(in) × 0.04875
```

### Labor Cost
```
Cost = Days × 8 hours × Crew Size × Hourly Rate
```

### Trucking Cost
```
Cost = Truck Hours × Trucking Rate ($/hr)
```

## Material Densities

| Material | Density | Source |
|----------|---------|--------|
| HMA (compacted) | 145 lbs/ft³ | Asphalt Institute |
| DGA (compacted) | 1.9 tons/CY | Industry standard |
| RAP (loose) | 130 lbs/ft³ | FHWA |
| Excavated soil | 1.5 tons/CY | Caterpillar |

## Production Rates (WisDOT 2022)

| Activity | DOT Range | Typical |
|----------|-----------|---------|
| Excavation | 250-1,300 CY/day | 600 |
| Milling (thin <2") | 8,500-25,000 SY/day | 17,000 |
| Milling (thick 2"+) | 8,000-20,000 SY/day | 14,000 |
| HMA Paving | 700-1,800 tons/day | 1,300 |

### Parking Lot Modifiers
| Complexity | Modifier | Description |
|------------|----------|-------------|
| Simple | 0.85× | Large retail, open access |
| Standard | 0.70× | Typical commercial |
| Complex | 0.55× | Dense obstacles, tight spaces |
| Roadway | 1.0× | DOT standard rates |

## Tack Coat

- **Default Area**: Automatically populated from Surface Area
- **Typical Rate**: 0.03-0.05 gal/SY
- **Application**: Between milled surface or base course and surface course

## Data Storage

Rates are saved to browser localStorage. This means:
- Rates persist between sessions on the same browser
- Rates are not shared across devices
- Clearing browser data will remove saved rates
- No data is sent to any server

## Export Format

The export includes:
- Project name
- Date/time generated
- Fuel and AC index references
- Production summary (days, truck hours, material quantities)
- Phase-by-phase breakdown
- Cost summary by category
- Direct cost, markup, and bid price

## Sources

- Wisconsin DOT Production Rate Table (December 2022)
- Asphalt Institute - HMA density and specifications
- FHWA - RAP density and recycling guidelines
- Caterpillar Equipment Handbook - Soil densities and swell factors

## Local Development

Simply open `index.html` in a browser. No build process required.

## License

MIT License

---

*Built for American Asphalt Solutions • January 2026*
