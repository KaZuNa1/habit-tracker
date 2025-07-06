// ===== IMPORTS =====
const { createHabit } = require('./logic/habitManager');
const { readHabits, removeHabit, writeHabits } = require('./logic/storage');
const { calculateNextDue, calculateNextDueAfterCompletion, checkIfCustomWeekdaysStreakBroken, recalculateNextDueFromStart } = require('./logic/dateUtils');

// ===== DOM ELEMENTS =====
const showFormButton = document.getElementById('createHabitButton');
const toggleViewButton = document.getElementById('toggleViewButton');
const form = document.getElementById('habitForm');
const freqInput = document.getElementById('freqInput');
const displayArea = document.getElementById('habitDisplayArea');
const counterCheckbox = document.getElementById('counter_checkbox');
const startDateInput = document.getElementById('startDate');

// ===== TOGGLE STATE =====
let showAllHabits = false; // ✅ ADD THIS VARIABLE

// Form sections
const dailySection = document.getElementById('daily_sec');
const intervalSection = document.getElementById('intervalday_section');
const customSection = document.getElementById('custom_weekdays_section');
const counterSection = document.getElementById('counter_section');

// ===== CONSTANTS =====
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const COLORS = {
    SUCCESS: '#28a745',
    INFO: '#666',
    DEFAULT: '#000'
};

// ===== UTILITY FUNCTIONS =====
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function hideAllFrequencySections() {
    dailySection.style.display = 'none';
    intervalSection.style.display = 'none';
    customSection.style.display = 'none';
}

function hideAllConditionalSections() {
    hideAllFrequencySections();
    counterSection.style.display = 'none';
}

function showSection(section) {
    section.style.display = 'block';
}

function getSelectedWeekdays() {
    const selected = [];
    WEEKDAYS.forEach(day => {
        const checkbox = document.getElementById(day);
        if (checkbox && checkbox.checked) {
            selected.push(day);
        }
    });
    return selected.join(',');
}

function getSelectedEditWeekdays() {
    const selected = [];
    WEEKDAYS.forEach(day => {
        const checkbox = document.getElementById('edit' + day.charAt(0).toUpperCase() + day.slice(1));
        if (checkbox && checkbox.checked) {
            selected.push(day);
        }
    });
    return selected.join(',');
}

// ===== STORAGE FUNCTIONS =====
function updateHabitInStorage(updatedHabit) {
    const allHabits = readHabits();
    const updatedHabits = allHabits.map(habit => 
        habit.id === updatedHabit.id ? updatedHabit : habit
    );
    writeHabits(updatedHabits);
}

// ===== HABIT STATUS FUNCTIONS =====
function isHabitDueToday(habit) {
    const today = getTodayDate();
    
    // Check if habit has started yet
    if (today < habit.startDate) {
        return false;
    }
    
    if (!habit.nextDue) {
        return true;
    }
    
    // For custom weekdays, check if today is a valid day
    if (habit.frequencyType === 'custom_weekdays') {
        const todayDate = new Date(today);
        const todayDayName = todayDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const validDays = habit.customdays.split(',').map(day => day.trim().toLowerCase());
        return validDays.includes(todayDayName);
    }
    
    return today >= habit.nextDue;
}

function isHabitCompletedToday(habit) {
    const today = getTodayDate();
    
    if (!habit.completionHistory || habit.completionHistory.length === 0) {
        return false;
    }
    
    const lastCompletion = habit.completionHistory[habit.completionHistory.length - 1];
    return lastCompletion === today;
}

// ===== STREAK CALCULATION =====
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

function autoUpdateStreakIfBroken(habit) {
    const today = getTodayDate();
    
    // Don't check streak if habit hasn't started yet
    if (today < habit.startDate) {
        return habit;
    }
    
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
        streakBroken = checkIfCustomWeekdaysStreakBroken(lastCompletion, today, habit.customdays);
    }
    
    if (streakBroken) {
        console.log(`Streak broken for ${habit.title}! Resetting to 0. Days gap: ${daysSinceLastCompletion}`);
        habit.currentStreak = 0;
        
        // When streak is broken, recalculate next due from today
        if (habit.frequencyType === 'custom_weekdays') {
            const newNextDue = calculateNextDue(habit.frequencyType, habit.intervalday, habit.customdays, today);
            habit.nextDue = newNextDue;
        }
    }
    
    return habit;
}

// ===== HABIT PROGRESS FUNCTIONS =====
function updateHabitProgress(habit) {
    const today = getTodayDate();
    
    // Update counter
    const newCounter = parseInt(habit.counter) + parseInt(habit.incrementation);
    
    // Update completion tracking  
    const newTotalCompleted = habit.totalCompleted + 1;
    const newCompletionHistory = [...habit.completionHistory, today];
    
    // Calculate streak
    let newStreak;
    if (habit.currentStreak === 0) {
        newStreak = 1;
    } else {
        newStreak = calculateStreak(
            habit.completionHistory, 
            today, 
            habit.nextDue, 
            habit.frequencyType,
            habit.intervalday,
            habit.customdays
        );
    }
    
    // Calculate next due date (AFTER completion)
    const newNextDue = calculateNextDueAfterCompletion(habit.frequencyType, habit.intervalday, habit.customdays, today);
    
    // Create updated habit
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
    
    // Save to storage
    updateHabitInStorage(updatedHabit);
    
    console.log(`Habit completed! Counter: ${habit.counter} → ${newCounter}, Streak: ${habit.currentStreak} → ${newStreak}`);
}

function undoHabitCompletion(habit) {
    const today = getTodayDate();
    
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
        
        revertedStreak = gapBreaksStreak ? 0 : Math.max(0, habit.currentStreak - 1);
    } else {
        revertedStreak = Math.max(0, habit.currentStreak - 1);
    }
    
    const revertedHabit = {
        ...habit,
        counter: revertedCounter,
        totalCompleted: revertedTotal,
        completionHistory: updatedHistory,
        currentStreak: revertedStreak,  
        lastCompleted: updatedHistory.length > 0 ? updatedHistory[updatedHistory.length - 1] : null,
        nextDue: today,
        isActiveToday: true
    };
    
    updateHabitInStorage(revertedHabit);
    
    console.log(`Habit undone! Counter: ${habit.counter} → ${revertedCounter}, Streak: ${habit.currentStreak} → ${revertedStreak}`);
}

// ===== DISPLAY FUNCTIONS =====
function createCheckboxLabel(habit, isDue, isCompletedToday) {
    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = `complete-${habit.id}`;
    
    if (isCompletedToday && !isDue) {
        checkboxLabel.textContent = ' Completed Today';
        checkboxLabel.style.color = COLORS.SUCCESS;
    } else if (!isDue) {
        checkboxLabel.textContent = ` 📅 Due: ${habit.nextDue}`;
        checkboxLabel.style.color = COLORS.INFO;
    } else if (isCompletedToday) {
        checkboxLabel.textContent = ' Completed Today';
        checkboxLabel.style.color = COLORS.SUCCESS;
    } else {
        checkboxLabel.textContent = ' Mark as Complete';
        checkboxLabel.style.color = COLORS.DEFAULT;
    }
    
    return checkboxLabel;
}

function updateSingleHabitDisplay(updatedHabit) {
    const existingDisplay = document.querySelector(`[data-habit-id="${updatedHabit.id}"]`);
    
    if (!existingDisplay) {
        console.warn(`Could not find display element for habit ${updatedHabit.id}`);
        loadHabits();
        return;
    }
    
    // Clear content but keep the element in place
    existingDisplay.innerHTML = updatedHabit.info();
    
    // Create checkbox
    const completeCheckbox = document.createElement('input');
    completeCheckbox.type = 'checkbox';
    completeCheckbox.id = `complete-${updatedHabit.id}`;
    
    const isDue = isHabitDueToday(updatedHabit);
    const isCompletedToday = isHabitCompletedToday(updatedHabit);

    completeCheckbox.checked = isCompletedToday;
    
    const shouldShowCheckbox = isDue || isCompletedToday;
    completeCheckbox.disabled = !shouldShowCheckbox;
    completeCheckbox.style.display = shouldShowCheckbox ? 'inline' : 'none';
    
    // Create label
    const checkboxLabel = createCheckboxLabel(updatedHabit, isDue, isCompletedToday);
    
    // Create buttons
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => openEditModal(updatedHabit);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteHabitOptimized(updatedHabit);
    
    // Add event listener
    completeCheckbox.onclick = () => markHabitComplete(updatedHabit);

    // Add everything back as inline elements
    existingDisplay.appendChild(completeCheckbox);
    existingDisplay.appendChild(checkboxLabel);
    existingDisplay.appendChild(editBtn);
    existingDisplay.appendChild(deleteBtn);
}

function displayHabit(habit) {


    const display = document.createElement('p');
    display.setAttribute('data-habit-id', habit.id);
    display.innerHTML = habit.info();

    const completeCheckbox = document.createElement('input');
    completeCheckbox.type = 'checkbox';
    completeCheckbox.id = `complete-${habit.id}`;
    
    const isDue = isHabitDueToday(habit);
    const isCompletedToday = isHabitCompletedToday(habit);

    completeCheckbox.checked = isCompletedToday;
    
    const shouldShowCheckbox = isDue || isCompletedToday;
    completeCheckbox.disabled = !shouldShowCheckbox;
    completeCheckbox.style.display = shouldShowCheckbox ? 'inline' : 'none';
    
    // Create label
    const checkboxLabel = createCheckboxLabel(habit, isDue, isCompletedToday);
    
    // Create buttons
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => openEditModal(habit);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteHabitOptimized(habit);
    
    // Add event listener
    completeCheckbox.onclick = () => markHabitComplete(habit);

    // Append elements
    display.appendChild(completeCheckbox);
    display.appendChild(checkboxLabel);
    display.appendChild(editBtn);
    display.appendChild(deleteBtn);
    displayArea.appendChild(display);
}

function markHabitComplete(habit) {
    const checkbox = document.getElementById(`complete-${habit.id}`);
    const isCompletedToday = isHabitCompletedToday(habit);
    const isDue = isHabitDueToday(habit);
    
    
    if (!isDue && !isCompletedToday) {
        checkbox.checked = isCompletedToday;
        return;
    }
    
    if (!isCompletedToday && checkbox.checked) {
        // User wants to complete habit
        updateHabitProgress(habit);
        const allHabits = readHabits();
        const updatedHabit = allHabits.find(h => h.id === habit.id);
        updateSingleHabitDisplay(updatedHabit);
        
    } else if (isCompletedToday && !checkbox.checked) {
        // User wants to undo completion
        undoHabitCompletion(habit);
        const allHabits = readHabits();
        const updatedHabit = allHabits.find(h => h.id === habit.id);
        updateSingleHabitDisplay(updatedHabit);
        
    } else {
        // Sync checkbox with actual state
        checkbox.checked = isCompletedToday;
    }
}

function deleteHabitOptimized(habitToDelete) {
    removeHabit(habitToDelete);
    
    // Remove only this habit's display element
    const habitElement = document.querySelector(`[data-habit-id="${habitToDelete.id}"]`);
    if (habitElement) {
        habitElement.remove();
    }
    
    // Check if any habits remain
    const remainingHabits = readHabits();
    if (remainingHabits.length === 0) {
        displayArea.innerHTML = '<p>No habits yet!</p>';
    }
}

function loadHabits() {
    const habits = readHabits();
    const today = getTodayDate();
    
    displayArea.innerHTML = '';
    
    if (habits.length === 0) {
        displayArea.innerHTML = '<p>No habits yet!</p>';
        return;
    }
    
    habits.forEach(habit => {
    const oldNextDue = habit.nextDue;
    habit.nextDue = recalculateNextDueFromStart(habit, today);
    
    const updatedHabit = autoUpdateStreakIfBroken(habit);
    
    if (oldNextDue !== habit.nextDue || updatedHabit !== habit) {
        updateHabitInStorage(updatedHabit);
    }
    
    // ✅ SMART SCHEDULING: Only display if due today OR completed today
    const isDue = isHabitDueToday(updatedHabit);
    const isCompletedToday = isHabitCompletedToday(updatedHabit);
    
    // ✅ NEW: Check toggle state
if (showAllHabits || isDue || isCompletedToday) {
    displayHabit(updatedHabit);
}
    // If neither due nor completed today, habit is hidden
});
}

// ===== EDIT MODAL FUNCTIONS =====
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

function showEditFrequencySection(frequencyType) {
    const sections = ['editDailySection', 'editIntervalSection', 'editCustomSection'];
    sections.forEach(section => {
        document.getElementById(section).style.display = 'none';
    });
    
    if (frequencyType === 'daily') {
        document.getElementById('editDailySection').style.display = 'block';
    } else if (frequencyType === 'interval') {
        document.getElementById('editIntervalSection').style.display = 'block';
    } else if (frequencyType === 'custom_weekdays') {
        document.getElementById('editCustomSection').style.display = 'block';
    }
}

function setupEditFormEventListeners() {
    document.getElementById('editFreq').addEventListener('change', function() {
        showEditFrequencySection(this.value);
    });
    
    document.getElementById('editCounterCheckbox').addEventListener('change', function() {
        const counterSection = document.getElementById('editCounterInputSection');
        counterSection.style.display = this.checked ? 'block' : 'none';
    });
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
    const newStartDate = document.getElementById('editStartDate').value;
    
    let newIntervalday = null;
    let newCustomdays = '';
    
    if (newFreq === 'interval') {
        newIntervalday = Math.max(1, parseInt(document.getElementById('editIntervalDay').value) || 1);
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
    
    const updatedHabit = {
        ...originalHabit,
        title: newTitle,
        frequencyType: newFreq,
        intervalday: newIntervalday,
        customdays: newCustomdays,
        counter: newCounter,
        incrementation: newIncrementation,
        startDate: newStartDate
    };
    
    // Recalculate nextDue when editing
    const today = getTodayDate();
    updatedHabit.nextDue = recalculateNextDueFromStart(updatedHabit, today);
    
    updateHabitInStorage(updatedHabit);
    closeEditModal();
    loadHabits();
}

function openEditModal(habit) {
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

        <label for="editStartDate">Start Date:</label>
        <input type="date" id="editStartDate" value="${habit.startDate}" required />
        <br><br>

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
    document.getElementById('cancelEditBtn').onclick = closeEditModal;
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeEditModal();
        }
    };
}

// ===== EVENT LISTENERS =====
showFormButton.addEventListener('click', function () {
    form.style.display = 'block';
    hideAllConditionalSections();
    
    // Set default start date to today when form opens
    startDateInput.value = getTodayDate();
});

// ===== TOGGLE VIEW EVENT LISTENER =====
toggleViewButton.addEventListener('click', function() {
    showAllHabits = !showAllHabits; // Flip the state
    
    // Update button text
    toggleViewButton.textContent = showAllHabits ? 'Show Today Only' : 'Show All Habits';
    
    // Reload habits with new filter
    loadHabits();
});

document.getElementById('cancelFormButton').addEventListener('click', function() {
    form.reset(); // Clear the form
    hideAllConditionalSections(); // Hide frequency sections
    form.style.display = 'none'; // Hide the form
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

counterCheckbox.addEventListener('change', function() {
    counterSection.style.display = this.checked ? 'block' : 'none';
});

form.addEventListener('submit', function (e) {
    e.preventDefault();

    const title = document.getElementById('titleInput').value;
    const freq = document.getElementById('freqInput').value;
    const startDate = startDateInput.value;
    
    let intervalday = null;
    let customdays = '';

    if (freq === 'interval') {
        intervalday = Math.max(1, parseInt(document.getElementById('intervalday').value) || 1);
    }

    if (freq === 'custom_weekdays') {
        customdays = getSelectedWeekdays();
    }

    let counter = 0;
    let incrementation = 0; 

    if (counterCheckbox.checked) {
        counter = parseInt(document.getElementById('counter_value').value) || 0;
        incrementation = parseInt(document.getElementById('incrementation_value').value) || 1;
    }

    try {
        createHabit(
            Date.now(),
            title,
            freq,
            intervalday,
            customdays,
            counter,
            incrementation,
            "default",
            startDate
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

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', loadHabits);