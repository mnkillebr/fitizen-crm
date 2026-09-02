import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ExerciseLogVolumePoint } from "../../models/exercise.server";


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type GroupedVolumeLifted = {
  date: Date | string
  exerciseName: string
  totalVolume: number
}

type GroupedVolumeDuration = {
  date: Date | string
  exerciseName: string
  totalDuration: number
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

export function calculateVolumeLifted(logEntries: ExerciseLogVolumePoint[]): GroupedVolumeLifted[] {
  const grouped = logEntries.reduce<Record<string, GroupedVolumeLifted>>((acc, item) => {
    const { completedAt, exerciseName, actualReps, actualWeight } = item;

    if (!completedAt) {
      return acc;
    }

    const date = toDate(completedAt)
    const dateKey = date.toISOString();

    if (!acc[dateKey]) {
      acc[dateKey] = { date, exerciseName, totalVolume: 0 };
    }

    acc[dateKey].totalVolume += (actualReps ?? 0) * (actualWeight ?? 0);

    return acc;
  }, {});

  return Object.values(grouped).sort(
    (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime()
  );
}

export function calculateVolumeDuration(logEntries: ExerciseLogVolumePoint[]): GroupedVolumeDuration[] {
  const grouped = logEntries.reduce<Record<string, GroupedVolumeDuration>>((acc, item) => {
    const { completedAt, exerciseName, actualDurationSeconds, actualWeight } = item;

    if (!completedAt) {
      return acc;
    }

    const date = toDate(completedAt)
    const dateKey = date.toISOString();

    if (!acc[dateKey]) {
      acc[dateKey] = { date, exerciseName, totalDuration: 0 };
    }

    acc[dateKey].totalDuration += (actualDurationSeconds ?? 0) * (actualWeight ?? 0);

    return acc;
  }, {});

  return Object.values(grouped).sort(
    (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime()
  );
}