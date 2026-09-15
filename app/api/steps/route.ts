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
    orderBy: { sequenceOrder: 'desc' },
  });

  if (steps.length === 0) {
    return 'NOT_STARTED';
  }

  const allCompleted = steps.every((step) => step.status === 'COMPLETED');
  if (allCompleted) {
    return 'COMPLETED';
  }

  const allNotStarted = steps.every((step) => step.status === 'NOT_STARTED');
  if (allNotStarted) {
    return 'NOT_STARTED';
  }

  const mostRecentStep = steps[0];
  if (mostRecentStep && mostRecentStep.status === 'BLOCKED') {
    return 'BLOCKED';
  }

  return 'IN_PROGRESS';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectId,
      stepName,
      startDate,
      workdaysRequired,
      releaseDate,
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

    let calculatedStartDate: Date;
    let calculatedEndDate: Date;
    let calculatedWorkdays: number;

    // Handle release steps differently
    if (isReleaseStep(stepName)) {
      // For release steps, start date = end date = release date
      // Parse as local date without timezone conversion
      const [year, month, day] = releaseDate.split('-').map(Number);
      calculatedStartDate = new Date(year, month - 1, day);
      calculatedEndDate = new Date(year, month - 1, day);
      calculatedWorkdays = 0;
    } else {
      // For regular steps, calculate end date from start date + workdays
      // Parse as local date without timezone conversion
      const [year, month, day] = startDate.split('-').map(Number);
      calculatedStartDate = new Date(year, month - 1, day);
      calculatedEndDate = addWorkdays(calculatedStartDate, workdaysRequired);
      calculatedWorkdays = workdaysRequired;
    }

    // Automated status logic: if start date <= today, status = IN_PROGRESS, else NOT_STARTED
    const today = startOfDay(new Date());
    const autoStatus: StepStatus = isBefore(calculatedStartDate, today) || isSameDay(calculatedStartDate, today)
      ? StepStatus.IN_PROGRESS
      : StepStatus.NOT_STARTED;

    // Create the step
    const step = await prisma.projectStep.create({
      data: {
        projectId,
        stepName,
        sequenceOrder,
        workdaysRequired: calculatedWorkdays,
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
