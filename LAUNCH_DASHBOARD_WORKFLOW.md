# Launch Dashboard Workflow Implementation

## Overview

This implementation adds special handling for the "Launch Dashboard" step in the cascade workflow, ensuring it aligns with the A360 Release Calendar while other steps use mathematical delta shifts.

---

## Changes Implemented

### 1. Dashboard UI Alignment Fix ✅

**File:** `app/dashboard/page.tsx`

**Problem:**
- Variance badges caused status dots to be vertically misaligned
- `flex flex-col` layout created variable cell heights

**Solution:**
- Changed to `relative inline-flex` positioning
- Variance badges use `absolute top-5` positioning
- Status dots maintain perfect horizontal alignment

**Code:**
```typescript
<div className="relative inline-flex items-center justify-center">
  <div className={`w-4 h-4 rounded-full ${getStatusColor(status)}`} />
  {variance !== 0 && (
    <span className="absolute top-5 text-[10px] font-semibold whitespace-nowrap ...">
      {variance > 0 ? '+' : ''}{variance}d
    </span>
  )}
</div>
```

---

### 2. Filter System-Generated Comments ✅

**File:** `app/dashboard/page.tsx`

**Implementation:**
- Filter out steps where `reasonForDelay` contains "Cascaded"
- Only display genuine user-entered reasons in the comments column

**Code:**
```typescript
const stepsWithReasons = project.steps.filter(
  (step) => step.reasonForDelay && !step.reasonForDelay.includes('Cascaded')
);
```

---

### 3. Launch Dashboard Date Picker in Edit Modal ✅

**File:** `app/projects/[id]/page.tsx`

**New State:**
```typescript
const [launchDashboardDate, setLaunchDashboardDate] = useState('');
```

**Initialization:**
- When opening the edit modal, check if "Launch Dashboard" exists in the project
- Initialize `launchDashboardDate` with the current Launch Dashboard target date

**Dynamic UI Section:**
- Only shown when:
  1. User changes the target date
  2. Cascade checkbox is checked
  3. "Launch Dashboard" is a downstream incomplete step

**UI Features:**
- Displays: "📅 Select new Launch Dashboard Date (must align with A360 Release Calendar)"
- Links to A360 Release Calendar
- Pre-populated with current Launch Dashboard target date
- User can keep original date or select a new release window

**Code:**
```typescript
{cascadeShift && editingStep && project && (() => {
  const launchStep = project.steps.find(
    (s) => s.stepName === 'Launch Dashboard' &&
    s.sequenceOrder > editingStep.sequenceOrder &&
    s.status !== 'COMPLETED'
  );
  return launchStep ? (
    <div className="mt-3 pt-3 border-t border-blue-300">
      <label className="block text-sm font-medium text-gray-900 mb-2">
        📅 Select new Launch Dashboard Date (must align with{' '}
        <a href="..." className="text-blue-600 underline">
          A360 Release Calendar
        </a>
        )
      </label>
      <input
        type="date"
        value={launchDashboardDate}
        onChange={(e) => setLaunchDashboardDate(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
    </div>
  ) : null;
})()}
```

---

### 4. API Cascade Logic with Launch Dashboard Exception ✅

**File:** `app/api/steps/[id]/route.ts`

**Key Changes:**

#### A. Exclude Launch Dashboard from Automatic Cascade
```typescript
const downstreamSteps = currentStep.project.steps.filter(
  (s) => s.sequenceOrder > currentStep.sequenceOrder &&
  s.status !== 'COMPLETED' &&
  s.stepName !== 'Launch Dashboard' // Exclude from auto-cascade
);
```

#### B. Handle Launch Dashboard Separately
```typescript
if (body.launchDashboardDate) {
  const launchStep = currentStep.project.steps.find(
    (s) => s.stepName === 'Launch Dashboard' &&
    s.sequenceOrder > currentStep.sequenceOrder &&
    s.status !== 'COMPLETED'
  );

  if (launchStep) {
    const [year, month, day] = body.launchDashboardDate.split('-').map(Number);
    const newLaunchDate = new Date(year, month - 1, day);
    const previousLaunchDate = new Date(launchStep.endDate);

    if (newLaunchDate.toDateString() !== previousLaunchDate.toDateString()) {
      // Create audit log with user reason (not "Cascaded")
      await prisma.dateChangeLog.create({
        data: {
          stepId: launchStep.id,
          previousEndDate: previousLaunchDate,
          newEndDate: newLaunchDate,
          daysShifted: Math.abs(launchDaysShifted),
          reasonForChange: body.reasonForChange, // User reason
        },
      });

      // Update Launch Dashboard with user reason
      await prisma.projectStep.update({
        where: { id: launchStep.id },
        data: {
          endDate: newLaunchDate,
          shiftCount: (launchStep.shiftCount || 0) + 1,
          reasonForDelay: body.reasonForChange, // User reason, not cascade
        },
      });

      // Update project go-live date
      await prisma.project.update({
        where: { id: currentStep.projectId },
        data: { currentTargetProdDate: newLaunchDate },
      });
    }
  }
}
```

---

## Workflow Behavior

### Scenario: User edits "Data Integration" step and shifts date by +5 days

**Without Launch Dashboard downstream:**
- All downstream incomplete steps shift by +5 days
- "Cascaded" reason applied to all shifted steps

**With Launch Dashboard downstream:**

1. **User Changes Date:**
   - Changes "Data Integration" target date by +5 days
   - Cascade checkbox appears (pre-checked)

2. **Launch Dashboard Date Picker Appears:**
   - Shows current Launch Dashboard date
   - Links to A360 Release Calendar
   - User can:
     - Keep original date → variance = 0
     - Select new release window → variance reflects new date vs baseline

3. **On Save:**
   - All downstream steps (except Launch Dashboard) shift by +5 days
   - These steps get "Cascaded from Data Integration shift" reason
   - Launch Dashboard updates to user-selected date
   - Launch Dashboard gets the user's original "Reason for Change" (not "Cascaded")

4. **Dashboard Display:**
   - Intermediate steps show variance badges based on cascade shift
   - Launch Dashboard shows variance based on user-selected date vs baseline
   - Comments column excludes "Cascaded" reasons, shows only user reasons

---

## Variance Logic

### Standard Steps (Cascaded)
- **Calculation:** `baselineEndDate` vs `endDate` (after cascade)
- **Display:** `+Xd` or `-Xd` badge on dashboard
- **Reason:** "Cascaded from [Step Name] shift" (hidden in comments)

### Launch Dashboard (User-Selected)
- **Calculation:** `baselineEndDate` vs user-selected date
- **Display:** 
  - `0` (no badge) if user kept original date
  - `+Xd` or `-Xd` if user selected new release window
- **Reason:** User's original "Reason for Change" (visible in comments)

---

## Files Modified

1. `app/projects/[id]/page.tsx`
   - Added `launchDashboardDate` state
   - Added Launch Dashboard date picker UI
   - Pass `launchDashboardDate` to API

2. `app/api/steps/[id]/route.ts`
   - Exclude Launch Dashboard from automatic cascade
   - Handle Launch Dashboard with explicit user-selected date
   - Apply user reason (not cascade reason) to Launch Dashboard

3. `app/dashboard/page.tsx`
   - Fixed status dot alignment with absolute positioning
   - Filtered system-generated "Cascaded" reasons from comments

---

## Testing Scenarios

### Test 1: Cascade with Launch Dashboard Unchanged
1. Edit a step before Launch Dashboard
2. Change target date by +3 days
3. Keep cascade checkbox checked
4. Keep Launch Dashboard date unchanged
5. **Expected:**
   - Intermediate steps shift by +3 days with "Cascaded" reason
   - Launch Dashboard stays unchanged (variance = 0, no badge)
   - User reason visible in comments for original step

### Test 2: Cascade with Launch Dashboard Changed
1. Edit a step before Launch Dashboard
2. Change target date by +3 days
3. Keep cascade checkbox checked
4. Change Launch Dashboard date to new release window (+7 days from baseline)
5. **Expected:**
   - Intermediate steps shift by +3 days with "Cascaded" reason
   - Launch Dashboard shows +7 days variance with user reason
   - Comments show user reason for Launch Dashboard, not "Cascaded"

### Test 3: Cascade Disabled
1. Edit a step before Launch Dashboard
2. Change target date by +3 days
3. Uncheck cascade checkbox
4. **Expected:**
   - Launch Dashboard date picker disappears
   - No downstream steps are updated
   - Only the current step is modified

---

## Verification

✅ **Build Status:** `npm run build` completed successfully
✅ **UI Alignment:** Status dots perfectly aligned with absolute positioning
✅ **Comment Filtering:** System "Cascaded" reasons excluded
✅ **Launch Dashboard:** Special handling with user-selected date
✅ **Variance Display:** Correct badges for both cascaded and user-selected dates
