const Habit = require('./habit');
const { saveHabit } = require('./storage');
const { calculateNextDue } = require('./dateUtils'); // ✅ Import

function createHabit(id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId = "default") {
    const today = new Date().toISOString().split('T')[0];
    
    const nextDue = calculateNextDue(frequencyType, intervalday, customdays, today);
    
    const newHabit = new Habit(
        id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId,
        null, nextDue, true, 0, 0, [], true, today, "", "medium"
    );
    
    saveHabit(newHabit);
    return newHabit;
}

module.exports = { createHabit };