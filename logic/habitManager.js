const Habit = require('./Habit');
const { saveHabit, readHabits } = require('./storage');
const { calculateNextDue } = require('./dateUtils');

/**
 * Creates a new habit with proper column positioning and saves it to storage
 * @param {number} id - Unique identifier for the habit
 * @param {string} title - Display name for the habit
 * @param {string} frequencyType - Type of frequency ('daily', 'interval', 'custom_weekdays')
 * @param {number|null} intervalday - Days between repetitions for interval type
 * @param {string} customdays - Comma-separated weekdays for custom frequency
 * @param {number} counter - Starting counter value
 * @param {number} incrementation - Amount to increment counter by
 * @param {string} projectId - Project category (defaults to "default")
 * @param {string|null} startDate - When habit should start (defaults to today)
 * @param {string} notes - Optional notes for the habit
 * @param {string} color - Visual color theme (defaults to "default")
 * @param {string} belongs - Column assignment (defaults to "whole day")
 * @returns {Habit} The created habit instance
 */
function createHabit(
    id, 
    title, 
    frequencyType, 
    intervalday, 
    customdays, 
    counter, 
    incrementation, 
    projectId = "default", 
    startDate = null, 
    notes = "", 
    color = "default", 
    belongs = "whole day"
) {
    const today = new Date().toISOString().split('T')[0];
    const habitStartDate = startDate || today;
    const nextDue = calculateNextDue(frequencyType, intervalday, customdays, habitStartDate);
    
    // Calculate column position - place new habit at bottom of target column
    const existingHabits = readHabits();
    const sameColumnHabits = existingHabits.filter(h => h.belongs === belongs);
    const maxIndex = sameColumnHabits.length > 0 
        ? Math.max(...sameColumnHabits.map(h => h.columnIndex || 0))
        : 0;
    const newColumnIndex = maxIndex + 1;
    
    const newHabit = new Habit(
        id, 
        title, 
        frequencyType, 
        intervalday, 
        customdays, 
        counter, 
        incrementation, 
        projectId,
        null, // lastCompleted
        nextDue, 
        true, // isActiveToday
        0, // currentStreak
        0, // totalCompleted
        [], // completionHistory
        true, // isActive
        today, // createdDate
        notes, 
        belongs, 
        habitStartDate, 
        color, 
        newColumnIndex
    );
    
    saveHabit(newHabit);
    return newHabit;
}

module.exports = { createHabit };