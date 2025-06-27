// habitmanager.js

const Habit = require('./Habit');
const { saveHabit } = require('./storage');


function createHabit(id, title, frequencyType, counter, incrementation, customdays, intervalday) {
  const newHabit = new Habit(id, title, frequencyType, counter, incrementation, customdays, intervalday);
  saveHabit(newHabit);
  return newHabit;
}


module.exports = {
  createHabit
};

