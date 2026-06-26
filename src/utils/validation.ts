// Common form validation rules
export const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  phone: {
    pattern: /^\+?1?-?\.?\s?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
    message: 'Please enter a valid phone number (10-15 digits)',
  },
  name: {
    minLength: 2,
    maxLength: 100,
    message: 'Name must be between 2 and 100 characters',
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    message: 'Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters',
  },
  date: {
    min: new Date('1900-01-01'),
    max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    message: 'Please select a valid date',
  },
  url: {
    pattern: /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/,
    message: 'Please enter a valid URL',
  },
  zipCode: {
    pattern: /^[0-9]{5}(?:-[0-9]{4})?$/,
    message: 'Please enter a valid ZIP code',
  },
  ssn: {
    pattern: /^\d{3}-\d{2}-\d{4}$/,
    message: 'Please enter a valid SSN (XXX-XX-XXXX)',
  },
};

// Form field error messages
export const FIELD_MESSAGES = {
  required: 'This field is required',
  requiredIf: (condition: boolean) => condition ? 'This field is required' : '',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  minLength: (min: number) => `Minimum length is ${min} characters`,
  maxLength: (max: number) => `Maximum length is ${max} characters`,
  minValue: (min: number) => `Minimum value is ${min}`,
  maxValue: (max: number) => `Maximum value is ${max}`,
  pattern: 'Value does not match the required pattern',
  equals: (value: any) => `Must equal ${value}`,
  notEquals: (value: any) => `Must not equal ${value}`,
  oneOf: (values: any[]) => `Must be one of: ${values.join(', ')}`,
  custom: 'Invalid value',
};

// Form validation utilities
export class FormValidator {
  static validateEmail(email: string): string | null {
    if (!email) return FIELD_MESSAGES.required;
    if (!VALIDATION_RULES.email.pattern.test(email)) {
      return FIELD_MESSAGES.email;
    }
    return null;
  }

  static validatePhone(phone: string): string | null {
    if (!phone) return null; // Optional field
    if (!VALIDATION_RULES.phone.pattern.test(phone.replace(/\s/g, ''))) {
      return FIELD_MESSAGES.phone;
    }
    return null;
  }

  static validateLength(value: string, min?: number, max?: number): string | null {
    if (min && value.length < min) {
      return FIELD_MESSAGES.minLength(min);
    }
    if (max && value.length > max) {
      return FIELD_MESSAGES.maxLength(max);
    }
    return null;
  }

  static validateValue(value: any, min?: number, max?: number): string | null {
    if (min !== undefined && value < min) {
      return FIELD_MESSAGES.minValue(min);
    }
    if (max !== undefined && value > max) {
      return FIELD_MESSAGES.maxValue(max);
    }
    return null;
  }

  static validateUrl(url: string): string | null {
    if (!url) return null; // Optional field
    if (!VALIDATION_RULES.url.pattern.test(url)) {
      return FIELD_MESSAGES.pattern;
    }
    return null;
  }

  static validatePassword(password: string): string | null {
    if (!password) return FIELD_MESSAGES.required;
    if (password.length < VALIDATION_RULES.password.minLength) {
      return FIELD_MESSAGES.minLength(VALIDATION_RULES.password.minLength);
    }
    if (VALIDATION_RULES.password.requireUppercase && !/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (VALIDATION_RULES.password.requireLowercase && !/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (VALIDATION_RULES.password.requireNumbers && !/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (VALIDATION_RULES.password.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  }

  static validateForm<T extends Record<string, any>>(formData: T, rules: Partial<Record<keyof T, (value: any) => string | null>>): Record<keyof T, string> {
    const errors: Record<keyof T, string> = {} as Record<keyof T, string>;

    for (const [field, value] of Object.entries(formData)) {
      if (rules[field as keyof T]) {
        const error = rules[field as keyof T]!(value);
        if (error) {
          errors[field as keyof T] = error;
        }
      }
    }

    return errors;
  }
}
