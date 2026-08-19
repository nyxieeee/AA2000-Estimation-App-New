// All survey types defined as a union type
export type SurveyTypes = 
  | 'CCTV'
  | 'FIRE_ALARM' 
  | 'FIRE_PROTECTION'
  | 'ACCESS_CONTROL'
  | 'BURGLAR_ALARM'
  | 'OTHER';

// Mapping survey types to display names and order
export const SURVEY_TYPES: Record<SurveyTypes, {
  label: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}> = {
  'CCTV': {
    label: 'CCTV',
    description: 'Closed Circuit Television Systems',
    icon: 'camera',
    color: 'blue',
    order: 1,
  },
  'FIRE_ALARM': {
    label: 'Fire Alarm',
    description: 'Fire Detection and Alarm Systems',
    icon: 'alert-triangle',
    color: 'red',
    order: 2,
  },
  'FIRE_PROTECTION': {
    label: 'Fire Protection',
    description: 'Fire Suppression Systems',
    icon: 'flame',
    color: 'orange',
    order: 3,
  },
  'ACCESS_CONTROL': {
    label: 'Access Control',
    description: 'Door Access and Security Systems',
    icon: 'key',
    color: 'green',
    order: 4,
  },
  'BURGLAR_ALARM': {
    label: 'Burglar Alarm',
    description: 'Perimeter Intrusion Detection',
    icon: 'shield',
    color: 'purple',
    order: 5,
  },
  'OTHER': {
    label: 'Other',
    description: 'Additional Systems (Turnstiles, Barriers, Intercom)',
    icon: 'more-horizontal',
    color: 'gray',
    order: 6,
  },
};

// Create ordered array for easy iteration
export const SURVEY_TYPE_ARRAY: SurveyTypes[] = Object.keys(SURVEY_TYPES) as SurveyTypes[];

// Helper function to get survey type by label
export function getSurveyTypeByLabel(label: string): SurveyTypes | undefined {
  return (Object.entries(SURVEY_TYPES).find(([_, config]) => config.label === label)?.[0] as SurveyTypes) || undefined;
}

// Helper function to get survey type by order
export function getSurveyTypeByOrder(order: number): SurveyTypes | undefined {
  return (Object.entries(SURVEY_TYPES).find(([_, config]) => config.order === order)?.[0] as SurveyTypes) || undefined;
}

// Validate if a survey type is valid
export function isValidSurveyType(type: string): type is SurveyTypes {
  return (Object.keys(SURVEY_TYPES) as SurveyTypes[]).includes(type as SurveyTypes);
}
