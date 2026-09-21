// Predefined step names as per BRD (in order for dashboard display)
export const STEP_NAMES = [
  'Business Requirements',
  'Wireframe',
  'Data Integration',
  'Data Source',
  'Dashboard',
  'Feedback',
  'Launch Dashboard',
  'Launch Data Source',
] as const;

export type StepName = typeof STEP_NAMES[number];

// Release steps where start date = end date
export const RELEASE_STEPS: StepName[] = ['Launch Dashboard', 'Launch Data Source'];

// Domain categories
export const DOMAIN_CATEGORIES = ['Product', 'Networks', 'R&D', 'Internal'] as const;

export type DomainCategory = typeof DOMAIN_CATEGORIES[number];

// Helper function to check if a step is a release step
export function isReleaseStep(stepName: string): boolean {
  return RELEASE_STEPS.includes(stepName as StepName);
}
