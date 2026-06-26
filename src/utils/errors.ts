// Clean error handler that converts internal errors to user-friendly messages
export class ErrorHandler {
  private knownErrors: Map<string, string> = new Map([
    ['NOT_FOUND', 'The requested resource was not found.'],
    ['UNAUTHORIZED', 'You are not authorized to perform this action.'],
    ['TIMEOUT', 'The request took too long. Please try again.'],
    ['NETWORK_ERROR', 'Unable to connect to the server. Please check your internet connection.'],
    ['VALIDATION_ERROR', 'Please check your input and try again.'],
    ['QUOTA_EXCEEDED', 'Storage limit reached. Some data may have been removed.'],
  ]);

  handle(error: any): { message: string; code?: string; details?: any } {
    // Handle known error codes
    if (error?.code && this.knownErrors.has(error.code)) {
      return {
        message: this.knownErrors.get(error.code) || error.message,
        code: error.code,
      };
    }

    // Handle HTTP status codes
    if (error?.status) {
      switch (error.status) {
        case 400:
          return { message: 'Invalid request. Please check your input.' };
        case 401:
          return { message: 'You must be logged in to perform this action.' };
        case 403:
          return { message: 'You do not have permission to perform this action.' };
        case 404:
          return { message: 'The requested resource was not found.' };
        case 409:
          return { message: 'This action conflicts with existing data.' };
        case 429:
          return { message: 'Too many requests. Please wait a moment and try again.' };
        case 500:
          return { message: 'An unexpected error occurred. Please try again.' };
        default:
          return { message: error.message || 'An error occurred.', code: error.code };
      }
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { message: 'Request timed out. Please try again.' };
      }
      return { message: error.message };
    }

    // Handle unknown errors
    console.error('Unhandled error:', error);
    return {
      message: 'An unexpected error occurred. Please contact support if the problem persists.',
    };
  }

  // Log error for debugging
  log(error: any, context?: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      context,
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack,
      },
    };

    console.error('[App Error]', logEntry);

    // In production, you would send this to an error monitoring service
    if (import.meta.env.PROD) {
      // Send to Sentry, LogRocket, etc.
      // await monitoringService.captureError(logEntry);
    }
  }
}
