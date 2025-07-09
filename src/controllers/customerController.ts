import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { errorResponse, successResponse } from '@src/responses';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@src/responses/constants/customerConstants';
import {
  saveCustomerAndInquiry,
  createNewCustomer,
  verifyCustomerExists,
  executeCustomerUpdate,
  deleteMultipleCustomersAndInquiries,
  incrementPropertyInquiryCount,
} from '@src/repositroies/customerModel';
import { sendEmail } from './EmailController';
import { customerSchema, updateCustomerSchema } from '@src/validations/individualCustomerValidation';
import { getClientId, getEmployeeId } from '@src/middleware/userContext';
import { checkDynamoDBClient, getDynamoDBClient } from '@src/interfaces/checkDynamoDBClient';
import {
  prepareCustomerUpdates,
  processFormData,
  processIdCardUrls,
} from '@src/services/customerService';
import {
  fetchIndividualCustomer,
  searchCustomerAndInquiry,
  getAllCustomers,
} from '@src/repositroies/customerModel';
import {
  createNewInquiry,
  executeInquiryUpdate,
  getAllInquires,
  showInquiryDetails,
} from '@src/repositroies/inquiryModel';
import { v4 as uuidv4 } from 'uuid';
import { prepareInquiryUpdates, splitPayload } from '@src/services/inquiryService';
import { verifyInquiryExists } from '@src/repositroies/inquiryModel';
import { updateInquirySchema } from '@src/validations/inquiryValidation';
import { getPropertyInfoByPropertyName, getPropertyById } from '@src/repositroies/propertyModel';

export const customerHandler = async (
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
          const { formData, idCardFrontUrls, idCardBackUrls } = await processFormData(req, clientId);
          const { frontInfo, backInfo } = processIdCardUrls(
            formData,
            idCardFrontUrls,
            idCardBackUrls,
          );

          formData.id_card_front = frontInfo;
          formData.id_card_back = backInfo;

          await customerSchema.validate(formData, { abortEarly: false });

          const id = uuidv4();

          // Get property info (including PK and SK needed for update)
          const propertyInfo = await getPropertyInfoByPropertyName(
            ddbDocClient,
            clientId,
            formData.property_name,
          );

          const newCustomer = createNewCustomer({
            ...formData,
            client_id: clientId,
            //  employee_id: employeeId,
            id,
          });

          const newInquiry = createNewInquiry({
            client_id: clientId,
            //   employee_id: employeeId,
            customer_id: newCustomer.id,
            property_id: propertyInfo.id,
            type: formData.type,
            method: formData.method,
            summary: formData.summary,
            category: formData.category,
            title: '新規問い合わせ', // fixed value for new inquiries
            created_at: newCustomer.created_at,
          });

          console.log('Customer to save:', newCustomer);
          console.log('Inquiry to save:', newInquiry);

          await saveCustomerAndInquiry(ddbDocClient, newCustomer, newInquiry);
          
          // プロパティの存在確認とデバッグ情報
          if (propertyInfo) {
            console.log('Property info for inquiry count update:', {
              id: propertyInfo.id,
              client_id: propertyInfo.client_id,
              created_at: propertyInfo.created_at,
            });
            
            // プロパティレコードの存在確認
            try {
              const propertyCheck = await getPropertyById(
                ddbDocClient,
                propertyInfo.id,
                propertyInfo.client_id,
              );
              
              if (propertyCheck.Items && propertyCheck.Items.length > 0) {
                const property = propertyCheck.Items[0];
                console.log('Property found:', {
                  id: property.id,
                  client_id: property.client_id,
                  created_at: property.created_at,
                  inquiry_count: property.inquiry_count,
                });
                
                // プロパティが存在する場合のみinquiry_countを更新
                await incrementPropertyInquiryCount(
                  ddbDocClient, 
                  property.client_id, 
                  property.created_at
                );
              } else {
                console.warn('Property not found in database. Skipping inquiry count update.');
              }
            } catch (error) {
              console.error('Error checking property or updating inquiry count:', error);
              // inquiry_countの更新に失敗してもcustomer/inquiryは既に保存されているので、処理は続行
            }
          }

          return reply.status(201).send(
            successResponse(201, SUCCESS_MESSAGES.CUSTOMER_REGISTERED, {
              customer: newCustomer,
              inquiry: newInquiry,
            }),
          );
        } catch (err) {
          console.error('Error during customer creation:', err);

          const message = err instanceof Error ? err.message : 'Unexpected error';

          return reply.status(400).send(errorResponse(400, message));
        }
      }

      case 'GET': {
        const { customerId } = req.params as { customerId: string };

        if (customerId) {
          const [individualCustomer, inquiryDetails] = await Promise.all([
            fetchIndividualCustomer(ddbDocClient, customerId, clientId),
            showInquiryDetails(ddbDocClient, customerId, clientId),
          ]);

          if (!individualCustomer) {
            return reply
              .status(200)
              .send(successResponse(200, ERROR_MESSAGES.CUSTOMER_NOT_FOUND_ERROR));
          }

          const customerData = {
            customer: individualCustomer,
            inquiry: inquiryDetails || null,
          };

          return reply
            .status(200)
            .send(successResponse(200, SUCCESS_MESSAGES.CUSTOMER_DETAILS_FETCHED, customerData));
        }

        if (!checkDynamoDBClient(app, reply)) return;

        const {
          page = '',
          limit = '',
        } = req.query as any;

        const [customers, inquiries] = await Promise.all([
          getAllCustomers(ddbDocClient, clientId),
          getAllInquires(ddbDocClient, clientId),
        ]);
        console.log('Customers:', customers);
        console.log('Inquiries:', inquiries);
        const formattedData = await Promise.all(
          customers.customers.map(async (customer) => {
            const inquiry = inquiries.inquires.find((i) => i.customer_id === customer.id);
            let property = null;

            if (inquiry?.property_id) {
              const propertyResult = await getPropertyById(
                ddbDocClient,
                inquiry.property_id,
                clientId,
              );
              property = propertyResult.Items?.[0] || null;
            }

            const { property_id, ...inquiryWithoutPropertyId } = inquiry || {};

            return {
              ...customer,
              inquires: inquiry
                ? {
                  ...inquiryWithoutPropertyId,
                  property: property || null,
                }
                : null,
            };
          }),
        );

        // Pagination
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;

        const total = formattedData.length;
        const startIndex = (pageNumber - 1) * limitNumber;
        const pagedItems = formattedData.slice(startIndex, startIndex + limitNumber);

        const paginatedResponse = {
          total,
          page: pageNumber,
          limit: limitNumber,
          items: pagedItems,
        };

        return reply
          .status(200)
          .send(successResponse(200, SUCCESS_MESSAGES.CUSTOMER_SEARCHED, paginatedResponse));
      }

      case 'PUT': {
        const jwtClientId = getClientId(req);
        const customer_id = (req.params as any)?.customerId;

        const { formData, idCardFrontUrls, idCardBackUrls } = await processFormData(req, jwtClientId);

        console.log('Received formData:', formData);
        console.log('Received idCardFrontUrls:', idCardFrontUrls);
        console.log('Received idCardBackUrls:', idCardBackUrls);

        // client_idの不整合をチェック
        const formClientId = formData.client_id;
        if (formClientId && formClientId !== jwtClientId) {
          console.log('⚠️ CUSTOMER IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID MISMATCH DETECTED:');
          console.log(`  JWT Token client_id: "${jwtClientId}"`);
          console.log(`  FormData client_id:  "${formClientId}"`);
          
          // セキュリティチェック: 異なるクライアントの顧客データへのアクセスを防ぐ
          // TODO: 権限チェックのロジックを追加（例: admin権限の確認など）
          console.log('  → Using FormData client_id for customer lookup');
        }

        // 顧客データの検索にはformDataのclient_idを使用（顧客が所属するクライアントで検索するため）
        const client_id = formClientId || jwtClientId;

        const { customer_created_at, inquiry_id, inquiry_created_at } = formData;

        if (
          !client_id ||
          !customer_created_at ||
          !customer_id ||
          (inquiry_id && !inquiry_created_at)
        ) {
          console.error('Missing required keys:', {
            client_id,
            customer_created_at,
            customer_id,
            inquiry_id,
            inquiry_created_at,
          });
          return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.MISSING_KEYS_ERROR));
        }

        console.log('Checking if customer exists:', {
          client_id,
          customer_created_at,
          customer_id,
        });
        const existingCustomer = await verifyCustomerExists(
          ddbDocClient,
          client_id,
          customer_created_at,
          customer_id,
          reply,
        );
        if (!existingCustomer) {
          console.warn('Customer not found.');
          
          // デバッグ: 該当のclient_idで存在するすべてのcustomerを確認
          console.log('🔍 Searching for all customers with client_id:', client_id);
          try {
            const allCustomers = await getAllCustomers(ddbDocClient, client_id);
            console.log('Found customers for this client:', allCustomers.customers?.length || 0);
            
            if (allCustomers.customers && allCustomers.customers.length > 0) {
              console.log('Existing customers:');
              allCustomers.customers.forEach((customer, index) => {
                console.log(`  ${index + 1}. id: "${customer.id}", created_at: "${customer.created_at}", name: "${customer.first_name} ${customer.last_name}"`);
              });
            } else {
              console.log('No customers found for this client_id. This might be a new client.');
            }
          } catch (scanError) {
            console.error('Error during customer debug scan:', scanError);
          }
          
          return reply.status(404).send(errorResponse(404, ERROR_MESSAGES.CUSTOMER_NOT_FOUND_ERROR));
        }

        const { customerUpdate, inquiryUpdate } = splitPayload(formData);
        console.log('customerUpdate:', customerUpdate);
        console.log('inquiryUpdate:', inquiryUpdate);

        // Remove key fields from customerUpdate to avoid updating primary keys
        delete customerUpdate.client_id;
        delete customerUpdate.customer_id;
        delete customerUpdate.customer_created_at;

        console.log('customerUpdate after key removal:', customerUpdate);

        // Handle ID card updates with empty string logic

        if ('id_card_front' in formData) {
          if (idCardFrontUrls.length > 0) {
            customerUpdate.id_card_front = idCardFrontUrls;
          } else {

            customerUpdate.id_card_front = '';
            customerUpdate._clear_id_card_front = true;
          }
        }


        if ('id_card_back' in formData) {
          if (idCardBackUrls.length > 0) {
            customerUpdate.id_card_back = idCardBackUrls;
          } else {

            customerUpdate.id_card_back = '';
            customerUpdate._clear_id_card_back = true;
          }
        }

        const customerUpdates = prepareCustomerUpdates(
          customerUpdate,
          idCardFrontUrls || [],
          idCardBackUrls || [],
        );
        console.log('Prepared customer updates:', customerUpdates);

        let customerResult = null;
        if (Object.keys(customerUpdates).length > 0) {
          await updateCustomerSchema.validate(
            {
              client_id,
              customer_created_at,
              customer_id,
              updates: customerUpdates,
            },
            { abortEarly: false },
          );

          customerResult = await executeCustomerUpdate(
            ddbDocClient,
            client_id,
            customer_created_at,
            customer_id,
            customerUpdates,
          );
          console.log('Customer update result:', customerResult);
        } else {
          console.log('No valid customer fields to update');
        }

        let inquiryResult = null;
        if (inquiryUpdate.inquiry_created_at && Object.keys(inquiryUpdate).length > 1) {
          console.log('Checking if inquiry exists:', {
            client_id,
            created_at: inquiryUpdate.inquiry_created_at,
          });
          const existingInquiry = await verifyInquiryExists(
            ddbDocClient,
            client_id,
            inquiryUpdate.inquiry_created_at,
          );
          if (!existingInquiry) {
            console.warn('Inquiry not found.');
            return reply.status(404).send(errorResponse(404, 'Inquiry not found'));
          }

          delete inquiryUpdate.client_id;

          if (inquiryUpdate.property_name) {
            const property = await getPropertyInfoByPropertyName(
              ddbDocClient,
              client_id,
              inquiryUpdate.property_name,
            );
            if (!property) {
              return reply.status(400).send(errorResponse(400, 'Property name not found.'));
            }
            inquiryUpdate.property_id = property;
            delete inquiryUpdate.property_name;
          }

          const inquiryUpdates = prepareInquiryUpdates(inquiryUpdate);
          console.log('Prepared inquiry updates:', inquiryUpdates);

          if (Object.keys(inquiryUpdates).length > 0) {
            await updateInquirySchema.validate(
              {
                client_id,
                created_at: inquiryUpdate.created_at,
                updates: inquiryUpdates,
              },
              { abortEarly: false },
            );

            inquiryResult = await executeInquiryUpdate(
              ddbDocClient,
              client_id,
              inquiryUpdate.inquiry_created_at,
              inquiryUpdates,
            );
            console.log('Inquiry update result:', inquiryResult);
          } else {
            console.log('No valid inquiry fields to update');
          }
        }

        const response: Record<string, any> = {};
        if (customerResult) {
          response.customerResult = customerResult.Attributes || {};
        }
        if (inquiryResult) {
          response.inquiryResult = inquiryResult.Attributes || {};
        }

        return reply
          .status(200)
          .send(successResponse(200, SUCCESS_MESSAGES.CUSTOMER_INQUIRY_UPDATE, response));
      }

      case 'DELETE': {
        try {
          const { customer_ids } = req.body as { customer_ids: string[] };

          if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
            return reply
              .status(400)
              .send(errorResponse(400, 'customer_ids must be a non-empty array.'));
          }

          const result = await deleteMultipleCustomersAndInquiries({
            ddbDocClient,
            clientId,
            customerIds: customer_ids,
          });

          if (result.notFoundCustomerIds.length === customer_ids.length) {
            return reply
              .status(404)
              .send(
                errorResponse(
                  404,
                  `No customers found with the provided IDs: ${result.notFoundCustomerIds.join(', ')}`,
                ),
              );
          } else if (result.notFoundCustomerIds.length > 0) {
            return reply.status(207).send({
              success: true,
              message: 'Partial deletion completed',
              data: {
                customersDeleted: result.customersDeleted,
                inquiriesDeleted: result.inquiriesDeleted,
                notFoundCustomerIds: result.notFoundCustomerIds,
                errors: result.errors,
              },
            });
          } else {
            return reply.status(200).send(
              successResponse(200, 'Customers and inquiries deleted successfully.', {
                customersDeleted: result.customersDeleted,
                inquiriesDeleted: result.inquiriesDeleted,
              }),
            );
          }
        } catch (err) {
          console.error('Bulk delete error:', err);
          return reply
            .status(500)
            .send(errorResponse(500, 'Failed to delete customers and inquiries.'));
        }
      }
      default:
        return reply.status(405).send(errorResponse(405, ERROR_MESSAGES.METHOD_NOT_ALLOWED));
    }
  } catch (err) {
    console.error('Error during update:', err);

    const message = err instanceof Error ? err.message : 'Unexpected error';
    const status = message === 'Property name not found.' ? 400 : 500;

    return reply.status(status).send(errorResponse(status, message));
  }
};
