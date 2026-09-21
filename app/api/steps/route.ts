import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProjectStatus, StepStatus } from '@prisma/client';
import { addWorkdays } from '@/lib/workday-calculator';
import { isReleaseStep } from '@/lib/constants';
import { startOfDay, isBefore, isSameDay } from 'date-fns';

// Helper function to calculate automated project status
async function calculateProjectStatus(projectId: string): Promise<ProjectStatus> {
  const steps = await prisma.projectStep.findMany({
    where: { projectId },
    orderBy: { sequenceOrder: 'asc' }, // Sequential order for evaluation
  });

  // Rule 1: No steps exist
  if (steps.length === 0) {
    return 'NOT_STARTED';
  }

  // Rule 2: COMPLETED - If Launch Dashboard or Launch Data Source step is COMPLETED
  const launchStep = steps.find(
    (step) => step.stepName === 'Launch Dashboard' || step.stepName === 'Launch Data Source'
  );
  if (launchStep && launchStep.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  // Rule 3: BLOCKED - If any step is BLOCKED AND all subsequent steps are NOT_STARTED
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.status === 'BLOCKED') {
      // Check if all subsequent steps are NOT_STARTED
      const subsequentSteps = steps.slice(i + 1);
      const allSubsequentNotStarted = subsequentSteps.every(
        (s) => s.status === 'NOT_STARTED'
      );
      if (allSubsequentNotStarted) {
        return 'BLOCKED';
      }
    }
  }

  // Rule 4: NOT_STARTED - If all steps are NOT_STARTED
  const allNotStarted = steps.every((step) => step.status === 'NOT_STARTED');
  if (allNotStarted) {
    return 'NOT_STARTED';
  }

  // Rule 5: IN_PROGRESS - Default case (any step is IN_PROGRESS or mixed states)
  return 'IN_PROGRESS';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectId,
      stepName,
      startDate,
      endDate,
    } = body;

    // Check for duplicate step in this project
    const existingStep = await prisma.projectStep.findFirst({
      where: {
        projectId,
        stepName,
      },
    });

    if (existingStep) {
      return NextResponse.json(
        { error: `Step "${stepName}" already exists in this project` },
        { status: 400 }
      );
    }

    // Get project info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        steps: {
          orderBy: { sequenceOrder: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Calculate sequence order
    const sequenceOrder = (project.steps[0]?.sequenceOrder || 0) + 1;

    // Parse target date as local date without timezone conversion
    const [year, month, day] = startDate.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);

    // All steps now use the same target date for both start and end
    const calculatedStartDate = targetDate;
    const calculatedEndDate = targetDate;

    // Automated status logic: if target date <= today, status = IN_PROGRESS, else NOT_STARTED
    const today = startOfDay(new Date());
    const autoStatus: StepStatus = isBefore(calculatedStartDate, today) || isSameDay(calculatedStartDate, today)
      ? StepStatus.IN_PROGRESS
      : StepStatus.NOT_STARTED;

    // Create the step - workdaysRequired is no longer used but kept for schema compatibility
    const step = await prisma.projectStep.create({
      data: {
        projectId,
        stepName,
        sequenceOrder,
        workdaysRequired: 0,
        startDate: calculatedStartDate,
        endDate: calculatedEndDate,
        baselineEndDate: calculatedEndDate,
        status: autoStatus,
      },
    });

    // Update project go-live date if this is a release step
    if (isReleaseStep(stepName)) {
      const currentBaseline = project.baselineProdDate;

      await prisma.project.update({
        where: { id: projectId },
        data: {
          currentTargetProdDate: calculatedEndDate,
          baselineProdDate: currentBaseline || calculatedEndDate,
          totalDateShifts: currentBaseline && calculatedEndDate > currentBaseline ? 1 : 0,
        },
      });
    }

    // Update project status based on new step
    const newStatus = await calculateProjectStatus(projectId);
    await prisma.project.update({
      where: { id: projectId },
      data: { status: newStatus },
    });

    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    console.error('Error creating step:', error);
    return NextResponse.json(
      { error: 'Failed to create step' },
      { status: 500 }
    );
  }
}
