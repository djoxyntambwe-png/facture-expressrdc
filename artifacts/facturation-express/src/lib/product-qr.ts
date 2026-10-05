import { parseMoneyInput, type Currency } from './money';

export interface ScannedProduct {
  productName: string;
  unitPrice: number;
  quantity: number;
  currency?: Currency;
}

type QrRecord = Record<string, unknown>;

function normalizedRecord(record: QrRecord): QrRecord {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key.toLowerCase().replace(/[\s_-]/g, ''),
      value,
    ]),
  );
}

function recordFromText(text: string): QrRecord | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const root = normalizedRecord(parsed as QrRecord);
      const nested = root.product ?? root.item;
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        return { ...root, ...normalizedRecord(nested as QrRecord) };
      }
      return root;
    }
  } catch {
    // Try URL and delimited product formats below.
  }

  try {
    const url = new URL(text);
    if ([...url.searchParams.keys()].length) {
      return normalizedRecord(Object.fromEntries(url.searchParams.entries()));
    }
  } catch {
    // A plain query string or delimited value may follow.
  }

  const query = text.includes('?') ? text.slice(text.indexOf('?') + 1) : text;
  if (/(^|[?&])[\w-]+=/.test(query)) {
    const params = new URLSearchParams(query);
    if ([...params.keys()].length) {
      return normalizedRecord(Object.fromEntries(params.entries()));
    }
  }

  const parts = text.split(/[|;\t]/).map((part) => part.trim());
  if (parts.length >= 2) {
    return normalizedRecord({
      name: parts[0],
      price: parts[1],
      currency: parts[2],
      quantity: parts[3],
    });
  }

  return null;
}

function firstValue(record: QrRecord, keys: string[]) {
  return keys.map((key) => record[key]).find((value) => value !== undefined && value !== null && value !== '');
}

function parseCurrency(value: unknown): Currency | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase().replace(/[.\s_-]/g, '');
  if (['USD', 'US$', '$', 'DOLLAR', 'DOLLARS'].includes(normalized)) return 'USD';
  if (['CDF', 'FC', 'FCDF', 'FRANC', 'FRANCS', 'FRANCCONGOLAIS', 'FRANCSCONGOLAIS'].includes(normalized)) {
    return 'CDF';
  }
  return undefined;
}

export function parseProductQr(text: string): ScannedProduct {
  const record = recordFromText(text.trim());
  if (!record) {
    throw new Error('QR non reconnu. Le code doit contenir le nom et le prix du produit.');
  }

  const payloadType = String(record.type ?? '').toLowerCase();
  if (payloadType.includes('receipt')) {
    throw new Error('Ce QR contient un reçu. Scannez un QR produit pour remplir la vente.');
  }

  const productName = firstValue(record, [
    'name',
    'productname',
    'product',
    'description',
    'item',
    'title',
    'designation',
  ]);
  const priceValue = firstValue(record, [
    'unitprice',
    'price',
    'amount',
    'saleprice',
  ]);
  const quantityValue = firstValue(record, ['quantity', 'qty', 'qte']);
  const currencyValue = firstValue(record, ['currency', 'currencycode', 'devise', 'monnaie']);

  if (typeof productName !== 'string' || !productName.trim()) {
    throw new Error('Le QR ne contient pas de nom de produit reconnu.');
  }

  const unitPrice = typeof priceValue === 'string' || typeof priceValue === 'number'
    ? parseMoneyInput(priceValue)
    : Number.NaN;
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new Error('Le QR ne contient pas de prix valide.');
  }

  const quantity = quantityValue === undefined
    ? 1
    : Number(String(quantityValue).trim().replace(',', '.'));
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('La quantité dans le QR doit être un entier supérieur à zéro.');
  }

  const currency = currencyValue === undefined ? undefined : parseCurrency(currencyValue);
  if (currencyValue !== undefined && !currency) {
    throw new Error('Devise non prise en charge dans le QR. Utilisez USD ou CDF.');
  }

  return {
    productName: productName.trim(),
    unitPrice,
    quantity,
    currency,
  };
}

export function createReceiptQrPayload(invoice: {
  customerName: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  currency: Currency;
  totalHt: number;
  vat: number;
  totalTtc: number;
  createdAt: Date;
}) {
  return JSON.stringify({
    type: 'facturation-express.receipt',
    version: 1,
    customerName: invoice.customerName,
    productName: invoice.productName,
    unitPrice: invoice.unitPrice,
    quantity: invoice.quantity,
    currency: invoice.currency,
    totalHt: invoice.totalHt,
    vatRate: 16,
    vat: invoice.vat,
    totalTtc: invoice.totalTtc,
    createdAt: invoice.createdAt.toISOString(),
  });
}
