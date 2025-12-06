/**
 * Form Schema Types
 *
 * Shared types for JSON-serializable form schemas that front-ends can render.
 */

// ============================================================
// CORE TYPES
// ============================================================

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'multi_text'
  | 'multi_input';

export interface SelectOption {
  value: string | boolean | number;
  label: string;
  description?: string;
}

export interface ConditionalLogic {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in';
  value: string | boolean | number | (string | boolean | number)[];
}

export interface QuestionSchema {
  id: string;
  type: QuestionType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: SelectOption[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  count?: number;  // For multi_text
  conditionalOn?: ConditionalLogic;
  categories?: CategorySchema[];  // For multi_input
}

export interface CategorySchema {
  id: string;
  label: string;
  placeholder?: string;
}

export interface SectionSchema {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
  questions: QuestionSchema[];
}

export interface FormSchema {
  productId: string;
  productName: string;
  version: string;
  estimatedTime: string;
  intro?: string;
  sections: SectionSchema[];
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function createTextQuestion(
  id: string,
  label: string,
  options: Partial<QuestionSchema> = {}
): QuestionSchema {
  return {
    id,
    type: 'text',
    label,
    required: true,
    ...options
  };
}

export function createTextareaQuestion(
  id: string,
  label: string,
  options: Partial<QuestionSchema> = {}
): QuestionSchema {
  return {
    id,
    type: 'textarea',
    label,
    required: true,
    minLength: 50,
    ...options
  };
}

export function createSelectQuestion(
  id: string,
  label: string,
  selectOptions: SelectOption[],
  options: Partial<QuestionSchema> = {}
): QuestionSchema {
  return {
    id,
    type: 'select',
    label,
    required: true,
    options: selectOptions,
    ...options
  };
}

export function createBooleanQuestion(
  id: string,
  label: string,
  options: Partial<QuestionSchema> = {}
): QuestionSchema {
  return {
    id,
    type: 'boolean',
    label,
    required: false,
    options: [
      { value: false, label: 'No' },
      { value: true, label: 'Yes' }
    ],
    ...options
  };
}
