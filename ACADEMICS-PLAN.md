# Academics Module – Design Plan

## Overview

The academics module handles:

- **Teachers** entering results per class
- **Parents** viewing their child’s results on web and mobile
- **Flexible teacher assignment** (class teacher vs subject teachers vs one teacher for all)
- **Excel paste import** with automatic student matching and name similarity detection
- **Missing / unmatched results** detection and reporting

---

## 1. Result Templates by Grade Level

| Level   | Headers (Student Name + subjects) |
|---------|-----------------------------------|
| **PP1** | Student Name, Math, Language, ENV, Creative |
| **PP2** | Student Name, Language, N/W, Literacy, Inter, Art |
| **Grade 1** | Student Name, Math, English, Kiswahili, Environment |
| **Grade 2** | Student Name, ENV, CRE, Creative, Math, Eng, Kisw |
| **Grade 3** | Student Name, Math, Eng, Kisw, ENV, CRE, C/A |
| **Grade 4** | Student Name, Math, Eng, Kisw, C/A, CRE, ENV |
| **Grade 5** | Student Name, ENG, KISW, MATH, S/T, CRE, AGRI, SST, C.A |
| **Grade 6** | Student Name, Math, Eng, Kisw, Agri, CRE, SST, S/T, CA |

Subject aliases will be normalized (e.g. ENG, Eng, English → same subject).

---

## 2. Database Design

### New Tables

- **subjects** – canonical subject names (Math, English, Kiswahili, etc.)
- **grade_templates** – template per grade level (PP1, PP2, G1–G6) with subject order
- **academic_results** – one row per student per term per subject: `user_id`, `academic_term_id`, `subject`, `score`, `max_score`, etc.
- **teacher_class_assignments** – `user_id` (teacher), `school_class_id`, `role` (class_teacher | subject_teacher | full_teacher)
- **teacher_subject_assignments** – optional: `user_id`, `subject`, `school_class_id` (when subject-specific)

### Grade Code on School Classes

Add `grade_code` (e.g. PP1, PP2, G1, G2) to `school_classes` so we can map a class like "PP1Red" → PP1 template.

---

## 3. Teacher Assignment Model

| Scenario | Assignment | Permission |
|----------|------------|------------|
| One teacher for all classes | `full_teacher` on each class, or a global "teaches all" flag | `manage results` |
| Class teacher | `class_teacher` on specific class | Can enter results for all subjects in that class |
| Subject teachers | `subject_teacher` with `subject` linked | Can enter results only for their subject(s) in that class |

Super admin assigns:
- Permissions: `view results`, `manage results`, `manage academics`
- Role: `academic-admin` (or extend `student-admin`) with results permissions
- Teacher–class links via `teacher_class_assignments` / `teacher_subject_assignments`

---

## 4. Result Import Flow (Excel Paste)

1. Teacher selects **class** (e.g. PP1Red) → system infers template from `grade_code` (PP1).
2. Teacher pastes rows (or uploads CSV/Excel). Header row must match template (aliases supported).
3. For each row:
   - **Exact match** – name matches `User.name` for a student in that class.
   - **Fuzzy match** – `similar_text()` + `levenshtein()` against class students; show suggestions when confidence > threshold.
   - **Unmatched** – listed for manual assignment or correction.
4. Output:
   - Matched rows → saved to `academic_results`.
   - **Unmatched** – list with suggestions (e.g. “Did you mean: John Doe?”).
   - **Students without results** – students in class but not in pasted list.
5. Teacher confirms or corrects before final save.

---

## 5. Name Similarity Detection

- Normalize: trim, lowercase, collapse spaces.
- Use `similar_text()` for percentage match (e.g. > 85% = possible match).
- Use `levenshtein()` for edit distance when names are short.
- Phonetic: `metaphone()` or `soundex()` to handle spelling variants.
- Report: “Possible matches” for manual verification when similarity is high but not exact.

---

## 6. Permissions

| Permission | Description |
|------------|-------------|
| `view results` | See results (teachers for their classes; parents for their child) |
| `manage results` | Enter/edit/import results (teachers, academic-admin) |
| `manage academics` | Configure subjects, templates, teacher assignments (super-admin / academic-admin) |

---

## 7. Parent Mobile View

- Parents log in via student email + guardian phone (existing flow).
- New API: `GET /api/auth/results` – returns results for the logged-in student (user_id) for the current/selected term.
- Mobile app: enable “Grades” button; add results screen similar to `fees.tsx` (term selector, subject list, scores).
- Responsive layout for small screens.

---

## 8. Implementation Phases

### Phase 1: Schema & Permissions
- Migrations: subjects, grade_templates, academic_results, teacher_class_assignments
- Add `grade_code` to school_classes
- Add academics permissions and `academic-admin` role

### Phase 2: Result Import
- `ResultImportService` with template mapping, name matching, missing detection
- API: preview, import, list unmatched / missing
- Admin UI: class selection, paste area, review and confirm

### Phase 3: Teacher Assignment & Access
- Teacher–class assignment UI
- Policy: teacher can manage results only for assigned classes/subjects

### Phase 4: Mobile Parent View
- API: `GET /api/auth/results`
- Mobile: results screen, term selector, simple card layout
