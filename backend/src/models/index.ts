import mongoose, { Schema, Document } from 'mongoose';

// ─── Assignment ───────────────────────────────────────────────────────────────

const QuestionConfigSchema = new Schema({
  type: String, label: String, count: Number, marksEach: Number,
}, { _id: false });

const QuestionSchema = new Schema({
  id: String, text: String, type: String, difficulty: String,
  marks: Number, options: [String], answer: String,
}, { _id: false });

const SectionSchema = new Schema({
  id: String, label: String, title: String,
  instruction: String, totalMarks: Number,
  questions: [QuestionSchema],
}, { _id: false });

const PaperSchema = new Schema({
  id: String, assignmentId: String,
  schoolName: String, teacherName: String,
  title: String, subject: String, grade: String,
  duration: Number, totalMarks: Number,
  sections: [SectionSchema],
  generatedAt: Date,
}, { _id: false });

const AssignmentSchema = new Schema({
  title:       { type: String, required: true, index: true },
  subject:     { type: String, required: true },
  grade:       { type: String, required: true },
  schoolName:  { type: String, required: true },
  teacherName: { type: String, required: true },
  dueDate:     { type: Date, required: true },
  assignedOn:  { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending','processing','complete','failed'],
    default: 'pending',
    index: true,
  },
  jobId: String,
  input: {
    title: String, subject: String, grade: String,
    schoolName: String, teacherName: String,
    dueDate: String, duration: Number, totalMarks: Number,
    gradingScale: String, instructions: String,
    questionConfigs: [QuestionConfigSchema],
    difficultyDistribution: { easy: Number, medium: Number, hard: Number },
    fileContent: String,
  },
  paper: { type: PaperSchema, default: null },
  error: String,
}, { timestamps: true });

export const AssignmentModel = mongoose.model('Assignment', AssignmentSchema);

// ─── Profile ──────────────────────────────────────────────────────────────────

const ProfileSchema = new Schema({
  userId:         { type: String, default: 'default', unique: true },
  name:           { type: String, default: 'Teacher' },
  schoolName:     { type: String, default: 'My School' },
  schoolLocation: { type: String, default: '' },
  subject:        { type: String, default: '' },
  avatarInitials: { type: String, default: 'T' },
}, { timestamps: true });

export const ProfileModel = mongoose.model('Profile', ProfileSchema);
