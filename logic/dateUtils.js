function calculateNextDue(frequencyType, intervalday, customdays, completedDate) {
    const today = new Date(completedDate);
    let nextDue;
    
    if (frequencyType === 'daily') {
        // ✅ FIX: For daily habits, they should be due TODAY when first created
        // Only move to tomorrow AFTER completion
        nextDue = new Date(today);
        // Don't add a day - start from today
        
    } else if (frequencyType === 'interval') {
        // ✅ FIX: For interval habits, they should be due TODAY when first created
        // Only move forward by interval AFTER completion
        nextDue = new Date(today);
        // Don't add interval days - start from today
        
    } else if (frequencyType === 'custom_weekdays') {
        nextDue = getNextValidWeekday(today, customdays);
    }
    
    return nextDue.toISOString().split('T')[0];
}

function calculateNextDueAfterCompletion(frequencyType, intervalday, customdays, completedDate) {
    // ✅ NEW FUNCTION: Use this AFTER a habit is completed to calculate the NEXT due date
    const today = new Date(completedDate);
    let nextDue;
    
    if (frequencyType === 'daily') {
        nextDue = new Date(today);
        nextDue.setDate(today.getDate() + 1); // Tomorrow
        
    } else if (frequencyType === 'interval') {
        nextDue = new Date(today);
        nextDue.setDate(today.getDate() + parseInt(intervalday)); // Add interval
        
    } else if (frequencyType === 'custom_weekdays') {
        nextDue = getNextValidWeekdayAfterCompletion(today, customdays); // ✅ Use the new function
    }
    
    return nextDue.toISOString().split('T')[0];
}

function getNextValidWeekday(fromDate, customdays) {
    const weekdayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    const validDays = customdays.split(',').map(day => weekdayMap[day.trim().toLowerCase()]);
    const currentDate = new Date(fromDate);
    
    // Check if TODAY is a valid day first (only for initial creation, not after completion)
    const todayDayNumber = currentDate.getDay();
    if (validDays.includes(todayDayNumber)) {
        return currentDate;
    }
    
    // Start checking from tomorrow
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Find next valid weekday
    for (let i = 0; i < 7; i++) {
        const dayOfWeek = currentDate.getDay();
        if (validDays.includes(dayOfWeek)) {
            return currentDate;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return currentDate;
}

function getNextValidWeekdayAfterCompletion(fromDate, customdays) {
    // ✅ NEW FUNCTION: Always skip today and find the NEXT occurrence
    const weekdayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    const validDays = customdays.split(',').map(day => weekdayMap[day.trim().toLowerCase()]);
    const currentDate = new Date(fromDate);
    
    // Always start checking from tomorrow (skip today)
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Find next valid weekday
    for (let i = 0; i < 7; i++) {
        const dayOfWeek = currentDate.getDay();
        if (validDays.includes(dayOfWeek)) {
            return currentDate;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return currentDate;
}

function checkIfCustomWeekdaysStreakBroken(lastCompletionDate, todayDate, customdays) {
    // ✅ NEW FUNCTION: Check if any valid days were missed for custom weekdays
    const weekdayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    const validDays = customdays.split(',').map(day => weekdayMap[day.trim().toLowerCase()]);
    const lastDate = new Date(lastCompletionDate);
    const currentDate = new Date(todayDate);
    
    // Start checking from the day after last completion
    const checkDate = new Date(lastDate);
    checkDate.setDate(checkDate.getDate() + 1);
    
    // Check each day between last completion and today
    while (checkDate < currentDate) {
        const dayOfWeek = checkDate.getDay();
        
        // If we find a valid day that was missed, streak is broken
        if (validDays.includes(dayOfWeek)) {
            console.log(`Streak broken! Missed valid day: ${checkDate.toISOString().split('T')[0]} (${Object.keys(weekdayMap)[dayOfWeek]})`);
            return true;
        }
        
        checkDate.setDate(checkDate.getDate() + 1);
    }
    
    return false; // No valid days were missed
}

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
        // ✅ NEW: Pattern-based calculation for intervals
        return calculateIntervalPatternNextDue(habit, currentDate);
        
    } else if (habit.frequencyType === 'custom_weekdays') {
        return getNextValidWeekday(new Date(currentDate), habit.customdays).toISOString().split('T')[0];
    }
    
    return currentDate;
}

// ✅ NEW FUNCTION: Calculate next due based on creation pattern
function calculateIntervalPatternNextDue(habit, currentDate) {
    const startDate = new Date(habit.startDate);
    const current = new Date(currentDate);
    const intervalDays = parseInt(habit.intervalday);
    
    // Calculate days since creation
    const daysSinceStart = Math.floor((current - startDate) / (1000 * 60 * 60 * 24));
    
    // ✅ FIX: Check if today is already a pattern day
    if (daysSinceStart >= 0 && daysSinceStart % intervalDays === 0) {
        // Today IS a pattern day - check if completed
        const isCompletedToday = habit.completionHistory && 
            habit.completionHistory[habit.completionHistory.length - 1] === currentDate;
        
        if (isCompletedToday) {
            // Already completed today, next due is in intervalDays
            const nextDueDate = new Date(current);
            nextDueDate.setDate(current.getDate() + intervalDays);
            return nextDueDate.toISOString().split('T')[0];
        } else {
            // Not completed yet, due TODAY
            return currentDate;
        }
    }
    
    // ✅ FIX: Find the next pattern day from start date
    let nextPatternDay = intervalDays; // Start with first interval
    while (nextPatternDay <= daysSinceStart) {
        nextPatternDay += intervalDays;
    }
    
    // Calculate the actual date
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
    calculateIntervalPatternNextDue  // ✅ ADD THIS
};