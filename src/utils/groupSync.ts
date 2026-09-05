const USER_NAME_KEY = 'gourmet_share_user_name';

export function getUserName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_NAME_KEY);
}

export function setUserName(name: string): void {
  if (!name || !name.trim()) return;
  localStorage.setItem(USER_NAME_KEY, name.trim());
}
