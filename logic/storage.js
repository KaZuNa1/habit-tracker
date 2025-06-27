const fs = require('fs');
const path = require('path');
const Habit = require('./Habit'); // Add this line

const dataDir = path.join(__dirname, '..', 'data');
const dataFilePath = path.join(dataDir, 'habits.json');

// 📥 Read habits from the file (returns array)
function readHabits() {
  if (!fs.existsSync(dataFilePath)) {
    return [];
  }

  try {
    const rawData = fs.readFileSync(dataFilePath, 'utf8');
    
    if (!rawData.trim()) {
      return [];
    }
    
    const plainData = JSON.parse(rawData);
    
    // Convert plain objects back to Habit instances with ALL 7 parameters
    return plainData.map(habitData => new Habit(
      habitData.id,
      habitData.title, 
      habitData.frequencyType,
      habitData.counter,
      habitData.incrementation,
      habitData.customdays,
      habitData.intervalday
    ));
    
  } catch (error) {
    console.error('Error reading habits file:', error);
    return [];
  }
}

// 💾 Save updated habit list to file
function writeHabits(habits) {
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(habits, null, 2));
  } catch (error) {
    console.error('Error writing habits file:', error);
    throw error;
  }
}

// 📌 Main function to save one habit
function saveHabit(habitObject) {
  const habits = readHabits();
  habits.push(habitObject);
  writeHabits(habits);
}

function removeHabit(habitToDelete){
  const allHabits = readHabits();
  const remainingHabits = allHabits.filter(habit => 
    habit.id !== habitToDelete.id  // ✅ Compare unique IDs
  );
  writeHabits(remainingHabits);
}

module.exports = {
  saveHabit,
  readHabits, // Export this in case you need it later
  removeHabit
};

