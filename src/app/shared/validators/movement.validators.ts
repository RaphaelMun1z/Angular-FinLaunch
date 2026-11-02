import { AbstractControl, ValidationErrors } from "@angular/forms";

export function localToday(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function movementDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { date: true };
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime()) || date.getDate() !== Number(value.slice(8, 10))) return { date: true };
  return value > localToday() ? { futureDate: true } : null;
}

export function integerValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === null || control.value === "" || Number.isInteger(control.value) ? null : { integer: true };
}
