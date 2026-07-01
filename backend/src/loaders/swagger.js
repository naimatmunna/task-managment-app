import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import config from '../config/index.js';

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'MERN Starter API',
    version: '1.0.0',
    description: 'Production-ready MERN starter — versioned REST API.',
  },
  servers: [{ url: `${config.apiPrefix}/v1`, description: 'v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          code: { type: 'string', nullable: true },
          details: { type: 'object', nullable: true },
          requestId: { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const spec = swaggerJSDoc({
  definition,
  apis: ['./src/routes/**/*.js', './src/docs/swagger/**/*.js'],
});

export const mountSwagger = (app) => {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));
  app.get('/docs.json', (_req, res) => res.json(spec));
};
