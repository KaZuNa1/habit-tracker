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

module.exports = {
    calculateNextDue,
    calculateNextDueAfterCompletion,
    getNextValidWeekday,
    getNextValidWeekdayAfterCompletion,
    checkIfCustomWeekdaysStreakBroken  // ✅ Export the new function
};