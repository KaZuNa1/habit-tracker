class Habit{
    constructor(id, title, frequencyType, intervalday, customdays, counter, incrementation, projectId, lastCompleted, nextDue, isActiveToday, currentStreak, totalCompleted, completionHistory, isActive, createdDate, notes, priority, startDate){
        this.id = id;
        this.title = title;
        this.frequencyType = frequencyType;
        this.intervalday = intervalday;
        this.customdays = customdays;
        this.counter = counter;
        this.incrementation = incrementation;
        this.projectId = projectId;
        this.lastCompleted = lastCompleted;
        this.nextDue = nextDue;
        this.isActiveToday = isActiveToday;
        this.currentStreak = currentStreak;
        this.totalCompleted = totalCompleted;
        this.completionHistory = completionHistory;
        this.isActive = isActive;
        this.createdDate = createdDate;
        this.notes = notes;
         console.log('Habit constructor received notes:', notes); 
        this.priority = priority;
        this.startDate = startDate;  // ✅ NEW: When habit should start being active
    }
    info() {
    let displayInfo = `
        <strong>${this.title}</strong><br>
        Project: ${this.projectId}<br>
        Frequency: ${this.getFrequencyDisplay()}<br>
    `;
    
    // Conditionally add counter info
    if (this.counter !== 0 || this.incrementation !== 0) {
        displayInfo += `Counter: ${this.counter} (+${this.incrementation})<br>`;
    }
    
    displayInfo += `
        Start Date: ${this.startDate}<br>
        Last Completed: ${this.lastCompleted || 'Never'}<br>
        Next Due: ${this.nextDue}<br>
        Current Streak: ${this.currentStreak}<br>
        Total Completed: ${this.totalCompleted}<br>
        Created: ${this.createdDate}<br>
    `;
    
    // Conditionally add notes
    if (this.notes && this.notes.trim() !== '') {
        displayInfo += `Notes: ${this.notes}<br>`;
    }
    
    displayInfo += `Priority: ${this.priority}<br>`;
    
    return displayInfo;
}

// Add this new helper method for frequency display
getFrequencyDisplay() {
    if (this.frequencyType === 'daily') {
        return 'Daily';
    } else if (this.frequencyType === 'interval') {
        return `Every ${this.intervalday} days`;
    } else if (this.frequencyType === 'custom_weekdays') {
        if (this.customdays) {
            // Convert comma-separated days to readable format
            const days = this.customdays.split(',')
                .map(day => day.charAt(0).toUpperCase() + day.slice(1))
                .join(', ');
            return `Custom: ${days}`;
        }
        return 'Custom weekdays';
    }
    return this.frequencyType;
}
}

module.exports = Habit;