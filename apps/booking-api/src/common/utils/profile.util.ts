export const sanitiseString = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const sanitisePhone = (value?: string | null): string | null => {
  const sanitised = sanitiseString(value);
  if (!sanitised) {
    return null;
  }
  return sanitised.replace(/\s+/g, '');
};

export const normalisePostcode = (value: string): string => {
  const trimmed = value.trim().toUpperCase().replace(/\s+/g, '');
  if (trimmed.length <= 3) {
    return trimmed;
  }
  return `${trimmed.slice(0, trimmed.length - 3)} ${trimmed.slice(-3)}`;
};
