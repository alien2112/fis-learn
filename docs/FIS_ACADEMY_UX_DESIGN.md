# FiS Academy - UX Design System

## 1. Public-Facing Pages Microcopy

### Homepage

**Hero Section:**
- Headline (Arabic): "تعلم بالممارسة، ليس بالمشاهدة"
- Subheadline: "من مبتدئ إلى محترف عبر محاكاة بيئة العمل الحقيقية"
- CTA Primary: "ابدأ مسيرتك المهنية" / "Start Your Career Journey"
- CTA Secondary: "استعرض المسارات" / "Explore Career Paths"

**Trust Bar:**
- "+10,000 متدرب في الشركات الكبرى"
- "معدل توظيف 85% خلال 6 أشهر"

### Course Landing Page

**Header:**
- Title: "[Track Name] - عالم [Career World]"
- Subtitle: "مسار عملي يؤهلك لوظيفة [Job Title]"

**CTA Variants:**
- V1: "انضم للمسار" (Join the Track)
- V2: "ابدأ التعلم العملي" (Start Hands-on Learning)

**Enrollment Card:**
- "احصل على شهادة معتمدة"
- "تواصل مع مرشد مهني"
- "30 يوم ضمان استرداد"

### Pricing Page

**Tier Labels:**
- "المتدرب" (Starter) - Free tier
- "المحترف" (Professional) - Monthly
- "الشركات" (Enterprise) - Custom

**CTA:**
- "ابدأ مجاناً" (Start Free)
- "اكتسب مهارات احترافية" (Gain Pro Skills)

### Signup Flow

**Step 1 - Account:**
- Headline: "أنشئ حسابك في دقيقة"
- Button: "متابعة" (Continue)
- Helper: "لديك حساب؟ تسجيل الدخول"

**Step 2 - Goals:**
- "ما هدفك التعليمي؟"
- Options: "تغيير وظيفتي" / "تطوير مهاراتي" / "بدء مشروعي"

**Step 3 - Skill Assessment:**
- "قيّم مستواك الحالي"
- CTA: "ابدأ التقييم" (Start Assessment)

---

## 2. In-Lesson Code Experience

### Layout: Three-Panel Design

```
┌─────────────────────────────────────────────────────────┐
│  [Lesson Nav]  │  [Code Editor]  │  [Output/Preview]   │
│  - Outline     │  - Syntax       │  - Console          │
│  - Progress    │    Highlighted  │  - Visual Output    │
│  - Notes       │  - Line Numbers │  - Browser Preview  │
└─────────────────────────────────────────────────────────┘
```

### Code Editor Features

**Toolbar:**
- Language Selector: "HTML | CSS | JS | Python | Java"
- "تشغيل الكود" (Run Code) - Primary Button
- "إعادة تعيين" (Reset) - Secondary
- "حفظ مؤقت" (Save Draft) - Icon

**Editor State:**
- Default: Read-only lesson code
- Edit Mode: Yellow border indicator
- Running: Blue spinner on Run button
- Error: Red highlight on problem line

**Output Panel Tabs:**
- "النتيجة" (Output)
- "الكونسول" (Console)
- "المتصفح" (Browser Preview - for HTML/CSS)

### Microcopy

**Success:**
- "أحسنت! الكود يعمل perfectly"
- "✓ اجتزت هذا التمرين"

**Error Feedback:**
- "هناك خطأ في السطر ٥"
- "تلميح: تحقق من الأقواس"

---

## 3. Live Debug Mode

### Visual Debugging Interface

**Control Bar:**
- "تشغيل خطوة بخطوة" (Step-by-Step)
- "استمرار" (Continue)
- "إعادة" (Restart)
- Speed: "بطيء | عادي | سريع"

**Variable Watch Panel:**
```
┌─────────────────┐
│ مراقبة المتغيرات │
├─────────────────┤
│ x = 5          │
│ y = "hello"    │
│ arr = [1,2,3]  │
└─────────────────┘
```

**Call Stack Visualization:**
- Tree view: main() → functionA() → functionB()
- Highlight current execution frame
- Click to jump to code location

**Execution Pointer:**
- Yellow arrow on current line
- Previous lines: Green checkmark
- Next lines: Grayed out

---

## 4. Code Comparison Mode (Diff View)

### Post-Submission Screen

**Header:**
- "قارن حلك بالحل المثالي"
- Score: "٩٥/١٠٠ - أداء ممتاز"

**Three-View Layout:**
```
┌──────────────────────────────────────────────────────┐
│  [Your Solution]  │  [Diff View]      │  [Model]     │
│  - Line numbers   │  - Green: Added   │  - Optimal   │
│  - Your code      │  - Red: Removed   │    code      │
│  - Syntax         │  - Yellow: Changed│              │
│    highlighted    │                   │              │
└──────────────────────────────────────────────────────┘
```

**Diff Legend:**
- 🟢 "إضافة مطلوبة"
- 🔴 "حذف زائد"
- 🟡 "تعديل مقترح"

**Action Buttons:**
- "اعتماد الحل المثالي" (Accept Model)
- "حفظ حلي" (Keep Mine)
- "إعادة المحاولة" (Try Again)

---

## 5. Skill Tree System (Career RPG)

### Visual Design

**Arc/Radial Layout:**
```
                    🌟 [Full Stack Dev]
                   ╱    ╲
              [APIs]    [Projects]
               ╱            ╲
        [OOP]              [Testing]
         ╱                      ╲
   [Functions]                [Git]
       ╱                          ╲
 [Loops] → [Variables] → [Setup] → 🏁
```

**Node States:**
- 🔒 Locked: Gray, "يتطلب: Functions"
- ⚪ Available: White border, pulsating
- 🟡 In Progress: Yellow, "50%"
- 🟢 Completed: Green checkmark
- ⭐ Mastered: Gold star

### Student View

**Progress Header:**
- "مسارك المهني: مطور الويب"
- "المهارات المكتسبة: ١٢/٢٨"
- "المستوى: محترف متوسط"

**Node Card (on hover):**
- Skill name: "Object Oriented Programming"
- Description: "أنشئ برامج قابلة للتوسع"
- Prerequisites: "✓ Functions ✓ Data Structures"
- Unlock condition: "أكمل ٣ مشاريع OOP"
- Estimated time: "٤٠ ساعة"

**Unlocked Notification:**
- 🎉 "مهارة جديدة متاحة!"
- "لقد فتحت: Advanced APIs"
- CTA: "ابدأ التعلم"

---

## 6. Instructor Dashboard - Skill Tree Management

### Skill Tree Builder

**Canvas Interface:**
- Drag-and-drop skill nodes
- Auto-connect dependencies
- Grid-snap for alignment

**Node Editor Panel:**
```
┌────────────────────────┐
│ تعديل المهارة         │
├────────────────────────┤
│ الاسم: [________]     │
│ الوصف: [________]     │
│ الأيقونة: [🎯]        │
│ المتطلبات:            │
│   ☑ Functions         │
│   ☐ Data Structures   │
│                        │
│ شرط الإكمال:          │
│   • ٣ مشاريع          │
│   • ٩٠% اختبار        │
│                        │
│ [حفظ] [حذف] [معاينة]  │
└────────────────────────┘
```

**Tree Settings:**
- "اسم المسار" (Track Name)
- "الصعوبة" (Difficulty): 1-5 stars
- "الفئة" (Category): Programming | Design | Trading
- "نشر/إخفاء" (Publish/Hide)

**Analytics View:**
- Completion rate per skill
- Common drop-off points
- Average time per node
- Student progression heatmap

---

## 7. Developer Handoff Notes

### Code Editor Component

**Tech Stack:**
- Monaco Editor (VS Code core) for syntax highlighting
- WebContainers or Docker-in-Docker for code execution
- WebSocket for real-time collaboration

**APIs Needed:**
```
POST /api/code/execute
{
  language: "python",
  code: "print('hello')",
  timeout: 5000
}

Response:
{
  output: "hello\n",
  error: null,
  executionTime: 120
}
```

### Skill Tree Data Model

```typescript
interface SkillNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  position: { x: number; y: number };
  prerequisites: string[];
  unlockConditions: {
    projectsCompleted: number;
    testScore: number;
    timeSpent: number;
  };
  resources: {
    lessons: string[];
    projects: string[];
    assessments: string[];
  };
  metadata: {
    estimatedHours: number;
    difficulty: 1-5;
    category: string;
  };
}

interface SkillTree {
  id: string;
  name: string;
  description: string;
  nodes: SkillNode[];
  category: "programming" | "design" | "trading";
  published: boolean;
}
```

### Debug Mode Implementation

**Approach:**
- Use language-specific debug adapters (DAP)
- Python: debugpy
- JavaScript: Node.js inspector
- Java: JDWP

**UI Updates:**
- WebSocket connection for real-time state
- Debounced variable watch updates
- Optimistic UI for step controls

### Responsive Considerations

**Breakpoints:**
- Mobile (<768px): Stack panels vertically, hide skill tree details
- Tablet (768-1024px): Two-column layout, simplified debug view
- Desktop (>1024px): Full three-panel layout

**RTL Support:**
- All layouts support Arabic (RTL)
- Code editor: LTR always (code is English)
- Skill tree: Radial layout flips for RTL

---

## Key Design Principles

1. **Progress, Not Completion**: Skill trees unlock based on performance, not just watching videos

2. **Contextual Feedback**: Code errors show inline with suggestions, not just console dumps

3. **Visible Progress**: Always show "% to next skill" and "time invested"

4. **Professional Context**: Code exercises simulate real job tasks, not abstract puzzles

5. **Social Proof**: Show "+500 students completed this today" for motivation

6. **Frictionless Experimentation**: One-click code run, instant feedback, no setup
