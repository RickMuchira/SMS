# Results Module - User Guide

## Overview
The Results Module provides comprehensive tools for managing, viewing, and analyzing academic results across classes, terms, and streams.

---

## Admin/Teacher Features

### 1. Import Results
**Path**: Results → Import Results (`/admin/results`)

**How to use**:
1. Select a class from the dropdown
2. Select the academic term
3. Edit/customize the header columns if needed (click "Edit headers")
4. Paste results from Excel or enter manually in the spreadsheet
5. Click "Import Results"
6. System automatically matches students and saves results

**Features**:
- Excel-like interface
- Custom header templates for each grade
- Automatic student matching
- Highlights unmatched students

---

### 2. View Analytics
**Path**: Results → View Analytics (`/admin/results/view`)

**What you'll see**:
- **Overview cards**: Total students, class average, highest/lowest scores
- **Subject performance chart**: Bar chart showing average per subject
- **Top 10 leaderboard**: Ranked list of top performers
- **Complete results table**: All students with their scores, position, and average

**How to use**:
1. Select a class
2. Select a term
3. Click "View Results"
4. Explore the charts and rankings

**Use cases**:
- Identify top performers
- See which subjects need attention
- Compare student performance
- Generate insights for parent-teacher meetings

---

### 3. Edit Results
**Path**: Results → Edit Results (`/admin/results/edit`)

**How to use**:
1. Select a class and term
2. Click "Load Results"
3. Click on any score cell to edit it
4. Make your changes
5. Click "Save Changes" to update
6. Or click "Delete All" to remove all results for this class/term (with confirmation)

**Features**:
- Spreadsheet interface for easy editing
- Bulk updates (edit multiple scores, save once)
- Delete all results for a class/term
- Undo by refreshing before saving

---

### 4. Stream Comparison
**Path**: Results → Stream Comparison (`/admin/results/streams`)

**What it does**:
- Compares performance across different streams (e.g., PP1 Red vs PP1 Green)
- Shows which stream is performing better
- Displays student count per stream

**How to use**:
1. Select a grade with multiple streams (e.g., PP1, G2)
2. Select a term
3. Click "Compare Streams"
4. View comparison charts and statistics

**Use cases**:
- Identify if streams are balanced
- See which stream needs more support
- Compare teaching effectiveness across streams
- Make informed decisions about stream allocation

---

## Mobile/Parent Features

### View Student Results
**Path**: Mobile app → Grades tab

**What parents/students see**:
- **Analytics card** (top of screen):
  - Position in class (e.g., "5 out of 30")
  - Student's average score
  - Class average (for comparison)
  - Total score
- **Results by subject**: List of all subjects with scores
- **Term selector**: Switch between terms to see historical results

**Features**:
- Pull to refresh
- Beautiful, easy-to-read interface
- Color-coded stats
- No internet? Previous results cached

---

## Understanding Streams

### What are streams?
Streams are multiple classes within the same grade level:
- **PP1 Red** and **PP1 Green** are two streams of PP1
- **G2 Red** and **G2 Green** are two streams of Grade 2

### Why compare streams?
- Ensure balanced performance across streams
- Identify if one stream needs additional support
- Evaluate teaching effectiveness
- Make data-driven decisions about resource allocation

### How the system detects streams:
The system groups classes by their `grade_code`:
- Classes with `grade_code = "PP1"` → PP1 streams
- Classes with `grade_code = "G2"` → G2 streams

---

## Permissions

| Feature | Required Permission |
|---------|-------------------|
| Import Results | `manage results` OR `manage academics` |
| View Analytics | `view results` OR `manage results` OR `manage academics` |
| Edit Results | `manage results` OR `manage academics` |
| Delete Results | `manage results` OR `manage academics` |
| Stream Comparison | `view results` OR `manage results` OR `manage academics` |

**Roles with access**:
- **Super Admin**: Full access
- **Academic Admin**: Full access
- **Teachers**: Can view and manage results for their assigned classes

---

## Tips & Best Practices

### For Importing Results:
1. **Use consistent naming**: Ensure student names match exactly or are similar
2. **Check templates**: Verify the header template matches your grade
3. **Edit headers first**: Customize headers before pasting if needed
4. **Preview before import**: Review matched students before finalizing

### For Viewing Analytics:
1. **Compare across terms**: Use the term selector to see progress
2. **Identify trends**: Look for subjects with consistently low averages
3. **Celebrate success**: Highlight top performers to motivate students
4. **Early intervention**: Identify struggling students early

### For Editing Results:
1. **Edit carefully**: Changes are saved immediately
2. **Double-check scores**: Verify scores before saving
3. **Use bulk edit**: Edit multiple scores, then save once
4. **Backup first**: Consider exporting before bulk deletes

### For Stream Comparison:
1. **Regular monitoring**: Compare streams every term
2. **Fair comparison**: Ensure similar assessments across streams
3. **Actionable insights**: Use data to improve teaching, not blame
4. **Share findings**: Discuss with teachers for collaborative improvement

---

## Troubleshooting

### Issue: "No results found"
**Solution**: Ensure results have been imported for the selected class and term.

### Issue: Student names don't match
**Solution**: Use the name matching suggestions during import, or update student names in the system.

### Issue: Position not showing on mobile
**Solution**: Ensure at least 2 students have results for the same class and term.

### Issue: Can't see Edit/Delete options
**Solution**: Check your permissions. You need `manage results` or `manage academics` permission.

### Issue: Charts not loading
**Solution**: Ensure there are results for the selected class/term. Try refreshing the page.

---

## Support

For additional help:
1. Contact your system administrator
2. Check the implementation plan: `RESULTS-ANALYTICS-PLAN.md`
3. Review the technical summary: `RESULTS-IMPLEMENTATION-SUMMARY.md`

---

**Last Updated**: February 28, 2026
