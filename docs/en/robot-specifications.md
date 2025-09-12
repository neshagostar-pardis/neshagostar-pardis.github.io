# Robot "Nameplate" Specifications & Categories

### Understanding Robot Specifications (The "Nameplate" Equivalent)

Just as electric motors have standardized nameplates with key specifications, industrial robots have equivalent technical data sheets with critical information for selection and operation.

#### 1.1 Standard Robot Nameplate Information

**Primary Specifications:**
- **Payload Capacity**: Maximum weight the robot can handle at full extension (kg/lbs)
- **Reach/Working Envelope**: Maximum horizontal and vertical reach distances (mm)
- **Repeatability**: Precision of returning to the same position (±mm, typically ±0.02 to ±0.5mm)
- **Speed**: Maximum joint speeds (degrees/second) and TCP speed (mm/s)
- **Degrees of Freedom**: Number of controllable joints (typically 6 for general purpose)
- **Protection Rating**: IP rating for environmental conditions (IP54, IP65, IP67)
- **Power Requirements**: Electrical supply (3-phase 400V typical) and consumption (kW)
- **Weight**: Robot arm weight and base mounting requirements
- **Operating Temperature**: Environmental operating range (-10°C to +50°C typical)

**Safety & Compliance:**
- **CE/UL Certifications**: European and North American safety compliance
- **Safety Categories**: Category 3 or 4 per ISO 13849
- **Collaborative Features**: Force limiting, speed monitoring for human interaction

#### 1.2 Robot Classification Categories

**By Configuration Type:**
- **6-Axis Articulated**: Most versatile, human arm-like movement (FANUC LR Mate, ABB IRB)
- **SCARA (4-Axis)**: Fast, precise assembly operations (FANUC SR series, ABB IRB 910SC)
- **Delta/Parallel**: High-speed pick and place (ABB IRB 360, FANUC M-1iA)
- **Cartesian/Gantry**: Large workspace, high payload (custom systems)
- **Collaborative (Cobots)**: Human-safe interaction (Universal Robots, FANUC CRX)

**By Payload Capacity:**
- **Light Payload**: <10kg - Electronics, small parts assembly
- **Medium Payload**: 10-100kg - General manufacturing, welding
- **Heavy Payload**: 100-1000kg+ - Automotive, large fabrication

**By Reach Classification:**
- **Short Reach**: <1000mm - Compact cells, machine tending
- **Medium Reach**: 1000-2000mm - General manufacturing
- **Long Reach**: >2000mm - Large part handling, extended workspace

**By Precision Class:**
- **Standard**: ±0.1-0.5mm - General manufacturing
- **High Precision**: ±0.02-0.1mm - Assembly, quality inspection
- **Ultra Precision**: <±0.02mm - Microelectronics, medical devices

#### 1.3 How to Read Robot Model Designations

**FANUC Model Decoding:**
- **LR Mate 200iD/7L**: LR Mate (series) + 200iD (generation) + 7L (7kg payload, Long reach)
- **M-20iA/35M**: M-series + 20iA (generation) + 35M (35kg payload, Medium reach)
- **ARC Mate 100iD/12**: ARC Mate (welding series) + 100iD + 12 (12kg payload)

**ABB Model Decoding:**
- **IRB 2600-20/1.65**: IRB (Industrial Robot) + 2600 (series) + 20 (20kg payload) + 1.65 (1.65m reach)
- **IRB 6700-200/2.60**: IRB + 6700 (series) + 200 (200kg payload) + 2.60 (2.60m reach)

**KUKA Model Decoding:**
- **KR 16-2**: KR (KUKA Robot) + 16 (16kg payload) + 2 (generation)
- **KR 1000 titan**: KR + 1000 (1000kg payload) + titan (heavy duty series)

#### 1.4 Key Performance Indicators for Manufacturing

**Speed Specifications:**
- **Cycle Time**: Complete operation time (seconds per part)
- **Acceleration**: Joint acceleration rates (rad/s²)
- **Path Deviation**: Accuracy following programmed path (±mm)

**Precision Metrics:**
- **Repeatability**: Statistical measure (±mm at 3σ)
- **Accuracy**: Absolute position accuracy (±mm)
- **Resolution**: Smallest controllable movement increment

**Reliability Indicators:**
- **MTBF**: Mean Time Between Failures (hours)
- **MTTR**: Mean Time To Repair (hours)
- **Uptime**: Operational availability percentage (>95% typical)