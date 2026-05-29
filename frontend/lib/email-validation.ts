/** @ and domain zone (e.g. .ru, .com) */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/

export const EMAIL_VALIDATION_ERROR =
  'Введите корректный адрес электронной почты'

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return true
  return EMAIL_REGEX.test(trimmed)
}
