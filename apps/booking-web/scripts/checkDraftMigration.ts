import { __draftMigrationTools } from '../src/features/booking/state';

const { extractStoredDraft } = __draftMigrationTools;

const legacyDraft = {
  serviceId: 12,
  serviceCode: 'MAJOR' as unknown,
  serviceName: 'Major Service',
  engineTierId: 4,
  engineTierCode: 'TIER_3',
  pricePence: 18999,
  vehicle: {
    vrm: 'AB12CDE',
    make: 'Ford',
    model: 'Focus',
    recommendation: {
      engineTierId: 4,
      engineTierCode: 'TIER_3',
      engineTierName: '2.0L - 2.9L',
      pricePence: 18999,
    },
  },
  date: '2025-11-02',
  time: '09:30',
  customer: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+447777777777',
    notes: 'Leave keys with reception',
  },
  holdId: 'hold_old_format',
  holdExpiresAt: '2025-10-29T10:15:00.000Z',
};

const storedLegacy = {
  version: 1,
  data: legacyDraft,
};

const migrated = extractStoredDraft(storedLegacy);

const tests = [
  ['customer.firstName', migrated.customer?.firstName === 'Jane'],
  ['customer.lastName', migrated.customer?.lastName === 'Doe'],
  ['customer.mobileNumber', migrated.customer?.mobileNumber === '+447777777777'],
  ['bookingNotes fallback', migrated.bookingNotes === 'Leave keys with reception'],
  ['account untouched', migrated.account === undefined],
];

// eslint-disable-next-line no-console
console.log('Legacy draft migration results:');
for (const [label, result] of tests) {
  // eslint-disable-next-line no-console
  console.log(`${label}: ${result ? 'pass' : 'FAIL'}`);
}

const currentFormat = {
  version: 2,
  data: {
    serviceId: 9,
    customer: {
      title: 'MR',
      firstName: 'Alex',
      lastName: 'Smith',
      email: 'alex@example.com',
      mobileNumber: '+441234567890',
      marketingOptIn: true,
      acceptedTerms: true,
      notes: 'Current format note',
    },
    bookingNotes: 'Current format note',
  },
};

const migratedCurrent = extractStoredDraft(currentFormat);

const currentTests = [
  ['current draft preserved', migratedCurrent.customer?.firstName === 'Alex'],
  ['marketing opt in', migratedCurrent.customer?.marketingOptIn === true],
  ['notes untouched', migratedCurrent.bookingNotes === 'Current format note'],
];

// eslint-disable-next-line no-console
console.log('\nCurrent format sanity checks:');
for (const [label, result] of currentTests) {
  // eslint-disable-next-line no-console
  console.log(`${label}: ${result ? 'pass' : 'FAIL'}`);
}
