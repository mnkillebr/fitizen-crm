import "dotenv/config"

import { ilike } from "drizzle-orm"

import db from "../db"
import {
  Exercise,
  type ExerciseEquipmentValue,
  type ExerciseMuscleGroupValue,
  type ExercisePlaneOfMotionValue,
  type ExerciseSupportValue,
} from "../db/schema"
import { createExercise, updateExercise } from "../models/exercise.server"

type SystemExercise = {
  name: string
  description: string
  muscleGroup: ExerciseMuscleGroupValue
  planeOfMotion: ExercisePlaneOfMotionValue
  support: ExerciseSupportValue
  equipment: ExerciseEquipmentValue
}

/**
 * Exercises from CFSC Level-1 Progressions and Regressions Sheet (Updated March 2023).
 * Schema fields (plane/support/muscle/equipment) are best-effort mappings for review.
 */
const SYSTEM_EXERCISES: SystemExercise[] = [
  // Power
  { name: "Shuttle Jump", description: "Power", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "bodyweight" },
  { name: "Drop Squat", description: "Power", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Box Jump", description: "Power — baseline", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "plyo_box" },
  { name: "Jump Squat w/ Stick", description: "Power", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "bodyweight" },
  { name: "Continuous Jump Squat", description: "Power", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "bodyweight" },
  { name: "Medball or Weighted Vest Jump Squat", description: "Power", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "medicine_ball" },
  { name: "Toe Touch Progression", description: "Power / Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Hip Hinge Patterning", description: "Power / Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "KB Deadlift", description: "Power / Hip Dominant — baseline", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "kettlebell" },
  { name: "KB Swing", description: "Power / Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "kettlebell" },
  { name: "TK (No Hinge) Chest Pass", description: "Power", muscleGroup: "chest", planeOfMotion: "sagittal", support: "bilateral", equipment: "medicine_ball" },
  { name: "TK Dynamic Chest Pass", description: "Power — baseline", muscleGroup: "chest", planeOfMotion: "sagittal", support: "dynamic", equipment: "medicine_ball" },
  { name: "Standing Chest Pass", description: "Power", muscleGroup: "chest", planeOfMotion: "sagittal", support: "dynamic", equipment: "medicine_ball" },
  { name: "2-Point Chest Pass", description: "Power", muscleGroup: "chest", planeOfMotion: "sagittal", support: "dynamic", equipment: "medicine_ball" },
  { name: "Sprint Start Chest Pass", description: "Power", muscleGroup: "chest", planeOfMotion: "sagittal", support: "dynamic", equipment: "medicine_ball" },
  { name: "Alternating Single Leg Balance Holds", description: "Power", muscleGroup: "legs", planeOfMotion: "frontal", support: "unilateral", equipment: "bodyweight" },
  { name: "Single Leg Drop Squat", description: "Power", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Single Leg Lateral Bound w/ Stick", description: "Power — baseline", muscleGroup: "legs", planeOfMotion: "frontal", support: "dynamic", equipment: "bodyweight" },
  { name: "Lateral Bound @ 45 degrees w/ Stick", description: "Power", muscleGroup: "legs", planeOfMotion: "frontal", support: "dynamic", equipment: "bodyweight" },
  { name: "Lateral Bound @ a 45 w/ Mini-bounce", description: "Power", muscleGroup: "legs", planeOfMotion: "frontal", support: "dynamic", equipment: "bodyweight" },
  { name: "Continuous Lateral Bound @ a 45", description: "Power", muscleGroup: "legs", planeOfMotion: "frontal", support: "dynamic", equipment: "bodyweight" },
  { name: "1/2 Kneeling Side Toss", description: "Power — baseline", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "medicine_ball" },
  { name: "Standing Side Toss", description: "Power", muscleGroup: "core", planeOfMotion: "transverse", support: "dynamic", equipment: "medicine_ball" },
  { name: "Stepping Side Toss", description: "Power", muscleGroup: "core", planeOfMotion: "transverse", support: "dynamic", equipment: "medicine_ball" },
  { name: "Lateral Bound Side Toss", description: "Power", muscleGroup: "core", planeOfMotion: "transverse", support: "dynamic", equipment: "medicine_ball" },
  { name: "Shuffle or Crossover Side Toss", description: "Power", muscleGroup: "core", planeOfMotion: "transverse", support: "dynamic", equipment: "medicine_ball" },

  // Ladder Drills
  { name: "Shuffle Wide + Stick F/B", description: "Ladder Drills — Phase 1", muscleGroup: "legs", planeOfMotion: "frontal", support: "dynamic", equipment: "bodyweight" },
  { name: "Cross In Front F/B", description: "Ladder Drills — Phase 1", muscleGroup: "legs", planeOfMotion: "transverse", support: "dynamic", equipment: "bodyweight" },
  { name: "Cross Behind F/B", description: "Ladder Drills — Phase 1", muscleGroup: "legs", planeOfMotion: "transverse", support: "dynamic", equipment: "bodyweight" },
  { name: "In-In-Out-Out F/B", description: "Ladder Drills — Phase 1", muscleGroup: "legs", planeOfMotion: "frontal", support: "dynamic", equipment: "bodyweight" },
  { name: "Scissors R/L", description: "Ladder Drills — Phase 1", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "bodyweight" },

  // Motor Control
  { name: "Breath Practice", description: "Motor Control — baseline", muscleGroup: "core", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Supine Floor Slides w/ Exhale", description: "Motor Control — baseline", muscleGroup: "shoulders", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Seated Wall Slides", description: "Motor Control", muscleGroup: "shoulders", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Pressing Progressions", description: "Motor Control", muscleGroup: "shoulders", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Supine Banded Hip Flexion Holds", description: "Motor Control — baseline", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "resistance_band" },
  { name: "Straight Arm Plank Slider Hip Flexion", description: "Motor Control", muscleGroup: "core", planeOfMotion: "sagittal", support: "unilateral", equipment: "glider" },
  { name: "1/2 Kneeling Hip Flexion Holds", description: "Motor Control", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Wall Drills & Sled Push", description: "Motor Control", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "sled" },
  { name: "Skip & Sprint Progressions", description: "Motor Control", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "bodyweight" },
  { name: "Supported Leg Lower", description: "Motor Control — baseline", muscleGroup: "core", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Unsupported Leg Lower", description: "Motor Control", muscleGroup: "core", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Sandbag OH Reaching Leg Lower", description: "Motor Control", muscleGroup: "core", planeOfMotion: "sagittal", support: "unilateral", equipment: "sandbag" },
  { name: "SLDL Patterning", description: "Motor Control", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "2-Leg Bridge", description: "Motor Control / Hip Dominant — baseline", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "1-Leg Bridge", description: "Motor Control / Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Leg Curl and Bridging Progressions", description: "Motor Control", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Opposite Arm & Leg Reach", description: "Motor Control", muscleGroup: "core", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "6-Point Forward Bear Crawl", description: "Motor Control — baseline", muscleGroup: "core", planeOfMotion: "sagittal", support: "dynamic", equipment: "bodyweight" },
  { name: "4-Point Forward Bear Crawl", description: "Motor Control", muscleGroup: "core", planeOfMotion: "sagittal", support: "dynamic", equipment: "bodyweight" },
  { name: "4-Point Lateral Bear Crawl", description: "Motor Control", muscleGroup: "core", planeOfMotion: "frontal", support: "dynamic", equipment: "bodyweight" },

  // Anti-Extension / Rotation
  { name: "Straight Arm Plank", description: "Anti-Extension/Rotation / Horizontal Press", muscleGroup: "core", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Straight Arm Clock Plank", description: "Anti-Extension/Rotation — baseline", muscleGroup: "core", planeOfMotion: "transverse", support: "bilateral", equipment: "bodyweight" },
  { name: "Straight Arm Plank Taps or Reach", description: "Anti-Extension/Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "bodyweight" },
  { name: "Straight Arm Sandbag Pull Through", description: "Anti-Extension/Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "bilateral", equipment: "sandbag" },

  // Anti-Lateral Flexion
  { name: "Short Lever Side Plank", description: "Anti-Lateral Flexion", muscleGroup: "core", planeOfMotion: "frontal", support: "unilateral", equipment: "bodyweight" },
  { name: "Side Plank", description: "Anti-Lateral Flexion — baseline", muscleGroup: "core", planeOfMotion: "frontal", support: "unilateral", equipment: "bodyweight" },
  { name: "Side Plank Row", description: "Anti-Lateral Flexion", muscleGroup: "core", planeOfMotion: "frontal", support: "unilateral", equipment: "dumbbell" },
  { name: "Feet Elevated Side Plank", description: "Anti-Lateral Flexion", muscleGroup: "core", planeOfMotion: "frontal", support: "unilateral", equipment: "bodyweight" },
  { name: "Side Plank w/ Adduction", description: "Anti-Lateral Flexion", muscleGroup: "core", planeOfMotion: "frontal", support: "unilateral", equipment: "bodyweight" },

  // Anti-Rotation
  { name: "TK Anti-Rotation", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "bilateral", equipment: "cable" },
  { name: "1/2 Kneeling Anti-Rotation", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "cable" },
  { name: "Iso Split Squat Anti-Rotation", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "cable" },
  { name: "Standing Anti-Rotation", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "bilateral", equipment: "cable" },
  { name: "SL Anti-Rotation", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "cable" },
  { name: "Tall Kneeling Chop/Lift", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "bilateral", equipment: "cable" },
  { name: "1/2 Kneeling Inline Chop/Lift", description: "Anti-Rotation — baseline", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "cable" },
  { name: "Iso Split Squat Inline Chop/Lift", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "cable" },
  { name: "Standing Static Chop/Lift", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "bilateral", equipment: "cable" },
  { name: "Dynamic Chop/Lift", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "dynamic", equipment: "cable" },
  { name: "TK Push/Pull", description: "Anti-Rotation — baseline", muscleGroup: "core", planeOfMotion: "transverse", support: "bilateral", equipment: "cable" },
  { name: "1/2 Kneeling Push/Pull", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "cable" },
  { name: "Standing Push/Pull", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "bilateral", equipment: "cable" },
  { name: "Dynamic Push/Pull", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "dynamic", equipment: "cable" },
  { name: "TK Landmine Anti-Rotation", description: "Anti-Rotation — baseline", muscleGroup: "core", planeOfMotion: "transverse", support: "bilateral", equipment: "landmine" },
  { name: "1/2 Kneeling Landmine Anti-Rotation", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "landmine" },
  { name: "Standing Landmine Anti-Rotation", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "bilateral", equipment: "landmine" },
  { name: "Standing Landmine w/ Rotation", description: "Anti-Rotation", muscleGroup: "core", planeOfMotion: "transverse", support: "dynamic", equipment: "landmine" },

  // Anti-Extension
  { name: "Elbows Elevated Front Plank", description: "Anti-Extension", muscleGroup: "core", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Front Plank", description: "Anti-Extension — baseline", muscleGroup: "core", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Feet Elevated Front Plank", description: "Anti-Extension", muscleGroup: "core", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Body Saw", description: "Anti-Extension", muscleGroup: "core", planeOfMotion: "sagittal", support: "bilateral", equipment: "glider" },
  { name: "Ring Fallout", description: "Anti-Extension — baseline", muscleGroup: "core", planeOfMotion: "sagittal", support: "bilateral", equipment: "rings" },
  { name: "Stability Ball Rollout", description: "Anti-Extension", muscleGroup: "core", planeOfMotion: "sagittal", support: "bilateral", equipment: "stability_ball" },
  { name: "Wheel Rollout", description: "Anti-Extension", muscleGroup: "core", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Goblet Carry", description: "Anti-Extension (Carry) — baseline", muscleGroup: "core", planeOfMotion: "sagittal", support: "dynamic", equipment: "kettlebell" },
  { name: "Farmer Carry", description: "Anti-Extension (Carry)", muscleGroup: "core", planeOfMotion: "sagittal", support: "dynamic", equipment: "dumbbell" },
  { name: "Suitcase Carry", description: "Anti-Extension (Carry)", muscleGroup: "core", planeOfMotion: "frontal", support: "dynamic", equipment: "dumbbell" },
  { name: "Waiters Carry Bottoms Up", description: "Anti-Extension (Carry)", muscleGroup: "shoulders", planeOfMotion: "sagittal", support: "dynamic", equipment: "kettlebell" },
  { name: "Overhead Carry", description: "Anti-Extension (Carry)", muscleGroup: "shoulders", planeOfMotion: "sagittal", support: "dynamic", equipment: "kettlebell" },

  // Horizontal Press
  { name: "Hands Elevated Push Up", description: "Horizontal Press", muscleGroup: "chest", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Push Up", description: "Horizontal Press — baseline", muscleGroup: "chest", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Feet Elevated Push Up", description: "Horizontal Press", muscleGroup: "chest", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Weighted Push Up", description: "Horizontal Press", muscleGroup: "chest", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Ring or Bosu Push Up", description: "Horizontal Press", muscleGroup: "chest", planeOfMotion: "sagittal", support: "bilateral", equipment: "rings" },
  { name: "DB Bench Press", description: "Horizontal Press — baseline", muscleGroup: "chest", planeOfMotion: "sagittal", support: "bilateral", equipment: "dumbbell" },
  { name: "Alt DB Bench Press", description: "Horizontal Press", muscleGroup: "chest", planeOfMotion: "sagittal", support: "unilateral", equipment: "dumbbell" },
  { name: "One Arm DB Bench", description: "Horizontal Press", muscleGroup: "chest", planeOfMotion: "sagittal", support: "unilateral", equipment: "dumbbell" },
  { name: "TK One Arm Cable Press", description: "Horizontal Press", muscleGroup: "chest", planeOfMotion: "sagittal", support: "unilateral", equipment: "cable" },
  { name: "1/2 Kneeling Inline Press", description: "Horizontal Press — baseline", muscleGroup: "chest", planeOfMotion: "sagittal", support: "unilateral", equipment: "cable" },
  { name: "Iso Split Squat Inline Press", description: "Horizontal Press", muscleGroup: "chest", planeOfMotion: "sagittal", support: "unilateral", equipment: "cable" },
  { name: "Standing One Arm Cable Press", description: "Horizontal Press", muscleGroup: "chest", planeOfMotion: "sagittal", support: "unilateral", equipment: "cable" },

  // Vertical Press
  { name: "1/2 Kneeling Landmine Press", description: "Vertical Press — baseline", muscleGroup: "shoulders", planeOfMotion: "sagittal", support: "unilateral", equipment: "landmine" },
  { name: "1/2 Kneeling KB/DB Alt Press", description: "Vertical Press", muscleGroup: "shoulders", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "1/2 Kneeling One Arm KB/DB Press", description: "Vertical Press", muscleGroup: "shoulders", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "Standing Alt KB/DB Press", description: "Vertical Press", muscleGroup: "shoulders", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "Standing One Arm KB/DB Press", description: "Vertical Press", muscleGroup: "shoulders", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "1/4 Get Up No Weight", description: "Vertical Press (Get Up)", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "bodyweight" },
  { name: "1/2 Get Up No Weight", description: "Vertical Press (Get Up) — baseline", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "bodyweight" },
  { name: "1/2 Get Up w/ Weight", description: "Vertical Press (Get Up)", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "kettlebell" },
  { name: "3/4 Get Up w/ Weight", description: "Vertical Press (Get Up)", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "kettlebell" },
  { name: "Full Get Up w/ Weight", description: "Vertical Press (Get Up)", muscleGroup: "core", planeOfMotion: "transverse", support: "unilateral", equipment: "kettlebell" },

  // Horizontal Pull
  { name: "Ring Row", description: "Horizontal Pull — baseline", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "rings" },
  { name: "Feet Elevated Ring Row", description: "Horizontal Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "rings" },
  { name: "Weighted Vest Ring Row", description: "Horizontal Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "rings" },
  { name: "1/2 Kneeling One Arm Cable Row", description: "Horizontal Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "unilateral", equipment: "cable" },
  { name: "Bench Straddle (Supported) DB Row", description: "Horizontal Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "unilateral", equipment: "dumbbell" },
  { name: "DB Row", description: "Horizontal Pull — baseline", muscleGroup: "back", planeOfMotion: "sagittal", support: "unilateral", equipment: "dumbbell" },
  { name: "1/2 Kneeling 1-Arm Cable Row", description: "Horizontal Pull — baseline", muscleGroup: "back", planeOfMotion: "sagittal", support: "unilateral", equipment: "cable" },
  { name: "Iso Split Squat 1-Arm Cable Row", description: "Horizontal Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "unilateral", equipment: "cable" },
  { name: "Standing 1-Arm Cable Row", description: "Horizontal Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "unilateral", equipment: "cable" },
  { name: "Standing 1-Arm 1-Leg Row", description: "Horizontal Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "unilateral", equipment: "cable" },
  { name: "Dynamic 1-Arm 1-Leg Row", description: "Horizontal Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "dynamic", equipment: "cable" },
  { name: "Rotational Row", description: "Horizontal Pull", muscleGroup: "back", planeOfMotion: "transverse", support: "unilateral", equipment: "cable" },

  // Vertical Pull
  { name: "Cable X-Pulldown (or Lat Pulldown)", description: "Vertical Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "cable" },
  { name: "Chin Up Eccentrics (on Rings or Bar)", description: "Vertical Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "rings" },
  { name: "Chin Up Band Assisted", description: "Vertical Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "resistance_band" },
  { name: "Chin Up", description: "Vertical Pull — baseline", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Weighted Chin Up", description: "Vertical Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Pull Up", description: "Vertical Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Weighted Pull Up", description: "Vertical Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Cable X-Pulldown", description: "Vertical Pull — baseline", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "cable" },
  { name: "Iso Alt Cable X-Pulldown", description: "Vertical Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "unilateral", equipment: "cable" },
  { name: "Cable X-Pulldown w/ Tricep Extension", description: "Vertical Pull", muscleGroup: "back", planeOfMotion: "sagittal", support: "bilateral", equipment: "cable" },

  // Knee Dominant
  { name: "Assisted (Supported) Split Squat", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Split Squat Hold", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Split Squat", description: "Knee Dominant / Hip Dominant — baseline", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Goblet Split Squat", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "2 KB/DB Split Squat", description: "Knee Dominant (or progress to RFESS)", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "5 Second Eccentric RFE Split Squat", description: "Knee Dominant — baseline", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Goblet RFE Split Squat", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "2 DB RFE Split Squat", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "dumbbell" },
  { name: "U-Bar RFE Split Squat", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "barbell" },
  { name: "Heels Elevated Squat to a Parallel Box", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "plyo_box" },
  { name: "Medball Reaching Squat to a Parallel Box", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "medicine_ball" },
  { name: "Goblet Squat to a Parallel Box", description: "Knee Dominant — baseline", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "kettlebell" },
  { name: "2 KB Goblet Squat to a Parallel Box", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "kettlebell" },
  { name: "Front Squat to a Parallel Box", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "barbell" },
  { name: "BW Lateral Squat", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "frontal", support: "unilateral", equipment: "bodyweight" },
  { name: "Medball Reaching Lateral Squat", description: "Knee Dominant — baseline", muscleGroup: "legs", planeOfMotion: "frontal", support: "unilateral", equipment: "medicine_ball" },
  { name: "Goblet Lateral Squat", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "frontal", support: "unilateral", equipment: "kettlebell" },
  { name: "1 or 2 DB Lateral Squat", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "frontal", support: "unilateral", equipment: "dumbbell" },
  { name: "1 or 2 DB Lateral Lunge", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "frontal", support: "unilateral", equipment: "dumbbell" },
  { name: "BW Squat Matrix", description: "Knee Dominant — baseline (split/lateral/rotational squat + toe touch to squat)", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "bodyweight" },
  { name: "BW Lunge Matrix", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "bodyweight" },
  { name: "Medball Reaching Lunge Matrix", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "dynamic", equipment: "medicine_ball" },
  { name: "Heel Elevated Sumo Squat Hold", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Sumo Squat Holds", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Sumo Squat Pressout", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "medicine_ball" },
  { name: "Sumo Squat Curl Press", description: "Knee Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "dumbbell" },

  // Hip Dominant
  { name: "Assisted (Supported) SLDL", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Cross Reaching SLDL", description: "Hip Dominant — baseline", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Medball Reaching SLDL", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "medicine_ball" },
  { name: "1 KB/DB SLDL", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "2 KB/DB SLDL", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "U-Bar or Barbell SLDL", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "barbell" },
  { name: "Shoulders Elevated 2-Leg Bridge", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "bodyweight" },
  { name: "Shoulders Elevated 1-Leg Bridge", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Shoulder Elevated 1 or 2-Leg Bridge w/ Sandbag", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "sandbag" },
  { name: "Slider 2-Leg Bridge Leg Curl (Eccentric Only)", description: "Hip Dominant — baseline", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "glider" },
  { name: "Slider 2-Leg Bridge Leg Curls", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "bilateral", equipment: "glider" },
  { name: "1-Leg Bridge Slider Leg Curl (Eccentric Only)", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "glider" },
  { name: "1-Leg Bridge Slider Leg Curls", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "glider" },
  { name: "BW Slider Reverse Lunge", description: "Hip Dominant — baseline", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "glider" },
  { name: "Goblet Slider Reverse Lunge", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "1 KB Slider Reverse Lunge", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "2 KB Slider Reverse Lunge", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "2 KB Rack Pos. Slider Reverse Lunge", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "BW Reverse Lunge", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Front Foot Elevated BW Reverse Lunge", description: "Hip Dominant — baseline", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "bodyweight" },
  { name: "Goblet Front Foot Elevated Reverse Lunge", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "kettlebell" },
  { name: "1 DB Front Foot Elevated Reverse Lunge", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "dumbbell" },
  { name: "2 DB Front Foot Elevated Reverse Lunge", description: "Hip Dominant", muscleGroup: "legs", planeOfMotion: "sagittal", support: "unilateral", equipment: "dumbbell" },
]

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

async function main() {
  const dryRun = hasFlag("dryRun")

  if (hasFlag("help") || hasFlag("h")) {
    console.log("Usage: pnpm seed:system-exercises [--dryRun]")
    console.log("")
    console.log(
      "Seeds CFSC Level-1 exercises as shared system library rows (isSystem=true)."
    )
    console.log(
      "Existing matches by name are promoted to system (createdById cleared)."
    )
    process.exit(0)
  }

  let created = 0
  let promoted = 0
  let unchanged = 0

  for (const exercise of SYSTEM_EXERCISES) {
    const existingRows = await db
      .select()
      .from(Exercise)
      .where(ilike(Exercise.name, exercise.name))
      .limit(1)

    const existing = existingRows[0]

    if (existing) {
      const needsPromotion =
        !existing.isSystem ||
        existing.createdById !== null ||
        existing.description !== exercise.description

      if (!needsPromotion) {
        unchanged += 1
        console.log(`  ok: ${exercise.name}`)
        continue
      }

      if (dryRun) {
        promoted += 1
        console.log(`  dry-run promote: ${exercise.name}`)
        continue
      }

      await updateExercise(existing.id, {
        description: exercise.description,
        muscleGroup: exercise.muscleGroup,
        planeOfMotion: exercise.planeOfMotion,
        support: exercise.support,
        equipment: exercise.equipment,
        isSystem: true,
        createdById: null,
      })

      promoted += 1
      console.log(`  promoted: ${exercise.name}`)
      continue
    }

    if (dryRun) {
      created += 1
      console.log(`  dry-run create: ${exercise.name}`)
      continue
    }

    await createExercise({
      name: exercise.name,
      description: exercise.description,
      muscleGroup: exercise.muscleGroup,
      planeOfMotion: exercise.planeOfMotion,
      support: exercise.support,
      equipment: exercise.equipment,
      isSystem: true,
      createdById: null,
    })

    created += 1
    console.log(`  created: ${exercise.name}`)
  }

  console.log("")
  console.log(
    dryRun
      ? `Dry run complete: ${created} would be created, ${promoted} would be promoted, ${unchanged} already system (${SYSTEM_EXERCISES.length} total).`
      : `Done: ${created} created, ${promoted} promoted, ${unchanged} unchanged (${SYSTEM_EXERCISES.length} total).`
  )
  console.log("System library exercises are visible to every coach.")

  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
