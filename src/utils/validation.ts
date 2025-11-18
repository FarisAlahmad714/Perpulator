/**
 * Validation utilities for position inputs
 */

export interface ValidationError {
  field: string;
  message: string;
}

export const validatePositionInput = (
  entryPrice: string,
  positionSize: string,
  leverage: string,
  stopLoss?: string,
  takeProfit?: string
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Entry Price validation
  const entry = parseFloat(entryPrice);
  if (!entryPrice || isNaN(entry)) {
    errors.push({ field: 'entryPrice', message: 'Entry price is required' });
  } else if (entry <= 0) {
    errors.push({ field: 'entryPrice', message: 'Entry price must be positive' });
  } else if (entry > 1000000) {
    errors.push({ field: 'entryPrice', message: 'Entry price seems too high (max $1M)' });
  }

  // Position Size validation
  const size = parseFloat(positionSize);
  if (!positionSize || isNaN(size)) {
    errors.push({ field: 'positionSize', message: 'Position size is required' });
  } else if (size <= 0) {
    errors.push({ field: 'positionSize', message: 'Position size must be positive' });
  } else if (size > 1000000) {
    errors.push({ field: 'positionSize', message: 'Position size too large (max $1M)' });
  }

  // Leverage validation
  const lev = parseFloat(leverage);
  if (!leverage || isNaN(lev)) {
    errors.push({ field: 'leverage', message: 'Leverage is required' });
  } else if (lev < 1) {
    errors.push({ field: 'leverage', message: 'Leverage must be at least 1x' });
  } else if (lev > 50) {
    errors.push({ field: 'leverage', message: 'Leverage cannot exceed 50x' });
  }

  // Stop Loss validation (if provided)
  if (stopLoss) {
    const sl = parseFloat(stopLoss);
    if (isNaN(sl)) {
      errors.push({ field: 'stopLoss', message: 'Stop loss must be a valid number' });
    } else if (sl <= 0) {
      errors.push({ field: 'stopLoss', message: 'Stop loss must be positive' });
    }
  }

  // Take Profit validation (if provided)
  if (takeProfit) {
    const tp = parseFloat(takeProfit);
    if (isNaN(tp)) {
      errors.push({ field: 'takeProfit', message: 'Take profit must be a valid number' });
    } else if (tp <= 0) {
      errors.push({ field: 'takeProfit', message: 'Take profit must be positive' });
    }
  }

  return errors;
};

export const validateAdjustmentInput = (
  newEntryPrice: string,
  adjustmentSize: string
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // New Entry Price validation
  const newEntry = parseFloat(newEntryPrice);
  if (!newEntryPrice || isNaN(newEntry)) {
    errors.push({ field: 'newEntryPrice', message: 'New entry price is required' });
  } else if (newEntry <= 0) {
    errors.push({ field: 'newEntryPrice', message: 'New entry price must be positive' });
  } else if (newEntry > 1000000) {
    errors.push({ field: 'newEntryPrice', message: 'New entry price seems too high' });
  }

  // Adjustment Size validation
  const adjustment = parseFloat(adjustmentSize);
  if (!adjustmentSize || isNaN(adjustment)) {
    errors.push({ field: 'adjustmentSize', message: 'Adjustment size is required' });
  } else if (adjustment <= 0) {
    errors.push({ field: 'adjustmentSize', message: 'Adjustment size must be positive' });
  } else if (adjustment > 10000000) {
    errors.push({ field: 'adjustmentSize', message: 'Adjustment size too large' });
  }

  return errors;
};

export const getErrorMessage = (errors: ValidationError[], field: string): string | null => {
  const error = errors.find((e) => e.field === field);
  return error ? error.message : null;
};
