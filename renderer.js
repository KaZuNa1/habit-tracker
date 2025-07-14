// ===== IMPORTS =====
const { createHabit } = require('./logic/habitManager');
const { readHabits, removeHabit, writeHabits } = require('./logic/storage');
const { calculateNextDue, calculateNextDueAfterCompletion, checkIfCustomWeekdaysStreakBroken, recalculateNextDueFromStart, calculateIntervalPatternNextDue } = require('./logic/dateUtils');

// ===== DOM ELEMENTS =====
const showFormButton = document.getElementById('createHabitButton');
const toggleViewButton = document.getElementById('toggleViewButton');


const displayArea = document.getElementById('habitDisplayArea');


// ===== TOGGLE STATE =====
let showAllHabits = false; // ✅ ADD THIS VARIABLE

// Form sections
const dailySection = document.getElementById('daily_sec');
const intervalSection = document.getElementById('intervalday_section');
const customSection = document.getElementById('custom_weekdays_section');
const counterSection = document.getElementById('counter_section');
const noteSection = document.getElementById('note_section');

// ===== CONSTANTS =====
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const COLORS = {
    SUCCESS: '#28a745',
    INFO: '#666',
    DEFAULT: '#000'
};

const HABIT_COLORS = {
    default: '#6c757d',  // Gray
    violet: '#8e44ad',   // Violet
    red: '#e74c3c',      // Red
    green: '#27ae60',    // Green
    blue: '#3498db',     // Blue
    orange: '#f39c12',   // Orange
    pink: '#e91e63',     // Pink
    cyan: '#17a2b8',     // Cyan
    yellow: '#f1c40f',   // Yellow
    purple: '#9b59b6'    // Purple
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
    noteSection.style.display = 'none'; 
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

// ===== NOTES MODAL FUNCTIONS =====

function showNotesModal(habitId, habitTitle) {
    // Get the habit data
    const habits = readHabits();
    const habit = habits.find(h => h.id == habitId);
    
    if (!habit || !habit.notes) {
        console.warn('No notes found for habit');
        return;
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'notesModal';
    modal.className = 'notes-modal';
    
    modal.innerHTML = `
        <div class="notes-modal-content">
            <div class="notes-modal-header">
                <h3 class="notes-modal-title">Notes: ${habitTitle}</h3>
                <button class="notes-modal-close" onclick="closeNotesModal()">&times;</button>
            </div>
            <div class="notes-content">${habit.notes}</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeNotesModal();
        }
    };
    
    // Close on Escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            closeNotesModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    });
}

function closeNotesModal() {
    const modal = document.getElementById('notesModal');
    if (modal) {
        modal.remove();
    }
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
// ===== COLUMN MANAGEMENT FUNCTIONS =====

function clearAllColumns() {
    document.getElementById('morning-habits').innerHTML = '';
    document.getElementById('main-habits').innerHTML = '';
    document.getElementById('evening-habits').innerHTML = '';
    document.getElementById('wholeday-habits').innerHTML = '';
}

function showEmptyState() {
    const columns = ['morning-habits', 'main-habits', 'evening-habits', 'wholeday-habits'];
    columns.forEach(columnId => {
        document.getElementById(columnId).innerHTML = '<p class="empty-message">No habits yet</p>';
    });
}

function getColumnContainer(belongs) {
    const columnMap = {
        'morning': 'morning-habits',
        'main': 'main-habits', 
        'evening': 'evening-habits',
        'whole day': 'wholeday-habits'
    };
    
    return document.getElementById(columnMap[belongs] || 'wholeday-habits');
}

function displayHabitInColumn(habit) {
    // Get the correct column container
    const columnContainer = getColumnContainer(habit.belongs);
    
    // Create the habit element
    const display = document.createElement('div');
    display.setAttribute('data-habit-id', habit.id);
    display.className = 'habit-item';
    
    // ✅ ADD BACK ALL THE MISSING INFORMATION
    display.innerHTML = `
        <div class="habit-title">${habit.title}</div>
        <div class="habit-info">
            <strong>Project:</strong> ${habit.projectId}<br>
            <strong>Frequency:</strong> ${habit.getFrequencyDisplay()}<br>
            ${habit.counter !== 0 || habit.incrementation !== 0 ? `<strong>Counter:</strong> ${habit.counter} (+${habit.incrementation})<br>` : ''}
            <strong>Start Date:</strong> ${habit.startDate}<br>
            <strong>Last Completed:</strong> ${habit.lastCompleted || 'Never'}<br>
            <strong>Next Due:</strong> ${habit.nextDue}<br>
            <strong>Current Streak:</strong> ${habit.currentStreak}<br>
            <strong>Total Completed:</strong> ${habit.totalCompleted}<br>
            ${habit.notes && habit.notes.trim() !== '' ? `
                <div class="notes-section">
                    <span class="notes-label">Notes:</span>
                    <button class="show-notes-btn" onclick="showNotesModal('${habit.id}', '${habit.title}')">Show</button>
                </div>
            ` : ''}
        </div>
    `;
    
    // Add checkbox and controls (same as before)
    const isDue = isHabitDueToday(habit);
    const isCompletedToday = isHabitCompletedToday(habit);
    
    const completeCheckbox = document.createElement('input');
    completeCheckbox.type = 'checkbox';
    completeCheckbox.id = `complete-${habit.id}`;
    completeCheckbox.checked = isCompletedToday;
    
    const shouldShowCheckbox = isDue || isCompletedToday;
    completeCheckbox.disabled = !shouldShowCheckbox;
    completeCheckbox.style.display = shouldShowCheckbox ? 'inline' : 'none';
    
    const checkboxLabel = createCheckboxLabel(habit, isDue, isCompletedToday);
    
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => openEditModal(habit);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteHabitOptimized(habit);
    
    completeCheckbox.onclick = () => markHabitComplete(habit);

    // Add controls to habit
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'habit-controls';
    controlsDiv.appendChild(completeCheckbox);
    controlsDiv.appendChild(checkboxLabel);
    controlsDiv.appendChild(editBtn);
    controlsDiv.appendChild(deleteBtn);
    
    display.appendChild(controlsDiv);
    
    // Add to the correct column
    columnContainer.appendChild(display);
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
        // ✅ UPDATED: Check if we missed the scheduled due date
        const scheduledNextDue = calculateIntervalPatternNextDue(habit, lastCompletion);
        streakBroken = today > scheduledNextDue;
    } else if (habit.frequencyType === 'custom_weekdays') {
        streakBroken = checkIfCustomWeekdaysStreakBroken(lastCompletion, today, habit.customdays);
    }
    
    if (streakBroken) {
        console.log(`Streak broken for ${habit.title}! Resetting to 0. Days gap: ${daysSinceLastCompletion}`);
        habit.currentStreak = 0;
        
        if (habit.frequencyType === 'custom_weekdays') {
            const newNextDue = calculateNextDue(habit.frequencyType, habit.intervalday, habit.customdays, today);
            habit.nextDue = newNextDue;
        }
        // ✅ For intervals, nextDue will be recalculated by the pattern function
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
    
    // Update the habit info (title and details)
    const titleElement = existingDisplay.querySelector('.habit-title');
    const infoElement = existingDisplay.querySelector('.habit-info');
    
    if (titleElement) {
        titleElement.textContent = updatedHabit.title;
    }
    
    if (infoElement) {
    infoElement.innerHTML = `
        <strong>Project:</strong> ${updatedHabit.projectId}<br>
        <strong>Frequency:</strong> ${updatedHabit.getFrequencyDisplay()}<br>
        ${updatedHabit.counter !== 0 || updatedHabit.incrementation !== 0 ? `<strong>Counter:</strong> ${updatedHabit.counter} (+${updatedHabit.incrementation})<br>` : ''}
        <strong>Start Date:</strong> ${updatedHabit.startDate}<br>
        <strong>Last Completed:</strong> ${updatedHabit.lastCompleted || 'Never'}<br>
        <strong>Next Due:</strong> ${updatedHabit.nextDue}<br>
        <strong>Current Streak:</strong> ${updatedHabit.currentStreak}<br>
        <strong>Total Completed:</strong> ${updatedHabit.totalCompleted}<br>
        ${updatedHabit.notes && updatedHabit.notes.trim() !== '' ? `
            <div class="notes-section">
                <span class="notes-label">Notes:</span>
                <button class="show-notes-btn" onclick="showNotesModal('${updatedHabit.id}', '${updatedHabit.title}')">Show</button>
            </div>
        ` : ''}
    `;
}
    
    // ✅ SIMPLE FIX: Rebuild the entire controls section
    const controlsDiv = existingDisplay.querySelector('.habit-controls');
    if (controlsDiv) {
        // Clear old controls
        controlsDiv.innerHTML = '';
        
        // Recreate controls with updated state
        const isDue = isHabitDueToday(updatedHabit);
        const isCompletedToday = isHabitCompletedToday(updatedHabit);
        
        const completeCheckbox = document.createElement('input');
        completeCheckbox.type = 'checkbox';
        completeCheckbox.id = `complete-${updatedHabit.id}`;
        completeCheckbox.checked = isCompletedToday;
        
        const shouldShowCheckbox = isDue || isCompletedToday;
        completeCheckbox.disabled = !shouldShowCheckbox;
        completeCheckbox.style.display = shouldShowCheckbox ? 'inline' : 'none';
        
        const checkboxLabel = createCheckboxLabel(updatedHabit, isDue, isCompletedToday);
        
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => openEditModal(updatedHabit);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteHabitOptimized(updatedHabit);
        
        completeCheckbox.onclick = () => markHabitComplete(updatedHabit);

        // Add all controls back
        controlsDiv.appendChild(completeCheckbox);
        controlsDiv.appendChild(checkboxLabel);
        controlsDiv.appendChild(editBtn);
        controlsDiv.appendChild(deleteBtn);
    }
    
    console.log('Successfully updated habit display in place');
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
    
    // ✅ Clear all columns first
    clearAllColumns();
    
    if (habits.length === 0) {
        showEmptyState();
        return;
    }
    
    habits.forEach(habit => {
        const oldNextDue = habit.nextDue;
        habit.nextDue = recalculateNextDueFromStart(habit, today);
        
        const updatedHabit = autoUpdateStreakIfBroken(habit);
        
        if (oldNextDue !== habit.nextDue || updatedHabit !== habit) {
            updateHabitInStorage(updatedHabit);
        }
        
        // ✅ NEW: Apply smart scheduling filter + sort into columns
        if (showAllHabits || isHabitDueToday(updatedHabit) || isHabitCompletedToday(updatedHabit)) {
            displayHabitInColumn(updatedHabit);
        }
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

    document.getElementById('editNoteCheckbox').addEventListener('change', function() {
        const noteSection = document.getElementById('editNoteInputSection');
        noteSection.style.display = this.checked ? 'block' : 'none';
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
    const newProject = document.getElementById('editProject').value.trim() || 'default';
    const newColor = document.getElementById('editColor').value || 'default';
    const newBelongs = document.getElementById('editBelongs').value || 'whole day';
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
    
    let newNotes = '';
    if (document.getElementById('editNoteCheckbox').checked) {
        newNotes = document.getElementById('editNote').value || '';
    }

    const updatedHabit = {
        ...originalHabit,
        title: newTitle,
        projectId: newProject,
        color: newColor, // ✅ ADD THIS LINE
        belongs: newBelongs, 
        frequencyType: newFreq,
        intervalday: newIntervalday,
        customdays: newCustomdays,
        counter: newCounter,
        incrementation: newIncrementation,
        startDate: newStartDate,
        notes: newNotes
    };
    
    // Recalculate nextDue when editing
    const today = getTodayDate();
    updatedHabit.nextDue = recalculateNextDueFromStart(updatedHabit, today);
    
    updateHabitInStorage(updatedHabit);
    closeEditModal();
    loadHabits();
}

// ===== CREATE HABIT MODAL FUNCTIONS =====
function openCreateModal() {
    const modal = document.createElement('div');
    modal.id = 'createModal';
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
        <h2>Create New Habit</h2>
        
        <label for="modalTitleInput">Habit Title:</label>
        <input type="text" id="modalTitleInput" placeholder="e.g. Drink Water" required />
        <br><br>

        <label for="modalProjectInput">Project Name:</label>
        <input type="text" id="modalProjectInput" placeholder="e.g. Health, Fitness, Work" />
        <br><br>

        <label for="modalColorInput">Color:</label>
        <select id="modalColorInput">
            <option value="default">Default (Gray)</option>
            <option value="violet">Violet</option>
            <option value="red">Red</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
            <option value="orange">Orange</option>
            <option value="pink">Pink</option>
            <option value="cyan">Cyan</option>
            <option value="yellow">Yellow</option>
            <option value="purple">Purple</option>
        </select>
        <br><br>

        <label for="modalBelongsInput">Belongs to:</label>
        <select id="modalBelongsInput">
            <option value="whole day">Whole Day</option>
            <option value="morning">Morning</option>
            <option value="main">Main</option>
            <option value="evening">Evening</option>
        </select>
        <br><br>

        <label for="modalFreqInput">Frequency Type:</label>
        <select id="modalFreqInput" required>
            <option value="">-- Select Frequency --</option>
            <option value="daily">Daily</option>
            <option value="interval">Interval</option>
            <option value="custom_weekdays">Weekly</option>
        </select>
        <br><br>

        <div id="modalDailySection" style="display: none;">
            <p>Daily habit - no additional settings needed</p>
            <br>
        </div>

        <div id="modalIntervalSection" style="display: none;">
            <label for="modalIntervalDay">Every how many days?</label>
            <input type="number" id="modalIntervalDay" min="1" value="1">
            <br><br>
        </div>

        <div id="modalCustomSection" style="display: none;">
            <label>Select weekdays:</label><br>
            <input type="checkbox" id="modalMonday" value="monday"> Monday<br>
            <input type="checkbox" id="modalTuesday" value="tuesday"> Tuesday<br>
            <input type="checkbox" id="modalWednesday" value="wednesday"> Wednesday<br>
            <input type="checkbox" id="modalThursday" value="thursday"> Thursday<br>
            <input type="checkbox" id="modalFriday" value="friday"> Friday<br>
            <input type="checkbox" id="modalSaturday" value="saturday"> Saturday<br>
            <input type="checkbox" id="modalSunday" value="sunday"> Sunday<br>
            <br>
        </div>

        <label for="modalStartDate">Start Date:</label>
        <input type="date" id="modalStartDate" required />
        <br><br>

        <label for="modalCounterCheckbox">Need counter?</label>
        <input type="checkbox" id="modalCounterCheckbox">
        <br><br>

        <div id="modalCounterSection" style="display: none;">
            <label for="modalCounterValue">Counter start value:</label>
            <input type="number" id="modalCounterValue" value="0">
            <br><br>
            <label for="modalIncrementationValue">Incrementation value:</label>
            <input type="number" id="modalIncrementationValue" value="1">
            <br><br>
        </div>

        <label for="modalNoteCheckbox">Want to write note?</label>
        <input type="checkbox" id="modalNoteCheckbox">
        <br><br>

        <div id="modalNoteSection" style="display: none;">
            <label for="modalNoteValue">Note:</label>
            <textarea id="modalNoteValue" placeholder="Write your note here..." rows="3" cols="40"></textarea>
            <br><br>
        </div>

        <button type="button" id="createHabitBtn">Create Habit</button>
        <button type="button" id="cancelCreateBtn">Cancel</button>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Set default start date to today
    const today = getTodayDate();
    document.getElementById('modalStartDate').value = today;

    // Setup event listeners
    setupCreateModalEventListeners();

    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeCreateModal();
        }
    };
}

function setupCreateModalEventListeners() {
    // Frequency type change
    document.getElementById('modalFreqInput').addEventListener('change', function() {
        const selectedValue = this.value;
        
        // Hide all sections
        document.getElementById('modalDailySection').style.display = 'none';
        document.getElementById('modalIntervalSection').style.display = 'none';
        document.getElementById('modalCustomSection').style.display = 'none';
        
        // Show relevant section
        if (selectedValue === 'daily') {
            document.getElementById('modalDailySection').style.display = 'block';
        } else if (selectedValue === 'interval') {
            document.getElementById('modalIntervalSection').style.display = 'block';
        } else if (selectedValue === 'custom_weekdays') {
            document.getElementById('modalCustomSection').style.display = 'block';
        }
    });

    // Counter checkbox
    document.getElementById('modalCounterCheckbox').addEventListener('change', function() {
        const counterSection = document.getElementById('modalCounterSection');
        counterSection.style.display = this.checked ? 'block' : 'none';
    });

    // Note checkbox
    document.getElementById('modalNoteCheckbox').addEventListener('change', function() {
        const noteSection = document.getElementById('modalNoteSection');
        noteSection.style.display = this.checked ? 'block' : 'none';
    });

    // Create button
    document.getElementById('createHabitBtn').onclick = createHabitFromModal;
    
    // Cancel button
    document.getElementById('cancelCreateBtn').onclick = closeCreateModal;
}

function closeCreateModal() {
    const modal = document.getElementById('createModal');
    if (modal) {
        modal.remove();
    }
}

function createHabitFromModal() {
    const title = document.getElementById('modalTitleInput').value;
    const freq = document.getElementById('modalFreqInput').value;
    const startDate = document.getElementById('modalStartDate').value;
    const projectName = document.getElementById('modalProjectInput').value.trim() || 'default';
    const selectedColor = document.getElementById('modalColorInput').value || 'default';
    const selectedBelongs = document.getElementById('modalBelongsInput').value || 'whole day';
    
    // Validate required fields
    if (!title || !freq) {
        alert('Please fill in all required fields');
        return;
    }
    
    let intervalday = null;
    let customdays = '';

    if (freq === 'interval') {
        intervalday = Math.max(1, parseInt(document.getElementById('modalIntervalDay').value) || 1);
    }

    if (freq === 'custom_weekdays') {
        customdays = getSelectedModalWeekdays();
    }

    let counter = 0;
    let incrementation = 0; 

    if (document.getElementById('modalCounterCheckbox').checked) {
        counter = parseInt(document.getElementById('modalCounterValue').value) || 0;
        incrementation = parseInt(document.getElementById('modalIncrementationValue').value) || 1;
    }

    let note = '';
    if (document.getElementById('modalNoteCheckbox').checked) {
        note = document.getElementById('modalNoteValue').value || '';
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
            projectName,
            startDate,
            note,
            selectedColor,
            selectedBelongs
        );
        
        closeCreateModal();
        loadHabits();
        
    } catch (error) {
        console.error('Error creating habit:', error);
        alert('Error creating habit: ' + error.message);
    }
}

function getSelectedModalWeekdays() {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const selected = [];
    
    weekdays.forEach(day => {
        const checkbox = document.getElementById('modal' + day.charAt(0).toUpperCase() + day.slice(1));
        if (checkbox && checkbox.checked) {
            selected.push(day);
        }
    });
    
    return selected.join(',');
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

        <label for="editProject">Project Name:</label>
        <input type="text" id="editProject" value="${habit.projectId}" placeholder="e.g. Health, Fitness, Work" />
        <br><br>

        <label for="editColor">Color:</label>
        <select id="editColor">
        <option value="default" ${habit.color === 'default' ? 'selected' : ''}>Default (Gray)</option>
        <option value="violet" ${habit.color === 'violet' ? 'selected' : ''}>Violet</option>
        <option value="red" ${habit.color === 'red' ? 'selected' : ''}>Red</option>
        <option value="green" ${habit.color === 'green' ? 'selected' : ''}>Green</option>
        <option value="blue" ${habit.color === 'blue' ? 'selected' : ''}>Blue</option>
        <option value="orange" ${habit.color === 'orange' ? 'selected' : ''}>Orange</option>
        <option value="pink" ${habit.color === 'pink' ? 'selected' : ''}>Pink</option>
        <option value="cyan" ${habit.color === 'cyan' ? 'selected' : ''}>Cyan</option>
        <option value="yellow" ${habit.color === 'yellow' ? 'selected' : ''}>Yellow</option>
        <option value="purple" ${habit.color === 'purple' ? 'selected' : ''}>Purple</option>
        </select>
        <br><br>

        <!-- ✅ ADD THIS BELONGS SECTION -->
    <label for="editBelongs">Belongs to:</label>
    <select id="editBelongs">
        <option value="whole day" ${habit.belongs === 'whole day' ? 'selected' : ''}>Whole Day</option>
        <option value="morning" ${habit.belongs === 'morning' ? 'selected' : ''}>Morning</option>
        <option value="main" ${habit.belongs === 'main' ? 'selected' : ''}>Main</option>
        <option value="evening" ${habit.belongs === 'evening' ? 'selected' : ''}>Evening</option>
    </select>
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

        <label for="editNoteCheckbox">Want to edit note?</label>
<input type="checkbox" id="editNoteCheckbox" ${habit.notes && habit.notes.trim() !== '' ? 'checked' : ''}>
<br><br>

<div id="editNoteInputSection" style="display: ${habit.notes && habit.notes.trim() !== '' ? 'block' : 'none'};">
    <label for="editNote">Note:</label>
    <textarea id="editNote" placeholder="Write your note here..." rows="3" cols="40">${habit.notes || ''}</textarea>
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
// ===== NEW CODE - USE THIS =====
showFormButton.addEventListener('click', function () {
    openCreateModal(); // ✅ Simply call the modal function
});
// ===== TOGGLE VIEW EVENT LISTENER =====
toggleViewButton.addEventListener('click', function() {
    showAllHabits = !showAllHabits; // Flip the state
    
    // Update button text
    toggleViewButton.textContent = showAllHabits ? 'Show Today Only' : 'Show All Habits';
    
    // Reload habits with new filter
    loadHabits();
});




// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', loadHabits);