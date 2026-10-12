# Edit Owner and How-To Guide Implementation

## Overview

Added inline owner editing functionality and a collapsible How-To Guide to help users understand the project step management workflow.

---

## Changes Implemented

### 1. Edit Owner Functionality ✅

**File:** `app/projects/[id]/page.tsx`

**New State Variables:**
```typescript
const [isEditingOwner, setIsEditingOwner] = useState(false);
const [newOwner, setNewOwner] = useState('');
```

**Handler Functions:**
```typescript
const handleEditOwner = () => {
  if (project) {
    setNewOwner(project.owner);
    setIsEditingOwner(true);
  }
};

const handleSaveOwner = async () => {
  // Validates and updates owner via API
  // Refreshes project data after successful update
};

const handleCancelEditOwner = () => {
  setIsEditingOwner(false);
  setNewOwner('');
};
```

**UI Implementation:**
- **View Mode:** Owner name displayed with an edit icon (✏️)
- **Edit Mode:** 
  - Input field pre-populated with current owner name
  - "Save" button (blue) to commit changes
  - "Cancel" button (gray) to discard changes
  - Auto-focus on input field for immediate editing

**Code:**
```typescript
{isEditingOwner ? (
  <div className="flex items-center gap-2">
    <input
      type="text"
      value={newOwner}
      onChange={(e) => setNewOwner(e.target.value)}
      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
      autoFocus
    />
    <button onClick={handleSaveOwner} className="px-2 py-1 bg-blue-600 text-white">
      Save
    </button>
    <button onClick={handleCancelEditOwner} className="px-2 py-1 bg-gray-200">
      Cancel
    </button>
  </div>
) : (
  <div className="flex items-center gap-2">
    <div className="text-lg text-gray-900">{project.owner}</div>
    <button onClick={handleEditOwner} className="text-blue-600 text-sm" title="Edit Owner">
      ✏️
    </button>
  </div>
)}
```

**API Route:**
- **Existing:** `app/api/projects/[id]/route.ts` PATCH endpoint already supports updating any project field
- **No changes needed:** Generic implementation accepts `owner` field in request body

---

### 2. How-To Guide Section ✅

**File:** `app/projects/[id]/page.tsx`

**New State Variable:**
```typescript
const [showGuide, setShowGuide] = useState(false);
```

**Features:**
- **Collapsible Design:** Click to expand/collapse
- **Visual Styling:** 
  - Gradient background (blue-50 to indigo-50)
  - Border and shadow for prominence
  - Icon (💡) for quick recognition
- **Positioned:** Between project header and project steps section

**Content Structure:**
1. **Adding Steps:** Brief explanation of adding steps and target dates
2. **Editing Dates & Cascading:**
   - Standard steps: Auto-shift behavior
   - Launch Dashboard: Manual date selection with A360 calendar link
3. **Reason for Change:** Clarifies when it's required
4. **Status Updates:** Emoji-based status indicators

**Code:**
```typescript
<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 mb-6">
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setShowGuide(!showGuide)}
      >
        <span className="text-2xl">💡</span>
        <h3 className="text-lg font-semibold text-gray-900">
          Quick Guide: Managing Project Steps
        </h3>
        <span className="text-gray-500 text-sm">
          {showGuide ? '(Click to collapse)' : '(Click to expand)'}
        </span>
      </div>

      {showGuide && (
        <div className="mt-4 space-y-3 text-sm text-gray-700">
          {/* Guide content with bullet points */}
        </div>
      )}
    </div>
  </div>
</div>
```

**Guide Content:**

> 💡 **Quick Guide: Managing Project Steps**
> 
> • **Adding Steps:** Add project steps and assign a Target Date.
> 
> • **Editing Dates & Cascading:** Changing a Target Date triggers the Auto-shift option.
>   - **Standard Steps:** Automatically shift by the same number of days.
>   - **Launch Dashboard:** Will not auto-shift. You must manually select a date to ensure alignment with the [A360 Release Calendar](link).
> 
> • **Reason for Change:** Only required when you *manually* change a target date.
> 
> • **Status Updates:** Keep statuses updated (🔵 In Progress, 🟢 Completed, 🔴 Blocked).

---

## User Experience

### Edit Owner Workflow

1. **View Mode:**
   - User sees owner name with edit icon
   - Hover shows "Edit Owner" tooltip

2. **Enter Edit Mode:**
   - Click edit icon (✏️)
   - Input field appears with current owner name
   - Field is auto-focused

3. **Make Changes:**
   - Type new owner name
   - Click "Save" to commit
   - Click "Cancel" to discard

4. **Validation:**
   - Empty owner name shows error alert
   - Successful update refreshes page data
   - Error handling for failed API calls

### How-To Guide Workflow

1. **Collapsed State (Default):**
   - Shows header with 💡 icon
   - "(Click to expand)" hint
   - Minimal space usage

2. **Expanded State:**
   - Shows full guide content
   - Organized with bullet points
   - Color-coded for readability
   - A360 calendar link active
   - "(Click to collapse)" hint

3. **Toggle:**
   - Click anywhere on header to toggle
   - Smooth expand/collapse
   - State preserved during session

---

## Styling Details

### Edit Owner Buttons
- **Save Button:** `bg-blue-600` with `hover:bg-blue-700`
- **Cancel Button:** `bg-gray-200` with `hover:bg-gray-300`
- **Edit Icon:** `text-blue-600` with `hover:text-blue-800`

### How-To Guide
- **Background:** `bg-gradient-to-r from-blue-50 to-indigo-50`
- **Border:** `border-blue-200`
- **Shadow:** `shadow-sm`
- **Bullet Points:** Blue color (`text-blue-600`)
- **Text:** Gray-700 for body, gray-900 for headers
- **Links:** `text-blue-600` with `hover:text-blue-800` and `underline`

---

## Files Modified

1. **`app/projects/[id]/page.tsx`**
   - Added edit owner state and handlers
   - Added inline owner editing UI
   - Added collapsible How-To Guide section

2. **`app/api/projects/[id]/route.ts`**
   - No changes needed (already supports owner field updates)

---

## Testing Scenarios

### Test 1: Edit Owner Success
1. Click edit icon next to owner name
2. Change owner name to "New Owner"
3. Click "Save"
4. **Expected:** Owner name updates, page refreshes, edit mode exits

### Test 2: Edit Owner Cancel
1. Click edit icon
2. Change owner name
3. Click "Cancel"
4. **Expected:** Edit mode exits, original owner name restored

### Test 3: Edit Owner Validation
1. Click edit icon
2. Clear owner name (empty)
3. Click "Save"
4. **Expected:** Alert: "Owner name cannot be empty"

### Test 4: How-To Guide Toggle
1. Guide is collapsed by default
2. Click on guide header
3. **Expected:** Guide expands showing full content
4. Click again
5. **Expected:** Guide collapses

### Test 5: A360 Calendar Link
1. Expand How-To Guide
2. Click "A360 Release Calendar" link in Launch Dashboard section
3. **Expected:** Opens calendar in new tab

---

## Verification

✅ **Build Status:** `npm run build` completed successfully
✅ **Edit Owner:** Inline editing with save/cancel functionality
✅ **API Integration:** Existing PATCH endpoint supports owner updates
✅ **How-To Guide:** Collapsible section with formatted content
✅ **Styling:** Clean Tailwind UI with gradient background and proper spacing
✅ **Accessibility:** Tooltips, focus states, and clear UI feedback
