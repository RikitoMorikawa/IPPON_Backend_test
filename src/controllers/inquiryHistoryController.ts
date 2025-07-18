import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { errorResponse, successResponse } from '@src/responses';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@src/responses/constants/customerConstants';
import { getClientId, getEmployeeId } from '@src/middleware/userContext';
import { checkDynamoDBClient, getDynamoDBClient } from '@src/interfaces/checkDynamoDBClient';
import { getAllCustomerDetails, incrementPropertyInquiryCount } from '@src/repositroies/customerModel';
import {
  getAllInquiryHistory,
  searchInquiryHistoryDetails,
  createNewInquiry,
  saveInquiry,
  updateInquiryHistory,
} from '@src/repositroies/inquiryModel';
import { getAllProperties, getPropertyById } from '@src/repositroies/propertyModel';
import { InquiryHistoryList } from '@src/interfaces/inquiryInterfaces';
import { getClientById, getEmployeeById } from '../repositroies/clientModel';
import { processCustomerFormData, formatCustomerResponse } from '@src/services/customerService';
import { inquirySchema } from '@src/validations/inquiryValidation';
import { v4 as uuidv4 } from 'uuid';

export const inquiryHistoryController = async (
  app: CustomFastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  try {
    const clientId = getClientId(req);
    const employeeId = getEmployeeId(req);

    if (!checkDynamoDBClient(app, reply)) return;
    const ddbDocClient = getDynamoDBClient(app);

    switch (req.method) {
      case 'POST': {
        try {
          const { formData } = await processCustomerFormData(req, clientId);

          await inquirySchema.validate(formData, { abortEarly: false });

          // Make sure customer_id is passed in formData if customer already exists
          const inquiryId = uuidv4();

          const newInquiry = createNewInquiry({
            client_id: clientId,
            employee_id: formData.employee_id,
            customer_id: formData.customer_id, // should be passed in formData
            property_id: formData.property_id,
            type: formData.type,
            method: formData.method,
            summary: formData.summary,
            category: formData.category,
            title: formData.title,
            created_at: new Date().toISOString(),
            id: inquiryId,
            inquired_at: formData.inquired_at,
          });

          console.log('Inquiry to save:', newInquiry);

          await saveInquiry(ddbDocClient, newInquiry);

          // Get property info to update inquiry count
          if (formData.property_id) {
            const propertyResult = await getPropertyById(
              ddbDocClient,
              formData.property_id,
              clientId,
            );
            const property = propertyResult.Items?.[0];
            if (property) {
              console.log('Property found for inquiry count update:', {
                id: property.id,
                client_id: property.client_id,
                created_at: property.created_at,
                current_inquiry_count: property.inquiry_count,
              });
              
              try {
                await incrementPropertyInquiryCount(
                  ddbDocClient,
                  property.client_id,
                  property.created_at
                );
                console.log('Inquiry count updated successfully');
              } catch (error) {
                console.error('Error updating property inquiry count:', error);
                // Continue with the response even if inquiry count update fails
              }
            } else {
              console.warn('Property not found for inquiry count update');
            }
          }

          return reply.status(201).send(
            successResponse(201, 'Inquiry registered successfully', {
              inquiry: newInquiry,
            }),
          );
        } catch (err) {
          console.error('Error during inquiry creation:', err);
          const message = err instanceof Error ? err.message : 'Unexpected error';
          return reply.status(400).send(errorResponse(400, message));
        }
      }

      case 'GET': {
        const {
          inquiryId = '',
          title = '',
          include = '',
        } = req.query as InquiryHistoryList & { include?: string };

        // 新規問い合わせも含めて全て表示するため、この除外処理を削除
        // if (title === '新規問い合わせ') {
        //   return reply.status(200).send(
        //     successResponse(200, SUCCESS_MESSAGES.CUSTOMER_SEARCHED, {
        //       total: 0,
        //       inquiries: [],
        //     }),
        //   );
        // }

        // クエリパラメータの存在をチェック（空文字列も含む）
        const hasQueryParams = Object.keys(req.query as Record<string, unknown>).length > 0;
        
        console.log('🔍 Query parameter check:');
        console.log(`  req.query:`, req.query);
        console.log(`  hasQueryParams: ${hasQueryParams}`);
        console.log(`  include: "${include}"`);

        // includeパラメータを解析
        const includeFields = include ? include.split(',').map((field) => field.trim()) : [];

        if (!hasQueryParams) {
          const [customers, inquiries, properties] = await Promise.all([
            getAllCustomerDetails(ddbDocClient, clientId),
            getAllInquiryHistory(ddbDocClient, clientId),
            getAllProperties(ddbDocClient, clientId),
          ]);

          const formattedData = await Promise.all(
            inquiries.inquires.map(async (inquiry: any) => {
              const customer = customers.customers.find((c: any) => c.id === inquiry.customer_id);
              const property = properties.properties.find((p: any) => p.id === inquiry.property_id);
              const [clientData, employeeData] = await Promise.all([
                getClientById(inquiry.client_id),
                getEmployeeById(inquiry.employee_id)
              ]);

              return {
                ...inquiry,
                client: clientData,
                employee: employeeData,
                customer: customer ? formatCustomerResponse(customer) : null,
                property,
              };
            }),
          );

          return reply.status(200).send(
            successResponse(200, SUCCESS_MESSAGES.CUSTOMER_SEARCHED, {
              total: formattedData.length,
              inquiries: formattedData,
            }),
          );
        }

        // Filtered inquiry case
        console.log('🔎 Performing filtered search with:');
        console.log(`  inquiryId: "${inquiryId}"`);
        console.log(`  title: "${title}"`);
        console.log(`  clientId: "${clientId}"`);
        
        const result = await searchInquiryHistoryDetails(
          ddbDocClient,
          inquiryId,
          title,
          clientId,
        );

        // Add client & employee info to each item
        console.log('🔗 Enriching inquiries with client & employee data...');

        // includeパラメータに基づいて関連データを取得
        const shouldIncludeCustomer = includeFields.includes('customer');
        const shouldIncludeProperty = includeFields.includes('property');
        const shouldIncludeClient = includeFields.includes('client');
        const shouldIncludeEmployee = includeFields.includes('employee');

        console.log('📋 Include fields:', {
          customer: shouldIncludeCustomer,
          property: shouldIncludeProperty,
          client: shouldIncludeClient,
          employee: shouldIncludeEmployee,
        });

        // 必要な関連データを取得
        const [customers, properties] = await Promise.all([
          shouldIncludeCustomer
            ? getAllCustomerDetails(ddbDocClient, clientId)
            : Promise.resolve({ customers: [] }),
          shouldIncludeProperty
            ? getAllProperties(ddbDocClient, clientId)
            : Promise.resolve({ properties: [] }),
        ]);

        const enrichedItems = await Promise.all(
          result.inquiries.map(async (inquiry: any, index: number) => {
            console.log(`  ${index + 1}. Processing inquiry:`, {
              id: inquiry.id,
              title: inquiry.title,
              client_id: inquiry.client_id,
              employee_id: inquiry.employee_id,
              customer_id: inquiry.customer_id,
              property_id: inquiry.property_id,
              employee_id_type: typeof inquiry.employee_id,
              employee_id_is_undefined: inquiry.employee_id === undefined,
              employee_id_is_null: inquiry.employee_id === null,
            });

            const [clientData, employeeData] = await Promise.all([
              shouldIncludeClient ? getClientById(inquiry.client_id) : Promise.resolve(null),
              shouldIncludeEmployee ? getEmployeeById(inquiry.employee_id) : Promise.resolve(null),
            ]);

            // 顧客情報とプロパティ情報を取得
            const customer = shouldIncludeCustomer
              ? customers.customers.find((c: any) => c.id === inquiry.customer_id)
              : null;
            const property = shouldIncludeProperty
              ? properties.properties.find((p: any) => p.id === inquiry.property_id)
              : null;

            console.log(`     → Client found: ${!!clientData}, Employee found: ${!!employeeData}`);
            console.log(`     → Customer found: ${!!customer}, Property found: ${!!property}`);

            return {
              ...inquiry,
              ...(shouldIncludeClient && { client: clientData }),
              ...(shouldIncludeEmployee && { employee: employeeData }),
              ...(shouldIncludeCustomer && { customer: customer ? formatCustomerResponse(customer) : null }),
              ...(shouldIncludeProperty && { property }),
            };
          }),
        );

        return reply.status(200).send(
          successResponse(200, SUCCESS_MESSAGES.CUSTOMER_SEARCHED, {
            total: result.total,
            inquiries: enrichedItems,
          }),
        );
      }

      case 'PUT': {
        try {
          const { formData } = await processCustomerFormData(req, clientId);

          const jwtClientId = clientId; // JWTトークンから取得
          const formClientId = formData.client_id; // formDataから取得
          
          // inquiry日付フィールドをチェック（inquired_at、inquiry_created_at、created_at）
          const inquiredAt = formData.inquired_at || formData.inquiry_created_at || formData.created_at;
          
          console.log('📅 Date field check:');
          console.log(`  formData.inquired_at: "${formData.inquired_at}"`);
          console.log(`  formData.inquiry_created_at: "${formData.inquiry_created_at}"`);
          console.log(`  formData.created_at: "${formData.created_at}"`);
          console.log(`  Using: "${inquiredAt}"`);

          // client_idの不整合をチェック
          if (formClientId && formClientId !== jwtClientId) {
            console.log('⚠️ IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID MISMATCH DETECTED:');
            console.log(`  JWT Token client_id: "${jwtClientId}"`);
            console.log(`  FormData client_id:  "${formClientId}"`);
            console.log('  → Using JWT client_id as the authoritative source');
          }

          const updateClientId = jwtClientId; // JWTのclient_idを優先使用

          if (!updateClientId || !inquiredAt) {
            return reply
              .status(400)
              .send(errorResponse(400, 'Client ID and inquired_at are required'));
          }

          // Remove key fields from updateData to avoid updating primary keys
          const updateData = { ...formData };
          delete updateData.clientId;
          delete updateData.client_id;
          delete updateData.created_at;
          delete updateData.createdAt;
          delete updateData.inquired_at;

          console.log('Updating inquiry with:', { updateClientId, inquiredAt, updateData });

          // タイトルが '新規問い合わせ' から変更される場合、
          // これは新規問い合わせが履歴に移行することを意味します
          if (updateData.title && updateData.title !== '新規問い合わせ') {
            console.log('Converting new inquiry to history with title:', updateData.title);
          }

          // Update the inquiry - titleに関係なく直接更新
          const updatedInquiry = await updateInquiryHistory(
            ddbDocClient,
            updateClientId,
            inquiredAt,
            updateData
          );

          if (!updatedInquiry) {
            return reply
              .status(404)
              .send(errorResponse(404, 'Inquiry not found'));
          }

          // Fetch client and employee data for the updated inquiry
          const [clientData, employeeData] = await Promise.all([
            getClientById(updatedInquiry.client_id),
            getEmployeeById(updatedInquiry.employee_id)
          ]);

          const formattedInquiry = {
            ...updatedInquiry,
            client: clientData,
            employee: employeeData
          };

          return reply
            .status(200)
            .send(successResponse(200, 'Inquiry updated successfully', {
              inquiry: formattedInquiry
            }));

        } catch (err) {
          console.error('Error during inquiry update:', err);
          const message = err instanceof Error ? err.message : 'Unexpected error';
          return reply.status(400).send(errorResponse(400, message));
        }
      }

      default:
        return reply.status(405).send(errorResponse(405, ERROR_MESSAGES.METHOD_NOT_ALLOWED));
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
