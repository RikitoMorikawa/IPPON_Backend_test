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
} from '@src/repositroies/propertyModel';
import { getClientId, getEmployeeId } from '@src/middleware/userContext';
import { checkDynamoDBClient, getDynamoDBClient } from '@src/interfaces/checkDynamoDBClient';
import {
  PropertySearchParams,
  PropertyDeleteRequest,
  PropertyDeleteRequestBody,
} from '@src/interfaces/propertyInterfaces';
import { getClientById } from '../services/clientService';
import { searchInquiryByProperty } from '@src/repositroies/inquiryModel';
import { getBatchReportSettingByProperty } from '@src/repositroies/batchReportModel';
import { getPrefectureCodeByName } from '@src/enums/propertyEnums';
import * as batchReportModel from '@src/repositroies/batchReportModel';
import { BatchReportSetting } from '@src/models/batchReportType';

// 物件データの都道府県をコードに変換する関数
const convertPrefectureToCode = (property: any) => {
  const convertedProperty = { ...property };
  
  // prefecture フィールドがある場合はコードに変換
  if (convertedProperty.prefecture) {
    const prefectureCode = getPrefectureCodeByName(convertedProperty.prefecture);
    if (prefectureCode) {
      convertedProperty.prefecture = prefectureCode;
    }
  }
  
  // address_prefecture フィールドがある場合もコードに変換
  if (convertedProperty.address_prefecture) {
    const prefectureCode = getPrefectureCodeByName(convertedProperty.address_prefecture);
    if (prefectureCode) {
      convertedProperty.address_prefecture = prefectureCode;
    }
  }
  
  return convertedProperty;
};

export const propertyHandler = async (
  app: CustomFastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  try {
    const clientId = getClientId(req);

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

          // Add client data to property and convert prefecture to code
          const propertyWithClient = convertPrefectureToCode({
            ...propertyItems[0],
            client: clientData
          });

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

        // Add client data to each property and convert prefecture to code
        const propertiesWithClient = (result.items || []).map((property: any) => 
          convertPrefectureToCode({
            ...property,
            client: clientData
          })
        );

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
          
          // Convert prefecture to code
          const property = convertPrefectureToCode(propertyItems[0]);

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

          // Convert prefecture to code for all properties
          const convertedProperties = {
            ...properties,
            items: (properties.items || []).map((property: any) => convertPrefectureToCode(property))
          };

          return reply
            .status(200)
            .send(successResponse(200, SUCCESS_MESSAGES.PROPERTY_SEARCH, convertedProperties));
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

export const propertyInquiryHandler = async (
  app: CustomFastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  try {
    const clientId = getClientId(req);
    const { propId } = req.params as { propId: string };
    const { 
      start_date = '',
      end_date = '',
      limit = '10',
      page = '1'
    } = req.query as {
      start_date?: string;
      end_date?: string;
      limit?: string;
      page?: string;
    };

    if (!checkDynamoDBClient(app, reply)) {
      return;
    }

    const ddbDocClient = getDynamoDBClient(app);

    if (!propId) {
      return reply.status(400).send(errorResponse(400, 'Property ID is required'));
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // fallback to defaults
    const safePage = isNaN(pageNumber) || pageNumber < 1 ? 1 : pageNumber;
    const safeLimit = isNaN(limitNumber) || limitNumber < 1 ? 10 : limitNumber;

    const result = await searchInquiryByProperty(
      ddbDocClient,
      clientId,
      safeLimit,
      safePage,
      propId,
      start_date,
      end_date,
      '', // inquiryId
      '', // inquiryMethod
    );

    // CustomerInteraction形式に変換
    const customerInteractions = result.items.map((item: any) => {
      const inquiry = item.inquiry;
      const customer = inquiry.customer;
      
      // customer_nameを作成 (last_name + first_name)
      let customerName = '';
      if (customer) {
        const lastName = customer.last_name || '';
        const firstName = customer.first_name || '';
        customerName = `${lastName}${firstName}`.trim();
      }

      // 日付をYYYY-MM-DD形式に変換
      const date = inquiry.inquired_at ? new Date(inquiry.inquired_at).toISOString().split('T')[0] : '';

      return {
        id: inquiry.id,
        date: date,
        customer_name: customerName,
        category: inquiry.category || '',
        content: inquiry.summary || ''
      };
    });

    return reply
      .status(200)
      .send(successResponse(200, 'Inquiries retrieved successfully', customerInteractions));

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

export const propertyBatchStatusHandler = async (
  app: CustomFastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  try {
    const clientId = getClientId(req);

    if (!checkDynamoDBClient(app, reply)) {
      return;
    }

    const ddbDocClient = getDynamoDBClient(app);

    switch (req.method) {
      case 'GET': {
        const { property_id } = req.query as { property_id: string };

        if (!property_id) {
          return reply.status(400).send(errorResponse(400, 'Property ID is required'));
        }

        // 指定された物件のバッチ設定を取得
        const batchSetting = await getBatchReportSettingByProperty(
          ddbDocClient,
          clientId,
          property_id
        );

        // バッチ設定が見つからない場合は空のデータを返す
        if (!batchSetting) {
          const emptyResponse = {
            id: null,
            start_date: null,
            auto_create_period: null,
            auto_generate: false,
            execution_time: null,
            next_execution_date: null,
            status: null,
            execution_count: 0,
            last_execution_date: null,
            weekday: null,
          };

          return reply
            .status(200)
            .send(successResponse(200, 'No batch setting found for this property', emptyResponse));
        }

        // レスポンス形式に変換
        const response = {
          id: batchSetting.id,
          start_date: batchSetting.start_date,
          auto_create_period: batchSetting.auto_create_period,
          auto_generate: batchSetting.auto_generate,
          execution_time: batchSetting.execution_time,
          next_execution_date: batchSetting.next_execution_date,
          status: batchSetting.status,
          execution_count: batchSetting.execution_count,
          weekday: batchSetting.weekday,
          last_execution_date: batchSetting.last_execution_date || null,
        };

        return reply
          .status(200)
          .send(successResponse(200, 'Batch status retrieved successfully', response));
      }

      case 'PUT': {
        const { id } = req.params as { id: string };
        const updateData = req.body as {
          start_date?: string;
          auto_create_period?: string;
          auto_generate?: boolean;
          execution_time?: string;
          executionTime?: string; // フロントエンド用
          weekday?: string;
        };

        if (!id) {
          return reply.status(400).send(errorResponse(400, 'Batch ID is required'));
        }

        // まずバッチ設定を取得してclient_idとcreated_atを確認
        const existingBatches = await batchReportModel.getBatchReportSettingsByClient(
          ddbDocClient,
          clientId
        );

        const existingBatch = existingBatches.find((batch: BatchReportSetting) => batch.id === id);
        if (!existingBatch) {
          return reply.status(404).send(errorResponse(404, 'Batch setting not found'));
        }

        // 更新データを準備
        const updates: any = {};
        
        if (updateData.start_date !== undefined) {
          updates.start_date = updateData.start_date;
        }
        if (updateData.auto_create_period !== undefined) {
          updates.auto_create_period = updateData.auto_create_period;
        }
        if (updateData.auto_generate !== undefined) {
          updates.auto_generate = updateData.auto_generate;
        }
        if (updateData.execution_time !== undefined) {
          updates.execution_time = updateData.execution_time;
        }
        // executionTime（フロントエンド）→ execution_time（サーバー）変換
        if (updateData.executionTime !== undefined) {
          updates.execution_time = updateData.executionTime;
        }
        if (updateData.weekday !== undefined) {
          updates.weekday = updateData.weekday;
        }

        // start_date, execution_time, weekday のいずれかが変更された場合、next_execution_dateを再計算
        if (updateData.start_date || updateData.execution_time || updateData.executionTime || updateData.weekday !== undefined) {
          const startDate = new Date(updateData.start_date || existingBatch.start_date);
          const executionTime = updateData.execution_time || updateData.executionTime || existingBatch.execution_time;
          const [hours, minutes] = executionTime.split(':').map(Number);
          const weekday = updateData.weekday !== undefined ? Number(updateData.weekday) : Number(existingBatch.weekday);

          // 新しい曜日に合わせて日付を調整
          const nextDate = new Date(startDate);
          const currentWeekday = nextDate.getDay();
          let daysToAdd = weekday - currentWeekday;
          if (daysToAdd < 0) daysToAdd += 7;
          nextDate.setDate(nextDate.getDate() + daysToAdd);
          nextDate.setHours(hours, minutes, 0, 0);

          updates.next_execution_date = nextDate.toISOString();
        }

        // バッチ設定を更新
        const updatedBatch = await batchReportModel.updateBatchReportSetting(
          ddbDocClient,
          clientId,
          existingBatch.created_at,
          updates
        );

        // レスポンス形式に変換
        const response = {
          id: updatedBatch.id,
          start_date: updatedBatch.start_date,
          auto_create_period: updatedBatch.auto_create_period,
          auto_generate: updatedBatch.auto_generate,
          execution_time: updatedBatch.execution_time,
          next_execution_date: updatedBatch.next_execution_date,
          status: updatedBatch.status,
          execution_count: updatedBatch.execution_count,
          weekday: updatedBatch.weekday,
          last_execution_date: updatedBatch.last_execution_date || null,
        };

        return reply
          .status(200)
          .send(successResponse(200, 'Batch setting updated successfully', response));
      }

      case 'DELETE': {
        const { id } = req.params as { id: string };

        if (!id) {
          return reply.status(400).send(errorResponse(400, 'Batch ID is required'));
        }

        // まずバッチ設定を取得してclient_idとcreated_atを確認
        const existingBatches = await batchReportModel.getBatchReportSettingsByClient(
          ddbDocClient,
          clientId
        );

        const existingBatch = existingBatches.find((batch: BatchReportSetting) => batch.id === id);
        if (!existingBatch) {
          return reply.status(404).send(errorResponse(404, 'この報告書自動出力設定は見つかりませんでした。'));
        }

        // バッチ設定を削除
        await batchReportModel.deleteBatchReportSetting(
          ddbDocClient,
          clientId,
          existingBatch.created_at
        );

        return reply
          .status(200)
          .send(successResponse(200, '報告書自動出力設定を削除しました。', { id }));
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
