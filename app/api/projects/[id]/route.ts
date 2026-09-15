import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to calculate automated project status
async function calculateProjectStatus(projectId: string): Promise<string> {
  const steps = await prisma.projectStep.findMany({
    where: { projectId },
    orderBy: { sequenceOrder: 'desc' },
  });

  if (steps.length === 0) {
    return 'NOT_STARTED';
  }

  // If all steps are completed, project is completed
  const allCompleted = steps.every((step) => step.status === 'COMPLETED');
  if (allCompleted) {
    return 'COMPLETED';
  }

  // If all steps are not started, project is not started
  const allNotStarted = steps.every((step) => step.status === 'NOT_STARTED');
  if (allNotStarted) {
    return 'NOT_STARTED';
  }

  // If the most recent step is blocked, project is blocked
  const mostRecentStep = steps[0];
  if (mostRecentStep && mostRecentStep.status === 'BLOCKED') {
    return 'BLOCKED';
  }

  // Otherwise, project is in progress
  return 'IN_PROGRESS';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: {
            sequenceOrder: 'asc',
          },
          include: {
            dateChangeLogs: {
              orderBy: {
                timestamp: 'desc',
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const project = await prisma.project.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
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
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
