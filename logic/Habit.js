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
    return `ID: ${this.id}<br>Title: ${this.title}<br>Project: ${this.projectId}<br>Frequency: ${this.frequencyType}<br>Interval Day: ${this.intervalday}<br>Custom Days: ${this.customdays}<br>Counter: ${this.counter}<br>Incrementation: ${this.incrementation}<br>Start Date: ${this.startDate}<br>Last Completed: ${this.lastCompleted || 'Never'}<br>Next Due: ${this.nextDue}<br>Active Today: ${this.isActiveToday}<br>Current Streak: ${this.currentStreak}<br>Total Completed: ${this.totalCompleted}<br>Completion History: ${this.completionHistory.length} entries<br>Is Active: ${this.isActive}<br>Created: ${this.createdDate}<br>Notes: ${this.notes || 'No notes'}<br>Priority: ${this.priority}`;
}
}

module.exports = Habit;