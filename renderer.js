// ===== IMPORTS =====
const { createHabit } = require('./logic/habitManager');
const { readHabits, removeHabit } = require('./logic/storage');

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
function markHabitComplete(habit) {
    console.log('Marking habit complete:', habit.title);
    
    // Update habit data (we'll implement this next)
    updateHabitProgress(habit);
    
    // Refresh display
    loadHabits();
}

// ===== HELPER FUNCTIONS =====
// ... your existing helper functions ...

function calculateStreak(completionHistory, todayDate) {
    // If no completions yet, streak is 1 (today is first)
    if (completionHistory.length === 0) {
        return 1;
    }
    
    // Add today to the history for calculation
    const allCompletions = [...completionHistory, todayDate];
    
    // Sort dates to make sure they're in order
    allCompletions.sort();
    
    let streak = 1; // Today counts as 1
    
    // Work backwards from today
    for (let i = allCompletions.length - 2; i >= 0; i--) {
        const currentDate = new Date(allCompletions[i + 1]);
        const previousDate = new Date(allCompletions[i]);
        
        // Calculate days between dates
        const daysDifference = Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24));
        
        // If previous completion was yesterday, continue streak
        if (daysDifference === 1) {
            streak++;
        } else {
            // Gap found, streak breaks
            break;
        }
    }
    
    return streak;
}

function updateHabitProgress(habit) {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Update counter (THIS WORKS - just math)
    const newCounter = habit.counter + habit.incrementation;
    
    // 2. Update completion tracking (THIS WORKS - just math)
    const newTotalCompleted = habit.totalCompleted + 1;
    const newCompletionHistory = [...habit.completionHistory, today];
    
    // 3. Update streak (❌ CALLS calculateStreak - NOT DEFINED YET)
    const newStreak = calculateStreak(habit.completionHistory, today);
    
    // 4. Update dates (❌ CALLS calculateNextDue - NOT DEFINED YET)
    const newNextDue = calculateNextDue(habit.frequencyType, habit.intervalday, habit.customdays, today);
    
    // Create updated habit object (THIS WORKS)
    const updatedHabit = { /* ... */ };
    
    // Save to storage (❌ CALLS updateHabitInStorage - NOT DEFINED YET)
    updateHabitInStorage(updatedHabit);
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
        counter = document.getElementById('counter_value').value || 0;
        incrementation = document.getElementById('incrementation_value').value || 1;
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
            displayHabit(habit);
        });
    }
}

function displayHabit(habit) {
    const display = document.createElement('p');
    display.innerHTML = habit.info();

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteHabit(habit);

    const completeBtn = document.createElement('button');
    completeBtn.textContent = 'Mark as Complete';
    completeBtn.onclick = () => markHabitComplete(habit);

    display.appendChild(completeBtn);
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