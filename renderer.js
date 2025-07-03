// ===== IMPORTS =====
const { createHabit } = require('./logic/habitManager');
const { readHabits, removeHabit, writeHabits } = require('./logic/storage'); // ✅ Add writeHabits

// ===== DOM ELEMENTS =====
const showFormButton = document.getElementById('createHabitButton');
const form = document.getElementById('habitForm');
const freqInput = document.getElementById('freqInput');
const displayArea = document.getElementById('habitDisplayArea');
const counter_checkbox = document.getElementById('counter_checkbox');

// Form sections
const dailySection = document.getElementById('daily_sec');
const intervalSection = document.getElementById('intervalday_section');
const customSection = document.getElementById('custom_weekdays_section');
const counter_section = document.getElementById('counter_section');

// ===== HELPER FUNCTIONS =====
function hideAllFrequencySections() {
    dailySection.style.display = 'none';
    intervalSection.style.display = 'none';
    customSection.style.display = 'none';
}

function hideAllConditionalSections() {  // ✅ Add this new function
    hideAllFrequencySections();
    counter_section.style.display = 'none';
}

function showSection(section) {
    section.style.display = 'block';
}

function getSelectedWeekdays() {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const selected = [];
    
    weekdays.forEach(day => {
        const checkbox = document.getElementById(day);
        if (checkbox && checkbox.checked) {
            selected.push(day);
        }
    });
    
    return selected.join(','); // Returns "monday,wednesday,friday"
}

// Handle marking habit as complete
function undoHabitCompletion(habit) {
    const today = new Date().toISOString().split('T')[0];
    
    // Remove today from completion history
    const updatedHistory = habit.completionHistory.filter(date => date !== today);
    
    // Revert counter
    const revertedCounter = habit.counter - habit.incrementation;
    
    // Decrease total completed
    const revertedTotal = Math.max(0, habit.totalCompleted - 1);
    
    // ✅ CRITICAL FIX: Don't recalculate streak, restore the PREVIOUS streak value
    let revertedStreak;
    
    // Check if this was the first completion after a streak break
    if (habit.currentStreak === 1 && updatedHistory.length > 0) {
        // This might have been the first completion after a break
        // Check if there was a gap before this completion
        const lastCompletion = updatedHistory[updatedHistory.length - 1];
        const lastDate = new Date(lastCompletion);
        const todayDate = new Date(today);
        const daysSinceLastCompletion = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        
        // Determine if there was a streak-breaking gap
        let gapBreaksStreak = false;
        if (habit.frequencyType === 'daily') {
            gapBreaksStreak = daysSinceLastCompletion > 1;
        } else if (habit.frequencyType === 'interval') {
            const maxAllowedGap = parseInt(habit.intervalday) + 1;
            gapBreaksStreak = daysSinceLastCompletion > maxAllowedGap;
        }
        
        if (gapBreaksStreak) {
            // This was indeed the first completion after a break
            revertedStreak = 0; // Revert to broken state
        } else {
            // This was a normal continuation, calculate previous streak
            revertedStreak = Math.max(0, habit.currentStreak - 1);
        }
    } else {
        // Normal case: just subtract 1 from current streak
        revertedStreak = Math.max(0, habit.currentStreak - 1);
    }
    
    console.log(`Reverting streak from ${habit.currentStreak} to ${revertedStreak}`);
    
    // Reset nextDue
    const revertedNextDue = today;
    
    const revertedHabit = {
        ...habit,
        counter: revertedCounter,
        totalCompleted: revertedTotal,
        completionHistory: updatedHistory,
        currentStreak: revertedStreak,  // ✅ Use our logic, not calculateStreak()
        lastCompleted: updatedHistory.length > 0 ? updatedHistory[updatedHistory.length - 1] : null,
        nextDue: revertedNextDue,
        isActiveToday: true
    };
    
    updateHabitInStorage(revertedHabit);
    
    console.log(`Habit undone! Counter: ${habit.counter} → ${revertedCounter}, Streak: ${habit.currentStreak} → ${revertedStreak}`);
}

function updateHabitInStorage(updatedHabit) {
    // 1. Read all current habits
    const allHabits = readHabits();
    
    // 2. Find and replace the updated habit
    const updatedHabits = allHabits.map(habit => {
        if (habit.id === updatedHabit.id) {
            return updatedHabit; // Replace with updated version
        }
        return habit; // Keep unchanged
    });
    
    // 3. Save back to storage
    writeHabits(updatedHabits);
}

function updateHabitProgress(habit) {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('=== updateHabitProgress called ===');
    console.log('Input habit currentStreak:', habit.currentStreak);
    console.log('Input habit counter:', habit.counter);
    
    // 1. Update counter
    const newCounter = parseInt(habit.counter) + parseInt(habit.incrementation);
    console.log('New counter calculated:', newCounter);
    
    // 2. Update completion tracking  
    const newTotalCompleted = habit.totalCompleted + 1;
    const newCompletionHistory = [...habit.completionHistory, today];
    console.log('New total completed:', newTotalCompleted);
    
    // 3. ✅ PROPER STREAK LOGIC
    let newStreak;
    if (habit.currentStreak === 0) {
        // Streak was broken - start fresh at 1
        newStreak = 1;
        console.log('Streak was broken, starting fresh at 1');
    } else {
        // Streak is active - calculate normally
        newStreak = calculateStreak(
            habit.completionHistory, 
            today, 
            habit.nextDue, 
            habit.frequencyType,
            habit.intervalday,
            habit.customdays
        );
        console.log('Continuing existing streak:', newStreak);
    }
    
    // 4. Calculate next due date
    const newNextDue = calculateNextDue(habit.frequencyType, habit.intervalday, habit.customdays, today);
    console.log('New next due:', newNextDue);
    
    // 5. Create updated habit
    const updatedHabit = {
        ...habit,
        counter: newCounter,
        totalCompleted: newTotalCompleted,
        completionHistory: newCompletionHistory,
        currentStreak: newStreak,
        lastCompleted: today,
        nextDue: newNextDue,
        isActiveToday: false
    };
    
    console.log('Updated habit object:', updatedHabit);
    
    // 6. Save to storage
    updateHabitInStorage(updatedHabit);
    
    console.log(`Habit completed! Counter: ${habit.counter} → ${newCounter}, Streak: ${habit.currentStreak} → ${newStreak}`);
    console.log('=== updateHabitProgress end ===');
}

function calculateNextDue(frequencyType, intervalday, customdays, completedDate) {
    const today = new Date(completedDate);
    let nextDue;
    
    if (frequencyType === 'daily') {
        // Next due: tomorrow
        nextDue = new Date(today);
        nextDue.setDate(today.getDate() + 1);
        
    } else if (frequencyType === 'interval') {
        // Next due: today + interval days
        nextDue = new Date(today);
        nextDue.setDate(today.getDate() + parseInt(intervalday));
        
    } else if (frequencyType === 'custom_weekdays') {
        // Next due: next valid weekday
        nextDue = getNextValidWeekday(today, customdays);
    }
    
    return nextDue.toISOString().split('T')[0]; // Return as "2025-06-30" format
}
function getNextValidWeekday(fromDate, customdays) {
    const weekdayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
    };
    
    const validDays = customdays.split(',').map(day => weekdayMap[day.trim()]);
    const currentDate = new Date(fromDate);
    
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
    
    return currentDate; // Fallback
}

function calculateStreak(completionHistory, todayDate, lastDueDate, frequencyType = 'daily', intervalday = 1, customdays = '') {
    if (completionHistory.length === 0) {
        return 1; // First completion
    }
    
    // Add today to history for calculation
    const allCompletions = [...completionHistory, todayDate];
    allCompletions.sort();
    
    let streak = 1; // Today counts as 1
    
    // Work backwards checking proper intervals based on frequency type
    for (let i = allCompletions.length - 2; i >= 0; i--) {
        const currentDate = new Date(allCompletions[i + 1]);
        const previousDate = new Date(allCompletions[i]);
        
        const daysDifference = Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24));
        
        let expectedGap = 1; // Default for daily
        
        if (frequencyType === 'interval') {
            expectedGap = parseInt(intervalday); // Every X days
        } else if (frequencyType === 'custom_weekdays') {
            expectedGap = 1; // Simplified for now
        }
        
        // Check if gap matches expected frequency (allow some flexibility)
        if (daysDifference <= expectedGap + 1) { // Allow 1 day late
            streak++;
        } else {
            // Gap too large - streak breaks
            break;
        }
    }
    
    return streak;
}

function getPreviousStreak(completionHistory) {
    // For now, return the count of recent consecutive completions
    // This is a simplified version - we can make it smarter later
    return completionHistory.length;
}

function openEditModal(habit) {
    console.log('Opening edit modal for:', habit.title);
    showEditForm(habit);  // ✅ Add this line
}

function showEditForm(habit) {
    // Create modal overlay (dark background)
    const modal = document.createElement('div');
    modal.id = 'editModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    // Create modal content (the form container)
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background-color: white;
        padding: 20px;
        border-radius: 5px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    `;

    // Create the EXACT same form as create form (but with different IDs)
    modalContent.innerHTML = `
        <h2>Edit Habit</h2>
        
        <label for="editTitle">Habit Title:</label>
        <input type="text" id="editTitle" value="${habit.title}" required />
        <br><br>

        <label for="editFreq">Frequency Type:</label>
        <select id="editFreq" required>
            <option value="">-- Select Frequency --</option>
            <option value="daily" ${habit.frequencyType === 'daily' ? 'selected' : ''}>Daily</option>
            <option value="interval" ${habit.frequencyType === 'interval' ? 'selected' : ''}>Interval</option>
            <option value="custom_weekdays" ${habit.frequencyType === 'custom_weekdays' ? 'selected' : ''}>Custom Weekdays</option>
        </select>
        <br><br>

        <!-- Daily Section (Hidden by default) -->
        <div id="editDailySection" style="display: none;">
            <p>Daily habit - no additional settings needed</p>
        </div>

        <!-- Interval Section (Hidden by default) -->
        <div id="editIntervalSection" style="display: none;">
            <label for="editIntervalDay">Every how many days?</label>
            <input type="number" id="editIntervalDay" value="${habit.intervalday || 1}" min="1">
            <br><br>
        </div>

        <!-- Custom Weekdays Section (Hidden by default) -->
        <div id="editCustomSection" style="display: none;">
            <label>Select weekdays:</label><br>
            <input type="checkbox" id="editMonday" value="monday"> Monday<br>
            <input type="checkbox" id="editTuesday" value="tuesday"> Tuesday<br>
            <input type="checkbox" id="editWednesday" value="wednesday"> Wednesday<br>
            <input type="checkbox" id="editThursday" value="thursday"> Thursday<br>
            <input type="checkbox" id="editFriday" value="friday"> Friday<br>
            <input type="checkbox" id="editSaturday" value="saturday"> Saturday<br>
            <input type="checkbox" id="editSunday" value="sunday"> Sunday<br>
            <br>
        </div>

        <!-- Counter Section -->
        <label for="editCounterCheckbox">Need Counter?</label>
        <input type="checkbox" id="editCounterCheckbox" ${habit.counter !== 0 || habit.incrementation !== 0 ? 'checked' : ''}>
        <br><br>

        <div id="editCounterInputSection" style="display: ${habit.counter !== 0 || habit.incrementation !== 0 ? 'block' : 'none'};">
            <label for="editCounter">Starting Number:</label>
            <input type="number" id="editCounter" value="${habit.counter}">
            <br><br>
            <label for="editIncrementation">Increment By:</label>
            <input type="number" id="editIncrementation" value="${habit.incrementation}">
            <br><br>
        </div>

        <button type="button" id="saveEditBtn">Save Changes</button>
        <button type="button" id="cancelEditBtn">Cancel</button>
    `;

    // Add modal to page
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // PRE-SELECT AND SHOW THE CURRENT FREQUENCY SECTION
    showEditFrequencySection(habit.frequencyType);
    preSelectCustomDays(habit.customdays);

    // ADD THE SAME EVENT LISTENERS AS CREATE FORM
    setupEditFormEventListeners();

    // Add save/cancel listeners
    document.getElementById('saveEditBtn').onclick = () => saveEditedHabit(habit);
    document.getElementById('cancelEditBtn').onclick = () => closeEditModal();
    
    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeEditModal();
        }
    };
}

// Show the correct frequency section based on current habit
function showEditFrequencySection(frequencyType) {
    // Hide all sections first
    document.getElementById('editDailySection').style.display = 'none';
    document.getElementById('editIntervalSection').style.display = 'none';
    document.getElementById('editCustomSection').style.display = 'none';
    
    // Show the current frequency section
    if (frequencyType === 'daily') {
        document.getElementById('editDailySection').style.display = 'block';
    } else if (frequencyType === 'interval') {
        document.getElementById('editIntervalSection').style.display = 'block';
    } else if (frequencyType === 'custom_weekdays') {
        document.getElementById('editCustomSection').style.display = 'block';
    }
}

// Pre-select the custom weekdays checkboxes
function preSelectCustomDays(customdays) {
    if (!customdays) return;
    
    const days = customdays.split(',');
    days.forEach(day => {
        const checkbox = document.getElementById('edit' + day.charAt(0).toUpperCase() + day.slice(1));
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

// Set up all event listeners for edit form (same logic as create form)
function setupEditFormEventListeners() {
    // Frequency change handler
    document.getElementById('editFreq').addEventListener('change', function() {
        const selectedValue = this.value;
        
        // Hide all sections first
        document.getElementById('editDailySection').style.display = 'none';
        document.getElementById('editIntervalSection').style.display = 'none';
        document.getElementById('editCustomSection').style.display = 'none';
        
        // Show relevant section
        if (selectedValue === 'daily') {
            document.getElementById('editDailySection').style.display = 'block';
        } else if (selectedValue === 'interval') {
            document.getElementById('editIntervalSection').style.display = 'block';
        } else if (selectedValue === 'custom_weekdays') {
            document.getElementById('editCustomSection').style.display = 'block';
        }
    });
    
    // Counter checkbox handler
    document.getElementById('editCounterCheckbox').addEventListener('change', function() {
        const counterSection = document.getElementById('editCounterInputSection');
        if (this.checked) {
            counterSection.style.display = 'block';
        } else {
            counterSection.style.display = 'none';
        }
    });
}

// Get selected weekdays from edit form (same as create form)
function getSelectedEditWeekdays() {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const selected = [];
    
    weekdays.forEach(day => {
        const checkbox = document.getElementById('edit' + day.charAt(0).toUpperCase() + day.slice(1));
        if (checkbox && checkbox.checked) {
            selected.push(day);
        }
    });
    
    return selected.join(',');
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.remove();
    }
}

function saveEditedHabit(originalHabit) {
    // Collect basic values
    const newTitle = document.getElementById('editTitle').value;
    const newFreq = document.getElementById('editFreq').value;
    
    // Collect frequency-specific values (same logic as create form)
    let newIntervalday = null;
    let newCustomdays = '';
    
    if (newFreq === 'interval') {
        newIntervalday = parseInt(document.getElementById('editIntervalDay').value) || 1;
        if (newIntervalday < 1) newIntervalday = 1;
    }
    
    if (newFreq === 'custom_weekdays') {
        newCustomdays = getSelectedEditWeekdays();
    }
    
    // Collect counter values
    let newCounter = 0;
    let newIncrementation = 0;
    
    if (document.getElementById('editCounterCheckbox').checked) {
        newCounter = parseInt(document.getElementById('editCounter').value) || 0;
        newIncrementation = parseInt(document.getElementById('editIncrementation').value) || 1;
    }
    
    console.log('Saving edited habit:', {newTitle, newFreq, newIntervalday, newCustomdays, newCounter, newIncrementation});
    
    // Create updated habit object
    const updatedHabit = {
        ...originalHabit,
        title: newTitle,
        frequencyType: newFreq,
        intervalday: newIntervalday,
        customdays: newCustomdays,
        counter: newCounter,
        incrementation: newIncrementation
    };
    
    // Save to storage
    updateHabitInStorage(updatedHabit);
    
    // Close modal and refresh
    closeEditModal();
    loadHabits();
    
    console.log('Habit updated successfully!');
}

function isHabitCompletedOnDueDay(habit) {
    const today = new Date().toISOString().split('T')[0]; // "2025-07-01"
    
    // Check if habit is even due today
    if (!isHabitDueToday(habit)) {
        return false; // Not due today, so completion status doesn't matter
    }
    
    // Check if today is in completion history
    if (!habit.completionHistory || habit.completionHistory.length === 0) {
        return false; // Never completed
    }
    
    // Check if last completion was today
    const lastCompletion = habit.completionHistory[habit.completionHistory.length - 1];
    return lastCompletion === today;
}

function isHabitDueToday(habit) {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Checking if habit is due:');
    console.log('Today:', today);
    console.log('Habit nextDue:', habit.nextDue);
    console.log('Comparison result:', today >= habit.nextDue);
    
    // If no next due date set, assume it's due (for backwards compatibility)
    if (!habit.nextDue) {
        console.log('No nextDue set, returning true');
        return true;
    }
    
    // Habit is due if today is on or after the next due date
    const result = today >= habit.nextDue;
    console.log('Final result:', result);
    return result;
}

function isHabitCompletedToday(habit) {
    const today = new Date().toISOString().split('T')[0];
    
    if (!habit.completionHistory || habit.completionHistory.length === 0) {
        return false;
    }
    
    const lastCompletion = habit.completionHistory[habit.completionHistory.length - 1];
    return lastCompletion === today;
}

function calculateStreakFromHistory(completionHistory, fromDate) {
    if (completionHistory.length === 0) return 0;
    
    // Use default parameters for backwards compatibility
    return calculateStreak(
        completionHistory.slice(0, -1), // Remove the last date
        fromDate,
        null,      // lastDueDate - not needed
        'daily',   // Default frequency
        1,         // Default interval
        ''         // Default custom days
    );
}

function markHabitComplete(habit) {
    console.log('=== markHabitComplete called ===');
    console.log('Habit:', habit.title);
    
    const checkbox = document.getElementById(`complete-${habit.id}`);
    console.log('Checkbox checked state:', checkbox.checked);
    
    const isCompletedToday = isHabitCompletedToday(habit);
    console.log('isHabitCompletedToday result:', isCompletedToday);
    
    const isDue = isHabitDueToday(habit);
    console.log('isHabitDueToday result:', isDue);
    
    // Don't allow interaction if not due and not completed today
    if (!isDue && !isCompletedToday) {
        console.log('BRANCH: Habit not available for interaction');
        checkbox.checked = isCompletedToday; // Set to actual state
        return;
    }
    
    // ✅ CLEAR LOGIC: Based on current completion state, not checkbox state
    if (!isCompletedToday && checkbox.checked) {
        // User wants to complete habit
        console.log('BRANCH: Completing habit');
        updateHabitProgress(habit);
        loadHabits();
        
    } else if (isCompletedToday && !checkbox.checked) {
        // User wants to undo completion
        console.log('BRANCH: Undoing completion');
        undoHabitCompletion(habit);
        loadHabits();
        
    } else {
        // Sync checkbox with actual state
        console.log('BRANCH: Syncing checkbox state');
        checkbox.checked = isCompletedToday;
    }
    
    console.log('=== markHabitComplete end ===');
}

function autoUpdateStreakIfBroken(habit) {
    const today = new Date().toISOString().split('T')[0];
    
    if (!habit.completionHistory || habit.completionHistory.length === 0) {
        return habit;
    }
    
    const lastCompletion = habit.completionHistory[habit.completionHistory.length - 1];
    const lastCompletionDate = new Date(lastCompletion);
    const todayDate = new Date(today);
    
    const daysSinceLastCompletion = Math.floor((todayDate - lastCompletionDate) / (1000 * 60 * 60 * 24));
    
    let streakBroken = false;
    
    if (habit.frequencyType === 'daily') {
        streakBroken = daysSinceLastCompletion > 1;
    } else if (habit.frequencyType === 'interval') {
        streakBroken = today > habit.nextDue;
    } else if (habit.frequencyType === 'custom_weekdays') {
        streakBroken = daysSinceLastCompletion > 7;
    }
    
    if (streakBroken) {
        console.log(`Streak broken for ${habit.title}! Resetting to 0. Days gap: ${daysSinceLastCompletion}`);
        // ✅ MODIFY THE EXISTING HABIT OBJECT (keeps the Habit class methods)
        habit.currentStreak = 0;
    }
    
    return habit;
}

// ===== EVENT LISTENERS =====

// Show form when button clicked
// Show form when button clicked
showFormButton.addEventListener('click', function () {
    form.style.display = 'block';
    hideAllConditionalSections();  // ✅ Add this line
});
// Handle frequency type changes
freqInput.addEventListener('change', function () {
    const selectedValue = this.value;
    
    // Hide all sections first
    hideAllFrequencySections();
    
    // Show relevant section
    if (selectedValue === 'daily') {
        showSection(dailySection);
    } else if (selectedValue === 'interval') {
        showSection(intervalSection);
    } else if (selectedValue === 'custom_weekdays') {
        showSection(customSection);
    }
});

counter_checkbox.addEventListener('change',function(){
   if (this.checked) {
        counter_section.style.display = 'block';
    } else {
        counter_section.style.display = 'none';
    }
})

// Handle form submission
form.addEventListener('submit', function (e) {
    e.preventDefault();

    const title = document.getElementById('titleInput').value;
    const freq = document.getElementById('freqInput').value;
    
    let intervalday = null;  // Default for all
    let customdays = '';

if (freq === 'interval') {
    intervalday = document.getElementById('intervalday').value || 1;
    if (!intervalday || intervalday < 1) {
        intervalday = 1;
    }
}

if (freq === 'custom_weekdays') {
    customdays = getSelectedWeekdays();
}

    let counter = 0;           // Default
    let incrementation = 0; 

    if (counter_checkbox.checked) {
        counter = parseInt(document.getElementById('counter_value').value) || 0;
        incrementation = parseInt(document.getElementById('incrementation_value').value) || 1;
    }

    console.log('Creating habit:', {title, freq, intervalday, customdays, counter, incrementation});

    try {
    const habit = createHabit(
    Date.now(),           // id
    title,                // title
    freq,                 // frequencyType
    intervalday,          // intervalday
    customdays,           // customdays
    counter,              // counter
    incrementation,       // incrementation
    "default"             // projectId (hardcoded for now)
);
        
        loadHabits();
        
        // Reset and hide form
        // Reset and hide form
form.reset();
hideAllConditionalSections();  // ✅ Add this line
form.style.display = 'none';
        
    } catch (error) {
        console.error('Error creating habit:', error);
        alert('Error creating habit: ' + error.message);
    }
});

// ===== HABIT DISPLAY FUNCTIONS =====

function loadHabits() {
    const habits = readHabits();
    console.log('Loaded habits:', habits);
    console.log('Habits length:', habits.length);
    console.log('Type of habits:', typeof habits);
    
    displayArea.innerHTML = '';
    
    if (habits.length === 0) {
        displayArea.innerHTML = '<p>No habits yet!</p>';
    } else {
        habits.forEach(habit => {
            console.log('Processing habit:', habit);
            
            // ✅ AUTO-UPDATE STREAK IF BROKEN
            const updatedHabit = autoUpdateStreakIfBroken(habit);
            
            // If streak was updated, save it back to storage
            if (updatedHabit.currentStreak !== habit.currentStreak) {
                updateHabitInStorage(updatedHabit);
                displayHabit(updatedHabit); // Display updated version
            } else {
                displayHabit(habit); // Display original
            }
        });
    }
}

function displayHabit(habit) {
    const display = document.createElement('p');
    display.innerHTML = habit.info();

    // Create checkbox
    const completeCheckbox = document.createElement('input');
    completeCheckbox.type = 'checkbox';
    completeCheckbox.id = `complete-${habit.id}`;
    
    const isCompleted = isHabitCompletedOnDueDay(habit);
    const isDue = isHabitDueToday(habit);
    const isCompletedToday = isHabitCompletedToday(habit); // ✅ Add this check
    
  completeCheckbox.checked = isCompletedToday;
    
    // ✅ KEY FIX: Show checkbox if due OR if completed today (for undo)
    const shouldShowCheckbox = isDue || isCompletedToday;
    completeCheckbox.disabled = !shouldShowCheckbox;
    completeCheckbox.style.display = shouldShowCheckbox ? 'inline' : 'none';
    
    // Create label with better status
    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = `complete-${habit.id}`;
    
    if (isCompletedToday && !isDue) {
        checkboxLabel.textContent = 'Completed Today';
        checkboxLabel.style.color = '#28a745';
    } else if (!isDue) {
        checkboxLabel.textContent = ` 📅 Due: ${habit.nextDue}`;
        checkboxLabel.style.color = '#666';
    } else if (isCompleted) {
        checkboxLabel.textContent = ' ✅ Completed Today';
        checkboxLabel.style.color = '#28a745';
    } else {
        checkboxLabel.textContent = ' Mark as Complete';
        checkboxLabel.style.color = '#000';
    }
    
    // Add click handler
    completeCheckbox.onclick = () => markHabitComplete(habit);

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => openEditModal(habit);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteHabit(habit);

    // Add elements to display
    display.appendChild(completeCheckbox);
    display.appendChild(checkboxLabel);
    display.appendChild(editBtn);
    display.appendChild(deleteBtn);
    displayArea.appendChild(display);
}

function deleteHabit(habitToDelete) {
    removeHabit(habitToDelete);
    displayArea.innerHTML = '';
    loadHabits();
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', loadHabits);