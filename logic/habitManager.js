const Habit = require('./Habit');
const { saveHabit } = require('./storage');
const { calculateNextDue } = require('./dateUtils');

function createHabit(id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId = "default", startDate = null, notes = "", color = "default", belongs = "whole day") {
    const today = new Date().toISOString().split('T')[0];
    
    const habitStartDate = startDate || today;
    const nextDue = calculateNextDue(frequencyType, intervalday, customdays, habitStartDate);
    
    // ✅ FIX: Calculate columnIndex for new habit (put at bottom of column)
    const { readHabits } = require('./storage');
    const existingHabits = readHabits();
    const sameColumnHabits = existingHabits.filter(h => h.belongs === belongs);
    const maxIndex = sameColumnHabits.length > 0 
        ? Math.max(...sameColumnHabits.map(h => h.columnIndex || 0))
        : 0;
    const newColumnIndex = maxIndex + 1;
    
    const newHabit = new Habit(
        id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId,
        null, nextDue, true, 0, 0, [], true, today, notes, belongs, habitStartDate, color, newColumnIndex  // ✅ Add columnIndex
    );
    
    saveHabit(newHabit);
    return newHabit;
}
module.exports = { createHabit };