
export type PackagingType = 'drums' | 'totes';

export interface Product {
  id: string;
  name: string;
  unNumber: string;
  hazardClass: string;
  packingGroup: string;
  density: number;
  kgPerTote: number;
  kgPerDrum: number;
  htsCode: string;
  pH: number;
  minSG: number;
  maxSG: number;
}

export interface LineItem {
  id: number;
  productId: string;
  quantity: number;
  unitType: PackagingType;
  unitPrice: number;
  lotNumber: string;
}

export interface CalculatedLineItem extends LineItem {
  product: Product;
  netWeight: number;
  tareWeight: number;
  grossWeight: number;
  totalValue: number;
  pallets: number;
}

export interface ShipmentFormData {
  items: LineItem[];
  customerName: string;
  mexicoAddress: string;
  laredoAddress: string;
  customerPhone: string;
  customerEmail: string;
  rfc: string;
  laredoContactName: string;
  laredoContactPhone: string;
  shipDate: string;
  poNumber: string;
  carrier: string;
  broker: string;
  loadNumber: string;
  itnNumber: string;
  baseInvoice: string;
  sequence: string;
}

export interface ShipmentCalculations {
  items: CalculatedLineItem[];
  totalNetWeight: number;
  totalTareWeight: number;
  totalGrossWeight: number;
  totalValue: number;
  totalPallets: number;
  totalQuantity: number;
  hasHazmat: boolean;
  invoiceNumber: string;
  isOverweight: boolean;
}

export type DocumentTab =
  | 'summary'
  | 'invoice'
  | 'packing'
  | 'usmca'
  | 'bol'
  | 'coq'
  | 'hazmat'
  | 'reminders';
