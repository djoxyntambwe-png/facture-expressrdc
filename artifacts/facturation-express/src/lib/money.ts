export type Currency = 'USD' | 'CDF';

export function roundMoney(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function parseMoneyInput(value: string | number) {
  if (typeof value === 'number') return value;

  let normalized = value.trim().replace(/[^\d,.-]/g, '');
  const comma = normalized.lastIndexOf(',');
  const dot = normalized.lastIndexOf('.');

  if (comma >= 0 && dot >= 0) {
    if (comma > dot && normalized.length - comma - 1 <= 2) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (comma >= 0) {
    const decimals = normalized.length - comma - 1;
    normalized = decimals > 0 && decimals <= 2
      ? normalized.replace(',', '.')
      : normalized.replace(/,/g, '');
  }

  return Number(normalized);
}

export function formatMoney(amount: number, currency: Currency) {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} FC`;
}

export function currencyName(currency: Currency) {
  return currency === 'USD' ? 'USD · Dollar américain' : 'FC · Franc congolais';
}
