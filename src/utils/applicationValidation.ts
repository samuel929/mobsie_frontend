import { SchoolStage } from '../data/schoolPackages';

export function formatIsoDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('-');
}

export function isRealIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const parsed = new Date(`${value}T00:00:00`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getFullYear() === Number(year) &&
    parsed.getMonth() + 1 === Number(month) &&
    parsed.getDate() === Number(day)
  );
}

export function isValidSouthAfricanId(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{13}$/.test(digits)) return false;
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    let digit = Number(digits[index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return (10 - (sum % 10)) % 10 === Number(digits[12]);
}

export function idMatchesDateOfBirth(idNumber: string, dateOfBirth: string) {
  const digits = idNumber.replace(/\D/g, '');
  return /^\d{13}$/.test(digits) && dateOfBirth.slice(2).replace(/-/g, '') === digits.slice(0, 6);
}

export function stageForDateOfBirth(dateOfBirth: string, today = new Date()): SchoolStage | null {
  if (!isRealIsoDate(dateOfBirth)) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  let months =
    (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 6 || months >= 84) return null;
  if (months < 24) return 'STAGE_1';
  if (months < 36) return 'STAGE_2';
  if (months < 48) return 'STAGE_3';
  if (months < 60) return 'STAGE_4';
  return 'GRADE_R';
}
