import { PrismaClient } from '@prisma/client';
import { addDays } from 'date-fns';

const prisma = new PrismaClient();

// Helper to add workdays (excluding weekends)
function addWorkdays(startDate: Date, workdays: number): Date {
  let currentDate = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < workdays) {
    currentDate = addDays(currentDate, 1);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return currentDate;
}

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  await prisma.dateChangeLog.deleteMany({});
  await prisma.projectStep.deleteMany({});
  await prisma.project.deleteMany({});

  const startDate = new Date('2026-09-15');

  // Project 1: Customer Analytics Dashboard (Product)
  const project1 = await prisma.project.create({
    data: {
      name: 'Customer Analytics Dashboard',
      jiraTicketUrl: 'https://track.akamai.com/jira/browse/CTGANLYSTS-3209',
      domainCategory: 'Product',
      owner: 'Sarah Chen',
      status: 'IN_PROGRESS',
      steps: {
        create: [
          {
            stepName: 'Create BRD',
            sequenceOrder: 1,
            workdaysRequired: 3,
            startDate: startDate,
            endDate: addWorkdays(startDate, 3),
            baselineEndDate: addWorkdays(startDate, 3),
            status: 'COMPLETED',
          },
          {
            stepName: 'Create Wireframe',
            sequenceOrder: 2,
            workdaysRequired: 2,
            startDate: addWorkdays(startDate, 4),
            endDate: addWorkdays(startDate, 6),
            baselineEndDate: addWorkdays(startDate, 6),
            status: 'COMPLETED',
          },
          {
            stepName: 'Data Integration',
            sequenceOrder: 3,
            workdaysRequired: 5,
            startDate: addWorkdays(startDate, 7),
            endDate: addWorkdays(startDate, 12),
            baselineEndDate: addWorkdays(startDate, 12),
            status: 'IN_PROGRESS',
          },
          {
            stepName: 'Create Dashboard',
            sequenceOrder: 4,
            workdaysRequired: 7,
            startDate: addWorkdays(startDate, 13),
            endDate: addWorkdays(startDate, 20),
            baselineEndDate: addWorkdays(startDate, 20),
            status: 'NOT_STARTED',
          },
          {
            stepName: 'User Feedback',
            sequenceOrder: 5,
            workdaysRequired: 3,
            startDate: addWorkdays(startDate, 21),
            endDate: addWorkdays(startDate, 24),
            baselineEndDate: addWorkdays(startDate, 24),
            status: 'NOT_STARTED',
          },
          {
            stepName: 'Launch Dashboard',
            sequenceOrder: 6,
            workdaysRequired: 0,
            startDate: addWorkdays(startDate, 25),
            endDate: addWorkdays(startDate, 25),
            baselineEndDate: addWorkdays(startDate, 25),
            status: 'NOT_STARTED',
          },
        ],
      },
    },
  });

  // Update project go-live date
  await prisma.project.update({
    where: { id: project1.id },
    data: {
      baselineProdDate: addWorkdays(startDate, 25),
      currentTargetProdDate: addWorkdays(startDate, 25),
    },
  });

  // Project 2: Network Capacity Monitoring (Networks) - with delays
  const project2StartDate = new Date('2026-09-10');
  const project2 = await prisma.project.create({
    data: {
      name: 'Network Capacity Monitoring',
      jiraTicketUrl: 'https://track.akamai.com/jira/browse/CTGANLYSTS-3301',
      domainCategory: 'Networks',
      owner: 'Michael Rodriguez',
      status: 'BLOCKED',
      steps: {
        create: [
          {
            stepName: 'Create BRD',
            sequenceOrder: 1,
            workdaysRequired: 4,
            startDate: project2StartDate,
            endDate: addWorkdays(project2StartDate, 4),
            baselineEndDate: addWorkdays(project2StartDate, 4),
            status: 'COMPLETED',
          },
          {
            stepName: 'Data Integration',
            sequenceOrder: 2,
            workdaysRequired: 6,
            startDate: addWorkdays(project2StartDate, 5),
            endDate: addWorkdays(project2StartDate, 13),
            baselineEndDate: addWorkdays(project2StartDate, 11),
            status: 'BLOCKED',
            shiftCount: 1,
            reasonForDelay: 'Waiting on API access from infrastructure team',
          },
          {
            stepName: 'Create Dashboard',
            sequenceOrder: 3,
            workdaysRequired: 8,
            startDate: addWorkdays(project2StartDate, 14),
            endDate: addWorkdays(project2StartDate, 22),
            baselineEndDate: addWorkdays(project2StartDate, 20),
            status: 'NOT_STARTED',
          },
          {
            stepName: 'Launch Dashboard',
            sequenceOrder: 4,
            workdaysRequired: 0,
            startDate: addWorkdays(project2StartDate, 23),
            endDate: addWorkdays(project2StartDate, 23),
            baselineEndDate: addWorkdays(project2StartDate, 21),
            status: 'NOT_STARTED',
          },
        ],
      },
    },
  });

  await prisma.project.update({
    where: { id: project2.id },
    data: {
      baselineProdDate: addWorkdays(project2StartDate, 21),
      currentTargetProdDate: addWorkdays(project2StartDate, 23),
      totalDateShifts: 1,
    },
  });

  // Project 3: ML Model Training Pipeline (R&D)
  const project3StartDate = new Date('2026-09-20');
  const project3 = await prisma.project.create({
    data: {
      name: 'ML Model Training Pipeline',
      jiraTicketUrl: 'https://track.akamai.com/jira/browse/CTGANLYSTS-3405',
      domainCategory: 'R&D',
      owner: 'Jennifer Park',
      status: 'IN_PROGRESS',
      steps: {
        create: [
          {
            stepName: 'Create BRD',
            sequenceOrder: 1,
            workdaysRequired: 5,
            startDate: project3StartDate,
            endDate: addWorkdays(project3StartDate, 5),
            baselineEndDate: addWorkdays(project3StartDate, 5),
            status: 'COMPLETED',
          },
          {
            stepName: 'Data Integration',
            sequenceOrder: 2,
            workdaysRequired: 10,
            startDate: addWorkdays(project3StartDate, 6),
            endDate: addWorkdays(project3StartDate, 16),
            baselineEndDate: addWorkdays(project3StartDate, 16),
            status: 'IN_PROGRESS',
          },
          {
            stepName: 'User Training',
            sequenceOrder: 3,
            workdaysRequired: 4,
            startDate: addWorkdays(project3StartDate, 17),
            endDate: addWorkdays(project3StartDate, 21),
            baselineEndDate: addWorkdays(project3StartDate, 21),
            status: 'NOT_STARTED',
          },
          {
            stepName: 'Launch SS Data Source',
            sequenceOrder: 4,
            workdaysRequired: 0,
            startDate: addWorkdays(project3StartDate, 22),
            endDate: addWorkdays(project3StartDate, 22),
            baselineEndDate: addWorkdays(project3StartDate, 22),
            status: 'NOT_STARTED',
          },
        ],
      },
    },
  });

  await prisma.project.update({
    where: { id: project3.id },
    data: {
      baselineProdDate: addWorkdays(project3StartDate, 22),
      currentTargetProdDate: addWorkdays(project3StartDate, 22),
    },
  });

  // Project 4: Employee Performance Dashboard (Internal) - completed
  const project4StartDate = new Date('2026-08-01');
  const project4 = await prisma.project.create({
    data: {
      name: 'Employee Performance Dashboard',
      jiraTicketUrl: 'https://track.akamai.com/jira/browse/CTGANLYSTS-3150',
      domainCategory: 'Internal',
      owner: 'David Kim',
      status: 'COMPLETED',
      steps: {
        create: [
          {
            stepName: 'Create BRD',
            sequenceOrder: 1,
            workdaysRequired: 3,
            startDate: project4StartDate,
            endDate: addWorkdays(project4StartDate, 3),
            baselineEndDate: addWorkdays(project4StartDate, 3),
            status: 'COMPLETED',
          },
          {
            stepName: 'Create Wireframe',
            sequenceOrder: 2,
            workdaysRequired: 2,
            startDate: addWorkdays(project4StartDate, 4),
            endDate: addWorkdays(project4StartDate, 6),
            baselineEndDate: addWorkdays(project4StartDate, 6),
            status: 'COMPLETED',
          },
          {
            stepName: 'Create Data Source',
            sequenceOrder: 3,
            workdaysRequired: 5,
            startDate: addWorkdays(project4StartDate, 7),
            endDate: addWorkdays(project4StartDate, 12),
            baselineEndDate: addWorkdays(project4StartDate, 12),
            status: 'COMPLETED',
          },
          {
            stepName: 'Create Dashboard',
            sequenceOrder: 4,
            workdaysRequired: 6,
            startDate: addWorkdays(project4StartDate, 13),
            endDate: addWorkdays(project4StartDate, 19),
            baselineEndDate: addWorkdays(project4StartDate, 19),
            status: 'COMPLETED',
          },
          {
            stepName: 'User Feedback',
            sequenceOrder: 5,
            workdaysRequired: 2,
            startDate: addWorkdays(project4StartDate, 20),
            endDate: addWorkdays(project4StartDate, 22),
            baselineEndDate: addWorkdays(project4StartDate, 22),
            status: 'COMPLETED',
          },
          {
            stepName: 'Launch Dashboard',
            sequenceOrder: 6,
            workdaysRequired: 0,
            startDate: addWorkdays(project4StartDate, 23),
            endDate: addWorkdays(project4StartDate, 23),
            baselineEndDate: addWorkdays(project4StartDate, 23),
            status: 'COMPLETED',
          },
        ],
      },
    },
  });

  await prisma.project.update({
    where: { id: project4.id },
    data: {
      baselineProdDate: addWorkdays(project4StartDate, 23),
      currentTargetProdDate: addWorkdays(project4StartDate, 23),
    },
  });

  // Project 5: Supply Chain Analytics (Product) - starting soon
  const project5StartDate = new Date('2026-10-01');
  const project5 = await prisma.project.create({
    data: {
      name: 'Supply Chain Analytics',
      jiraTicketUrl: 'https://track.akamai.com/jira/browse/CTGANLYSTS-3500',
      domainCategory: 'Product',
      owner: 'Lisa Anderson',
      status: 'NOT_STARTED',
      steps: {
        create: [
          {
            stepName: 'Create BRD',
            sequenceOrder: 1,
            workdaysRequired: 4,
            startDate: project5StartDate,
            endDate: addWorkdays(project5StartDate, 4),
            baselineEndDate: addWorkdays(project5StartDate, 4),
            status: 'NOT_STARTED',
          },
          {
            stepName: 'Create Wireframe',
            sequenceOrder: 2,
            workdaysRequired: 3,
            startDate: addWorkdays(project5StartDate, 5),
            endDate: addWorkdays(project5StartDate, 8),
            baselineEndDate: addWorkdays(project5StartDate, 8),
            status: 'NOT_STARTED',
          },
          {
            stepName: 'Launch Dashboard',
            sequenceOrder: 3,
            workdaysRequired: 0,
            startDate: addWorkdays(project5StartDate, 20),
            endDate: addWorkdays(project5StartDate, 20),
            baselineEndDate: addWorkdays(project5StartDate, 20),
            status: 'NOT_STARTED',
          },
        ],
      },
    },
  });

  await prisma.project.update({
    where: { id: project5.id },
    data: {
      baselineProdDate: addWorkdays(project5StartDate, 20),
      currentTargetProdDate: addWorkdays(project5StartDate, 20),
    },
  });

  console.log('Seed data created successfully!');
  console.log('Created 5 projects with various statuses and steps');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
