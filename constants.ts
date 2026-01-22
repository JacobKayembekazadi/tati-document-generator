
import { Product } from './types';

const withDefaultSpecs = (
  p: Omit<Product, 'pH' | 'minSG' | 'maxSG'>
): Product => ({
  ...p,
  pH: 7.5,
  minSG: p.density * 0.98,
  maxSG: p.density * 1.02,
});

export const PRODUCT_DATABASE: Product[] = [
  withDefaultSpecs({ id: 'P01', name: 'TATI ANTIFOAM-07', unNumber: 'Not regulated', hazardClass: '-', packingGroup: '-', density: 1.01, kgPerTote: 1010, kgPerDrum: 208, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P02', name: 'TATI CLEAN 100', unNumber: 'Not regulated', hazardClass: '-', packingGroup: '-', density: 1.01, kgPerTote: 1010, kgPerDrum: 208, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P03', name: 'TATI CYDE 900', unNumber: 'Not regulated', hazardClass: '-', packingGroup: '-', density: 1.02, kgPerTote: 1020, kgPerDrum: 212, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P04', name: 'TATI FLOC-07', unNumber: 'Not regulated', hazardClass: '-', packingGroup: '-', density: 1.01, kgPerTote: 1010, kgPerDrum: 210, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P05', name: 'TATI FOAM 311', unNumber: 'Not regulated', hazardClass: '-', packingGroup: '-', density: 1.07, kgPerTote: 1070, kgPerDrum: 223, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P06', name: 'TATI SCALE 327', unNumber: 'Not regulated', hazardClass: '-', packingGroup: '-', density: 1.04, kgPerTote: 1040, kgPerDrum: 216, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P07', name: 'TATI NOL 99', unNumber: 'UN1219', hazardClass: '3', packingGroup: 'II', density: 0.785, kgPerTote: 785, kgPerDrum: 163, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P08', name: 'TATI FIN 91', unNumber: 'UN1268', hazardClass: '3', packingGroup: 'II', density: 0.92, kgPerTote: 920, kgPerDrum: 191, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P09', name: 'TATI REZ 100', unNumber: 'UN1299', hazardClass: '3', packingGroup: 'II', density: 0.865, kgPerTote: 865, kgPerDrum: 180, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P10', name: 'TATI CLR-07', unNumber: 'UN1992', hazardClass: '3 (6.1)', packingGroup: 'II', density: 1.01, kgPerTote: 1000, kgPerDrum: 208, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P11', name: 'TATI IH-07', unNumber: 'UN1992', hazardClass: '3 (6.1)', packingGroup: 'II', density: 0.83, kgPerTote: 830, kgPerDrum: 173, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P12', name: 'TATI FLOW-07', unNumber: 'UN1992', hazardClass: '3 (6.1)', packingGroup: 'II', density: 1.02, kgPerTote: 1020, kgPerDrum: 212, htsCode: '3811.90.99' }),
  { id: 'P13', name: 'TATI Y-07', unNumber: 'UN1992', hazardClass: '3 (6.1)', packingGroup: 'II', density: 0.86, kgPerTote: 861, kgPerDrum: 179, htsCode: '3811.90.99', pH: 5.0, minSG: 0.84, maxSG: 0.90 },
  withDefaultSpecs({ id: 'P14', name: 'TATI EB-07', unNumber: 'UN1992', hazardClass: '3 (6.1)', packingGroup: 'II', density: 0.9, kgPerTote: 900, kgPerDrum: 187, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P15', name: 'TATI AYA-07', unNumber: 'NA1993', hazardClass: '3', packingGroup: 'III', density: 0.861, kgPerTote: 861, kgPerDrum: 179, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P16', name: 'TATI HIB-77', unNumber: 'NA1993', hazardClass: '3', packingGroup: 'III', density: 0.92, kgPerTote: 920, kgPerDrum: 191, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P17', name: 'TATI HIB-07', unNumber: 'NA1993', hazardClass: '3', packingGroup: 'III', density: 0.87, kgPerTote: 870, kgPerDrum: 181, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P18', name: 'TATI SCORE-07', unNumber: 'NA1993', hazardClass: '3', packingGroup: 'III', density: 0.99, kgPerTote: 990, kgPerDrum: 206, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P19', name: 'TATI THIN 80', unNumber: 'NA1993', hazardClass: '3', packingGroup: 'III', density: 0.861, kgPerTote: 861, kgPerDrum: 179, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P20', name: 'TATI ECO H2S SECUESTRANTE', unNumber: 'NA1993', hazardClass: '3', packingGroup: 'III', density: 1.02, kgPerTote: 1020, kgPerDrum: 212, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P21', name: 'TATI SECUESTRANTE H2S', unNumber: 'UN2735', hazardClass: '8', packingGroup: 'III', density: 1.12, kgPerTote: 1120, kgPerDrum: 233, htsCode: '3811.90.99' }),
  withDefaultSpecs({ id: 'P22', name: 'TATI CHEM 153', unNumber: 'UN2924', hazardClass: '8', packingGroup: 'II', density: 1.01, kgPerTote: 1010, kgPerDrum: 210, htsCode: '3811.90.99' }),
];

export const EXPORTER_INFO = {
  name: 'Texas American Trade, Inc.',
  address: '5075 Westheimer, Suite 799 W',
  city: 'Houston, Texas – USA 77056',
  phone: '+1 (832) 238-1103',
  email: 'hernany@texasamericantrade.com',
  taxId: '74-3016496',
};

export const PERSONNEL = {
  generalManager: 'Hernany Martinez',
  shipperContact: 'Diego Yañez Fortoul',
  qaTechnician: 'Rudy Montalvo',
  receiverContact: 'Hernany Martinez',
  contactPhone: '(832) 671-9631',
  contactEmail: 'hernany@texasamericantrade.com',
};

export const PACKAGING_STANDARDS = {
  drumTareKg: 25,
  toteTareKg: 60,
  drumsPerPallet: 4,
  totesPerPallet: 1,
};

export const MAX_GROSS_WEIGHT_KG = 21000;

export const ERG_NUMBERS: Record<string, string> = {
  'UN1219': '127',
  'UN1268': '128',
  'UN1299': '128',
  'UN1992': '131',
  'NA1993': '128',
  'UN2735': '153',
  'UN2924': '154',
};

export const PROPER_SHIPPING_NAMES: Record<string, { dot: string; nom: string; desc: string }> = {
  'UN1219': { dot: 'Isopropanol', nom: 'Isopropanol', desc: '' },
  'UN1268': { dot: 'Petroleum distillates, n.o.s.', nom: 'Destilados de petróleo, n.e.p.', desc: '' },
  'UN1299': { dot: 'Turpentine', nom: 'Trementina', desc: '' },
  'UN1992': { dot: 'Flammable liquid, toxic, n.o.s.', nom: 'Líquido inflamable, tóxico, n.e.p.', desc: ' (Xylene, Methyl Alcohol)' },
  'NA1993': { dot: 'Combustible liquid, n.o.s.', nom: 'Líquido combustible, n.e.p.', desc: '' },
  'UN2735': { dot: 'Amines, liquid, corrosive, n.o.s.', nom: 'Aminas, líquidas, corrosivas, n.e.p.', desc: '' },
  'UN2924': { dot: 'Flammable liquid, corrosive, n.o.s.', nom: 'Líquido inflamable, corrosivo, n.e.p.', desc: '' },
};

export const getProductById = (id: string): Product => {
  return PRODUCT_DATABASE.find((p) => p.id === id) || PRODUCT_DATABASE[0];
};

export const generateLotNumber = (): string => {
  return `LOT-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
};

export const generateLabId = (shipDate: string): string => {
  const date = new Date(shipDate + 'T00:00:00');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
};
