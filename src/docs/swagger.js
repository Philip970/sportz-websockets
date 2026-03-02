import swaggerJSDoc from "swagger-jsdoc";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sportz API",
      version: "1.0.0",
      description: "API documentation for Sportz backend",
    },
    servers: [
      {
        url: "http://localhost:8010",
      },
    ],
  },
  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
