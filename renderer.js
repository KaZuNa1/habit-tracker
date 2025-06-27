const { createHabit } = require('./logic/habitManager');
const { readHabits,removeHabit } = require('./logic/storage');

// 👉 Show form when 'Create Habit' button is clicked
const showFormButton = document.getElementById('createHabitButton');
const form = document.getElementById('habitForm');
const displayArea = document.getElementById('habitDisplayArea');

showFormButton.addEventListener('click', function () {
  form.style.display = 'block';
});


// 👉 Handle form submission
form.addEventListener('submit', function (e) {
  e.preventDefault(); // Stop page reload

  const title = document.getElementById('titleInput').value;
  const freq = document.getElementById('freqInput').value;

  console.log('Creating habit:', title, freq); // Debug log

try {
  const habit = createHabit(
    Date.now(),           // id (still need unique ID)
    title,                // title (from form)
    freq,                 // frequencyType (from form)
    "empty for now",      // counter
    "empty for now",      // incrementation
    "empty for now",      // customdays
    "empty for now"       // intervalday
  );
  loadHabits();  // ✅ Change this line - reload everything instead of just adding one

  // ✅ Reset & hide form after submit
  form.reset();
  form.style.display = 'none';
} catch (error) {
  console.error('Error creating habit:', error);
  alert('Error creating habit: ' + error.message);
}
});


function loadHabits(){
  const habits = readHabits();
  console.log('Loaded habits:', habits);
  console.log('Habits length:', habits.length);  // Add this
  console.log('Type of habits:', typeof habits);  // Add this
  
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

function displayHabit(habit){
    const display = document.createElement('p');
    display.innerHTML = habit.info();

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '  Delete';
    deleteBtn.onclick = () => deleteHabit(habit);
    
    display.appendChild(deleteBtn);
    displayArea.appendChild(display);
}


function deleteHabit(habitToDelete){  // lowercase 'h' (JavaScript convention)
    removeHabit(habitToDelete);       // lowercase 'h' here too
    displayArea.innerHTML = '';
    loadHabits();
}

document.addEventListener('DOMContentLoaded', loadHabits); 