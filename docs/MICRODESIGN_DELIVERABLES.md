# FIS Learn Micro-Design Deliverables

## 1. Homepage CTAs

| Element | Current | Optimized |
|---------|---------|-----------|
| Primary CTA | "Start Learning Now" | "Explore Free Courses" |
| Secondary CTA | "How It Works" | "Watch a Demo Lesson" |
| Social Proof | "from 10,000+ students" | "Trusted by 10,000+ learners in 50+ countries" |
| Subtitle | "Access world-class courses..." | "Learn from industry experts. No rigid schedules." |

**Rationale**: "Free" reduces friction; specific numbers build trust; benefits over buzzwords.

---

## 2. Authentication (Login/Register)

### Buttons
- "Log In" → "Sign In" (matches Google/Apple pattern)
- "Signing in..." → "Signing you in..." (more personal)
- "Create an account" → "Create your free account" (adds value)

### Error States
| Scenario | Current | Optimized |
|----------|---------|-----------|
| Invalid credentials | "Login failed." | "Email or password doesn't match. Try again or reset your password." |
| Server error | "Unable to reach the server." | "Connection issue. Please check your internet and try again." |
| Success | "Logged in successfully." | "You're in! Taking you to your dashboard..." |

### MFA
- "Two-factor authentication" → "Verify it's you"
- "Verification code" → "Security code"
- "Back to login" → "Use password instead"

---

## 3. Courses Page

| Element | Current | Optimized |
|---------|---------|-----------|
| Search placeholder | "Search courses, instructors..." | "What do you want to learn?" |
| Empty state | "No courses found." | "No courses match your search. Try a broader term or browse all categories." |
| Free CTA | "Free" | "Start Free" |
| Paid CTA | "Enroll Now" | "Preview Course" (lower commitment) |

---

## 4. Course Detail Page

**CTA Variants for A/B Testing:**

- **Variant A** (Low friction): "Watch Free Preview" / "View Full Syllabus"
- **Variant B** (Social proof): "Join 2,340 Students" / "Try First Lesson Free"

**Enrollment Success**: "You're enrolled! Start learning now." → Auto-scroll to first lesson.

---

## 5. Dashboard Empty States

| Section | Optimized Copy |
|---------|----------------|
| My Courses (empty) | "You haven't enrolled in any courses yet. Explore our catalog to find your first course." |
| Progress (none) | "Your learning journey starts with the first lesson. Pick a course and dive in!" |
| Community (no messages) | "Join the conversation! Ask questions and connect with fellow learners." |

---

## 6. Community/Chat

### Channel Names
- "Q&A" → "Questions & Help" (clearer for non-native speakers)

### Composer Placeholders
- Q&A: "Ask a question..."
- Discussion: "Share your thoughts..."

### Message States
- Sending: Faded text + spinner
- Failed: "Couldn't send. Tap to retry."

### Moderation
- "Pin Message" tooltip: "Pin to top"
- "Mark as Answer" tooltip: "Mark as best answer"

---

## 7. Loading & Empty States

| State | Microcopy |
|-------|-----------|
| Loading courses | "Finding the best courses for you..." |
| Loading video | "Preparing your lesson..." |
| No search results | "We couldn't find courses matching 'X'. Try different keywords." |
| Offline | "You're offline. Check your connection and try again." |
| Saving changes | "Saving..." |
| Changes saved | "Saved" (brief checkmark, auto-fade) |

---

## 8. Tooltips & Helper Text

| Context | Helper Text |
|---------|-------------|
| Password field | "Use 8+ characters with a mix of letters, numbers & symbols" |
| Access code | "Enter the code from your instructor or course materials" |
| Email verification | "We'll send a verification link to this address" |
| Download material | "PDF, 2.4 MB" |
| Live class reminder | "Starts in 15 minutes · Add to calendar" |

---

## 9. Accessibility-First Wording

| Avoid | Use Instead | Why |
|-------|-------------|-----|
| "Click here" | "Browse courses", "Open settings" | Clear action + destination |
| "Invalid input" | "Please enter a valid email address" | Specific + helpful |
| "Oops!" | "Something went wrong" | Professional, universally understood |
| "Simply/Just" | Remove entirely | Can feel condescending |
| "Disabled users" | "Users who rely on screen readers" | Person-first language |

---

## 10. Conversion-Optimized Microcopy Checklist

**Before any CTA, ask:**
1. Does it clearly state the benefit?
2. Does it reduce perceived effort?
3. Is the next step obvious?

**High-impact changes to implement first:**
1. Change "Enroll Now" → "Preview Course" (reduce anxiety)
2. Add "free" to account creation CTAs
3. Replace generic errors with specific recovery steps
4. Add time estimates to progress indicators ("45% complete · 3 hours left")
