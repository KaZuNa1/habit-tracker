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

// ===== EVENT LISTENERS =====

// Show form when button clicked
showFormButton.addEventListener('click', function () {
    form.style.display = 'block';
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
    
    let intervalday = 1;
    let customdays = '';

    if (freq == 'interval') {
      intervalday = document.getElementById('intervalday').value ||1;

      if (!intervalday || intervalday < 1) {
        intervalday = 1; // Default to 1 if empty or invalid
    }
    }

    if (freq == 'custom_weekdays') {
      customdays = getSelectedWeekdays();
    }



    console.log('Creating habit:', title, freq,customdays,intervalday);

    try {
        const habit = createHabit(
            Date.now(),           // id
            title,                // title
            freq,                 // frequencyType
            intervalday,      // counter
            customdays,      // incrementation
            "empty for now",      // customdays
            "empty for now"       // intervalday
        );
        
        loadHabits();
        
        // Reset and hide form
        form.reset();
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