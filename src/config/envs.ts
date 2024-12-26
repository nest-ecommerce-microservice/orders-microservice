import 'dotenv/config';

import * as Joi from 'joi';

interface EnvVars {
  PORT: number;
  PRODUCTS_MICROSERVICES_HOST: string;
  PRODUCTS_MICROSERVICES_PORT: number;
}

const envsSchema = Joi.object({
  PORT: Joi.number().required(),
  PRODUCTS_MICROSERVICES_HOST: Joi.string().required(),
  PRODUCTS_MICROSERVICES_PORT: Joi.number().required(),
}).unknown(true);

const { error, value } = envsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  productsMicroservicesHost: envVars.PRODUCTS_MICROSERVICES_HOST,
  productsMicroservicesPort: envVars.PRODUCTS_MICROSERVICES_PORT,
};
