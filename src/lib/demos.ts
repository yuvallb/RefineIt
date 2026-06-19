const BASE = import.meta.env.BASE_URL;

export interface DemoDataset {
  file: string;
  filename: string;
}

export interface Demo {
  id: string;
  label: string;
  description: string;
  workflow: string;
  datasets: DemoDataset[];
}

export const DEMOS: Demo[] = [
  {
    id: 'sales-analysis',
    label: 'Sales analysis',
    description: 'CSV → Filter → GroupBy → Output',
    workflow: `${BASE}demo/sales-analysis.refineit.json`,
    datasets: [{ file: `${BASE}demo/sales.csv`, filename: 'sales.csv' }],
  },
  {
    id: 'customer-join',
    label: 'Customer join',
    description: 'Two sources → Join → Select → Output',
    workflow: `${BASE}demo/customer-join.refineit.json`,
    datasets: [
      { file: `${BASE}demo/sales.csv`, filename: 'sales.csv' },
      { file: `${BASE}demo/customers.csv`, filename: 'customers.csv' },
    ],
  },
  {
    id: 'parameterized-filter',
    label: 'Parameterized filter',
    description: 'Filter with {country} parameter',
    workflow: `${BASE}demo/parameterized-filter.refineit.json`,
    datasets: [{ file: `${BASE}demo/sales.csv`, filename: 'sales.csv' }],
  },
];
