/**
 * Calculates the initial next due date for a new habit
 * @param {string} frequencyType - Type of frequency ('daily', 'interval', 'custom_weekdays')
 * @param {number} intervalday - Days between repetitions for interval type
 * @param {string} customdays - Comma-separated weekdays for custom frequency
 * @param {string} completedDate - Start date for the habit
 * @returns {string} Next due date in YYYY-MM-DD format
 */
function calculateNextDue(frequencyType, intervalday, customdays, completedDate) {
    const today = new Date(completedDate);
    let nextDue;
    
    if (frequencyType === 'daily') {
        // Daily habits start due today
        nextDue = new Date(today);
    } else if (frequencyType === 'interval') {
        // Interval habits start due today
        nextDue = new Date(today);
    } else if (frequencyType === 'custom_weekdays') {
        nextDue = getNextValidWeekday(today, customdays);
    }
    
    return nextDue.toISOString().split('T')[0];
}

/**
 * Calculates next due date after habit completion
 * @param {string} frequencyType - Type of frequency
 * @param {number} intervalday - Days between repetitions
 * @param {string} customdays - Comma-separated weekdays
 * @param {string} completedDate - Date when habit was completed
 * @returns {string} Next due date in YYYY-MM-DD format
 */
function calculateNextDueAfterCompletion(frequencyType, intervalday, customdays, completedDate) {
    const today = new Date(completedDate);
    let nextDue;
    
    if (frequencyType === 'daily') {
        nextDue = new Date(today);
        nextDue.setDate(today.getDate() + 1);
    } else if (frequencyType === 'interval') {
        nextDue = new Date(today);
        nextDue.setDate(today.getDate() + parseInt(intervalday));
    } else if (frequencyType === 'custom_weekdays') {
        nextDue = getNextValidWeekdayAfterCompletion(today, customdays);
    }
    
    return nextDue.toISOString().split('T')[0];
}

/**
 * Finds the next valid weekday for custom frequency habits (initial creation)
 * @param {Date} fromDate - Starting date
 * @param {string} customdays - Comma-separated weekdays
 * @returns {Date} Next valid date
 */
function getNextValidWeekday(fromDate, customdays) {
    const weekdayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    const validDays = customdays.split(',').map(day => weekdayMap[day.trim().toLowerCase()]);
    const currentDate = new Date(fromDate);
    
    // Check if today is a valid day first
    const todayDayNumber = currentDate.getDay();
    if (validDays.includes(todayDayNumber)) {
        return currentDate;
    }
    
    // Find next valid weekday starting tomorrow
    currentDate.setDate(currentDate.getDate() + 1);
    
    for (let i = 0; i < 7; i++) {
        const dayOfWeek = currentDate.getDay();
        if (validDays.includes(dayOfWeek)) {
            return currentDate;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return currentDate;
}

/**
 * Finds the next valid weekday after habit completion (skips today)
 * @param {Date} fromDate - Completion date
 * @param {string} customdays - Comma-separated weekdays
 * @returns {Date} Next valid date
 */
function getNextValidWeekdayAfterCompletion(fromDate, customdays) {
    const weekdayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    const validDays = customdays.split(',').map(day => weekdayMap[day.trim().toLowerCase()]);
    const currentDate = new Date(fromDate);
    
    // Always start checking from tomorrow
    currentDate.setDate(currentDate.getDate() + 1);
    
    for (let i = 0; i < 7; i++) {
        const dayOfWeek = currentDate.getDay();
        if (validDays.includes(dayOfWeek)) {
            return currentDate;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return currentDate;
}

/**
 * Checks if streak is broken for custom weekday habits
 * @param {string} lastCompletionDate - Last completion date
 * @param {string} todayDate - Current date
 * @param {string} customdays - Comma-separated weekdays
 * @returns {boolean} True if streak is broken
 */
function checkIfCustomWeekdaysStreakBroken(lastCompletionDate, todayDate, customdays) {
    const weekdayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    const validDays = customdays.split(',').map(day => weekdayMap[day.trim().toLowerCase()]);
    const lastDate = new Date(lastCompletionDate);
    const currentDate = new Date(todayDate);
    
    // Check each day between last completion and today
    const checkDate = new Date(lastDate);
    checkDate.setDate(checkDate.getDate() + 1);
    
    while (checkDate < currentDate) {
        const dayOfWeek = checkDate.getDay();
        
        if (validDays.includes(dayOfWeek)) {
            return true; // Valid day was missed
        }
        
        checkDate.setDate(checkDate.getDate() + 1);
    }
    
    return false;
}

/**
 * Recalculates next due date from habit start date
 * @param {Object} habit - Habit object
 * @param {string} currentDate - Current date
 * @returns {string} Next due date
 */
function recalculateNextDueFromStart(habit, currentDate) {
    if (currentDate < habit.startDate) {
        return habit.startDate;
    }
    
    if (habit.frequencyType === 'daily') {
        const isCompletedToday = habit.completionHistory && 
            habit.completionHistory[habit.completionHistory.length - 1] === currentDate;
        
        if (isCompletedToday) {
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        } else {
            return currentDate;
        }
        
    } else if (habit.frequencyType === 'interval') {
        return calculateIntervalPatternNextDue(habit, currentDate);
        
    } else if (habit.frequencyType === 'custom_weekdays') {
        return getNextValidWeekday(new Date(currentDate), habit.customdays).toISOString().split('T')[0];
    }
    
    return currentDate;
}

/**
 * Calculates next due date for interval habits based on pattern from start date
 * @param {Object} habit - Habit object with startDate and intervalday
 * @param {string} currentDate - Current date
 * @returns {string} Next due date in YYYY-MM-DD format
 */
function calculateIntervalPatternNextDue(habit, currentDate) {
    const startDate = new Date(habit.startDate);
    const current = new Date(currentDate);
    const intervalDays = parseInt(habit.intervalday);
    
    const daysSinceStart = Math.floor((current - startDate) / (1000 * 60 * 60 * 24));
    
    // Check if today is a pattern day
    if (daysSinceStart >= 0 && daysSinceStart % intervalDays === 0) {
        const isCompletedToday = habit.completionHistory && 
            habit.completionHistory[habit.completionHistory.length - 1] === currentDate;
        
        if (isCompletedToday) {
            // Already completed, next due is in intervalDays
            const nextDueDate = new Date(current);
            nextDueDate.setDate(current.getDate() + intervalDays);
            return nextDueDate.toISOString().split('T')[0];
        } else {
            // Due today
            return currentDate;
        }
    }
    
    // Find next pattern day
    let nextPatternDay = intervalDays;
    while (nextPatternDay <= daysSinceStart) {
        nextPatternDay += intervalDays;
    }
    
    const nextDueDate = new Date(startDate);
    nextDueDate.setDate(startDate.getDate() + nextPatternDay);
    
    return nextDueDate.toISOString().split('T')[0];
}

module.exports = {
    calculateNextDue,
    calculateNextDueAfterCompletion,
    getNextValidWeekday,
    getNextValidWeekdayAfterCompletion,
    checkIfCustomWeekdaysStreakBroken,
    recalculateNextDueFromStart,
    calculateIntervalPatternNextDue
};