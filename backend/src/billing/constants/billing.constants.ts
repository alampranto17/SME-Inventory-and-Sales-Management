import { TenantPlan } from 'src/tenants/enums/tenantPlan.enum';

export const BILLING_PLANS = [
  {
    id: 'starter',
    plan: TenantPlan.STARTER,
    name: 'Starter',
    description: 'Best for small shops just getting started',
    badge: null,
    pricing: {
      monthly: { amount: 2999, currency: 'BDT', label: '2,999 BDT / month' },
      yearly: {
        amount: 29990,
        currency: 'BDT',
        label: '29,990 BDT / year',
        saving: 'Save 17%',
      },
    },
    limits: {
      skus: 100,
      warehouses: 1,
      users: 2,
    },
    features: [
      { text: '100 products', included: true },
      { text: '1 warehouse', included: true },
      { text: '2 staff accounts', included: true },
      { text: 'Email support', included: true },
      { text: 'Sales reports', included: false },
      { text: 'API access', included: false },
      { text: 'Custom reports', included: false },
    ],
    payment_methods: ['bKash', 'Nagad', 'Card'],
    cta: 'Get started',
  },
  {
    id: 'growth',
    plan: TenantPlan.GROWTH,
    name: 'Growth',
    description: 'For businesses that are growing fast',
    badge: { label: 'Most popular', color: 'blue' },
    pricing: {
      monthly: { amount: 7999, currency: 'BDT', label: '7,999 BDT / month' },
      yearly: {
        amount: 79990,
        currency: 'BDT',
        label: '79,990 BDT / year',
        saving: 'Save 17%',
      },
    },
    limits: {
      skus: 10_000,
      warehouses: 5,
      users: 10,
    },
    features: [
      { text: '10,000 products', included: true },
      { text: '5 warehouses', included: true },
      { text: '10 staff accounts', included: true },
      { text: 'Priority support', included: true },
      { text: 'Sales reports', included: true },
      { text: 'API access', included: true },
      { text: 'Custom reports', included: false },
    ],
    payment_methods: ['bKash', 'Nagad', 'Rocket', 'Card', 'Bank Transfer'],
    cta: 'Start now',
  },
  {
    id: 'enterprise',
    plan: TenantPlan.ENTERPRISE,
    name: 'Enterprise',
    description: 'For large businesses that need everything',
    badge: { label: 'Best value', color: 'green' },
    pricing: {
      monthly: { amount: 19999, currency: 'BDT', label: '19,999 BDT / month' },
      yearly: {
        amount: 199990,
        currency: 'BDT',
        label: '1,99,990 BDT / year',
        saving: 'Save 17%',
      },
    },
    limits: {
      skus: null, // unlimited
      warehouses: null,
      users: null,
    },
    features: [
      { text: 'Unlimited products', included: true },
      { text: 'Unlimited warehouses', included: true },
      { text: 'Unlimited staff accounts', included: true },
      { text: 'Dedicated support', included: true },
      { text: 'Sales reports', included: true },
      { text: 'API access', included: true },
      { text: 'Custom reports', included: true },
    ],
    payment_methods: [
      'bKash',
      'Nagad',
      'Rocket',
      'Card',
      'Bank Transfer',
      'Cheque',
    ],
    cta: 'Talk to us',
  },
];
