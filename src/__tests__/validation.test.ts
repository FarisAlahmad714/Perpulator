/**
 * Test suite for validation utilities
 * Tests input validation for position and adjustment forms
 */

import {
  validatePositionInput,
  validateAdjustmentInput,
  getErrorMessage,
  ValidationError,
} from '@/utils/validation';

describe('validatePositionInput', () => {
  describe('Entry Price Validation', () => {
    it('should reject empty entry price', () => {
      const errors = validatePositionInput('', '1000', '2', '95', '110');
      const entryError = getErrorMessage(errors, 'entryPrice');
      expect(entryError).toBe('Entry price is required');
    });

    it('should reject non-numeric entry price', () => {
      const errors = validatePositionInput('abc', '1000', '2', '95', '110');
      const entryError = getErrorMessage(errors, 'entryPrice');
      expect(entryError).toBe('Entry price is required');
    });

    it('should reject zero entry price', () => {
      const errors = validatePositionInput('0', '1000', '2', '95', '110');
      const entryError = getErrorMessage(errors, 'entryPrice');
      expect(entryError).toBe('Entry price must be positive');
    });

    it('should reject negative entry price', () => {
      const errors = validatePositionInput('-100', '1000', '2', '95', '110');
      const entryError = getErrorMessage(errors, 'entryPrice');
      expect(entryError).toBe('Entry price must be positive');
    });

    it('should reject entry price exceeding $1M', () => {
      const errors = validatePositionInput('1000001', '1000', '2', '95', '110');
      const entryError = getErrorMessage(errors, 'entryPrice');
      expect(entryError).toBe('Entry price seems too high (max $1M)');
    });

    it('should accept valid entry price', () => {
      const errors = validatePositionInput('102500', '1000', '2', '95', '110');
      const entryError = getErrorMessage(errors, 'entryPrice');
      expect(entryError).toBeNull();
    });

    it('should accept decimal entry prices', () => {
      const errors = validatePositionInput('0.0001', '1000', '2', '0.00009', '0.00011');
      const entryError = getErrorMessage(errors, 'entryPrice');
      expect(entryError).toBeNull();
    });
  });

  describe('Position Size Validation', () => {
    it('should reject empty position size', () => {
      const errors = validatePositionInput('100', '', '2', '95', '110');
      const sizeError = getErrorMessage(errors, 'positionSize');
      expect(sizeError).toBe('Position size is required');
    });

    it('should reject zero position size', () => {
      const errors = validatePositionInput('100', '0', '2', '95', '110');
      const sizeError = getErrorMessage(errors, 'positionSize');
      expect(sizeError).toBe('Position size must be positive');
    });

    it('should reject negative position size', () => {
      const errors = validatePositionInput('100', '-500', '2', '95', '110');
      const sizeError = getErrorMessage(errors, 'positionSize');
      expect(sizeError).toBe('Position size must be positive');
    });

    it('should reject position size exceeding $1M', () => {
      const errors = validatePositionInput('100', '1000001', '2', '95', '110');
      const sizeError = getErrorMessage(errors, 'positionSize');
      expect(sizeError).toBe('Position size too large (max $1M)');
    });

    it('should accept valid position size', () => {
      const errors = validatePositionInput('100', '1500', '2', '95', '110');
      const sizeError = getErrorMessage(errors, 'positionSize');
      expect(sizeError).toBeNull();
    });

    it('should accept small position sizes', () => {
      const errors = validatePositionInput('100', '10', '2', '95', '110');
      const sizeError = getErrorMessage(errors, 'positionSize');
      expect(sizeError).toBeNull();
    });
  });

  describe('Leverage Validation', () => {
    it('should reject empty leverage', () => {
      const errors = validatePositionInput('100', '1000', '', '95', '110');
      const leverageError = getErrorMessage(errors, 'leverage');
      expect(leverageError).toBe('Leverage is required');
    });

    it('should reject leverage below 1x', () => {
      const errors = validatePositionInput('100', '1000', '0.5', '95', '110');
      const leverageError = getErrorMessage(errors, 'leverage');
      expect(leverageError).toBe('Leverage must be at least 1x');
    });

    it('should reject zero leverage', () => {
      const errors = validatePositionInput('100', '1000', '0', '95', '110');
      const leverageError = getErrorMessage(errors, 'leverage');
      expect(leverageError).toBe('Leverage must be at least 1x');
    });

    it('should reject leverage exceeding 50x', () => {
      const errors = validatePositionInput('100', '1000', '51', '95', '110');
      const leverageError = getErrorMessage(errors, 'leverage');
      expect(leverageError).toBe('Leverage cannot exceed 50x');
    });

    it('should accept 1x leverage', () => {
      const errors = validatePositionInput('100', '1000', '1', '95', '110');
      const leverageError = getErrorMessage(errors, 'leverage');
      expect(leverageError).toBeNull();
    });

    it('should accept maximum 50x leverage', () => {
      const errors = validatePositionInput('100', '1000', '50', '95', '110');
      const leverageError = getErrorMessage(errors, 'leverage');
      expect(leverageError).toBeNull();
    });

    it('should accept decimal leverage', () => {
      const errors = validatePositionInput('100', '1000', '7.5', '95', '110');
      const leverageError = getErrorMessage(errors, 'leverage');
      expect(leverageError).toBeNull();
    });
  });

  describe('Stop Loss Validation', () => {
    it('should allow empty stop loss', () => {
      const errors = validatePositionInput('100', '1000', '2', '', '110');
      const slError = getErrorMessage(errors, 'stopLoss');
      expect(slError).toBeNull();
    });

    it('should reject invalid stop loss', () => {
      const errors = validatePositionInput('100', '1000', '2', 'invalid', '110');
      const slError = getErrorMessage(errors, 'stopLoss');
      expect(slError).toBe('Stop loss must be a valid number');
    });

    it('should reject zero stop loss', () => {
      const errors = validatePositionInput('100', '1000', '2', '0', '110');
      const slError = getErrorMessage(errors, 'stopLoss');
      expect(slError).toBe('Stop loss must be positive');
    });

    it('should reject negative stop loss', () => {
      const errors = validatePositionInput('100', '1000', '2', '-50', '110');
      const slError = getErrorMessage(errors, 'stopLoss');
      expect(slError).toBe('Stop loss must be positive');
    });

    it('should accept valid stop loss', () => {
      const errors = validatePositionInput('100', '1000', '2', '95', '110');
      const slError = getErrorMessage(errors, 'stopLoss');
      expect(slError).toBeNull();
    });
  });

  describe('Take Profit Validation', () => {
    it('should allow empty take profit', () => {
      const errors = validatePositionInput('100', '1000', '2', '95', '');
      const tpError = getErrorMessage(errors, 'takeProfit');
      expect(tpError).toBeNull();
    });

    it('should reject invalid take profit', () => {
      const errors = validatePositionInput('100', '1000', '2', '95', 'invalid');
      const tpError = getErrorMessage(errors, 'takeProfit');
      expect(tpError).toBe('Take profit must be a valid number');
    });

    it('should reject zero take profit', () => {
      const errors = validatePositionInput('100', '1000', '2', '95', '0');
      const tpError = getErrorMessage(errors, 'takeProfit');
      expect(tpError).toBe('Take profit must be positive');
    });

    it('should reject negative take profit', () => {
      const errors = validatePositionInput('100', '1000', '2', '95', '-120');
      const tpError = getErrorMessage(errors, 'takeProfit');
      expect(tpError).toBe('Take profit must be positive');
    });

    it('should accept valid take profit', () => {
      const errors = validatePositionInput('100', '1000', '2', '95', '110');
      const tpError = getErrorMessage(errors, 'takeProfit');
      expect(tpError).toBeNull();
    });

    it('should accept very high take profit for crypto', () => {
      const errors = validatePositionInput('100', '1000', '2', '95', '1000000');
      const tpError = getErrorMessage(errors, 'takeProfit');
      expect(tpError).toBeNull();
    });
  });

  describe('Multiple Errors', () => {
    it('should collect multiple validation errors', () => {
      const errors = validatePositionInput('', '', '51', 'bad', 'invalid');
      expect(errors.length).toBeGreaterThan(1);
      expect(getErrorMessage(errors, 'entryPrice')).not.toBeNull();
      expect(getErrorMessage(errors, 'positionSize')).not.toBeNull();
      expect(getErrorMessage(errors, 'leverage')).not.toBeNull();
    });

    it('should validate all required fields', () => {
      const errors = validatePositionInput('', '', '', '', '');
      expect(errors.length).toBeGreaterThanOrEqual(3); // At least entry, size, leverage
      expect(getErrorMessage(errors, 'entryPrice')).not.toBeNull();
      expect(getErrorMessage(errors, 'positionSize')).not.toBeNull();
      expect(getErrorMessage(errors, 'leverage')).not.toBeNull();
    });
  });

  describe('Valid Scenarios', () => {
    it('should accept user test case - SHORT position', () => {
      // Original SHORT: $1500 at $102,500, 7x leverage, SL $104,500, TP $90,415
      const errors = validatePositionInput('102500', '1500', '7', '104500', '90415');
      expect(errors.length).toBe(0);
    });

    it('should accept minimum valid input', () => {
      const errors = validatePositionInput('1', '1', '1');
      expect(errors.length).toBe(0);
    });

    it('should accept maximum valid input', () => {
      const errors = validatePositionInput('1000000', '1000000', '50');
      expect(errors.length).toBe(0);
    });

    it('should accept common crypto trading scenario', () => {
      const errors = validatePositionInput('60000', '5000', '10', '54000', '66000');
      expect(errors.length).toBe(0);
    });
  });
});

describe('validateAdjustmentInput', () => {
  describe('New Entry Price Validation', () => {
    it('should reject empty new entry price', () => {
      const errors = validateAdjustmentInput('', '500');
      const priceError = getErrorMessage(errors, 'newEntryPrice');
      expect(priceError).toBe('New entry price is required');
    });

    it('should reject negative new entry price', () => {
      const errors = validateAdjustmentInput('-100', '500');
      const priceError = getErrorMessage(errors, 'newEntryPrice');
      expect(priceError).toBe('New entry price must be positive');
    });

    it('should reject new entry price exceeding $1M', () => {
      const errors = validateAdjustmentInput('1000001', '500');
      const priceError = getErrorMessage(errors, 'newEntryPrice');
      expect(priceError).toBe('New entry price seems too high');
    });

    it('should accept valid new entry price', () => {
      const errors = validateAdjustmentInput('96000', '500');
      const priceError = getErrorMessage(errors, 'newEntryPrice');
      expect(priceError).toBeNull();
    });
  });

  describe('Adjustment Size Validation', () => {
    it('should reject empty adjustment size', () => {
      const errors = validateAdjustmentInput('96000', '');
      const sizeError = getErrorMessage(errors, 'adjustmentSize');
      expect(sizeError).toBe('Adjustment size is required');
    });

    it('should reject zero adjustment size', () => {
      const errors = validateAdjustmentInput('96000', '0');
      const sizeError = getErrorMessage(errors, 'adjustmentSize');
      expect(sizeError).toBe('Adjustment size must be positive');
    });

    it('should reject negative adjustment size', () => {
      const errors = validateAdjustmentInput('96000', '-100');
      const sizeError = getErrorMessage(errors, 'adjustmentSize');
      expect(sizeError).toBe('Adjustment size must be positive');
    });

    it('should reject adjustment size exceeding $10M', () => {
      const errors = validateAdjustmentInput('96000', '10000001');
      const sizeError = getErrorMessage(errors, 'adjustmentSize');
      expect(sizeError).toBe('Adjustment size too large');
    });

    it('should accept valid adjustment size', () => {
      const errors = validateAdjustmentInput('96000', '1500');
      const sizeError = getErrorMessage(errors, 'adjustmentSize');
      expect(sizeError).toBeNull();
    });

    it('should accept large valid adjustment size', () => {
      const errors = validateAdjustmentInput('96000', '5000000');
      const sizeError = getErrorMessage(errors, 'adjustmentSize');
      expect(sizeError).toBeNull();
    });
  });

  describe('Valid Scenarios', () => {
    it('should accept user test case - adding to position', () => {
      // Adding $1500 at $96,000 to existing position
      const errors = validateAdjustmentInput('96000', '1500');
      expect(errors.length).toBe(0);
    });

    it('should accept adjustment with decimal values', () => {
      const errors = validateAdjustmentInput('96000.50', '1500.25');
      expect(errors.length).toBe(0);
    });

    it('should accept small adjustment', () => {
      const errors = validateAdjustmentInput('100', '1');
      expect(errors.length).toBe(0);
    });

    it('should accept large adjustment', () => {
      const errors = validateAdjustmentInput('100000', '9999999');
      expect(errors.length).toBe(0);
    });
  });

  describe('Multiple Errors', () => {
    it('should collect multiple errors', () => {
      const errors = validateAdjustmentInput('', '');
      expect(errors.length).toBe(2);
      expect(getErrorMessage(errors, 'newEntryPrice')).not.toBeNull();
      expect(getErrorMessage(errors, 'adjustmentSize')).not.toBeNull();
    });

    it('should collect errors for invalid values', () => {
      const errors = validateAdjustmentInput('invalid', 'invalid');
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

describe('getErrorMessage Helper', () => {
  it('should return null for non-existent field', () => {
    const errors: ValidationError[] = [];
    const message = getErrorMessage(errors, 'unknownField');
    expect(message).toBeNull();
  });

  it('should return message for matching field', () => {
    const errors: ValidationError[] = [{ field: 'entryPrice', message: 'Entry price is required' }];
    const message = getErrorMessage(errors, 'entryPrice');
    expect(message).toBe('Entry price is required');
  });

  it('should return first matching error for field with multiple messages', () => {
    const errors: ValidationError[] = [
      { field: 'leverage', message: 'Error 1' },
      { field: 'entryPrice', message: 'Entry price error' },
      { field: 'leverage', message: 'Error 2' },
    ];
    const message = getErrorMessage(errors, 'leverage');
    expect(message).toBe('Error 1');
  });

  it('should be case-sensitive', () => {
    const errors: ValidationError[] = [{ field: 'entryPrice', message: 'Test' }];
    expect(getErrorMessage(errors, 'entryPrice')).toBe('Test');
    expect(getErrorMessage(errors, 'entryprice')).toBeNull();
    expect(getErrorMessage(errors, 'ENTRYPRICE')).toBeNull();
  });
});
