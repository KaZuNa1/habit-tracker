const Habit = require('./habit');
const { saveHabit } = require('./storage');
const { calculateNextDue } = require('./dateUtils');

function createHabit(id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId = "default", startDate = null, notes = "") {
    const today = new Date().toISOString().split('T')[0];
    
    // Use provided startDate or default to today
    const habitStartDate = startDate || today;
    
    // Calculate nextDue based on start date (not today)
    const nextDue = calculateNextDue(frequencyType, intervalday, customdays, habitStartDate);
    
    const newHabit = new Habit(
        id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId,
        null, nextDue, true, 0, 0, [], true, today, notes, "medium", habitStartDate  // ✅ Changed "" to notes
    );
    
    saveHabit(newHabit);
    return newHabit;
}
module.exports = { createHabit };