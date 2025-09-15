const _ = require('lodash');

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function formatUserData(users) {
  return users.map(user => ({
    ...user,
    displayName: _.capitalize(user.name),
    isValidEmail: validateEmail(user.email)
  }));
}

function calculateStats(data) {
  return {
    total: data.length,
    average: _.meanBy(data, 'value'),
    max: _.maxBy(data, 'value'),
    min: _.minBy(data, 'value')
  };
}

module.exports = {
  validateEmail,
  formatUserData,
  calculateStats
};