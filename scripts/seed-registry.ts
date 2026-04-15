import 'dotenv/config';
import { Pool } from 'pg';

type RegistryEvent = {
  eventName: string;
  platform: 'web' | 'android' | 'ios' | 'backend';
  producer: 'client' | 'backend';
  sourceOfTruth: 'client' | 'backend';
  description: string;
  requiredParameters?: string[];
  optionalParameters?: string[];
};

const productName = 'ghabzino';

const events: RegistryEvent[] = [
  {
    eventName: 'login_otp_success',
    platform: 'web',
    producer: 'client',
    sourceOfTruth: 'client',
    description: 'OTP was sent or verified successfully during login.'
  },
  {
    eventName: 'login_otp_fail',
    platform: 'web',
    producer: 'client',
    sourceOfTruth: 'client',
    description: 'OTP login flow failed.',
    optionalParameters: ['Product', 'message', 'error_code', 'store']
  },
  {
    eventName: 'login_success',
    platform: 'web',
    producer: 'client',
    sourceOfTruth: 'client',
    description: 'User logged in successfully.'
  },
  {
    eventName: 'login_fail',
    platform: 'web',
    producer: 'client',
    sourceOfTruth: 'client',
    description: 'User login failed.',
    optionalParameters: ['Product', 'message', 'error_code', 'store']
  },
  {
    eventName: 'choose_WBI',
    platform: 'web',
    producer: 'client',
    sourceOfTruth: 'client',
    description: 'Water bill inquiry service was selected.'
  },
  {
    eventName: 'start_WBI_fail',
    platform: 'web',
    producer: 'client',
    sourceOfTruth: 'client',
    description: 'Water bill inquiry start failed.',
    optionalParameters: ['Product', 'message', 'error_code']
  },
  {
    eventName: 'start_WBI_success',
    platform: 'web',
    producer: 'client',
    sourceOfTruth: 'client',
    description: 'Water bill inquiry started successfully.',
    optionalParameters: ['Product']
  },
  {
    eventName: 'finalized_WBI_success',
    platform: 'web',
    producer: 'client',
    sourceOfTruth: 'client',
    description: 'Water bill inquiry finished successfully.',
    optionalParameters: ['Product']
  },
  {
    eventName: 'finalized_WBI_fail',
    platform: 'web',
    producer: 'client',
    sourceOfTruth: 'client',
    description: 'Water bill inquiry finished with failure.',
    optionalParameters: ['Product', 'message', 'error_code']
  },
  {
    eventName: 'finalized_CTFI_success',
    platform: 'android',
    producer: 'client',
    sourceOfTruth: 'client',
    description: 'Car traffic fines inquiry finished successfully.'
  },
  {
    eventName: 'payment_callback_wallet',
    platform: 'backend',
    producer: 'backend',
    sourceOfTruth: 'backend',
    description: 'Wallet payment callback received.'
  },
  {
    eventName: 'payment_callback_wallet_success',
    platform: 'backend',
    producer: 'backend',
    sourceOfTruth: 'backend',
    description: 'Wallet payment callback succeeded.',
    optionalParameters: ['transaction_id', 'provider_reference', 'pay_amount', 'gateway_type']
  },
  {
    eventName: 'payment_callback_wallet_fail',
    platform: 'backend',
    producer: 'backend',
    sourceOfTruth: 'backend',
    description: 'Wallet payment callback failed.',
    optionalParameters: ['message', 'error_code', 'transaction_id', 'provider_reference', 'gateway_type']
  },
  {
    eventName: 'payment_callback_basket_success',
    platform: 'backend',
    producer: 'backend',
    sourceOfTruth: 'backend',
    description: 'Basket payment callback succeeded.',
    optionalParameters: ['transaction_id', 'provider_reference', 'pay_amount', 'gateway_type']
  },
  {
    eventName: 'payment_callback_basket_fail',
    platform: 'backend',
    producer: 'backend',
    sourceOfTruth: 'backend',
    description: 'Basket payment callback failed.',
    optionalParameters: ['message', 'error_code', 'transaction_id', 'provider_reference', 'gateway_type']
  }
];

const pool = new Pool({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  user: process.env.DATABASE_USER ?? 'tracking',
  password: process.env.DATABASE_PASSWORD ?? 'tracking',
  database: process.env.DATABASE_NAME ?? 'tracking'
});

async function run() {
  for (const event of events) {
    await pool.query(
      `
        INSERT INTO tracking_event_registry (
          product_name,
          event_name,
          platform,
          producer,
          source_of_truth,
          description,
          required_parameters,
          optional_parameters
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (product_name, event_name, platform)
        DO UPDATE SET
          producer = EXCLUDED.producer,
          source_of_truth = EXCLUDED.source_of_truth,
          description = EXCLUDED.description,
          required_parameters = EXCLUDED.required_parameters,
          optional_parameters = EXCLUDED.optional_parameters,
          is_active = true,
          updated_at = now()
      `,
      [
        productName,
        event.eventName,
        event.platform,
        event.producer,
        event.sourceOfTruth,
        event.description,
        event.requiredParameters ?? [],
        event.optionalParameters ?? []
      ]
    );
  }

  console.log(`Seeded ${events.length} registry events`);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
