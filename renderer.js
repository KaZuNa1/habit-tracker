// ===== IMPORTS =====
const { createHabit } = require('./logic/habitManager');
const { readHabits, removeHabit, writeHabits } = require('./logic/storage');
const { calculateNextDue, calculateNextDueAfterCompletion, checkIfCustomWeekdaysStreakBroken } = require('./logic/dateUtils');

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

function hideAllConditionalSections() {
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
    
    return selected.join(',');
}

function updateHabitInStorage(updatedHabit) {
    const allHabits = readHabits();
    const updatedHabits = allHabits.map(habit => {
        if (habit.id === updatedHabit.id) {
            return updatedHabit;
        }
        return habit;
    });
    writeHabits(updatedHabits);
}

function calculateStreak(completionHistory, todayDate, lastDueDate, frequencyType = 'daily', intervalday = 1, customdays = '') {
    if (completionHistory.length === 0) {
        return 1; // First completion
    }
    
    const allCompletions = [...completionHistory, todayDate];
    allCompletions.sort();
    
    let streak = 1; // Today counts as 1
    
    for (let i = allCompletions.length - 2; i >= 0; i--) {
        const currentDate = new Date(allCompletions[i + 1]);
        const previousDate = new Date(allCompletions[i]);
        
        const daysDifference = Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24));
        
        let expectedGap = 1;
        
        if (frequencyType === 'interval') {
            expectedGap = parseInt(intervalday);
        } else if (frequencyType === 'custom_weekdays') {
            expectedGap = 1; // Simplified for now
        }
        
        if (daysDifference <= expectedGap + 1) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
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
    
    // 3. Calculate streak
    let newStreak;
    if (habit.currentStreak === 0) {
        newStreak = 1;
        console.log('Streak was broken, starting fresh at 1');
    } else {
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
    
    // 4. Calculate next due date (AFTER completion)
    const newNextDue = calculateNextDueAfterCompletion(habit.frequencyType, habit.intervalday, habit.customdays, today);
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

function undoHabitCompletion(habit) {
    const today = new Date().toISOString().split('T')[0];
    
    // Remove today from completion history
    const updatedHistory = habit.completionHistory.filter(date => date !== today);
    
    // Revert counter
    const revertedCounter = habit.counter - habit.incrementation;
    
    // Decrease total completed
    const revertedTotal = Math.max(0, habit.totalCompleted - 1);
    
    // Calculate reverted streak
    let revertedStreak;
    
    if (habit.currentStreak === 1 && updatedHistory.length > 0) {
        const lastCompletion = updatedHistory[updatedHistory.length - 1];
        const lastDate = new Date(lastCompletion);
        const todayDate = new Date(today);
        const daysSinceLastCompletion = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        
        let gapBreaksStreak = false;
        if (habit.frequencyType === 'daily') {
            gapBreaksStreak = daysSinceLastCompletion > 1;
        } else if (habit.frequencyType === 'interval') {
            const maxAllowedGap = parseInt(habit.intervalday) + 1;
            gapBreaksStreak = daysSinceLastCompletion > maxAllowedGap;
        }
        
        if (gapBreaksStreak) {
            revertedStreak = 0;
        } else {
            revertedStreak = Math.max(0, habit.currentStreak - 1);
        }
    } else {
        revertedStreak = Math.max(0, habit.currentStreak - 1);
    }
    
    console.log(`Reverting streak from ${habit.currentStreak} to ${revertedStreak}`);
    
    const revertedNextDue = today;
    
    const revertedHabit = {
        ...habit,
        counter: revertedCounter,
        totalCompleted: revertedTotal,
        completionHistory: updatedHistory,
        currentStreak: revertedStreak,  
        lastCompleted: updatedHistory.length > 0 ? updatedHistory[updatedHistory.length - 1] : null,
        nextDue: revertedNextDue,
        isActiveToday: true
    };
    
    updateHabitInStorage(revertedHabit);
    
    console.log(`Habit undone! Counter: ${habit.counter} → ${revertedCounter}, Streak: ${habit.currentStreak} → ${revertedStreak}`);
}

function isHabitDueToday(habit) {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Checking if habit is due:');
    console.log('Today:', today);
    console.log('Habit nextDue:', habit.nextDue);
    console.log('Habit frequency:', habit.frequencyType);
    console.log('Custom days:', habit.customdays);
    
    if (!habit.nextDue) {
        console.log('No nextDue set, returning true');
        return true;
    }
    
    // For custom weekdays, check if today is a valid day
    if (habit.frequencyType === 'custom_weekdays') {
        const todayDate = new Date(today);
        const todayDayName = todayDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        console.log('Today day name:', todayDayName);
        
        const validDays = habit.customdays.split(',').map(day => day.trim().toLowerCase());
        console.log('Valid days:', validDays);
        
        const isDueToday = validDays.includes(todayDayName);
        console.log('Is due today (custom):', isDueToday);
        return isDueToday;
    }
    
    const result = today >= habit.nextDue;
    console.log('Final result (nextDue comparison):', result);
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
        checkbox.checked = isCompletedToday;
        return;
    }
    
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
        // ✅ FIXED: Use the new function to properly check for missed days
        streakBroken = checkIfCustomWeekdaysStreakBroken(lastCompletion, today, habit.customdays);
    }
    
    if (streakBroken) {
        console.log(`Streak broken for ${habit.title}! Resetting to 0. Days gap: ${daysSinceLastCompletion}`);
        habit.currentStreak = 0;
        
        // ✅ FIXED: When streak is broken, recalculate next due from today
        if (habit.frequencyType === 'custom_weekdays') {
            const newNextDue = calculateNextDue(habit.frequencyType, habit.intervalday, habit.customdays, today);
            habit.nextDue = newNextDue;
            console.log(`Updated next due for broken streak: ${newNextDue}`);
        }
    }
    
    return habit;
}

// ===== EDIT MODAL FUNCTIONS =====
function openEditModal(habit) {
    console.log('Opening edit modal for:', habit.title);
    showEditForm(habit);
}

function showEditForm(habit) {
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

        <div id="editDailySection" style="display: none;">
            <p>Daily habit - no additional settings needed</p>
        </div>

        <div id="editIntervalSection" style="display: none;">
            <label for="editIntervalDay">Every how many days?</label>
            <input type="number" id="editIntervalDay" value="${habit.intervalday || 1}" min="1">
            <br><br>
        </div>

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

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    showEditFrequencySection(habit.frequencyType);
    preSelectCustomDays(habit.customdays);
    setupEditFormEventListeners();

    document.getElementById('saveEditBtn').onclick = () => saveEditedHabit(habit);
    document.getElementById('cancelEditBtn').onclick = () => closeEditModal();
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeEditModal();
        }
    };
}

function showEditFrequencySection(frequencyType) {
    document.getElementById('editDailySection').style.display = 'none';
    document.getElementById('editIntervalSection').style.display = 'none';
    document.getElementById('editCustomSection').style.display = 'none';
    
    if (frequencyType === 'daily') {
        document.getElementById('editDailySection').style.display = 'block';
    } else if (frequencyType === 'interval') {
        document.getElementById('editIntervalSection').style.display = 'block';
    } else if (frequencyType === 'custom_weekdays') {
        document.getElementById('editCustomSection').style.display = 'block';
    }
}

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

function setupEditFormEventListeners() {
    document.getElementById('editFreq').addEventListener('change', function() {
        const selectedValue = this.value;
        
        document.getElementById('editDailySection').style.display = 'none';
        document.getElementById('editIntervalSection').style.display = 'none';
        document.getElementById('editCustomSection').style.display = 'none';
        
        if (selectedValue === 'daily') {
            document.getElementById('editDailySection').style.display = 'block';
        } else if (selectedValue === 'interval') {
            document.getElementById('editIntervalSection').style.display = 'block';
        } else if (selectedValue === 'custom_weekdays') {
            document.getElementById('editCustomSection').style.display = 'block';
        }
    });
    
    document.getElementById('editCounterCheckbox').addEventListener('change', function() {
        const counterSection = document.getElementById('editCounterInputSection');
        if (this.checked) {
            counterSection.style.display = 'block';
        } else {
            counterSection.style.display = 'none';
        }
    });
}

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
    const newTitle = document.getElementById('editTitle').value;
    const newFreq = document.getElementById('editFreq').value;
    
    let newIntervalday = null;
    let newCustomdays = '';
    
    if (newFreq === 'interval') {
        newIntervalday = parseInt(document.getElementById('editIntervalDay').value) || 1;
        if (newIntervalday < 1) newIntervalday = 1;
    }
    
    if (newFreq === 'custom_weekdays') {
        newCustomdays = getSelectedEditWeekdays();
    }
    
    let newCounter = 0;
    let newIncrementation = 0;
    
    if (document.getElementById('editCounterCheckbox').checked) {
        newCounter = parseInt(document.getElementById('editCounter').value) || 0;
        newIncrementation = parseInt(document.getElementById('editIncrementation').value) || 1;
    }
    
    console.log('Saving edited habit:', {newTitle, newFreq, newIntervalday, newCustomdays, newCounter, newIncrementation});
    
    const updatedHabit = {
        ...originalHabit,
        title: newTitle,
        frequencyType: newFreq,
        intervalday: newIntervalday,
        customdays: newCustomdays,
        counter: newCounter,
        incrementation: newIncrementation
    };
    
    updateHabitInStorage(updatedHabit);
    closeEditModal();
    loadHabits();
    
    console.log('Habit updated successfully!');
}

// ===== EVENT LISTENERS =====
showFormButton.addEventListener('click', function () {
    form.style.display = 'block';
    hideAllConditionalSections();
});

freqInput.addEventListener('change', function () {
    const selectedValue = this.value;
    hideAllFrequencySections();
    
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

form.addEventListener('submit', function (e) {
    e.preventDefault();

    const title = document.getElementById('titleInput').value;
    const freq = document.getElementById('freqInput').value;
    
    let intervalday = null;
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

    let counter = 0;
    let incrementation = 0; 

    if (counter_checkbox.checked) {
        counter = parseInt(document.getElementById('counter_value').value) || 0;
        incrementation = parseInt(document.getElementById('incrementation_value').value) || 1;
    }

    console.log('Creating habit:', {title, freq, intervalday, customdays, counter, incrementation});

    try {
        const habit = createHabit(
            Date.now(),
            title,
            freq,
            intervalday,
            customdays,
            counter,
            incrementation,
            "default"
        );
        
        loadHabits();
        
        form.reset();
        hideAllConditionalSections();
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
    
    displayArea.innerHTML = '';
    
    if (habits.length === 0) {
        displayArea.innerHTML = '<p>No habits yet!</p>';
    } else {
        habits.forEach(habit => {
            console.log('Processing habit:', habit);
            
            const updatedHabit = autoUpdateStreakIfBroken(habit);
            
            if (updatedHabit.currentStreak !== habit.currentStreak) {
                updateHabitInStorage(updatedHabit);
                displayHabit(updatedHabit);
            } else {
                displayHabit(habit);
            }
        });
    }
}

function displayHabit(habit) {
    const display = document.createElement('p');
    display.innerHTML = habit.info();

    const completeCheckbox = document.createElement('input');
    completeCheckbox.type = 'checkbox';
    completeCheckbox.id = `complete-${habit.id}`;
    
    const isDue = isHabitDueToday(habit);
    const isCompletedToday = isHabitCompletedToday(habit);

    completeCheckbox.checked = isCompletedToday;
    
    // Show checkbox if due OR if completed today (for undo)
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
    } else if (isCompletedToday) {  // Fixed variable name
        checkboxLabel.textContent = ' Completed Today';
        checkboxLabel.style.color = '#28a745';
    } else {
        checkboxLabel.textContent = ' Mark as Complete';
        checkboxLabel.style.color = '#000';
    }
    
    completeCheckbox.onclick = () => markHabitComplete(habit);

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => openEditModal(habit);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteHabit(habit);

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