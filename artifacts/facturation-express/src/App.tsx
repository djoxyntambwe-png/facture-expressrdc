import { type FormEvent, type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { BadgeCheck, Calculator, FileText, LockKeyhole, ReceiptText, RotateCcw } from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [invoice, setInvoice] = useState<{
    customerName: string;
    productName: string;
    unitPriceUsd: number;
    quantity: number;
    totalHt: number;
    vat: number;
    totalTtc: number;
    createdAt: Date;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const usd = (amount: number) => `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const roundMoney = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const price = Number(unitPrice);
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
      unitPriceUsd: price,
      quantity: count,
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
          <p>Votre vente en USD, avec la TVA RDC déjà intégrée.</p>
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
                  placeholder="Ex. Grâce Mwamba"
                  value={customerName}
                  aria-invalid={Boolean(errors.customerName)}
                  aria-describedby={errors.customerName ? 'customer-error' : undefined}
                  onChange={(event) => { setCustomerName(event.target.value); setErrors((previous) => ({ ...previous, customerName: '' })); }}
                />
                {errors.customerName && <div className="field-hint" id="customer-error" role="alert">{errors.customerName}</div>}
              </div>
              <div className="field">
                <label htmlFor="productName">Produit ou service</label>
                <input
                  id="productName"
                  data-testid="input-product-name"
                  type="text"
                  placeholder="Ex. Lot de fournitures"
                  value={productName}
                  aria-invalid={Boolean(errors.productName)}
                  aria-describedby={errors.productName ? 'product-error' : undefined}
                  onChange={(event) => { setProductName(event.target.value); setErrors((previous) => ({ ...previous, productName: '' })); }}
                />
                {errors.productName && <div className="field-hint" id="product-error" role="alert">{errors.productName}</div>}
              </div>
              <div className="two-fields">
                <div className="field">
                  <label htmlFor="unitPrice">Prix unitaire <small>USD</small></label>
                  <div className="input-with-prefix">
                    <span className="prefix" aria-hidden="true">$</span>
                    <input
                      id="unitPrice"
                      data-testid="input-unit-price"
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      placeholder="0,00"
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
                      <div className="receipt-value">USD · Dollar américain</div>
                    </div>
                  </div>
                  <div className="item-head"><span>Désignation</span><span>Montant HT</span></div>
                  <div className="item-row">
                    <div className="item-name" data-testid="text-product-name">{invoice.productName}</div>
                    <div className="item-detail">
                      <span>{invoice.quantity} × {usd(invoice.unitPriceUsd)}</span>
                      <span data-testid="text-subtotal">{usd(invoice.totalHt)}</span>
                    </div>
                  </div>
                  <div className="summary">
                    <div className="summary-line">
                      <span>Total hors taxe (HT)</span>
                      <strong data-testid="text-total-ht">{usd(invoice.totalHt)}</strong>
                    </div>
                    <div className="summary-line">
                      <span>TVA <span className="vat-rate">16 %</span></span>
                      <strong data-testid="text-vat">{usd(invoice.vat)}</strong>
                    </div>
                    <div className="total-line">
                      <div className="total-caption">Total à payer<small>TOUTES TAXES COMPRISES</small></div>
                      <div className="total-amount" data-testid="text-total-ttc">{usd(invoice.totalTtc)}<span>USD</span></div>
                    </div>
                    <div className="receipt-foot">
                      <span>TVA RDC · 16 %</span>
                      <span>Merci pour votre confiance</span>
                    </div>
                  </div>
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
