const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },        // Task title
  description: { type: String },                  // Optional details
  completed: { type: Boolean, default: false },   // Status
  dueDate: { type: Date },                        // Deadline
  userId: {                                       // Link task to a specific user
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });                         // Auto add createdAt & updatedAt

// Virtual property to check if overdue
TaskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  return !this.completed && new Date() > this.dueDate;
});

// Ensure virtuals are included when converting to JSON
TaskSchema.set('toObject', { virtuals: true });
TaskSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Task', TaskSchema);
