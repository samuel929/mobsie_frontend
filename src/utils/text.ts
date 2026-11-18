export function sentenceCase(value: unknown) {
  const text = String(value ?? '')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-ZA');
  return text ? text.charAt(0).toLocaleUpperCase('en-ZA') + text.slice(1) : '';
}

export function personNameCase(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-ZA')
    .replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('en-ZA'));
}
