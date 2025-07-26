// IMPORTS
const { createHabit } = require('./logic/habitManager');
const { readHabits, removeHabit, writeHabits } = require('./logic/storage');
const { calculateNextDue, calculateNextDueAfterCompletion, checkIfCustomWeekdaysStreakBroken, recalculateNextDueFromStart, calculateIntervalPatternNextDue } = require('./logic/dateUtils');

// DOM ELEMENTS
const showFormButton = document.getElementById('createHabitButton');
const toggleViewButton = document.getElementById('toggleViewButton');
const displayArea = document.getElementById('habitDisplayArea');

// TOGGLE STATE
let showAllHabits = false;

// Form sections
const dailySection = document.getElementById('daily_sec');
const intervalSection = document.getElementById('intervalday_section');
const customSection = document.getElementById('custom_weekdays_section');
const counterSection = document.getElementById('counter_section');
const noteSection = document.getElementById('note_section');

// CONSTANTS
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const COLORS = {
    SUCCESS: '#28a745',
    INFO: '#666',
    DEFAULT: '#000'
};

const HABIT_COLORS = {
    default: '#6c757d',
    violet: '#8e44ad',
    red: '#e74c3c',
    green: '#27ae60',
    blue: '#3498db',
    orange: '#f39c12',
    pink: '#e91e63',
    cyan: '#17a2b8',
    yellow: '#f1c40f',
    purple: '#9b59b6'
};

// UTILITY FUNCTIONS
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// COLUMN HELPER FUNCTIONS
function getHabitsForColumn(columnName, applyDateFilter = true) {
    const allHabits = readHabits();
    let columnHabits = allHabits.filter(habit => habit.belongs === columnName);
    
    if (applyDateFilter && !showAllHabits) {
        columnHabits = columnHabits.filter(habit => {
            return isHabitDueToday(habit) || isHabitCompletedToday(habit);
        });
    }
    
    return columnHabits.sort((a, b) => {
        const indexA = a.columnIndex || 999;
        const indexB = b.columnIndex || 999;
        return indexA - indexB;
    });
}

function showEmptyColumnMessage(container, columnName) {
    const columnConfig = {
        'morning': { name: 'Morning', icon: '🌅' },
        'main': { name: 'Main', icon: '☀️' },
        'evening': { name: 'Evening', icon: '🌆' },
        'whole day': { name: 'Whole Day', icon: '🌙' }
    };
    
    const config = columnConfig[columnName] || { name: 'Unknown', icon: '❓' };
    
    if (showAllHabits) {
        container.innerHTML = `
            <div class="empty-column-message">
                <p>${config.icon}</p>
                <p>No ${config.name.toLowerCase()} habits yet</p>
                <small>Create habits or drag them here</small>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="empty-column-message">
                <p>${config.icon}</p>
                <p>Nothing due right now</p>
                <small>Great job staying on track!</small>
            </div>
        `;
    }
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

// NOTES MODAL FUNCTIONS
function showNotesModal(habitId, habitTitle) {
    const habits = readHabits();
    const habit = habits.find(h => h.id == habitId);
    
    if (!habit || !habit.notes) {
        return;
    }
    
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
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeNotesModal();
        }
    };
    
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

// STORAGE FUNCTIONS
function updateHabitInStorage(updatedHabit) {
    const allHabits = readHabits();
    const updatedHabits = allHabits.map(habit => 
        habit.id === updatedHabit.id ? updatedHabit : habit
    );
    writeHabits(updatedHabits);
}

// DRAG & DROP FUNCTIONALITY
let sortableInstances = {};

function initializeDragAndDrop() {
    if (!showAllHabits) {
        return;
    }
    
    destroyDragAndDrop();
    
    const columns = ['morning', 'main', 'evening', 'wholeday'];
    
    columns.forEach(columnName => {
        const columnContainer = document.getElementById(`${columnName}-habits`);
        
        if (columnContainer) {
            sortableInstances[columnName] = Sortable.create(columnContainer, {
                group: 'habits',
                animation: 200,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                draggable: '.habit-item',
                
                onEnd: function(evt) {
                    const sourceColumn = evt.from.id.replace('-habits', '');
                    const targetColumn = evt.to.id.replace('-habits', '');
                    
                    handleHabitReorder(sourceColumn, targetColumn, evt.oldIndex, evt.newIndex, evt.item);
                }
            });
        }
    });
}

function handleHabitReorder(sourceColumn, targetColumn, oldIndex, newIndex, draggedElement) {
    const habitId = draggedElement.getAttribute('data-habit-id');
    const habits = readHabits();
    const draggedHabit = habits.find(h => h.id == habitId);
    
    if (!draggedHabit) {
        return;
    }
    
    if (sourceColumn === targetColumn) {
        reorderWithinColumn(sourceColumn, draggedHabit.id, newIndex);
    } else {
        moveBetweenColumns(draggedHabit.id, sourceColumn, targetColumn, newIndex);
    }
}

function reorderWithinColumn(columnName, draggedHabitId, newPosition) {
    const habits = readHabits();
    const columnHabits = habits.filter(h => h.belongs === columnName);
    
    columnHabits.sort((a, b) => (a.columnIndex || 999) - (b.columnIndex || 999));
    
    const draggedHabitIndex = columnHabits.findIndex(h => h.id == draggedHabitId);
    const draggedHabit = columnHabits.splice(draggedHabitIndex, 1)[0];
    
    columnHabits.splice(newPosition, 0, draggedHabit);
    
    columnHabits.forEach((habit, index) => {
        habit.columnIndex = index + 1;
        updateHabitInStorage(habit);
    });
}

function moveBetweenColumns(draggedHabitId, sourceColumn, targetColumn, newPosition) {
    const habits = readHabits();
    const draggedHabit = habits.find(h => h.id == draggedHabitId);
    
    draggedHabit.belongs = targetColumn;
    
    const targetColumnHabits = habits.filter(h => h.belongs === targetColumn && h.id != draggedHabitId);
    
    targetColumnHabits.sort((a, b) => (a.columnIndex || 999) - (b.columnIndex || 999));
    
    targetColumnHabits.splice(newPosition, 0, draggedHabit);
    
    targetColumnHabits.forEach((habit, index) => {
        habit.columnIndex = index + 1;
        updateHabitInStorage(habit);
    });
    
    const sourceColumnHabits = habits.filter(h => h.belongs === sourceColumn);
    sourceColumnHabits.sort((a, b) => (a.columnIndex || 999) - (b.columnIndex || 999));
    sourceColumnHabits.forEach((habit, index) => {
        habit.columnIndex = index + 1;
        updateHabitInStorage(habit);
    });
}

function destroyDragAndDrop() {
    Object.values(sortableInstances).forEach(instance => {
        if (instance) {
            instance.destroy();
        }
    });
    sortableInstances = {};
}

// HABIT STATUS FUNCTIONS
function isHabitDueToday(habit) {
    const today = getTodayDate();
    
    if (today < habit.startDate) {
        return false;
    }
    
    if (!habit.nextDue) {
        return true;
    }
    
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

// COLUMN MANAGEMENT FUNCTIONS
function clearAllColumns() {
    const columnIds = ['morning-habits', 'main-habits', 'evening-habits', 'wholeday-habits'];
    
    columnIds.forEach(columnId => {
        const container = document.getElementById(columnId);
        if (container) {
            container.innerHTML = '';
        }
    });
}

function fixInvalidBelongs() {
    const habits = readHabits();
    const validColumns = ['morning', 'main', 'evening', 'whole day'];
    let fixedCount = 0;
    
    habits.forEach(habit => {
        if (!validColumns.includes(habit.belongs)) {
            habit.belongs = 'whole day';
            habit.columnIndex = 999;
            updateHabitInStorage(habit);
            fixedCount++;
        }
    });
    
    if (fixedCount > 0) {
        loadHabits();
    }
}

function getColumnContainer(belongs) {
    const columnMap = {
        'morning': 'morning-habits',
        'main': 'main-habits', 
        'evening': 'evening-habits',
        'whole day': 'wholeday-habits'
    };
    
    const containerId = columnMap[belongs];
    if (!containerId) {
        return document.getElementById('wholeday-habits');
    }
    
    const container = document.getElementById(containerId);
    if (!container) {
        return document.getElementById('wholeday-habits');
    }
    
    return container;
}

function displayHabitInColumn(habit) {
    const columnContainer = getColumnContainer(habit.belongs);
    
    const display = document.createElement('div');
    display.setAttribute('data-habit-id', habit.id);
    display.className = 'habit-item';
    
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

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'habit-controls';
    controlsDiv.appendChild(completeCheckbox);
    controlsDiv.appendChild(checkboxLabel);
    controlsDiv.appendChild(editBtn);
    controlsDiv.appendChild(deleteBtn);
    
    display.appendChild(controlsDiv);
    columnContainer.appendChild(display);
}

// STREAK CALCULATION
function calculateStreak(completionHistory, todayDate, lastDueDate, frequencyType = 'daily', intervalday = 1, customdays = '') {
    if (completionHistory.length === 0) {
        return 1;
    }
    
    const allCompletions = [...completionHistory, todayDate];
    allCompletions.sort();
    
    let streak = 1;
    
    for (let i = allCompletions.length - 2; i >= 0; i--) {
        const currentDate = new Date(allCompletions[i + 1]);
        const previousDate = new Date(allCompletions[i]);
        
        const daysDifference = Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24));
        
        let expectedGap = 1;
        if (frequencyType === 'interval') {
            expectedGap = parseInt(intervalday);
        } else if (frequencyType === 'custom_weekdays') {
            expectedGap = 1;
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
        const scheduledNextDue = calculateIntervalPatternNextDue(habit, lastCompletion);
        streakBroken = today > scheduledNextDue;
    } else if (habit.frequencyType === 'custom_weekdays') {
        streakBroken = checkIfCustomWeekdaysStreakBroken(lastCompletion, today, habit.customdays);
    }
    
    if (streakBroken) {
        habit.currentStreak = 0;
        
        if (habit.frequencyType === 'custom_weekdays') {
            const newNextDue = calculateNextDue(habit.frequencyType, habit.intervalday, habit.customdays, today);
            habit.nextDue = newNextDue;
        }
    }
    
    return habit;
}

// HABIT PROGRESS FUNCTIONS
function updateHabitProgress(habit) {
    const today = getTodayDate();
    
    const newCounter = parseInt(habit.counter) + parseInt(habit.incrementation);
    const newTotalCompleted = habit.totalCompleted + 1;
    const newCompletionHistory = [...habit.completionHistory, today];
    
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
    
    const newNextDue = calculateNextDueAfterCompletion(habit.frequencyType, habit.intervalday, habit.customdays, today);
    
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
    
    updateHabitInStorage(updatedHabit);
}

function undoHabitCompletion(habit) {
    const today = getTodayDate();
    
    const updatedHistory = habit.completionHistory.filter(date => date !== today);
    const revertedCounter = habit.counter - habit.incrementation;
    const revertedTotal = Math.max(0, habit.totalCompleted - 1);
    
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
}

// DISPLAY FUNCTIONS
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
        loadHabits();
        return;
    }
    
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
    
    const controlsDiv = existingDisplay.querySelector('.habit-controls');
    if (controlsDiv) {
        controlsDiv.innerHTML = '';
        
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

        controlsDiv.appendChild(completeCheckbox);
        controlsDiv.appendChild(checkboxLabel);
        controlsDiv.appendChild(editBtn);
        controlsDiv.appendChild(deleteBtn);
    }
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
        updateHabitProgress(habit);
        const allHabits = readHabits();
        const updatedHabit = allHabits.find(h => h.id === habit.id);
        updateSingleHabitDisplay(updatedHabit);
    } else if (isCompletedToday && !checkbox.checked) {
        undoHabitCompletion(habit);
        const allHabits = readHabits();
        const updatedHabit = allHabits.find(h => h.id === habit.id);
        updateSingleHabitDisplay(updatedHabit);
    } else {
        checkbox.checked = isCompletedToday;
    }
}

function deleteHabitOptimized(habitToDelete) {
    removeHabit(habitToDelete);
    
    const habitElement = document.querySelector(`[data-habit-id="${habitToDelete.id}"]`);
    if (habitElement) {
        habitElement.remove();
    }
    
    const remainingHabits = readHabits();
    if (remainingHabits.length === 0) {
        displayArea.innerHTML = '<p>No habits yet!</p>';
    }
}

function loadHabits() {
    const habits = readHabits();
    const today = getTodayDate();
    
    clearAllColumns();
    
    if (habits.length === 0) {
        const firstColumn = document.getElementById('morning-habits');
        if (firstColumn) {
            firstColumn.innerHTML = `
                <div class="empty-state">
                    <h3>🌟 Start Your Habit Journey!</h3>
                    <p>Create your first habit to begin building better routines.</p>
                    <button onclick="document.getElementById('createHabitButton').click()" class="btn btn-primary" style="margin-top: 12px;">
                        Create Your First Habit
                    </button>
                </div>
            `;
        }
        return;
    }
    
    const columns = ['morning', 'main', 'evening', 'whole day'];
    
    columns.forEach(columnName => {
        let columnHabits = habits.filter(habit => habit.belongs === columnName);
        
        columnHabits = columnHabits.map(habit => {
            const oldNextDue = habit.nextDue;
            habit.nextDue = recalculateNextDueFromStart(habit, today);
            
            const updatedHabit = autoUpdateStreakIfBroken(habit);
            
            if (oldNextDue !== habit.nextDue || updatedHabit !== habit) {
                updateHabitInStorage(updatedHabit);
            }
            
            return updatedHabit;
        });
        
        const filteredHabits = columnHabits.filter(habit => {
            return showAllHabits || isHabitDueToday(habit) || isHabitCompletedToday(habit);
        });
        
        const sortedHabits = filteredHabits.sort((a, b) => {
            const indexA = a.columnIndex || 999;
            const indexB = b.columnIndex || 999;
            return indexA - indexB;
        });
        
        const columnContainer = getColumnContainer(columnName);
        if (sortedHabits.length === 0) {
            showEmptyColumnMessage(columnContainer, columnName);
        } else {
            columnContainer.innerHTML = '';
            sortedHabits.forEach(habit => {
                displayHabitInColumn(habit);
            });
        }
    });
    
    setTimeout(() => {
        initializeDragAndDrop();
    }, 100);
}

// EDIT MODAL FUNCTIONS
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
    
    let newColumnIndex = originalHabit.columnIndex;
    if (newBelongs !== originalHabit.belongs) {
        const allHabits = readHabits();
        const sameColumnHabits = allHabits.filter(h => h.belongs === newBelongs);
        const maxIndex = sameColumnHabits.length > 0 
            ? Math.max(...sameColumnHabits.map(h => h.columnIndex || 0))
            : 0;
        newColumnIndex = maxIndex + 1;
    }
    
    const updatedHabit = {
        ...originalHabit,
        title: newTitle,
        projectId: newProject,
        color: newColor,
        belongs: newBelongs,
        frequencyType: newFreq,
        intervalday: newIntervalday,
        customdays: newCustomdays,
        counter: newCounter,
        incrementation: newIncrementation,
        startDate: newStartDate,
        notes: newNotes,
        columnIndex: newColumnIndex
    };
    
    const today = getTodayDate();
    updatedHabit.nextDue = recalculateNextDueFromStart(updatedHabit, today);
    
    updateHabitInStorage(updatedHabit);
    closeEditModal();
    loadHabits();
}

// CREATE HABIT MODAL FUNCTIONS
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

    const today = getTodayDate();
    document.getElementById('modalStartDate').value = today;

    setupCreateModalEventListeners();

    modal.onclick = (e) => {
        if (e.target === modal) {
            closeCreateModal();
        }
    };
}

function setupCreateModalEventListeners() {
    document.getElementById('modalFreqInput').addEventListener('change', function() {
        const selectedValue = this.value;
        
        document.getElementById('modalDailySection').style.display = 'none';
        document.getElementById('modalIntervalSection').style.display = 'none';
        document.getElementById('modalCustomSection').style.display = 'none';
        
        if (selectedValue === 'daily') {
            document.getElementById('modalDailySection').style.display = 'block';
        } else if (selectedValue === 'interval') {
            document.getElementById('modalIntervalSection').style.display = 'block';
        } else if (selectedValue === 'custom_weekdays') {
            document.getElementById('modalCustomSection').style.display = 'block';
        }
    });

    document.getElementById('modalCounterCheckbox').addEventListener('change', function() {
        const counterSection = document.getElementById('modalCounterSection');
        counterSection.style.display = this.checked ? 'block' : 'none';
    });

    document.getElementById('modalNoteCheckbox').addEventListener('change', function() {
        const noteSection = document.getElementById('modalNoteSection');
        noteSection.style.display = this.checked ? 'block' : 'none';
    });

    document.getElementById('createHabitBtn').onclick = createHabitFromModal;
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

// EVENT LISTENERS
showFormButton.addEventListener('click', function () {
    openCreateModal();
});

toggleViewButton.addEventListener('click', function() {
    showAllHabits = !showAllHabits;
    
    if (showAllHabits) {
        toggleViewButton.textContent = '🎯 Today Focus';
        toggleViewButton.className = 'btn btn-primary';
        document.body.classList.remove('smart-view');
        document.body.classList.add('organize-view');
    } else {
        toggleViewButton.textContent = '📝 Organize Habits';
        toggleViewButton.className = 'btn btn-secondary';
        document.body.classList.remove('organize-view');
        document.body.classList.add('smart-view');
        destroyDragAndDrop();
    }
    
    loadHabits();
});

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        document.getElementById('createHabitButton').click();
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
        event.preventDefault();
        document.getElementById('toggleViewButton').click();
    }
    
    if (event.key === 'Escape') {
        closeCreateModal();
        closeEditModal();
        closeNotesModal();
    }
});

// BUTTON FEEDBACK
function addButtonFeedback() {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });
}

// SUCCESS FEEDBACK SYSTEM
function showSuccessMessage(message, duration = 3000) {
    const existing = document.getElementById('successMessage');
    if (existing) existing.remove();
    
    const successDiv = document.createElement('div');
    successDiv.id = 'successMessage';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-color);
        color: white;
        padding: 12px 20px;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 2000;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => successDiv.remove(), 300);
        }
    }, duration);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// INITIALIZE APP STATE
document.addEventListener('DOMContentLoaded', function() {
    if (showAllHabits) {
        document.body.classList.add('organize-view');
        toggleViewButton.textContent = '🎯 Today Focus';
        toggleViewButton.className = 'btn btn-primary';
    } else {
        document.body.classList.add('smart-view');
        toggleViewButton.textContent = '📝 Organize Habits';
        toggleViewButton.className = 'btn btn-secondary';
    }
    
    fixInvalidBelongs();
    loadHabits();
    addButtonFeedback();
});