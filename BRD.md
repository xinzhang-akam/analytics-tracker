# Business Requirement Document (BRD) - CTG D&A Project Tracker

You are an expert full-stack developer. Build a self-contained web application (Next.js App Router with Tailwind CSS, SQLite, and Prisma ORM — or Python FastAPI + React) for an Analytics Team to track detailed project step timelines, log date changes, and display an executive stakeholder dashboard.

---

## 1. System Context & Purpose
The CTG Analytics Team requires a dedicated web application to replace legacy single-ticket Jira tracking and manual Google Sheets. Single Jira tickets fail to represent multi-step project workflows, while spreadsheets lack automated audit logging for commitment date changes and target delays.

Build a dual-purpose system:
1. **CTG D&A Project Manager (Transactional System):** An interactive project setup and step-editing interface for analysts to define step workdays, set launch dates, trigger automatic downstream timeline adjustments, capture shift reasons, and maintain project health.
2. **CTG D&A Project Status (Stakeholder Visual Dashboard):** An executive milestone matrix displaying project progress across standardized delivery stages with status indicators, relative date range filters, shift indicators, and aggregated delay reasons.

---

## 2. Core Data Model & Schema Specifications

### 2.1 Projects Table (`projects`)
* **`id`**: UUID (Primary Key)
* **`name`**: String (Required)
* **`jira_ticket_url`**: String (Required, formatted as `https://track.akamai.com/jira/browse/CTGANLYSTS-XXXX`)
* **`domain_category`**: Enum (`Product`, `Networks`, `R&D`, `Internal`)
* **`owner`**: String (Required)
* **`status`**: Enum (`Not Started`, `In Progress`, `Completed`, `Blocked`) — *Calculated dynamically*
* **`baseline_prod_date`**: Date (Locked upon step initial commitment)
* **`current_target_prod_date`**: Date (Dynamically calculated based on the project's launch step)
* **`total_date_shifts`**: Integer (Default: `0`, calculates net workdays shifted between baseline and current target date)
* **`created_at` / `updated_at`**: Timestamps

### 2.2 Project Steps Table (`project_steps`)
* **`id`**: UUID (Primary Key)
* **`project_id`**: Foreign Key (`projects.id`)
* **`step_name`**: Enum (`Create BRD`, `Create Wireframe`, `Data Integration`, `Create Data Source`, `Create Dashboard`, `User Feedback`, `Launch Dashboard`, `Launch SS Data Source`)
* **`sequence_order`**: Integer
* **`workdays_required`**: Integer (Calculated using standard 5-day workweeks, excluding weekends)
* **`start_date`**: Date (Stored as local `YYYY-MM-DD` ISO string to prevent timezone offset shifts)
* **`end_date`**: Date (Stored as local `YYYY-MM-DD` ISO string)
* **`baseline_end_date`**: Date (Original locked target end date)
* **`status`**: Enum (`Not Started`, `In Progress`, `Completed`, `Blocked`)
* **`shift_count`**: Integer (Default: `0`)
* **`reason_for_change`**: String (Required when `end_date` is modified)

### 2.3 Audit Log Table (`date_change_logs`)
* **`id`**: UUID
* **`step_id`**: Foreign Key (`project_steps.id`)
* **`previous_end_date`**: Date
* **`new_end_date`**: Date
* **`days_shifted`**: Integer (Net workday difference)
* **`reason_for_change`**: String (Mandatory audit note)
* **`timestamp`**: Timestamp

---

## 3. Business Logic & Calculation Rules

### 3.1 Date Calculation & Workday Engine
* Standard calculations operate on 5-day workweeks (Monday through Friday), automatically excluding Saturdays and Sundays.
* All date parsing and storage strictly use local date strings (`YYYY-MM-DD`) without UTC timezone conversions to prevent date subtraction bugs (e.g., date shifting back by 1 day).

### 3.2 Downstream Timeline Cascading
* When an analyst modifies a step's `end_date` to a later date, calculate the delta in workdays.
* Automatically push out the `start_date` and `end_date` of all subsequent steps in that project by that same number of workdays.
* Automatically update the project's `current_target_prod_date` to match the updated launch step end date.

### 3.3 Automated Project Status Logic
Project status is computed dynamically based on child step statuses:
* **Completed:** All project steps have a status of `Completed`.
* **Not Started:** All project steps have a status of `Not Started`.
* **Blocked:** The most recent active step has a status of `Blocked`.
* **In Progress:** Any project with active work under way that does not meet the criteria above.

### 3.4 Step Completion Validation
* Analysts cannot mark a step status as `Completed` if the step's `end_date` is in the future relative to the current calendar date.
* Show inline validation error: *"Step end date must be on or before today to mark as Completed."*

---

## 4. Module 1: CTG D&A Project Manager (Transactional System)

### 4.1 Main Project List View (`/projects`)
* **Header Title:** `CTG D&A Project Manager`
* **Table Columns:** Project Name (hyperlinked to Jira Ticket URL), Domain, Owner, Status, Go-Live Date, Date Shifted (Net days shifted from baseline; default `0`).
* **Actions:** `Edit Project`, `Delete Project`.

### 4.2 Workflow: Creating a New Project
1. User inputs **Project Name**.
2. User inputs **Jira Ticket URL** (e.g., `https://track.akamai.com/jira/browse/CTGANLYSTS-3209`).
3. User selects **Domain** from dropdown: `Product`, `Networks`, `R&D`, or `Internal`.
4. User inputs **Project Owner**.
5. User clicks **Create Project**.

### 4.3 Workflow: Adding a Step to an Existing Project
1. User selects a **Step Name** from available options: `Create BRD`, `Create Wireframe`, `Data Integration`, `Create Data Source`, `Create Dashboard`, `User Feedback`, `Launch Dashboard`, `Launch SS Data Source`.
2. **Form State Sync & Reset:** When opening the form or updating steps, the dropdown automatically resets state to `availableSteps[0]` to prevent submitting hidden/duplicate options.
3. **Duplicate Protection:** Steps already created within the project are filtered out of the selection list and rejected by backend validation.
4. **Mutually Exclusive Launch Steps:** A project can contain either `Launch Dashboard` or `Launch SS Data Source`, but not both. Selecting one removes the other from future step additions.
5. **Standard Step Inputs:** User inputs `Start Date` and `Workdays Required`.
6. **Launch Step Exception:** If `Launch Dashboard` or `Launch SS Data Source` is selected, replace `Start Date` and `Workdays Required` with a single **Release Date** input (`start_date` and `end_date` set to equal the `release_date`).
7. **Automated Step Status Initialization:**
   * If `start_date` <= `current_date` -> set status to `In Progress`.
   * If `start_date` > `current_date` -> set status to `Not Started`.

### 4.4 Workflow: Editing an Existing Step
1. User clicks **Edit** on a step row within the Edit Project page (`/projects/[id]`).
2. **Field Inputs:**
   * Standard Steps: Users can update `Status`, `Start Date`, and `End Date`.
   * Launch Steps: Users can update `Status` and `Release Date`.
3. **Override Reason Rule:** **Reason for Change** is strictly required **only** when the `end_date` (or `release_date`) is modified (`newEndDate !== baselineEndDate`). Start date changes do not require a reason.
4. **Visual Date Delta:** Display original vs. new release date indicators on the project form, explicitly noting pull-forwards vs. delays.
5. **UI Layout:** Date Shifted KPI card is removed from the Edit Project page header (retained on the main project list table).

---

## 5. Module 2: CTG D&A Project Status (Stakeholder Visual Dashboard)

### 5.1 Dashboard Header & Controls (`/dashboard`)
* **Header Title:** `CTG D&A Project Status`
* **KPI Summary Cards (3):**
  1. `Total Active Projects`
  2. `On-Track vs Delayed`
  3. `Blocked Projects`
* **Global Filters (3):**
  1. **Go-live Date Picker:** Relative month filter supporting `Past X Months` (1, 3, 6) or `Next X Months` (1, 3, 6), with both ranges including the current calendar month (Default: *Next 3 Months*).
  2. **Domain:** Filter by domain categories (`Product`, `Networks`, `R&D`, `Internal`).
  3. **Owner & Status:** Filter by project owner or health status.

### 5.2 Milestone Matrix Visual Table
Projects are grouped by **Domain** (leftmost merged column) and pivoted horizontally across **7 Standardized Milestone Columns** strictly in this order:
1. `Create BRD`
2. `Create Wireframe`
3. `Data Integration`
4. `Create Data Source`
5. `Create Dashboard`
6. `User Feedback`
7. `Launch` (renders status for `Launch Dashboard` or `Launch SS Data Source`)

### 5.3 Milestone Node & Status Dot Mapping
* **Completed:** Solid Green circle (`bg-emerald-500`)
* **In Progress:** Solid Blue circle (`bg-blue-500`)
* **Blocked:** Solid Red circle (`bg-red-500`)
* **Not Started:** White circle with dark border (`bg-white border-2 border-slate-400`)
* **N/A (Uncreated / Skipped Step):** Solid Grey circle (`bg-gray-400`). Automatically rendered for any of the 7 standard columns not present in a project.

### 5.4 Target Go-Live Date & Shift Styling
Displays formatted Target Go-Live Date with shift indicators:
* **Pulled-Forward:** Shift count text rendered in **Green** (e.g., `Mar 15 (-3 days)`).
* **Delayed:** Shift count text rendered in **Red** (e.g., `Apr 10 (+5 days)`).

### 5.5 Comments / Issues / Blockers Column
Aggregates active blocker notes alongside all step end-date override reasons across the project (e.g., *"Data Integration: Scope expanded by product team"*).

### 5.6 Status Legend
Includes an explicit legend displaying all 5 status indicators (`Completed`, `In Progress`, `Blocked`, `Not Started`, and `N/A`).