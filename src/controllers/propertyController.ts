import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { errorResponse, successResponse } from '@src/responses';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@src/responses/constants/propertyConstant';
import {
  parsePropertyFormData,
  parseUpdateFormData,
  fetchExistingProperty,
  createUpdatedPropertyObject,
  searchPropertiesWithFilters,
  deletePropertiesByIds,
} from '@src/services/propertyService';
import {
  validateAndSaveProperty,
  createPropertyObject,
  validateRequiredFields,
  validateAndSaveUpdatedProperty,
} from '@src/validations/propertyValidation';
import {
  getPropertyById,
  fetchAllProperties,
  searchPropertiesWithPageNumber,
  getPropertySummaries
} from '@src/models/propertyModel';
import { getClientId, getEmployeeId } from '@src/middleware/userContext';
import { checkDynamoDBClient, getDynamoDBClient } from '@src/interfaces/checkDynamoDBClient';
import {
  PropertySearchParams,
  PropertyDeleteRequest,
  PropertyDeleteRequestBody,
} from '@src/interfaces/propertyInterfaces';
import { getClientById } from '../services/clientService';

export const propertyHandler = async (
  app: CustomFastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  try {
    const clientId = getClientId(req);
    const employeeId = getEmployeeId(req);

    if (!checkDynamoDBClient(app, reply)) {
      return;
    }

    const ddbDocClient = getDynamoDBClient(app);

    switch (req.method) {
      case 'POST': {
        if (!req.isMultipart()) {
          return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.REQUEST_ERROR));
        }

        const propertyData = await parsePropertyFormData(req.parts(), clientId);
        const newProperty = createPropertyObject({
          ...propertyData,
          client_id: clientId,

        });

        await validateAndSaveProperty(ddbDocClient, newProperty, reply);
        return;
      }

      case 'GET': {
        const queryParams = req.query as PropertySearchParams;

        const propId = (req.params as any)?.propId;
        if (propId) {
          if (!propId || !clientId) {
            return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.REQUIRED_ID_ERROR));
          }

          const propertyResult = await getPropertyById(ddbDocClient, propId, clientId);
          const propertyItems = propertyResult.Items;

          if (!propertyItems || propertyItems.length === 0) {
            return reply
              .status(200)
              .send(successResponse(200, ERROR_MESSAGES.PROPERTY_NOT_FOUND_ERROR, []));
          }

          // Fetch client data
          const clientData = await getClientById(clientId);

          // Add client data to property
          const propertyWithClient = {
            ...propertyItems[0],
            client: clientData
          };

          return reply
            .status(200)
            .send(successResponse(200, SUCCESS_MESSAGES.PROPERTY_RETRIEVED, propertyWithClient));
        }

        const limit = parseInt(queryParams.limit || '10', 10);
        const page = parseInt(queryParams.page || '1', 10);

        const result = await searchPropertiesWithPageNumber(
          ddbDocClient,
          queryParams,
          clientId,
          limit,
          page,
        );

        // Fetch client data
        const clientData = await getClientById(clientId);

        // Add client data to each property
        const propertiesWithClient = (result.items || []).map((property: any) => ({
          ...property,
          client: clientData
        }));

        const formattedResult = {
          property: propertiesWithClient,
          pagination: {
            next_token: result.lastEvaluatedKey
              ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
              : '',
            prev_token: '',
            limit: result.limit,
            total: result.total,
          },
        };

        return reply.status(200).send({
          status: 200,
          message: SUCCESS_MESSAGES.PROPERTY_SEARCH,
          data: [formattedResult],
        });
      }

      case 'PUT': {
        if (!req.isMultipart()) {
          return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.REQUEST_ERROR));
        }

        const { propId } = req.params as { propId: string };
        const formData = await parseUpdateFormData(req.parts(), clientId);
        formData.id = propId;

        const enrichedFormData = {
          ...formData,
          client_id: clientId,
        };

        if (!validateRequiredFields(enrichedFormData, reply)) {
          return;
        }

        const existingProperty = await fetchExistingProperty(ddbDocClient, enrichedFormData, reply);
        if (!existingProperty) {
          return;
        }

        const updatedProperty = createUpdatedPropertyObject(existingProperty, enrichedFormData);
        await validateAndSaveUpdatedProperty(ddbDocClient, updatedProperty, reply);
        return;
      }

      case 'DELETE': {
        const deleteReq = req as PropertyDeleteRequest;
        const { propId } = deleteReq.params;

        const body = (deleteReq.body || {}) as PropertyDeleteRequestBody;
        const propIds = body.propIds;
        if (!propId && (!propIds || !Array.isArray(propIds) || propIds.length === 0)) {
          return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.REQUEST_ERROR));
        }
        const idsToDelete = propId ? propId : (propIds || []).join(',');

        try {
          const result = await deletePropertiesByIds(app, idsToDelete, clientId);
          if (result.success === false && result.reason === 'NOT_FOUND') {
            return reply.status(200).send(successResponse(200, 'No properties found to delete'));
          }
          return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.PROPERTY_DELETE));
        } catch (error) {
          return reply
            .status(500)
            .send(
              errorResponse(
                500,
                ERROR_MESSAGES.SERVER_ERROR,
                error instanceof Error ? error.message : 'Unknown error',
              ),
            );
        }
      }

      default:
        return reply.status(405).send(errorResponse(405, ERROR_MESSAGES.METHOD_NOT_ALLOWED_ERROR));
    }
  } catch (error) {
    return reply
      .status(500)
      .send(
        errorResponse(
          500,
          ERROR_MESSAGES.SERVER_ERROR,
          error instanceof Error ? error.message : 'Unknown error',
        ),
      );
  }
};

export const publicPropertyHandler = async (
  app: CustomFastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  try {
    if (!checkDynamoDBClient(app, reply)) {
      return;
    }

    const ddbDocClient = getDynamoDBClient(app);

    switch (req.method) {
      case 'GET': {
        if (req.params && (req.params as any).propId) {
          const { propId } = req.params as { propId: string };
          const { client_id } = req.query as { client_id: string };
          if (!propId || !client_id) {
            return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.REQUIRED_ID_ERROR));
          }

          const propertyResult = await getPropertyById(ddbDocClient, propId, client_id);
          const propertyItems = propertyResult.Items;

          if (!propertyItems || propertyItems.length === 0) {
            return reply
              .status(200)
              .send(successResponse(200, ERROR_MESSAGES.PROPERTY_NOT_FOUND_ERROR, null));
          }
          const property = propertyItems[0];

          return reply
            .status(200)
            .send(successResponse(200, SUCCESS_MESSAGES.PROPERTY_RETRIEVED, property));
        } else {
          const queryParams = req.query as PropertySearchParams;
          const { client_id } = req.query as { client_id: string };
          const hasFilters = Object.values(queryParams).some((value) => !!value);

          const properties = await (hasFilters
            ? searchPropertiesWithFilters(ddbDocClient, queryParams, client_id)
            : fetchAllProperties(ddbDocClient, client_id));

          return reply
            .status(200)
            .send(successResponse(200, SUCCESS_MESSAGES.PROPERTY_SEARCH, properties));
        }
      }

      default:
        return reply.status(405).send(errorResponse(405, ERROR_MESSAGES.METHOD_NOT_ALLOWED_ERROR));
    }
  } catch (error) {
    return reply
      .status(500)
      .send(
        errorResponse(
          500,
          ERROR_MESSAGES.SERVER_ERROR,
          error instanceof Error ? error.message : 'Unknown error',
        ),
      );
  }
};

export const propertyNameHandler = async (app: CustomFastifyInstance, req: any, reply: any) => {
  try {
    const ddbDocClient = getDynamoDBClient(app);
    const clientId = getClientId(req);
    if (!clientId) {
      return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.CLIENDTT_ID_REQUIRED_ERROR));
    }

    const summaries = await getPropertySummaries(ddbDocClient, clientId);

    return reply.status(200).send(successResponse(200, SUCCESS_MESSAGES.PROPERTY_SEARCH, summaries));
  } catch (err) {
    console.error('Error in propertySummaryHandler:', err);
    return reply.status(500).send(errorResponse(500, ERROR_MESSAGES.SERVER_ERROR));
  }
};
