const Habit = require('./habit');
const { saveHabit } = require('./storage');

function createHabit(id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId = "default") {
    const today = new Date().toISOString().split('T')[0];
    
    const newHabit = new Habit(
        id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId,
        null,           // lastCompleted
        today,          // nextDue
        true,           // isActiveToday
        0,              // currentStreak
        0,              // totalCompleted
        [],             // completionHistory
        true,           // isActive
        today,          // createdDate
        "",             // notes
        "medium"        // priority
    );
    
    saveHabit(newHabit);
    return newHabit;
}

module.exports = {
    createHabit
};