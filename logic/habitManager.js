const Habit = require('./Habit');
const { saveHabit } = require('./storage');
const { calculateNextDue } = require('./dateUtils');

function createHabit(id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId = "default", startDate = null, notes = "", color = "default", belongs = "whole day") {
    const today = new Date().toISOString().split('T')[0];
    
    const habitStartDate = startDate || today;
    const nextDue = calculateNextDue(frequencyType, intervalday, customdays, habitStartDate);
    
    const newHabit = new Habit(
        id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId,
        null, nextDue, true, 0, 0, [], true, today, notes, belongs, habitStartDate, color  // ✅ CHANGE "medium" to belongs
    );
    
    saveHabit(newHabit);
    return newHabit;
}
module.exports = { createHabit };