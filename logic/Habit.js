/**
 * Habit class representing a single habit with all its properties and methods
 */
class Habit {
    /**
     * Creates a new Habit instance
     * @param {number} id - Unique identifier
     * @param {string} title - Habit title
     * @param {string} frequencyType - Type of frequency ('daily', 'interval', 'custom_weekdays')
     * @param {number|null} intervalday - Days between repetitions for interval type
     * @param {string} customdays - Comma-separated weekdays for custom frequency
     * @param {number} counter - Current counter value
     * @param {number} incrementation - Amount to increment counter by
     * @param {string} projectId - Project category
     * @param {string|null} lastCompleted - Last completion date
     * @param {string|null} nextDue - Next due date
     * @param {boolean} isActiveToday - Whether habit is active today
     * @param {number} currentStreak - Current streak count
     * @param {number} totalCompleted - Total times completed
     * @param {Array<string>} completionHistory - Array of completion dates
     * @param {boolean} isActive - Whether habit is active
     * @param {string} createdDate - Creation date
     * @param {string} notes - Optional notes
     * @param {string} belongs - Column assignment
     * @param {string} startDate - When habit should start being active
     * @param {string} color - Visual color theme
     * @param {number} columnIndex - Position within column
     */
    constructor(
        id, 
        title, 
        frequencyType, 
        intervalday, 
        customdays, 
        counter, 
        incrementation, 
        projectId, 
        lastCompleted, 
        nextDue, 
        isActiveToday, 
        currentStreak, 
        totalCompleted, 
        completionHistory, 
        isActive, 
        createdDate, 
        notes, 
        belongs, 
        startDate, 
        color, 
        columnIndex
    ) {
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
        this.belongs = belongs || 'whole day';
        this.startDate = startDate;
        this.color = color || 'default';
        this.columnIndex = columnIndex || 999;
    }

    /**
     * Generates HTML display information for the habit
     * @returns {string} HTML string with habit information
     */
    info() {
        let displayInfo = `
            <strong>${this.title}</strong><br>
            Project: ${this.projectId}<br>
            Frequency: ${this.getFrequencyDisplay()}<br>
        `;
        
        // Add counter info if enabled
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
        
        // Add notes if present
        if (this.notes && this.notes.trim() !== '') {
            displayInfo += `Notes: ${this.notes}<br>`;
        }
        
        displayInfo += `Belongs to: ${this.belongs}<br>`;
        
        return displayInfo;
    }

    /**
     * Returns a human-readable frequency description
     * @returns {string} Formatted frequency display text
     */
    getFrequencyDisplay() {
        if (this.frequencyType === 'daily') {
            return 'Daily';
        } else if (this.frequencyType === 'interval') {
            return `Every ${this.intervalday} days`;
        } else if (this.frequencyType === 'custom_weekdays') {
            if (this.customdays) {
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