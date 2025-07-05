const Habit = require('./habit');
const { saveHabit } = require('./storage');
const { calculateNextDue } = require('./dateUtils');

function createHabit(id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId = "default", startDate = null) {
    const today = new Date().toISOString().split('T')[0];
    
    // ✅ NEW: Use provided startDate or default to today
    const habitStartDate = startDate || today;
    
    // ✅ NEW: Calculate nextDue based on start date (not today)
    const nextDue = calculateNextDue(frequencyType, intervalday, customdays, habitStartDate);
    
    const newHabit = new Habit(
        id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId,
        null, nextDue, true, 0, 0, [], true, today, "", "medium", habitStartDate  // ✅ NEW: Added startDate parameter
    );
    
    saveHabit(newHabit);
    return newHabit;
}

module.exports = { createHabit };