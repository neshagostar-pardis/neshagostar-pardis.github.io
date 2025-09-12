# آموزش برنامه‌نویسی ربات CNC

## مثال عملی: برش سوراخ 300 میلی‌متری در لوله مارپیچی HDPE 3000 میلی‌متری

این آموزش جامع نحوه برنامه‌نویسی ربات قابل CNC را برای برش سوراخ‌های دقیق در لوله‌های بزرگ HDPE با استفاده از روش‌های آشنای برنامه‌نویسی CNC نشان می‌دهد.

---

## نمای کلی پروژه

### **کاربرد**: 
ایجاد سوراخ 300 میلی‌متری در لوله مارپیچی HDPE به قطر 3000 میلی‌متر برای درگاه‌های اتصال، دسترسی نگهداری، یا اتصالات.

### **نیازهای تجهیزاتی**:
- ربات صنعتی قابل CNC (KUKA، FANUC، یا ABB)
- سری برش واترجت یا تورچ پلاسما
- فیکسچر موقعیت‌دهی لوله یا میز دوار
- سیستم اندازه‌گیری مختصات
- نرم‌افزار CAM (Fusion 360، Mastercam، و غیره)

---

## گام 1: درک سیستم مختصات

### **سلسله‌مراتب سیستم‌های مختصات ربات**

```
World Coordinate System (Base)
    ↓
Robot Base Coordinate System
    ↓
Tool Center Point (TCP) - Cutting Tool
    ↓
Workpiece Coordinate System - HDPE Pipe
```

### **نمودار تنظیم سیستم مختصات**

```
                    Z↑ (Vertical)
                     |
                     |
    Y←────────── ROBOT ──────────→ X
                     |              (Forward)
                     |
                ┌────▼────┐
                │         │
                │  HDPE   │ ← Pipe Center = Work Coordinate Origin
                │  PIPE   │
                │ Ø3000mm │
                └─────────┘
                     |
              Pipe Rotation Axis
```

### **نقاط مرجع کلیدی**:
1. **مبدأ پایه ربات**: نقطه ثابت محل نصب ربات
2. **مرکز لوله**: مرکز لوله 3000 میلی‌متری (مبدأ کار ما)
3. **مرکز سوراخ**: جایی که می‌خواهیم سوراخ 300 میلی‌متری را برش دهیم
4. **نقطه مرکز ابزار**: نوک ابزار برش

---

## گام 2: تنظیم فیزیکی و تعیین نقاط مرجع

### **الف. موقعیت‌دهی و فیکسچر لوله**

#### **روش 1: لوله ثابت با حرکت ربات**
```
Setup Layout (Top View):

    ROBOT ARM                    PIPE SUPPORT
        │                      ╔══════════════╗
        │                      ║              ║
        │ ┌─ Cutting Tool       ║   HDPE PIPE  ║
        └→◦                    ║   Ø3000mm    ║ ← Fixed Position
                               ║              ║
                               ╚══════════════╝
                                      │
                              Reference Point (0,0,0)
```

#### **روش 2: لوله روی میز دوار (توصیه شده برای لوله‌های بزرگ)**
```
Setup Layout (Side View):

                    ROBOT ARM
                        │
                        │ ┌─ Cutting Head
                        └→◦
                          │
    ╔══════════════════════════════════════╗
    ║           HDPE PIPE Ø3000mm          ║ ← Rotates on table
    ╚══════════════════════════════════════╝
                          │
              ┌─────────────────────┐
              │   ROTARY TABLE      │ ← A-axis (4th axis)
              └─────────────────────┘
                     │
              Reference Point (0,0,0)
```

### **ب. تنظیم نقاط مرجع**

#### **تعیین مرجع فیزیکی**:

1. **موقعیت مرکز لوله**:
   ```
   Method: 3-Point Circle Measurement
   
   Step 1: Touch pipe surface at 3 points (120° apart)
   Step 2: Robot calculates circle center automatically
   Step 3: Set this center as Work Coordinate Origin (0,0,0)
   ```

2. **مرجع سطح**:
   ```
   Z-axis Reference: Top surface of pipe
   X-axis Reference: Pipe centerline direction
   Y-axis Reference: Perpendicular to pipe centerline
   ```

### **ج. کالیبراسیون نقطه مرکز ابزار (TCP)**

#### **تنظیم TCP برای برش واترجت/پلاسما**:
```
Physical Tool Measurement:

   Robot Flange
        │
        │ ┌── Tool Holder
        └→┤
          │ ┌── Cutting Nozzle
          └→◦ ← Tool Center Point (TCP)
             │
             │ Standoff Distance: 5-10mm from surface
             ▼
    ═══════════════════════════════════
    ║       HDPE PIPE SURFACE       ║
    ═══════════════════════════════════
```

**مثال مختصات TCP**:
- X: 0mm (متمرکز بر نگهدارنده ابزار)
- Y: 0mm (متمرکز بر نگهدارنده ابزار)  
- Z: 85mm (فاصله از فلنج ربات تا نوک برش)

---

## گام 3: گردش کاری برنامه‌نویسی CAM

### **الف. ایجاد مدل CAD**

#### **تنظیم مدل سه‌بعدی در Fusion 360**:

1. **ایجاد هندسه لوله**:
   ```
   Command: Create → Cylinder
   - Diameter: 3000mm
   - Length: As required (e.g., 1000mm section)
   - Material: HDPE
   ```

2. **ایجاد هندسه سوراخ**:
   ```
   Command: Create → Hole
   - Type: Simple hole
   - Diameter: 300mm
   - Position: Center of pipe wall
   - Depth: Through pipe wall thickness
   ```

3. **تنظیم سیستم مختصات کار**:
   ```
   Setup → Create Setup
   - Origin: Pipe center point
   - X-axis: Along pipe centerline
   - Z-axis: Radial outward from pipe center
   ```

### **ب. تولید مسیر ابزار**

#### **استراتژی مسیر ابزار برش**:

```
Fusion 360 CAM Setup:

1. Manufacturing Workspace → Create Setup
   - Work Coordinate System: Pipe Center Origin
   - Stock: HDPE pipe model
   - Fixtures: Support points

2. Create 2D Cutting Toolpath
   - Operation: 2D Profile
   - Geometry: 300mm circle
   - Tool: Waterjet/Plasma (zero width kerf)
   - Cutting Direction: Conventional (clockwise)
```

#### **پارامترهای برش برای HDPE**:
```
Waterjet Cutting (Recommended):
- Cutting Speed: 200-400 mm/min
- Standoff Distance: 3-5mm
- Water Pressure: 60,000 PSI
- Abrasive Flow: 0.3-0.5 kg/min

Plasma Cutting (Alternative):
- Cutting Speed: 1000-2000 mm/min
- Standoff Distance: 6-8mm
- Current: 40-60 Amps (depending on thickness)
- Gas: Compressed Air or Nitrogen
```

### **ج. تولید G-Code**

#### **نمونه G-Code برای برش دایره 300 میلی‌متری**:

```gcode
; HDPE Pipe Hole Cutting Program
; 300mm diameter hole in 3000mm pipe
; Tool: Waterjet cutting head

; Program header
G90          ; Absolute coordinates
G17          ; XY plane selection
G21          ; Millimeter units
F200         ; Feed rate 200mm/min

; Move to safe position
G00 X0 Y0 Z50                ; Move above pipe center, safe height

; Position for hole cutting
G00 X150 Y0                  ; Move to start point (150mm radius)
G01 Z5                       ; Lower to cutting height (5mm standoff)

; Start cutting process
M03          ; Start waterjet/plasma
G04 P2       ; Dwell 2 seconds for system stabilization

; Cut 300mm circle (150mm radius)
G02 X150 Y0 I-150 J0 F200    ; Circular interpolation, full circle
                             ; I,J = relative coordinates to circle center

; End cutting
M05          ; Stop cutting
G01 Z50      ; Retract to safe height
G00 X0 Y0    ; Return to home position

; Program end
M30          ; Program end and rewind
```

---

## گام 4: روش‌های برنامه‌نویسی مخصوص ربات

### **الف. برنامه‌نویسی ربات KUKA (KUKA.CNC)**

#### **برنامه KRL با یکپارچه‌سازی CNC**:

```krl
&ACCESS RVP
&REL 1
&PARAM EDITMASK = *
&PARAM TEMPLATE = C:\KRC\Roboter\Template\vorgabe
&PARAM DISKPATH = KRC:\R1\Program\

DEF HDPE_HOLE_CUTTING()

; Initialize CNC mode
BAS(#INITMOV,0)
CNC_ON()

; Set work coordinate system (pipe center)
$BASE = {X 1500, Y 0, Z 800, A 0, B 0, C 0}
$TOOL = TCP_WATERJET

; Safety position
PTP {X 0, Y 0, Z 50, A 0, B 0, C 0}

; Move to cutting start position
PTP {X 150, Y 0, Z 5, A 0, B 0, C 0}

; Execute G-code block for circle cutting
CNC_BLOCK("G02 X150 Y0 I-150 J0 F200")

; Return to safe position
PTP {X 0, Y 0, Z 50, A 0, B 0, C 0}

CNC_OFF()
END
```

### **ب. برنامه‌نویسی ربات FANUC (با QSSR)**

#### **برنامه FANUC TP**:

```fanuc
/PROG HDPE_HOLE
/ATTR
OWNER = MNEDITOR;
COMMENT = "Cut 300mm hole in HDPE pipe";
PROG_SIZE = 2048;
CREATE = DATE 23-12-12 TIME 10:30:00;
MODIFIED = DATE 23-12-12 TIME 10:30:00;
FILE_NAME = ;
VERSION = 0;
LINE_COUNT = 15;
MEMORY_SIZE = 1024;
PROTECT = READ_WRITE;
TCD: STACK_SIZE = 0,
     TASK_PRIORITY = 50,
     TIME_SLICE = 0,
     BUSY_LAMP_OFF = 0,
     ABORT_REQUEST = 0,
     PAUSE_REQUEST = 0;
DEFAULT_GROUP = 1,*,*,*,*;

/MN
1: UFRAME_NUM=1 ;
2: UTOOL_NUM=1 ;
3: !Set cutting parameters ;
4: F200 (Feedrate 200mm/min) ;
5: !Move to safe position ;
6: J P[1] 50% CNT0 ;
7: !Position for cutting ;
8: L P[2] 200mm/min CNT0 ;
9: !Start cutting system ;
10: DO[1]=ON (Start waterjet) ;
11: WAIT .50 (sec) ;
12: !Execute circle cutting ;
13: G02 P[2] I-150 J0 F200 ;
14: !Stop cutting and retract ;
15: DO[1]=OFF ;
16: J P[1] 50% CNT0 ;
/END

; Position data
P[1] = {X: 0, Y: 0, Z: 50, W: 0, P: 0, R: 0}    ; Safe position
P[2] = {X: 150, Y: 0, Z: 5, W: 0, P: 0, R: 0}   ; Cutting start position
```

### **ج. برنامه‌نویسی ربات ABB (RAPID با Machining PowerPac)**

#### **برنامه RAPID**:

```rapid
MODULE HDPE_Cutting

    CONST robtarget pSafe := [[0,0,50],[1,0,0,0],[0,0,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
    CONST robtarget pStart := [[150,0,5],[1,0,0,0],[0,0,0,0],[9E+09,9E+09,9E+09,9E+09,9E+09,9E+09]];
    
    PROC Main()
        ! Set work object and tool
        WObj := wobj_pipe;
        Tool := tWaterjet;
        
        ! Move to safe position
        MoveJ pSafe, v1000, z50, tWaterjet;
        
        ! Move to cutting start position
        MoveL pStart, v200, fine, tWaterjet;
        
        ! Start cutting system
        SetDO doWaterjet, 1;
        WaitTime 0.5;
        
        ! Execute circular cutting path
        MoveC pStart, pStart, v200, fine, tWaterjet;
        
        ! Stop cutting and return
        SetDO doWaterjet, 0;
        MoveJ pSafe, v1000, z50, tWaterjet;
        
    ENDPROC

ENDMODULE
```

---

## گام 5: تکنیک‌های پیشرفته برنامه‌نویسی

### **الف. برش چند پاسه برای HDPE ضخیم**

#### **برش لوله دیواره ضخیم (ضخامت دیواره >20 میلی‌متر)**:

```gcode
; Multi-pass cutting for thick HDPE pipe walls
; Pass 1: Rough cut at 50% depth
G01 Z10                      ; First pass depth
G02 X150 Y0 I-150 J0 F150    ; Slower feed for rough cut

; Pass 2: Finish cut at full depth
G01 Z2                       ; Full depth pass
G02 X150 Y0 I-150 J0 F200    ; Normal feed for finish
```

### **ب. برش تطبیقی با دنبال کردن سطح**

#### **جبران سطح منحنی لوله**:

```
For pipes with curvature or deflection:

1. Probe pipe surface at multiple points around cut area
2. Create 3D surface model
3. Adjust Z-height dynamically during cutting:

G01 Z[#501 + 5]              ; Z = probed height + standoff
```

### **ج. یکپارچه‌سازی کنترل کیفیت**

#### **نظارت زمان واقعی**:

```gcode
; Quality monitoring during cutting
M98 P9001                    ; Call probe subroutine
IF [#500 GT 0.5] THEN        ; If deviation > 0.5mm
    M00                      ; Program pause
    (MSG, CHECK CUT QUALITY) ; Display message
ENDIF
```

---

## گام 6: عیب‌یابی و بهینه‌سازی

### **مشکلات رایج و راه‌حل‌ها**

#### **1. دایره گرد نیست**
```
Problem: Oval or irregular cut shape
Causes:
- Robot acceleration too high
- Cutting speed too fast for material
- Poor TCP calibration

Solutions:
- Reduce acceleration: G01 F100 (slower feed)
- Check TCP accuracy with calibration sphere
- Verify robot stiffness parameters
```

#### **2. مشکلات کیفیت لبه برش**
```
Problem: Rough or melted edges
Causes (HDPE specific):
- Cutting speed too slow (heat buildup)
- Wrong standoff distance
- Contaminated cutting medium

Solutions:
- Increase cutting speed: F300-400 for waterjet
- Adjust standoff: 3-5mm for HDPE
- Check water/abrasive quality
```

#### **3. مشکلات دقت موقعیت‌یابی**
```
Problem: Hole not in correct location
Causes:
- Work coordinate system error
- Reference point drift
- Thermal expansion of pipe

Solutions:
- Re-establish work coordinates before each cut
- Use multiple reference points for large pipes
- Account for material thermal expansion
```

### **تکنیک‌های بهینه‌سازی**

#### **الف. بهینه‌سازی مسیر برش**

```gcode
; Optimized entry/exit strategy
G01 X160 Y0                  ; Approach from outside
G03 X150 Y0 I-5 J0 F100      ; Spiral entry (reduces stress)
G02 X150 Y0 I-150 J0 F200    ; Main cutting circle
G02 X160 Y0 I-150 J0 F100    ; Spiral exit
```

#### **ب. برنامه‌نویسی چند سوراخه**

```gcode
; Pattern cutting for multiple holes
#1 = 0                       ; Hole counter
WHILE [#1 LT 4] DO           ; 4 holes total
    #2 = #1 * 90             ; Angle calculation (90° spacing)
    #3 = 1500 * COS[#2]      ; X position calculation
    #4 = 1500 * SIN[#2]      ; Y position calculation
    
    G00 X#3 Y#4              ; Move to hole position
    M98 P8001                ; Call hole cutting subroutine
    #1 = #1 + 1              ; Increment counter
END
```

---

## گام 7: ملاحظات ایمنی

### **نیازهای برنامه‌نویسی ایمنی**

#### **الف. مناطق امن و محدودیت‌ها**

```gcode
; Software safety limits
G10 L2 P1 X0 Y0 Z0           ; Work coordinate system
G10 L2 P2 X-2000 Y-2000 Z-100 A0 ; Safety zone minimum
G10 L2 P3 X2000 Y2000 Z1000 A0   ; Safety zone maximum

; Check position before cutting
IF [ABS[#5021] GT 1800] THEN      ; If X > 1800mm
    M00 (POSITION OUT OF RANGE)    ; Emergency stop
ENDIF
```

#### **ب. یکپارچه‌سازی توقف اضطراری**

```krl
; KUKA safety monitoring
IF $IN[32] == FALSE THEN     ; Emergency stop input
    HALT                     ; Stop all motion
    CNC_OFF()               ; Disable cutting
    BAS(#INITMOV,0)         ; Reset to safe state
ENDIF
```

#### **ج. اجتناب از برخورد**

```rapid
! ABB collision detection
PROC SafeMove()
    IF RobOS() THEN
        MoveJ pSafe, v1000, z50, tWaterjet;
    ENDIF
    
    ! Check for collision before movement
    IF TestSignRead(diCollisionZone) = 1 THEN
        Stop;
        TPWrite "Collision zone active";
    ENDIF
ENDPROC
```

---

## گام 8: یکپارچه‌سازی با گردش کاری CAD/CAM

### **مثال گردش کاری کامل**

#### **فرآیند طراحی تا تولید**:

```
1. CAD Design (SolidWorks/Fusion 360)
   ↓
   - Create 3000mm pipe model
   - Add 300mm hole feature
   - Define assembly constraints

2. CAM Programming (Fusion 360 Manufacturing)
   ↓
   - Setup work coordinate system
   - Create 2D profile toolpath
   - Generate robot-specific post-processor output
   - Simulate cutting operation

3. Robot Program Generation
   ↓
   - Import G-code into robot programming software
   - Add robot-specific commands (tool control, etc.)
   - Verify program with 3D simulation

4. Production Setup
   ↓
   - Establish physical reference points
   - Load program into robot controller
   - Run test cuts on sample material
   - Execute production cutting

5. Quality Control
   ↓
   - Measure cut diameter and position
   - Check edge quality and perpendicularity
   - Document results for process improvement
```

### **پیکربندی پست‌پروسسور**

#### **تنظیمات پست‌پروسسور سفارشی برای CNC ربات**:

```javascript
// Fusion 360 Robot Post-Processor excerpt
function onCircular(clockwise, cx, cy, cz, x, y, z, feed) {
    if (clockwise) {
        writeBlock("G02", 
                   "X" + xyzFormat.format(x), 
                   "Y" + xyzFormat.format(y),
                   "I" + xyzFormat.format(cx - getCurrentPosition().x),
                   "J" + xyzFormat.format(cy - getCurrentPosition().y),
                   "F" + feedFormat.format(feed));
    } else {
        writeBlock("G03", 
                   "X" + xyzFormat.format(x), 
                   "Y" + xyzFormat.format(y),
                   "I" + xyzFormat.format(cx - getCurrentPosition().x),
                   "J" + xyzFormat.format(cy - getCurrentPosition().y),
                   "F" + feedFormat.format(feed));
    }
}
```

---

## نتیجه‌گیری

این آموزش جامع نشان می‌دهد که چگونه می‌توان تخصص برنامه‌نویسی CNC را مستقیماً برای اتوماسیون ربات در پردازش لوله‌های HDPE به کار برد. مزایای کلیدی این رویکرد شامل:

- **برنامه‌نویسی آشنا**: استفاده از دانش موجود G-code
- **یکپارچه‌سازی CAM**: بهره‌برداری از سرمایه‌گذاری‌های نرم‌افزاری فعلی  
- **دقت بالا**: دستیابی به دقت سطح CNC (±0.1mm)
- **فرآیند مقیاس‌پذیر**: آسان برای تغییر اندازه‌های مختلف سوراخ و موقعیت‌ها
- **مقرون‌به‌صرفه**: منحنی یادگیری کمینه برای تیم‌های با تجربه CNC

با دنبال کردن این روش‌شناسی، تیم‌های دارای تجربه CNC می‌توانند به سرعت راه‌حل‌های رباتیک را پیاده‌سازی کنند در حالی که گردش کاری برنامه‌نویسی آشنای خود را حفظ کرده و دقت فوق‌العاده در فرآیندهای تولید HDPE دست یابند.

---

## منابع اضافی

### **ویدیوهای آموزشی و مستندات**:
- **[KUKA CNC Programming Course](https://www.youtube.com/results?search_query=KUKA+CNC+robot+programming)**
- **[FANUC QSSR Training Materials](https://www.fanuc.com/support/documentation)**
- **[ABB Machining PowerPac User Guide](https://new.abb.com/products/robotics/robotics-software/machining-powerpac)**
- **[Fusion 360 Robot Programming Tutorials](https://www.autodesk.com/support/technical/learn-explore/learn-fusion-360-manufacturing/manufacturing)**

### **جوامع پشتیبانی**:
- **[RobotForum.org CNC Section](https://www.robotforum.org/robotics-programming/)**
- **[Industrial Automation Forums](https://www.plctalk.net/qanda/forumdisplay.php?f=33)**
- **[CNC/Robot Integration Groups](https://www.linkedin.com/groups/)**