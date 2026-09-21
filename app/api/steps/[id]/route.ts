import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ProjectStatus } from '@prisma/client';
import { getWorkdaysBetween, addWorkdays } from '@/lib/workday-calculator';
import { isReleaseStep } from '@/lib/constants';

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get current step with all project steps
    const currentStep = await prisma.projectStep.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            steps: {
              orderBy: { sequenceOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!currentStep) {
      return NextResponse.json(
        { error: 'Step not found' },
        { status: 404 }
      );
    }

    let updateData: any = {};

    // Only include status if it's provided
    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    // Handle start date override
    if (body.startDate) {
      const [year, month, day] = body.startDate.split('-').map(Number);
      const newStartDate = new Date(year, month - 1, day);
      updateData.startDate = newStartDate;
    }

    // Handle end date override with cascading
    let workdayShift = 0;
    if (body.endDate) {
      // Parse as local date without timezone conversion
      const [year, month, day] = body.endDate.split('-').map(Number);
      const newEndDate = new Date(year, month - 1, day);
      const previousEndDate = new Date(currentStep.endDate);

      // Check if date actually changed
      if (newEndDate.toDateString() !== previousEndDate.toDateString()) {
        if (!body.reasonForChange) {
          return NextResponse.json(
            { error: 'Reason for change is required when modifying the end date' },
            { status: 400 }
          );
        }

        // Calculate days shifted (weekends only) - only based on baseline end date
        const baselineEnd = currentStep.baselineEndDate
          ? new Date(currentStep.baselineEndDate)
          : previousEndDate;
        const daysShifted = getWorkdaysBetween(baselineEnd, newEndDate);

        // Calculate workday difference for cascading (from previous to new end date)
        workdayShift = getWorkdaysBetween(previousEndDate, newEndDate);

        // Create audit log
        await prisma.dateChangeLog.create({
          data: {
            stepId: id,
            previousEndDate,
            newEndDate,
            daysShifted: Math.abs(daysShifted),
            reasonForChange: body.reasonForChange,
          },
        });

        // Increment shift counter
        updateData.shiftCount = (currentStep.shiftCount || 0) + 1;
        updateData.endDate = newEndDate;
        updateData.reasonForDelay = body.reasonForChange;

        // If end date is pushed out, cascade to downstream steps
        if (workdayShift > 0) {
          const downstreamSteps = currentStep.project.steps.filter(
            (s) => s.sequenceOrder > currentStep.sequenceOrder
          );

          for (const downstreamStep of downstreamSteps) {
            const currentStartDate = new Date(downstreamStep.startDate);
            const currentEndDate = new Date(downstreamStep.endDate);

            const newStartDate = addWorkdays(currentStartDate, workdayShift);
            const newEndDate = addWorkdays(currentEndDate, workdayShift);

            await prisma.projectStep.update({
              where: { id: downstreamStep.id },
              data: {
                startDate: newStartDate,
                endDate: newEndDate,
              },
            });
          }
        }

        // If this is a release step, update project go-live date
        if (isReleaseStep(currentStep.stepName)) {
          const currentBaseline = currentStep.project.baselineProdDate;
          let totalShifts = currentStep.project.totalDateShifts;

          // Calculate how many times the date has been shifted
          if (currentBaseline && newEndDate.getTime() !== currentBaseline.getTime()) {
            totalShifts = (currentStep.shiftCount || 0) + 1;
          }

          await prisma.project.update({
            where: { id: currentStep.projectId },
            data: {
              currentTargetProdDate: newEndDate,
              totalDateShifts: totalShifts,
            },
          });
        } else {
          // If not a release step, check if there's a release step and update its date too
          const releaseStep = currentStep.project.steps.find((s) =>
            isReleaseStep(s.stepName)
          );

          if (releaseStep && workdayShift > 0) {
            const releaseEndDate = new Date(releaseStep.endDate);
            const newReleaseEndDate = addWorkdays(releaseEndDate, workdayShift);

            await prisma.project.update({
              where: { id: currentStep.projectId },
              data: {
                currentTargetProdDate: newReleaseEndDate,
              },
            });
          }
        }
      }
    }

    const updatedStep = await prisma.projectStep.update({
      where: { id },
      data: updateData,
    });

    // Update project status
    const newStatus = await calculateProjectStatus(currentStep.projectId);
    await prisma.project.update({
      where: { id: currentStep.projectId },
      data: { status: newStatus },
    });

    return NextResponse.json(updatedStep);
  } catch (error) {
    console.error('Error updating step:', error);
    return NextResponse.json(
      { error: 'Failed to update step' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const step = await prisma.projectStep.findUnique({
      where: { id },
    });

    if (!step) {
      return NextResponse.json(
        { error: 'Step not found' },
        { status: 404 }
      );
    }

    const projectId = step.projectId;

    await prisma.projectStep.delete({
      where: { id },
    });

    // Update project status after deletion
    const newStatus = await calculateProjectStatus(projectId);
    await prisma.project.update({
      where: { id: projectId },
      data: { status: newStatus },
    });

    return NextResponse.json({ message: 'Step deleted successfully' });
  } catch (error) {
    console.error('Error deleting step:', error);
    return NextResponse.json(
      { error: 'Failed to delete step' },
      { status: 500 }
    );
  }
}
