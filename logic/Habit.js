
class Habit{
   constructor(id, title, frequencyType, counter, incrementation, customdays, intervalday){
       this.id = id;
       this.title = title;
       this.frequencyType = frequencyType;
       this.counter = counter;
       this.incrementation = incrementation;
       this.customdays = customdays;
       this.intervalday = intervalday;
   }
   info() {
       return `ID: ${this.id}<br>Title: ${this.title}<br>Frequency: ${this.frequencyType}<br>Counter: ${this.counter}<br>Incrementation: ${this.incrementation}<br>Custom Days: ${this.customdays}<br>Interval Day: ${this.intervalday}`;
   }
}


module.exports = Habit;