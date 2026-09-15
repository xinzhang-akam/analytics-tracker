# Analytics Project Timeline Tracker

A comprehensive web application for tracking detailed project step timelines and displaying an executive stakeholder dashboard for analytics teams.

## Features

### Analyst Transactional System
- **Project Management**: Create and manage multiple analytics projects with detailed metadata
- **Step-by-Step Tracking**: Break down projects into granular steps with workday estimates
- **Smart Date Calculation**: Automatically calculates start/end dates excluding weekends, company holidays, and analyst PTO
- **Commitment Baseline**: Lock baseline dates to track schedule drift over time
- **Date Change Auditing**: Mandatory reason logging when committed dates slip, with full audit trail
- **Shift Counter**: Tracks how many times dates have been pushed back after commitment

### Executive Stakeholder Dashboard
- **Visual Milestone Pipeline**: Color-coded progress indicators across 8 standard stages
- **Summary Metrics**: At-a-glance view of active projects, on-track vs delayed, total shifts, and blocked projects
- **Advanced Filtering**: Filter by domain/category, status, or project owner
- **Grouped Display**: Projects organized by domain category for easy scanning
- **Status Indicators**:
  - 🔵 Blue = In Progress
  - 🟢 Green = Completed
  - 🔴 Red = Blocked
  - ⚫ Grey = Not Started / N/A

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Date Utilities**: date-fns for workday calculations

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Initialize the database:
```bash
npx prisma generate
npx prisma db push
```

3. Seed the database with sample data:
```bash
npm run seed
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Application Structure

- `/` - Home page with navigation to Analyst Editor and Executive Dashboard
- `/projects` - Project list and management interface
- `/projects/[id]` - Detailed project editor with step breakdown and audit log
- `/dashboard` - Executive stakeholder visual dashboard

## Database Schema

### Projects Table
- Stores project metadata, commitment status, and date shift counters
- Tracks baseline vs current target production dates

### Project Steps Table
- Granular step definitions with macro stage classification
- Workday requirements and calculated dates
- Baseline date locking for commitment tracking
- Blocker comments and status tracking

### Date Change Logs Table
- Audit trail of all date changes after commitment
- Tracks previous/new dates, days shifted, and reason for change
- Links to the changed step for full traceability

### Holidays/PTO Table
- Company-wide holidays
- Analyst-specific PTO
- Used in workday calculations to exclude non-working days

## Business Logic

### Workday Calculation Engine
- Excludes weekends (Saturday/Sunday)
- Excludes company holidays
- Excludes analyst-specific PTO
- Cascades date changes when steps are reordered or modified

### Commitment & Shift Tracking
1. Projects start in Draft mode
2. When "Commit Baseline" is clicked:
   - Current calculated end dates locked as baseline dates
   - Final step end date becomes baseline production date
3. After commitment, any date slip triggers:
   - Mandatory "Reason for Change" prompt
   - Increment of step shift counter
   - Increment of project total shift counter
   - Creation of audit log entry

## Sample Data

The seed script creates 4 sample projects:

1. **Linode Capacity: Sellable Capacity** (Networks/Platform) - In Progress, 8 steps
2. **Linode Capacity: GPU Alerting** (Networks/Platform) - In Progress with 2 date shifts, currently blocked
3. **Supply Chain Visibility Dashboard** (Supply Chain) - Early stage, not committed
4. **Revenue Forecasting Model** (Finance Analytics) - Completed project

## API Endpoints

- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details with steps
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project
- `POST /api/projects/[id]/commit` - Commit project baseline
- `POST /api/steps` - Create new step
- `PATCH /api/steps/[id]` - Update step (with date change tracking)
- `DELETE /api/steps/[id]` - Delete step
- `GET /api/holidays` - List holidays/PTO
- `POST /api/holidays` - Add holiday/PTO

## Future Enhancements

- Holiday/PTO management UI
- Step editing and reordering
- Export to Excel/PDF
- Email notifications for blocked projects
- Historical trend analysis
- Team capacity planning

## License

Private - Internal Analytics Team Use Only
