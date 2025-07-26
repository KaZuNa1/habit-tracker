const fs = require('fs');
const path = require('path');
const Habit = require('./Habit');

const dataDir = path.join(__dirname, '..', 'data');
const dataFilePath = path.join(dataDir, 'habits.json');

/**
 * Reads all habits from storage and converts them to Habit instances
 * @returns {Array<Habit>} Array of Habit objects
 */
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
    
    // Convert plain objects back to Habit instances with backward compatibility
    return plainData.map(habitData => new Habit(
        habitData.id,
        habitData.title, 
        habitData.frequencyType,
        habitData.intervalday,
        habitData.customdays,
        habitData.counter,
        habitData.incrementation,
        habitData.projectId || "default",
        habitData.lastCompleted || null,
        habitData.nextDue || null,
        habitData.isActiveToday || false,
        habitData.currentStreak || 0,
        habitData.totalCompleted || 0,
        habitData.completionHistory || [],
        habitData.isActive !== undefined ? habitData.isActive : true,
        habitData.createdDate || new Date().toISOString().split('T')[0],
        habitData.notes || "",
        habitData.belongs || habitData.priority || "whole day",
        habitData.startDate || habitData.createdDate || new Date().toISOString().split('T')[0],
        habitData.color || "default",
        habitData.columnIndex || 999
    ));
    
  } catch (error) {
    console.error('Error reading habits file:', error);
    return [];
  }
}

/**
 * Writes habit array to storage file
 * @param {Array<Habit>} habits - Array of habits to save
 */
function writeHabits(habits) {
  // Ensure data directory exists
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

/**
 * Adds a new habit to storage
 * @param {Habit} habitObject - The habit instance to save
 */
function saveHabit(habitObject) {
  const habits = readHabits();
  habits.push(habitObject);
  writeHabits(habits);
}

/**
 * Removes a habit from storage by ID
 * @param {Habit} habitToDelete - The habit to remove
 */
function removeHabit(habitToDelete) {
  const allHabits = readHabits();
  const remainingHabits = allHabits.filter(habit => 
    habit.id !== habitToDelete.id
  );
  writeHabits(remainingHabits);
}

module.exports = {
  saveHabit,
  readHabits,
  removeHabit,
  writeHabits
};