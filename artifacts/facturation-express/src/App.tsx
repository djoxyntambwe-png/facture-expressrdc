import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  BadgeCheck,
  Calculator,
  Download,
  FileText,
  LockKeyhole,
  Printer,
  ReceiptText,
  RotateCcw,
  ScanLine,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { ProductQrScannerDialog } from '@/components/ProductQrScannerDialog';
import { currencyName, formatMoney, parseMoneyInput, roundMoney, type Currency } from '@/lib/money';
import { createReceiptQrPayload, parseProductQr } from '@/lib/product-qr';

const queryClient = new QueryClient();

type Invoice = {
  customerName: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  currency: Currency;
  totalHt: number;
  vat: number;
  totalTtc: number;
  createdAt: Date;
};

function Home() {
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receiptQr, setReceiptQr] = useState('');
  const [receiptQrError, setReceiptQrError] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!invoice) {
      setReceiptQr('');
      setReceiptQrError('');
      return;
    }

    let isActive = true;
    QRCode.toDataURL(createReceiptQrPayload(invoice), {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 150,
    }).then((dataUrl) => {
      if (isActive) {
        setReceiptQr(dataUrl);
        setReceiptQrError('');
      }
    }).catch(() => {
      if (isActive) setReceiptQrError('Le QR du reçu n’a pas pu être créé.');
    });

    return () => {
      isActive = false;
    };
  }, [invoice]);

  const handleQrDetected = useCallback((payload: string) => {
    try {
      const product = parseProductQr(payload);
      setProductName(product.productName);
      setUnitPrice(String(product.unitPrice));
      setQuantity(String(product.quantity));
      if (product.currency) setCurrency(product.currency);
      setErrors({});
      setDocumentError('');
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        qr: error instanceof Error ? error.message : 'Impossible de lire ce QR produit.',
      }));
    }
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const price = parseMoneyInput(unitPrice);
    const count = Number(quantity);
    if (!customerName.trim()) nextErrors.customerName = 'Indiquez le nom du client.';
    if (!productName.trim()) nextErrors.productName = 'Indiquez le nom du produit.';
    if (!Number.isFinite(price) || price <= 0) nextErrors.unitPrice = 'Le prix doit être supérieur à zéro.';
    if (!Number.isInteger(count) || count < 1) nextErrors.quantity = 'La quantité minimale est de 1.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const totalHt = roundMoney(price * count);
    const vat = roundMoney(totalHt * 0.16);
    setInvoice({
      customerName: customerName.trim(),
      productName: productName.trim(),
      unitPrice: price,
      quantity: count,
      currency,
      totalHt,
      vat,
      totalTtc: roundMoney(totalHt + vat),
      createdAt: new Date(),
    });
  };

  const resetReceipt = () => {
    setInvoice(null);
    setCustomerName('');
    setProductName('');
    setUnitPrice('');
    setQuantity('1');
    setErrors({});
    setDocumentError('');
  };

  const downloadPdf = async () => {
    if (!invoice) return;
    setPdfBusy(true);
    setDocumentError('');

    try {
      const { jsPDF } = await import('jspdf');
      const qrImage = receiptQr || await QRCode.toDataURL(createReceiptQrPayload(invoice), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 200,
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const rightEdge = pageWidth - 20;
      const pdfMoney = (amount: number) =>
        formatMoney(amount, invoice.currency).replace(/[\u00a0\u202f]/g, ' ');

      pdf.setFillColor(28, 93, 68);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('FACTURATION EXPRESS', 20, 18);
      pdf.setFontSize(10);
      pdf.text('RECU DE VENTE', 20, 29);

      pdf.setTextColor(32, 43, 54);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Date : ${invoice.createdAt.toLocaleDateString('fr-FR')}`, 20, 53);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FACTURE A', 20, 66);
      pdf.setFont('helvetica', 'normal');
      const customerLines = pdf.splitTextToSize(invoice.customerName, 112);
      pdf.text(customerLines, 20, 73);
      pdf.addImage(qrImage, 'PNG', rightEdge - 35, 47, 35, 35);

      const detailsY = Math.max(94, 77 + customerLines.length * 5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DETAIL DE LA TRANSACTION', 20, detailsY);
      pdf.setDrawColor(220, 215, 203);
      pdf.line(20, detailsY + 5, rightEdge, detailsY + 5);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Designation', 20, detailsY + 17);
      pdf.setFont('helvetica', 'normal');
      const productLines = pdf.splitTextToSize(invoice.productName, 150);
      pdf.text(productLines, 20, detailsY + 25);
      const itemY = detailsY + 25 + productLines.length * 5 + 3;
      pdf.text(`${invoice.quantity} x ${pdfMoney(invoice.unitPrice)}`, 20, itemY);
      pdf.text(pdfMoney(invoice.totalHt), rightEdge, itemY, { align: 'right' });
      pdf.setDrawColor(232, 227, 216);
      pdf.line(20, itemY + 6, rightEdge, itemY + 6);

      const summaryY = itemY + 19;
      pdf.setTextColor(92, 105, 97);
      pdf.text('Total hors taxe (HT)', 20, summaryY);
      pdf.text(pdfMoney(invoice.totalHt), rightEdge, summaryY, { align: 'right' });
      pdf.text('TVA RDC (16 %)', 20, summaryY + 10);
      pdf.text(pdfMoney(invoice.vat), rightEdge, summaryY + 10, { align: 'right' });
      pdf.setDrawColor(220, 215, 203);
      pdf.line(20, summaryY + 16, rightEdge, summaryY + 16);
      pdf.setTextColor(28, 93, 68);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('TOTAL TTC', 20, summaryY + 27);
      pdf.text(pdfMoney(invoice.totalTtc), rightEdge, summaryY + 27, { align: 'right' });

      pdf.setTextColor(120, 131, 123);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('Aucune conversion automatique entre USD et FC.', 20, summaryY + 44);
      pdf.text('TVA RDC calculee a 16 %.', 20, summaryY + 51);
      pdf.setProperties({ title: 'Reçu Facturation Express', subject: 'Reçu de vente' });
      pdf.save(`recu-facturation-express-${invoice.createdAt.toISOString().slice(0, 10)}.pdf`);
    } catch {
      setDocumentError('Impossible de créer le PDF. Réessayez ou utilisez l’impression.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Facturation Express">
          <div className="brand-mark"><ReceiptText size={19} strokeWidth={1.8} /></div>
          <div className="brand-name">Facturation <span>Express</span></div>
        </div>
        <div className="topbar-note"><span className="live-dot" /> Calcul local sécurisé</div>
      </header>

      <main className="main-wrap">
        <section className="intro">
          <div className="eyebrow"><span className="eyebrow-line" /> Facture en quelques secondes</div>
          <h1>Le bon total,<br /><em>sans calculer.</em></h1>
          <p>Votre vente en USD ou FC, avec la TVA RDC déjà intégrée.</p>
        </section>

        <section className="workspace" aria-label="Calcul de facture">
          <form className="panel form-panel" onSubmit={handleSubmit} noValidate>
            <div className="panel-heading">
              <div>
                <h2>Préparer une vente</h2>
                <p>Renseignez les détails de votre transaction.</p>
              </div>
              <span className="step-tag">01 / SAISIE</span>
            </div>

            <div className="form-fields">
              <div className="field">
                <label htmlFor="customerName">Nom du client</label>
                <input
                  id="customerName"
                  data-testid="input-customer-name"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  placeholder="Ex. Grâce Mwamba"
                  value={customerName}
                  aria-invalid={Boolean(errors.customerName)}
                  aria-describedby={errors.customerName ? 'customer-error' : undefined}
                  onChange={(event) => { setCustomerName(event.target.value); setErrors((previous) => ({ ...previous, customerName: '' })); }}
                />
                {errors.customerName && <div className="field-hint" id="customer-error" role="alert">{errors.customerName}</div>}
              </div>
              <div className="field">
                <div className="field-title-row">
                  <label htmlFor="productName">Produit ou service</label>
                  <button
                    className="scanner-trigger"
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    aria-label="Scanner un QR produit avec la caméra"
                  >
                    <ScanLine size={14} /> Scanner QR
                  </button>
                </div>
                <input
                  id="productName"
                  data-testid="input-product-name"
                  type="text"
                  maxLength={120}
                  placeholder="Ex. Lot de fournitures"
                  value={productName}
                  aria-invalid={Boolean(errors.productName)}
                  aria-describedby={errors.productName ? 'product-error' : undefined}
                  onChange={(event) => { setProductName(event.target.value); setErrors((previous) => ({ ...previous, productName: '', qr: '' })); }}
                />
                {errors.qr && <div className="field-hint" role="alert">{errors.qr}</div>}
                {errors.productName && <div className="field-hint" id="product-error" role="alert">{errors.productName}</div>}
              </div>
              <div className="three-fields">
                <div className="field currency-field">
                  <label htmlFor="currency">Monnaie</label>
                  <select
                    id="currency"
                    className="currency-select"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value as Currency)}
                  >
                    <option value="USD">USD · Dollar</option>
                    <option value="CDF">FC · Franc congolais</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="unitPrice">Prix unitaire <small>{currency}</small></label>
                  <div className="input-with-prefix">
                    <span className="prefix" aria-hidden="true">{currency === 'USD' ? '$' : 'FC'}</span>
                    <input
                      id="unitPrice"
                      data-testid="input-unit-price"
                      type="text"
                      inputMode="decimal"
                      maxLength={16}
                      placeholder={currency === 'CDF' ? '0,00' : '0.00'}
                      value={unitPrice}
                      aria-invalid={Boolean(errors.unitPrice)}
                      aria-describedby={errors.unitPrice ? 'price-error' : undefined}
                      onChange={(event) => { setUnitPrice(event.target.value); setErrors((previous) => ({ ...previous, unitPrice: '' })); }}
                    />
                  </div>
                  {errors.unitPrice && <div className="field-hint" id="price-error" role="alert">{errors.unitPrice}</div>}
                </div>
                <div className="field">
                  <label htmlFor="quantity">Quantité <small>unités</small></label>
                  <input
                    id="quantity"
                    data-testid="input-quantity"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={quantity}
                    aria-invalid={Boolean(errors.quantity)}
                    aria-describedby={errors.quantity ? 'quantity-error' : undefined}
                    onChange={(event) => { setQuantity(event.target.value); setErrors((previous) => ({ ...previous, quantity: '' })); }}
                  />
                  {errors.quantity && <div className="field-hint" id="quantity-error" role="alert">{errors.quantity}</div>}
                </div>
              </div>
              <button className="submit-button" data-testid="button-generate-receipt" type="submit">
                <Calculator size={17} strokeWidth={2} />
                Calculer le total
                <FileText size={15} strokeWidth={1.8} />
              </button>
            </div>
            <div className="vat-note">
              <LockKeyhole size={15} strokeWidth={1.8} />
              <span>Vos montants restent dans votre navigateur. TVA RDC calculée à 16 %.</span>
            </div>
          </form>

          <section className="panel receipt-panel" aria-live="polite" data-testid="receipt-result">
            {invoice ? (
              <div className="receipt-appear">
                <div className="receipt-head">
                  <div className="receipt-topline">
                    <span className="receipt-label">Reçu de vente</span>
                    <span className="receipt-status"><BadgeCheck /> Calculé</span>
                  </div>
                  <h2 className="receipt-title">Détail de la transaction</h2>
                  <div className="receipt-date">
                    {invoice.createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div className="receipt-body">
                  <div className="receipt-parties">
                    <div>
                      <div className="receipt-caption">Facturé à</div>
                      <div className="receipt-value" data-testid="text-customer-name">{invoice.customerName}</div>
                    </div>
                    <div>
                      <div className="receipt-caption">Devise</div>
                      <div className="receipt-value">{currencyName(invoice.currency)}</div>
                    </div>
                  </div>
                  <div className="item-head"><span>Désignation</span><span>Montant HT</span></div>
                  <div className="item-row">
                    <div className="item-name" data-testid="text-product-name">{invoice.productName}</div>
                    <div className="item-detail">
                      <span>{invoice.quantity} × {formatMoney(invoice.unitPrice, invoice.currency)}</span>
                      <span data-testid="text-subtotal">{formatMoney(invoice.totalHt, invoice.currency)}</span>
                    </div>
                  </div>
                  <div className="summary">
                    <div className="summary-line">
                      <span>Total hors taxe (HT)</span>
                      <strong data-testid="text-total-ht">{formatMoney(invoice.totalHt, invoice.currency)}</strong>
                    </div>
                    <div className="summary-line">
                      <span>TVA <span className="vat-rate">16 %</span></span>
                      <strong data-testid="text-vat">{formatMoney(invoice.vat, invoice.currency)}</strong>
                    </div>
                    <div className="total-line">
                      <div className="total-caption">Total à payer<small>TOUTES TAXES COMPRISES</small></div>
                      <div className="total-amount" data-testid="text-total-ttc">{formatMoney(invoice.totalTtc, invoice.currency)}</div>
                    </div>
                  </div>
                  <div className="receipt-qr-section">
                    <div className="receipt-qr-copy">
                      <strong>QR du reçu</strong>
                      <span>Scannez pour lire les détails de cette vente.</span>
                      {receiptQrError && <span className="receipt-qr-error" role="alert">{receiptQrError}</span>}
                    </div>
                    {receiptQr
                      ? <img className="receipt-qr-image" src={receiptQr} alt="QR code contenant les détails du reçu" />
                      : <div className="receipt-qr-loading" aria-label="Création du QR code">…</div>}
                  </div>
                  <div className="receipt-foot">
                    <span>TVA RDC · 16 %</span>
                    <span>Merci pour votre confiance</span>
                  </div>
                  <div className="receipt-actions">
                    <button className="receipt-action" type="button" onClick={downloadPdf} disabled={pdfBusy}>
                      <Download size={15} /> {pdfBusy ? 'Création…' : 'Télécharger PDF'}
                    </button>
                    <button className="receipt-action" type="button" onClick={() => window.print()}>
                      <Printer size={15} /> Imprimer
                    </button>
                  </div>
                  {documentError && <p className="receipt-action-error" role="alert">{documentError}</p>}
                  <button className="reset-button" type="button" data-testid="button-new-calculation" onClick={resetReceipt}>
                    <RotateCcw size={13} /> Nouvelle facture
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-receipt" data-testid="empty-receipt">
                <div className="empty-icon"><ReceiptText strokeWidth={1.6} /></div>
                <h3>Votre reçu apparaîtra ici</h3>
                <p>Ajoutez une vente à gauche pour voir le détail HT, TVA et TTC.</p>
                <div className="empty-dash" />
              </div>
            )}
          </section>
        </section>
      </main>

      <footer className="footer">
        <strong>Par Djoberty Ntambwe - Expert Commercial &amp; Code</strong>
        <div className="footer-note"><LockKeyhole size={12} /> Simple, privé, transparent</div>
      </footer>
      <ProductQrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleQrDetected}
      />
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
