const dotenv = require('dotenv');
const path = require('path');
const { Joi } = require('celebrate');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MAIN_POINT_URL: Joi.string().required('Point main app url'),
    WEBSITE_URL: Joi.string().required('Website url'),
    DATABASE_USERNAME: Joi.string().required().description('Main database username'),
    DATABASE_PASSWORD: Joi.string().required().description('Main database password'),
    DATABASE_NAME: Joi.string().required().description('Main database name'),
    DATABASE_PORT: Joi.string().required().description('Main database port'),
    DATABASE_LOGGING: Joi.boolean().default(false).description('Main database logging'),
    TENANT_DATABASE_USERNAME: Joi.string().required().description('Tenant database username'),
    TENANT_DATABASE_PASSWORD: Joi.string().required().description('Tenant database password'),
    TENANT_DATABASE_NAME: Joi.string().required().description('Tenant database name'),
    TENANT_DATABASE_PORT: Joi.string().required().description('Tenant database port'),
    TENANT_DATABASE_LOGGING: Joi.boolean().default(false).description('Tenant database logging'),
    TEST_DATABASE_USERNAME: Joi.string().allow(null, '').description('Test main database username'),
    TEST_DATABASE_PASSWORD: Joi.string().allow(null, '').description('Test main database password'),
    TEST_DATABASE_NAME: Joi.string().allow(null, '').description('Test main database name'),
    TEST_DATABASE_PORT: Joi.string().allow(null, '').description('Test main database port'),
    TEST_DATABASE_LOGGING: Joi.boolean().default(false).description('Test main database logging'),
    TEST_TENANT_DATABASE_USERNAME: Joi.string().allow(null, '').description('Test tenant database username'),
    TEST_TENANT_DATABASE_PASSWORD: Joi.string().allow(null, '').description('Test tenant database password'),
    TEST_TENANT_DATABASE_NAME: Joi.string().allow(null, '').description('Test tenant database name'),
    TEST_TENANT_DATABASE_PORT: Joi.string().allow(null, '').description('Test tenant database port'),
    TEST_TENANT_DATABASE_LOGGING: Joi.boolean().default(false).description('Test tenant database logging'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    AWS_REGION: Joi.string().description('aws region'),
    AWS_ACCESS_KEY_ID: Joi.string().description('aws access key id'),
    AWS_SECRET_ACCESS_KEY: Joi.string().description('aws secret access key'),
    AWS_S3_BUCKET_NAME: Joi.string().description('aws s3 bucket name'),
    AWS_S3_BASE_URL: Joi.string().description('aws s3 base url'),
    TZ: Joi.string().required().description('default timezone')
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mainPointUrl: envVars.MAIN_POINT_URL,
  websiteUrl: envVars.WEBSITE_URL,
  database: {
    username: envVars.DATABASE_USERNAME,
    password: envVars.DATABASE_PASSWORD,
    name: envVars.DATABASE_NAME,
    host: envVars.DATABASE_HOST,
    port: envVars.DATABASE_PORT,
    logging: envVars.DATABASE_LOGGING,
  },
  tenantDatabase: {
    username: envVars.TENANT_DATABASE_USERNAME,
    password: envVars.TENANT_DATABASE_PASSWORD,
    name: envVars.TENANT_DATABASE_NAME,
    host: envVars.TENANT_DATABASE_HOST,
    port: envVars.TENANT_DATABASE_PORT,
    logging: envVars.TENANT_DATABASE_LOGGING,
  },
  testDatabase: {
    username: envVars.TEST_DATABASE_USERNAME,
    password: envVars.TEST_DATABASE_PASSWORD,
    name: envVars.TEST_DATABASE_NAME,
    host: envVars.TEST_DATABASE_HOST,
    port: envVars.TEST_DATABASE_PORT,
    logging: envVars.TEST_DATABASE_LOGGING,
  },
  testTenantDatabase: {
    username: envVars.TEST_TENANT_DATABASE_USERNAME,
    password: envVars.TEST_TENANT_DATABASE_PASSWORD,
    name: envVars.TEST_TENANT_DATABASE_NAME,
    host: envVars.TEST_TENANT_DATABASE_HOST,
    port: envVars.TEST_TENANT_DATABASE_PORT,
    logging: envVars.TEST_TENANT_DATABASE_LOGGING,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  aws: {
    region: envVars.AWS_REGION,
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    s3BucketName: envVars.AWS_S3_BUCKET_NAME,
    s3BaseUrl: envVars.AWS_S3_BASE_URL,
  },
  timezone: envVars.TZ
};
