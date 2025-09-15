const { validateEmail, formatUserData, calculateStats } = require('../src/utils');

describe('Utils', () => {
  describe('validateEmail', () => {
    test('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    test('should reject invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });

  describe('formatUserData', () => {
    test('should format user data correctly', () => {
      const users = [
        { id: 1, name: 'john doe', email: 'john@example.com' }
      ];
      const formatted = formatUserData(users);

      expect(formatted[0].displayName).toBe('John doe');
      expect(formatted[0].isValidEmail).toBe(true);
    });
  });

  describe('calculateStats', () => {
    test('should calculate statistics correctly', () => {
      const data = [
        { value: 10 },
        { value: 20 },
        { value: 30 }
      ];
      const stats = calculateStats(data);

      expect(stats.total).toBe(3);
      expect(stats.average).toBe(20);
    });
  });
});