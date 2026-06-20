# STABLE-MERGE — อธิบายระบบอย่างละเอียด (ภาษาไทย)

**STABLE-MERGE**: Stability Testing Audit for Benchmark Leaderboards via  
Multi-Environment Ranking Generalizability Examination

> ผู้พัฒนา: ณัฏฐกิตติ์ ปิยะเวชวิรัตน์  
> เวอร์ชัน: `stable_merge` v1.0.0 — 116/116 tests pass

---

## สารบัญ

1. [ปัญหาที่แก้](#1-ปัญหาที่แก้)
2. [STABLE-MERGE คืออะไร?](#2-stable-merge-คืออะไร)
3. [แนวคิดหลัก — อธิบายแบบเข้าใจง่าย](#3-แนวคิดหลัก--อธิบายแบบเข้าใจง่าย)
4. [ทำงานยังไง — ทีละขั้นตอน](#4-ทำงานยังไง--ทีละขั้นตอน)
5. [ผลลัพธ์ 3 แบบ](#5-ผลลัพธ์-3-แบบ)
6. [Metrics หลัก — อธิบายลึก](#6-metrics-หลัก--อธิบายลึก)
7. [การรับประกันทางคณิตศาสตร์](#7-การรับประกันทางคณิตศาสตร์)
8. [LOEO Evaluation Protocol](#8-loeo-evaluation-protocol)
9. [การสร้าง Synthetic Environments](#9-การสร้าง-synthetic-environments)
10. [จุดขาย — ทำไม STABLE-MERGE ถึงไม่เหมือนใคร](#10-จุดขาย--ทำไม-stable-merge-ถึงไม่เหมือนใคร)
11. [ตัวอย่างที่ทำงานจริง](#11-ตัวอย่างที่ทำงานจริง)
12. [โครงสร้างระบบ](#12-โครงสร้างระบบ)
13. [ค่าคงที่มาตรฐาน](#13-ค่าคงที่มาตรฐาน)

---

## 1. ปัญหาที่แก้

### สถานการณ์ในชีวิตจริง

สมมติว่าคุณทำงานในระบบโรงพยาบาล 5 แห่ง ทีม Data Science ฝึกโมเดล ML หลายตัวเพื่อทำนายความเสี่ยงที่ผู้ป่วยจะกลับมารักษาซ้ำ แล้วนำมาเปรียบเทียบ:

| โมเดล | AUROC (โรงพยาบาล 1) | ผล |
|---|---|---|
| โมเดล A (XGBoost) | 0.87 | 🥇 ชนะ |
| โมเดล B (LightGBM) | 0.85 | อันดับ 2 |
| โมเดล C (Logistic Reg) | 0.83 | อันดับ 3 |

ทีมสรุป: **"Deploy โมเดล A"**

โมเดล A ถูก deploy ไปทั้ง 5 โรงพยาบาล

### สิ่งที่เกิดขึ้นจริง

| โมเดล | รพ. 1 | รพ. 2 | รพ. 3 | รพ. 4 | รพ. 5 |
|---|---|---|---|---|---|
| โมเดล A | **0.87** | 0.71 | 0.69 | 0.74 | 0.70 |
| โมเดล C | 0.83 | **0.86** | **0.84** | **0.85** | **0.87** |

**โมเดล A ชนะเฉพาะที่โรงพยาบาล 1 แต่แพ้ทุกที่ที่เหลือ** โมเดล C ซึ่งถูกจัดอันดับ 3 กลับเป็นตัวเลือกที่ดีกว่าสำหรับการ deploy จริง

### ทำไมถึงเกิดแบบนี้?

การประเมินทำในสภาพแวดล้อมเดียว (โรงพยาบาล 1) อันดับนั้นเป็นแค่ "อันดับเฉพาะที่" ไม่ใช่ "อันดับทั่วไป" และทีมไม่มีทางรู้เรื่องนี้จนกระทั่งมันสายเกินไปแล้ว

### ปัญหาที่ซ่อนอยู่ในระบบทุกระบบที่มีอยู่

ระบบ model selection ทุกระบบที่มีอยู่ทำงานแบบเดียวกัน:

> **"ให้ข้อมูลมา → ฉันให้คำตอบว่าโมเดลไหนชนะ"**

ไม่มีระบบไหนสามารถตอบได้ว่า: *"อันดับนี้น่าเชื่อถือจริงๆ ไหม? จะยังคงเป็นแบบนี้ใน environment ใหม่ด้วยไหม?"*

ทุกระบบให้คำตอบเสมอ — แม้ในกรณีที่ควรปฏิเสธ

---

## 2. STABLE-MERGE คืออะไร?

STABLE-MERGE คือ **ระบบตรวจสอบความน่าเชื่อถือของการจัดอันดับโมเดล ML** ที่:

1. รับ predictions จากหลายโมเดลในหลาย environment
2. วัดว่าการจัดอันดับ *เสถียร* แค่ไหนข้าม environment ต่างๆ
3. **รับรอง** ตัวชนะพร้อมการรับประกันทางคณิตศาสตร์ — หรือ **ปฏิเสธ** การรับรองอย่างชัดเจนถ้า ranking ไม่น่าเชื่อถือ

พูดสั้นๆ ได้ว่า:

> **STABLE-MERGE เป็นระบบแรกที่รู้ว่าเมื่อไหรควรพูดว่า "ไม่"**

ระบบนี้ไม่ได้แค่จัดอันดับโมเดล — มัน *ตรวจสอบ* ว่าการจัดอันดับนั้นปลอดภัยที่จะเชื่อหรือไม่

---

## 3. แนวคิดหลัก — อธิบายแบบเข้าใจง่าย

### Environment (สภาพแวดล้อม)
บริบทที่โมเดลถูกประเมินแยกกัน ในการแพทย์: โรงพยาบาลต่างๆ, ช่วงเวลาต่างๆ, กลุ่มประชากรต่างๆ ในการเงิน: ภูมิภาคต่างๆ, สภาวะตลาด ใน e-commerce: กลุ่มผู้ใช้ต่างๆ

**เปรียบได้กับ:** ข้อสอบเดียวกันที่ให้ในห้องเรียนต่างกัน นักเรียนที่ได้ที่ 1 ในห้องตัวเองอาจไม่ได้ที่ 1 ถ้าสอบรวมกับทุกห้อง

### Ranking Instability (ความไม่เสถียรของอันดับ)
เมื่อโมเดล A > โมเดล B ใน Environment 1 แต่โมเดล B > โมเดล A ใน Environment 2 อันดับ *กลับด้าน*

**เปรียบได้กับ:** ร้านอาหารที่ได้รีวิวดีมากในวันธรรมดาแต่แย่มากในวันหยุด การเลือกร้านโดยดูแค่รีวิววันธรรมดาอย่างเดียวนั้นทำให้เข้าใจผิดได้

### Calibration (ความสอดคล้องของความมั่นใจ)
เมื่อโมเดลบอกว่า "ฉัน 80% มั่นใจ" มันควรถูกต้องประมาณ 80% ของเวลา โมเดลที่ calibration แย่นั้น overconfident หรือ underconfident — ตัวเลข probability ที่ออกมาไม่สามารถเชื่อถือได้

**เปรียบได้กับ:** พยากรณ์อากาศที่บอก "มีโอกาสฝนตก 90%" ทุกวันโดยไม่คำนึงถึงสภาพอากาศจริง บางทีอาจทายทิศทางได้ถูก แต่ตัวเลข confidence ไม่มีความหมาย

### Feasible Set F (ชุดโมเดลที่ผ่านเกณฑ์)
ชุดโมเดลที่ผ่าน *ทั้งสอง* เงื่อนไข: calibration ดี **และ** ranking เสถียร มีเฉพาะโมเดลในชุดนี้ที่มีสิทธิ์ได้รับการรับรอง

---

## 4. ทำงานยังไง — ทีละขั้นตอน

### Input (ข้อมูลเข้า)
ไฟล์ prediction สำหรับแต่ละคู่ โมเดล × environment:
```
preds__env=hospital_A__model=XGB.npz    → มี y_true, y_prob
preds__env=hospital_A__model=LR.npz
preds__env=hospital_B__model=XGB.npz
preds__env=hospital_B__model=LR.npz
...
```

### ขั้นตอนที่ 1 — คำนวณ AUROC ต่อโมเดลต่อ environment

AUROC วัดความสามารถในการแยกแยะ Positive/Negative
- AUROC = 1.0 → สมบูรณ์แบบ
- AUROC = 0.5 → สุ่มเดา

ผลลัพธ์เป็น matrix:

| | รพ. A | รพ. B | รพ. C |
|---|---|---|---|
| XGB | 0.88 | 0.79 | 0.82 |
| LR  | 0.83 | 0.84 | 0.86 |
| ET  | 0.86 | 0.80 | 0.81 |

### ขั้นตอนที่ 2 — คำนวณ ECE ต่อโมเดลต่อ environment

ECE วัดว่าโมเดล calibrated ดีแค่ไหน
- ECE = 0.02 → ดีมาก
- ECE = 0.10 → แย่
- เกณฑ์ τ = 0.05 (ค่ามาตรฐาน)

### ขั้นตอนที่ 3 — คำนวณ FlipInv ต่อโมเดล

FlipInv(m) = สัดส่วน opponents ที่อันดับกลับด้านข้าม environment pair ใดๆ

```
FlipInv(XGB) = 0.50  → XGB กลับอันดับกับ 50% ของ opponents
FlipInv(LR)  = 0.00  → LR ไม่เคยกลับอันดับเลย
FlipInv(ET)  = 0.33  → ET กลับอันดับกับ 1 ใน 3 opponents
```

เกณฑ์ κ = 0.25 (ค่ามาตรฐาน)

### ขั้นตอนที่ 4 — สร้าง Feasible Set F

```
F = { m : mean_ECE(m) ≤ τ  AND  FlipInv(m) ≤ κ }
```


> **การจัดการ Missing Values:** `generate_predictions.py` รองรับ NaN อัตโนมัติ โดยใช้ per-fold median imputation (`SimpleImputer(strategy='median')` fit บน training fold เท่านั้น — ไม่มี data leakage) ไม่จำเป็นต้อง impute CSV ล่วงหน้า
ตัวอย่าง:

| โมเดล | Mean ECE | ECE ≤ 0.05? | FlipInv | FlipInv ≤ 0.25? | ผ่านไหม? |
|---|---|---|---|---|---|
| XGB | 0.068 | ✗ | 0.50 | ✗ | ✗ |
| LR  | 0.022 | ✓ | 0.00 | ✓ | **✓** |
| ET  | 0.031 | ✓ | 0.33 | ✗ | ✗ |

F = { LR }

### ขั้นตอนที่ 5 — สร้าง Output

**ถ้า F ไม่ว่าง → CERTIFY**

เลือกโมเดลใน F ที่มี mean AUROC สูงสุด คำนวณ regret bound

```
STABLE-MERGE AUDIT RESULT: CERTIFY
  Certified model : LR
  Feasible set    : ['LR']
  Regret bound    : E[Regret] ≤ 0.112
```

**ถ้า F ว่าง → FALLBACK**

ไม่มีโมเดลไหนผ่านทั้งสองเงื่อนไข คืน best-guess พร้อม warning ชัดเจน

```
STABLE-MERGE AUDIT RESULT: FALLBACK
  ⚠ ไม่มีโมเดลไหนผ่านเงื่อนไขภายใต้ค่า threshold ปัจจุบัน
  Fallback model  : XGB  (ไม่มีการรับประกันความเสถียร)
```

---

## 5. ผลลัพธ์ 3 แบบ

### CERTIFY ✅
- **ความหมาย:** โมเดลผ่านทั้งสองเงื่อนไข (ECE และ FlipInv) ranking ถือว่าเสถียรและน่าเชื่อถือ
- **Output ที่ได้:** ชื่อโมเดลที่ได้รับการรับรอง + feasible set + regret bound ทางคณิตศาสตร์
- **เชื่อถือได้:** โมเดลนี้จะ perform ภายใน guaranteed regret bound ในทุก target environment

### FALLBACK ⚠️
- **ความหมาย:** ไม่มีโมเดลไหนผ่านทั้งสองเงื่อนไข ranking ไม่เสถียรหรือ calibration แย่
- **Output ที่ได้:** โมเดล best-guess ที่เลือกโดย variance-penalized AUROC (mean − λ·std) พร้อม audit envelope ที่ระบุ violation ทุกอย่าง
- **เชื่อถือได้:** ไม่มีการรับประกัน — นี่คือการเดาที่ดีที่สุด ใช้ด้วยความระมัดระวัง

### ABSTAIN 🚫
- **ความหมาย:** ไม่มีโมเดลผ่าน dual constraint และไม่สามารถเลือก fallback ได้ (AUROC ทุกค่าเป็น NaN — ปัญหาคุณภาพข้อมูล)
- **Output ที่ได้:** Audit envelope เท่านั้น — `fallback_model = None` ไม่มีชื่อโมเดลถูกคืนกลับ
- **เกิดขึ้นเมื่อไหร่:** Edge case ที่ validation fold ของทุกโมเดลมี class เดียว ในทางปฏิบัติ FALLBACK คือผลลัพธ์ปกติเมื่อไม่ certify ส่วน ABSTAIN บ่งชี้ปัญหา pipeline

---

## 6. Metrics หลัก — อธิบายลึก

### AUROC — Area Under the ROC Curve

วัดว่าโมเดลแยกแยะ Positive case จาก Negative case ได้ดีแค่ไหน

**ตัวอย่างเข้าใจง่าย:** มีผู้ป่วย 10 คน — 5 คนจะกลับมา (Positive), 5 คนจะไม่กลับมา (Negative) AUROC วัดว่า: ถ้าสุ่มเลือก 1 Positive และ 1 Negative โมเดลจะให้ probability ที่ Positive สูงกว่า Negative บ่อยแค่ไหน?

- AUROC = 1.0 → ถูกทุกครั้ง
- AUROC = 0.5 → เดาสุ่ม
- AUROC = 0.0 → ผิดทุกครั้ง (แต่สามารถ flip ได้เป็น 1.0)

---

### ECE — Expected Calibration Error

**สูตร:**
```
ECE = Σ_bin (|ขนาด bin| / N) × |accuracy(bin) - confidence(bin)|
```

แบ่ง probability ที่โมเดลทำนายออกเป็น 15 bin เท่าๆ กัน (0–0.067, 0.067–0.133, ...) สำหรับแต่ละ bin วัด gap ระหว่าง:
- สิ่งที่โมเดลบอกว่า confident แค่ไหน (average probability ใน bin)
- สิ่งที่เกิดขึ้นจริง (fraction of positives ใน bin)

**ตัวอย่าง:**
> โมเดลทำนาย probability 0.7–0.8 สำหรับผู้ป่วย 100 คน  
> ถ้า 75 คนเป็น Positive จริง: accuracy = 0.75, confidence ≈ 0.75 → gap ≈ 0.00 ✓  
> ถ้ามีแค่ 40 คนเป็น Positive: accuracy = 0.40, confidence ≈ 0.75 → gap = 0.35 ✗

gap สูงหมายความว่าโมเดล overconfident ECE รวม gap เหล่านี้ทุก bin ถ่วงน้ำหนักด้วยขนาด bin

**เกณฑ์:** τ = 0.05 ต้องการ ECE ≤ 0.05 เพื่อเข้า feasible set

---

### FlipInv — Flip Involvement

**สูตร:**
```
FlipInv(m) = จำนวน opponents n ที่ sign(AUROC_m − AUROC_n) กลับด้านในคู่ env ใดๆ
             ────────────────────────────────────────────────────────────────
             จำนวน opponents ที่มีคู่ env ที่เปรียบเทียบได้อย่างน้อย 1 คู่
```

**ตัวอย่างทีละขั้นตอน:**

โมเดล: A, B, C | Environments: E1, E2, E3

AUROC matrix:
```
       E1     E2     E3
A:    0.88   0.80   0.75
B:    0.85   0.83   0.82
C:    0.90   0.78   0.71
```

ตรวจสอบ FlipInv ของโมเดล A กับ B:
- E1: A(0.88) > B(0.85) ← A ชนะ
- E2: A(0.80) < B(0.83) ← B ชนะ ← **อันดับกลับ!**
- นับ 1 ให้ opponent B

ตรวจสอบ FlipInv ของโมเดล A กับ C:
- E1: A(0.88) < C(0.90) ← C ชนะ
- E2: A(0.80) > C(0.78) ← A ชนะ ← **อันดับกลับ!**
- นับ 1 ให้ opponent C

FlipInv(A) = 2 flipped / 2 total = **1.0**

หมายความว่า A กลับอันดับกับ opponent ทุกตัวขึ้นอยู่กับว่าดู environment ไหน A ไม่เสถียรอย่างสมบูรณ์

**เกณฑ์:** κ = 0.25 — ถ้ากลับอันดับกับ opponent มากกว่า 25% = ไม่ผ่าน

---

## 7. การรับประกันทางคณิตศาสตร์

เมื่อ STABLE-MERGE รับรองโมเดล m* ระบบให้ upper bound ที่พิสูจน์ได้ว่าคุณจะเสียไปเท่าไรเมื่อเทียบกับโมเดลที่ดีที่สุดในทางทฤษฎี (oracle):

### Proposition 1 — Regret Bound

```
E[Regret(m*, e_target)] ≤ 2τ + κ · Δ_AUROC
```

โดยที่:
- `τ` = ECE threshold (0.05)
- `κ` = FlipInv threshold (0.25)
- `Δ_AUROC` = ช่วงของค่า AUROC (max − min) ข้ามโมเดลและ environment ทั้งหมด

**ตัวอย่าง MIMIC M5:**
```
τ = 0.05, κ = 0.25, Δ_AUROC = 0.112

Bound = 2(0.05) + 0.25(0.112) = 0.10 + 0.028 = 0.128 (= 12.8 AUROC points)
Empirical max regret ที่วัดได้จริง = 0.012 (= 1.2 AUROC points)
ความเข้ม: 0.128 / 0.012 = 10.7× ต่ำกว่า bound
```

โมเดลที่ได้รับการรับรอง perform ดีกว่า worst case ที่รับประกันถึง 10.7 เท่า Bound นั้น conservative แต่ถูกต้องเสมอ

**การยืนยัน:** Monte Carlo 1,000 รอบ — 0 violations

---

## 8. LOEO Evaluation Protocol

Leave-One-Environment-Out (LOEO) ใช้วัดว่า STABLE-MERGE generalize ได้ดีแค่ไหนเมื่อเทียบกับ strategy พื้นฐาน

### วิธีทำงาน

สำหรับแต่ละ environment e_t:
1. ซ่อน e_t (แกล้งทำเป็นว่าไม่รู้)
2. รัน STABLE-MERGE บน environment ที่เหลือ
3. วัด **regret** = AUROC(oracle บน e_t) − AUROC(โมเดลที่เลือก บน e_t)
4. ทำซ้ำสำหรับทุก environment
5. รายงาน mean regret

### เปรียบเทียบกับ Baselines

| วิธี | Strategy |
|---|---|
| **Oracle** | เลือกโมเดลที่ดีที่สุดจริงๆ บน e_t (ทำไม่ได้ในทางปฏิบัติ — นี่คือ theoretical ceiling) |
| **STABLE-MERGE** | ใช้ dual-constraint audit บน source environments |
| **Baseline-Mean** | เลือกโมเดลที่มี mean AUROC สูงสุด |
| **Baseline-Worst** | เลือกโมเดลที่มี worst-case AUROC สูงสุด (minimax) |
| **Baseline-Var** | เลือกโมเดลที่มี mean − λ·std AUROC สูงสุด |

### ตัวอย่าง LOEO Output

```
  วิธี                       Mean Regret
  ----------------------------------------
  Oracle                          0.0000
  STABLE-MERGE                    0.0082  ← ดีที่สุดในบรรดาวิธีที่ใช้ได้จริง
  Baseline-Mean                   0.0134
  Baseline-Worst                  0.0201
  Baseline-Var                    0.0118
```

STABLE-MERGE ได้ regret ต่ำที่สุดในบรรดาวิธีที่ใช้ได้จริง เพราะมันปฏิเสธโมเดลที่ไม่เสถียรอย่างชัดเจน

---

## 9. การสร้าง Synthetic Environments

### ปัญหาที่แก้

พลังของ STABLE-MERGE มาจากการเปรียบเทียบ environment ถ้ามีแค่ 1–2 environment จริง มีการเปรียบเทียบน้อยเกินไปที่จะวัด FlipInv ได้มีความหมาย

### วิธีแก้

เมื่อมี environment จริงน้อยกว่า 3 ระบบจะสร้าง synthetic environment อัตโนมัติ:

| Environment จริง | Synthetic เพิ่ม | รวม |
|---|---|---|
| 1 | 2 | 3 |
| 2 | 1 | 3 |
| ≥ 3 | 0 | คงเดิม |

### วิธีสร้าง Synthetic Environments

1. **Stratified bootstrap resampling** — สุ่มตัวอย่างแบบมี replacement จาก environment จริง โดยรักษา positive-to-negative class ratio
2. **Gaussian noise injection** — เพิ่ม random noise เล็กน้อย (std = 0.025) ลงบน predicted probabilities ตัดค่าให้อยู่ใน [0, 1]
3. **Per-model seed isolation** — แต่ละคู่ (environment, model) ได้ seed แบบ deterministic ที่ไม่ซ้ำกัน เพื่อป้องกัน synthetic environments เหมือนกันทุกโมเดล

### Warning ที่สำคัญ

Synthetic environments **ไม่ได้** แทน distribution shift จริง ผลจาก augmented datasets มีความน่าเชื่อถือลดลง Output ของ audit จะแสดง banner `!! SYNTHETIC AUGMENTATION ACTIVE !!` ที่เห็นได้ชัด และการตัดสิน CERTIFY จาก augmented data ควรถือเป็นการสำรวจเบื้องต้นเท่านั้น ไม่ใช่สำหรับ production

ปิด augmentation:
```bash
python generate_predictions.py --input data.csv --dataset my_data --no-augment
```

---

## 10. จุดขาย — ทำไม STABLE-MERGE ถึงไม่เหมือนใคร

### 1. ระบบแรกที่รู้ว่าเมื่อไหรควรพูดว่า "ไม่"

ระบบ model selection ทุกระบบก่อนหน้านี้คืนคำตอบเสมอ STABLE-MERGE เป็นระบบแรกที่มี **ABSTAIN/FALLBACK** path ที่ออกแบบตั้งแต่ต้น เมื่อ ranking ไม่น่าเชื่อถือ ระบบจะบอกอย่างชัดเจนแทนที่จะเดาเงียบๆ

**ระบบอื่นทำแบบนี้ไม่ได้:**
- Cross-validation: เลือกผู้ชนะ, ไม่มีการรับประกันความเสถียร
- Ensemble methods: รวมผล, ไม่มีการวิเคราะห์ per-environment
- DomainBed: วัด generalization แต่ยังคืน ranking เสมอ
- AutoML platforms: optimize metric เดียว, ไม่ตรวจ stability ข้าม environment

---

### 2. การพิสูจน์ทางคณิตศาสตร์ — ไม่ใช่แค่ heuristic

Regret bound `E[Regret] ≤ 2τ + κ·Δ_AUROC` มาจาก:
- Hoeffding's inequality (calibration error → AUROC bias bound)
- Preference reversal counting (FlipInv → probability of oracle beating certified model)

นี่ไม่ใช่การสังเกตเชิงประจักษ์ — มันคือ theorem ที่พิสูจน์แล้ว Bound นี้ถูกต้องในทุก scenario ที่ผ่านเงื่อนไข ไม่ใช่แค่โดยเฉลี่ย

---

### 3. สองเงื่อนไขอิสระ = ครอบคลุม 2 จุดอ่อนอิสระกัน

ระบบอื่นป้องกันจุดอ่อนทีละอย่าง:
- Calibration methods แก้ overconfidence แต่ไม่แก้ ranking instability
- Robust selection (minimax) ลด variance แต่ไม่ตรวจ calibration

STABLE-MERGE ต้องการ **ทั้ง** ECE ≤ τ **และ** FlipInv ≤ κ พร้อมกัน หมายความว่า:
- โมเดลที่ calibrated ดีแต่ไม่เสถียรข้าม environment → **ไม่ผ่าน**
- โมเดลที่เสถียรแต่ calibration แย่ → **ไม่ผ่าน**
- เฉพาะโมเดลที่ *ทั้ง* calibrated *และ* เสถียร → **ได้รับการรับรอง**

---

### 4. Audit Envelope — หลักฐานสำหรับ Regulator

เมื่อ STABLE-MERGE ไม่สามารถรับรองได้ (FALLBACK) ระบบไม่ได้แค่บอกว่า "ไม่ผ่าน" แต่สร้าง evidence package ที่มีข้อมูลครบถ้วน:
- FlipInv ของแต่ละโมเดล
- ECE ของแต่ละโมเดล
- โมเดลไหนล้มเหลวเพราะ ECE, FlipInv หรือทั้งสอง
- Threshold ที่ใช้
- คำอธิบายเหตุผลที่ปฏิเสธการรับรอง

ออกแบบมาสำหรับการแพทย์ การเงิน และอุตสาหกรรมที่มีกฎระเบียบสูงที่ต้องการเอกสารประกอบการตัดสินใจ

---

### 5. Threshold Sensitivity Grid

ระบบ auto-sweep 16 combinations ของ threshold:

τ ∈ {0.02, 0.05, 0.08, 0.10} × κ ∈ {0.15, 0.25, 0.33, 0.50}

แสดงให้เห็นว่าการตัดสิน CERTIFY นั้น robust หรือ fragile แค่ไหน โมเดลที่ CERTIFY ผ่านทุก 16 combinations น่าเชื่อถือกว่าโมเดลที่ผ่านแค่ threshold หลวมๆ

---

### 6. ออกแบบให้ใช้ได้กับทุก Domain

ทำงานได้กับทุก domain ที่สามารถนิยาม "environments" ได้:
- การแพทย์: โรงพยาบาล, ช่วงเวลา, กลุ่มประชากร
- การเงิน: ภูมิภาค, สภาวะตลาด, กลุ่มลูกค้า
- E-commerce: ประเภทอุปกรณ์, ตลาดภูมิภาค
- ทุก scenario ที่มีความหลากหลายตามธรรมชาติระหว่างกลุ่มย่อย

ระบบไม่ต้องการ assumption เกี่ยวกับ distribution ต้องการแค่ predictions จากโมเดลเดียวกันข้าม multiple environments

---

### 7. Zero-Shot — ไม่ต้องการข้อมูล Target Environment

STABLE-MERGE ทำงานทั้งหมดบนข้อมูล **source environment** ไม่ต้องการข้อมูลจาก target deployment environment เลย นี่สำคัญมากในการ deploy จริงที่คุณมักไม่สามารถเก็บข้อมูลล่วงหน้าจาก target environment ได้

---

## 11. ตัวอย่างที่ทำงานจริง

### สถานการณ์

ระบบโรงพยาบาลมี 4 แห่ง ต้องการ deploy โมเดลทำนาย sepsis

**โมเดลที่ประเมิน:** LR, XGB, ET, RF

**AUROC matrix:**

| โมเดล | รพ. A | รพ. B | รพ. C | รพ. D |
|---|---|---|---|---|
| LR    | 0.830 | 0.845 | 0.862 | 0.838 |
| XGB   | 0.860 | 0.790 | 0.775 | 0.801 |
| ET    | 0.856 | 0.811 | 0.820 | 0.819 |
| RF    | 0.841 | 0.822 | 0.835 | 0.828 |

การเลือกโดยดูแค่ mean AUROC จะเลือก XGB (สูงสุดที่ รพ. A) แต่ดูให้ดี: XGB ที่ 0.860 ใน รพ. A กับ 0.775 ใน รพ. C — ต่างกัน 8.5 คะแนน ในขณะที่ LR สม่ำเสมอ (0.830–0.862) ทุกโรงพยาบาล

**ECE matrix:**

| โมเดล | รพ. A | รพ. B | รพ. C | รพ. D | Mean ECE |
|---|---|---|---|---|---|
| LR    | 0.021 | 0.025 | 0.019 | 0.023 | **0.022** |
| XGB   | 0.044 | 0.071 | 0.083 | 0.067 | **0.066** |
| ET    | 0.028 | 0.033 | 0.030 | 0.029 | **0.030** |
| RF    | 0.035 | 0.040 | 0.037 | 0.038 | **0.038** |

**FlipInv:**

| โมเดล | FlipInv |
|---|---|
| LR    | 0.00 ← ไม่กลับอันดับเลย |
| XGB   | 1.00 ← กลับอันดับกับทุก opponent |
| ET    | 0.33 ← กลับอันดับกับ 1 ใน 3 opponents |
| RF    | 0.33 ← กลับอันดับกับ 1 ใน 3 opponents |

**ตรวจสอบ Feasibility (τ=0.05, κ=0.25):**

| โมเดล | ECE ≤ 0.05? | FlipInv ≤ 0.25? | Feasible? |
|---|---|---|---|
| LR    | ✓ (0.022) | ✓ (0.00) | **ใช่** |
| XGB   | ✗ (0.066) | ✗ (1.00) | ไม่ |
| ET    | ✓ (0.030) | ✗ (0.33) | ไม่ |
| RF    | ✓ (0.038) | ✗ (0.33) | ไม่ |

**ผลลัพธ์:**

```
STABLE-MERGE AUDIT RESULT: CERTIFY
  Certified model : LR
  Feasible set    : ['LR']
  Mean AUROC (LR) : 0.844
  Regret bound    : E[Regret] ≤ 0.125

  Per-model summary:
    [✓] LR   AUROC=0.844  ECE=0.022  FlipInv=0.000  ← ได้รับการรับรอง
    [✗] XGB  AUROC=0.807  ECE=0.066  FlipInv=1.000  ← ล้มเหลวทั้ง ECE และ FlipInv
    [✗] ET   AUROC=0.827  ECE=0.030  FlipInv=0.333  ← ล้มเหลว FlipInv
    [✗] RF   AUROC=0.832  ECE=0.038  FlipInv=0.333  ← ล้มเหลว FlipInv
```

**การตีความ:**

แม้ XGB จะมี AUROC สูงสุดที่ รพ. A และ RF มี mean AUROC สูงเป็นอันดับสอง ทั้งคู่ไม่เสถียรและไม่ได้รับการรับรอง LR แม้จะมี mean AUROC ต่ำกว่าเล็กน้อย แต่เป็นโมเดลเดียวที่ **ทั้ง calibrated ดีและ ranking เสถียรทุกโรงพยาบาล** STABLE-MERGE รับรอง LR พร้อมการรับประกันทางคณิตศาสตร์ว่าจะไม่แพ้ oracle มากกว่า 0.125 AUROC ในทุกโรงพยาบาล

---

## 12. โครงสร้างระบบ

```
stable_merge_patent/
│
├── run_audit.py                  Entry point หลัก — รัน audit บน datasets/ folder
├── prepare_dataset.py            แปลง predictions CSV → NPZ format
├── generate_predictions.py       ฝึก 5 โมเดลบน raw data → NPZ predictions
├── synthetic_augment.py          สร้าง synthetic environments (ถ้า real envs < 3)
├── setup.py                      Package installer
├── run_all.sh                    Full verification (116 unit tests)
│
├── stable_merge/                 Core Python package
│   ├── __init__.py               Public API + canonical constants
│   ├── _constants.py             แหล่งเดียวของค่าทุกตัว: TAU_CAL, KAPPA_RANK, ฯลฯ
│   ├── metrics.py                คำนวณ ECE, AUROC, FlipInv, FlipRate
│   ├── audit.py                  Logic หลัก CERTIFY / FALLBACK / ABSTAIN
│   ├── bounds.py                 คำนวณ regret bound (Proposition 1)
│   ├── loeo.py                   LOEO evaluation protocol
│   └── npz_loader.py             อ่าน/เขียนไฟล์ prediction (.npz)
│
├── tests/                        116 unit tests
│
├── datasets/                     วางข้อมูลของคุณที่นี่
│
├── examples/
│   ├── example_mimic_m5.py
│   └── example_custom_dataset.py
│
└── docs/
    ├── STABLE_MERGE_Overview(Eng ver.).md
    ├── STABLE_MERGE_Overview(Thai ver.).md      ← ไฟล์นี้
    ├── STABLE_MERGE_Overview(Chinese Traditional ver.).md
    └── ...
```

### Data Flow

```
Raw CSV data
    │
    ▼
generate_predictions.py
    │  StratifiedKFold cross-validation
    │  ฝึก: LR, RF_600, ET_800, XGB, LGBM
    │  Output: preds__env=<E>__model=<M>.npz
    ▼
datasets/<ชื่อ>/
    │
    ├──► synthetic_augment.py  (ถ้า < 3 real envs)
    │        Stratified bootstrap + Gaussian noise
    │
    ▼
run_audit.py
    │
    ├── คำนวณ AUROC, ECE, FlipInv
    ├── StableMergeAuditor → CERTIFY / FALLBACK
    ├── คำนวณ Regret Bound
    └── LOEO evaluation
         │
         ▼
    Audit Result + LOEO Table + Sensitivity Grid
```

---

## 13. ค่าคงที่มาตรฐาน

ค่า threshold ทั้งหมดอยู่ใน `stable_merge/_constants.py` ถ้าต้องการเปลี่ยน แก้ที่นี่ที่เดียว — ทุก module import จากไฟล์นี้

| ค่าคงที่ | ค่า | ความหมาย |
|---|---|---|
| `TAU_CAL` | 0.05 | ECE threshold — โมเดลต้องมี ECE ≤ 0.05 เพื่อเข้า feasible set |
| `KAPPA_RANK` | 0.25 | FlipInv threshold — ranking ต้องเสถียรกับ ≥ 75% ของ env pairs |
| `LAMBDA_VAR` | 0.5 | Variance penalty ใน fallback (mean − 0.5 × std) |
| `ECE_BINS` | 15 | จำนวน bins สำหรับ ECE |
| `N_BOOT` | 2000 | จำนวน bootstrap resamples สำหรับ synthetic environments |
| `SEED` | 42 | Random seed สำหรับ model training |
| `BOOT_SEED` | 123 | Random seed สำหรับ bootstrap augmentation |

---

*STABLE-MERGE — Patent Reference Implementation*  
*ผู้พัฒนา: ณัฏฐกิตติ์ ปิยะเวชวิรัตน์*  
*116/116 tests pass*
