import { FastifyRequest, FastifyReply } from 'fastify';
import { CustomFastifyInstance } from '@src/interfaces/CustomFastifyInstance';
import { errorResponse, successResponse } from '@src/responses';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@src/responses/constants/customerConstants';
import {
  saveCustomerDetail,
  saveCustomerDetailAndInquiry,
  verifyCustomerDetailExists,
  executeCustomerDetailUpdate,
  deleteMultipleCustomerDetailsAndInquiries,
  incrementPropertyInquiryCount,
  getAllCustomerDetails,
  fetchIndividualCustomerDetail,
  fetchCorporateCustomerDetail,
} from '@src/repositroies/customerModel';
import { getClientId, getEmployeeId } from '@src/middleware/userContext';
import { checkDynamoDBClient, getDynamoDBClient } from '@src/interfaces/checkDynamoDBClient';
import {
  processCustomerFormData,
  prepareCustomerDetailUpdates,
  buildCustomerDetailFromFormData,
  formatCustomerResponse,
} from '@src/services/customerService';
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
import { 
  CreateCustomerRequest, 
  GetCustomersQuery, 
  GetCustomersResponse,
} from '@src/interfaces/customerInterfaces';
import { CustomerType, CUSTOMER_TYPES } from '@src/enums/customerEnums';

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
          const {
            formData,
            idCardFrontUrls,
            idCardBackUrls,
            representativeIdCardFrontUrls,
            representativeIdCardBackUrls,
            managerIdCardFrontUrls,
            managerIdCardBackUrls,
          } = await processCustomerFormData(req, clientId);

          console.log('Received form data:', formData);

          // 物件情報の取得
          let propertyInfo = null;
          if (formData.property_name) {
            propertyInfo = await getPropertyInfoByPropertyName(
              ddbDocClient,
              clientId,
              formData.property_name,
            );
            if (!propertyInfo) {
              return reply.status(400).send(errorResponse(400, 'Property not found.'));
            }
          }

          // 顧客詳細の自動構築
          const newCustomerDetail = buildCustomerDetailFromFormData(
            formData,
            clientId,
            employeeId,
            idCardFrontUrls,
            idCardBackUrls,
            representativeIdCardFrontUrls,
            representativeIdCardBackUrls,
            managerIdCardFrontUrls,
            managerIdCardBackUrls,
          );

          // 問い合わせ情報の作成（オプション）
          let newInquiry = null;
          if (formData.type && formData.method && propertyInfo) {
            newInquiry = createNewInquiry({
              client_id: clientId,
              customer_id: newCustomerDetail.id,
              property_id: propertyInfo.id,
              type: formData.type,
              method: formData.method,
              summary: formData.summary || '',
              category: formData.category || '',
              title: '新規問い合わせ',
              created_at: newCustomerDetail.created_at,
            });
          }

          console.log('Customer Detail to save:', newCustomerDetail);
          console.log('Inquiry to save:', newInquiry);

          // 顧客詳細と問い合わせの保存
          if (newInquiry) {
            await saveCustomerDetailAndInquiry(ddbDocClient, newCustomerDetail, newInquiry);
          } else {
            // 問い合わせがない場合は顧客詳細のみ保存
            await saveCustomerDetail(ddbDocClient, newCustomerDetail);
          }

          // 物件の問い合わせ数更新
          if (propertyInfo && newInquiry) {
            try {
              const propertyCheck = await getPropertyById(
                ddbDocClient,
                propertyInfo.id,
                propertyInfo.client_id,
              );

              if (propertyCheck.Items && propertyCheck.Items.length > 0) {
                const property = propertyCheck.Items[0];
                console.log('Property found, updating inquiry count:', {
                  id: property.id,
                  client_id: property.client_id,
                  created_at: property.created_at,
                  inquiry_count: property.inquiry_count,
                });

                await incrementPropertyInquiryCount(
                  ddbDocClient,
                  property.client_id,
                  property.created_at
                );
              } else {
                console.warn('Property not found in database. Skipping inquiry count update.');
              }
            } catch (error) {
              console.error('Error updating property inquiry count:', error);
            }
          }

          const responseData: any = {
            customer: newCustomerDetail,
          };

          if (newInquiry) {
            responseData.inquiry = newInquiry;
          }

          return reply.status(201).send(
            successResponse(201, SUCCESS_MESSAGES.CUSTOMER_REGISTERED, responseData),
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
          // 個人顧客と法人顧客の両方を検索
          const [individualCustomer, corporateCustomer, inquiryDetails] = await Promise.all([
            fetchIndividualCustomerDetail(ddbDocClient, customerId, clientId).catch(() => null),
            fetchCorporateCustomerDetail(ddbDocClient, customerId, clientId).catch(() => null),
            showInquiryDetails(ddbDocClient, customerId, clientId).catch(() => null),
          ]);

          const customerDetail = individualCustomer || corporateCustomer;

          if (!customerDetail) {
            return reply
              .status(404)
              .send(errorResponse(404, ERROR_MESSAGES.CUSTOMER_NOT_FOUND_ERROR));
          }

          const customerData = {
            customer: customerDetail,
            inquiry: inquiryDetails || null,
          };

          return reply
            .status(200)
            .send(successResponse(200, SUCCESS_MESSAGES.CUSTOMER_DETAILS_FETCHED, customerData));
        }

        // 全顧客の取得
        const queryParams = req.query as GetCustomersQuery;
        const {
          page = '1',
          limit = '10',
          customer_type,
        } = queryParams;

        const [customers, inquiries] = await Promise.all([
          getAllCustomerDetails(ddbDocClient, clientId),
          getAllInquires(ddbDocClient, clientId),
        ]);

        console.log('Customers:', customers);
        console.log('Inquiries:', inquiries);

        let filteredCustomers = customers.customers || [];

        // 顧客タイプでフィルタリング
        if (customer_type && Object.values(CUSTOMER_TYPES).includes(customer_type as CustomerType)) {
          filteredCustomers = filteredCustomers.filter(
            customer => customer.customer_type === customer_type
          );
        }

        const formattedData = await Promise.all(
          filteredCustomers.map(async (customer) => {
            const inquiry = inquiries.inquires?.find((i) => i.customer_id === customer.id);
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

        // ページネーション
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;

        const total = formattedData.length;
        const startIndex = (pageNumber - 1) * limitNumber;
        const pagedItems = formattedData.slice(startIndex, startIndex + limitNumber);

        const paginatedResponse: GetCustomersResponse = {
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

        const {
          formData,
          idCardFrontUrls,
          idCardBackUrls,
          representativeIdCardFrontUrls,
          representativeIdCardBackUrls,
          managerIdCardFrontUrls,
          managerIdCardBackUrls,
        } = await processCustomerFormData(req, jwtClientId);

        console.log('Received formData:', formData);

        // クライアントIDの整合性チェック
        const formClientId = formData.client_id;
        if (formClientId && formClientId !== jwtClientId) {
          console.log('⚠️ CLIENT_ID MISMATCH DETECTED:');
          console.log(`  JWT Token client_id: "${jwtClientId}"`);
          console.log(`  FormData client_id:  "${formClientId}"`);
          console.log('  → Using FormData client_id for customer lookup');
        }

        const client_id = formClientId || jwtClientId;
        const { customer_created_at, inquiry_id, inquiry_created_at } = formData;

        if (!client_id || !customer_created_at || !customer_id || (inquiry_id && !inquiry_created_at)) {
          console.error('Missing required keys:', {
            client_id,
            customer_created_at,
            customer_id,
            inquiry_id,
            inquiry_created_at,
          });
          return reply.status(400).send(errorResponse(400, ERROR_MESSAGES.MISSING_KEYS_ERROR));
        }

        // 顧客の存在確認
        console.log('Checking if customer exists:', {
          client_id,
          customer_created_at,
          customer_id,
        });

        const existingCustomer = await verifyCustomerDetailExists(
          ddbDocClient,
          client_id,
          customer_created_at,
          customer_id,
          reply,
        );

        if (!existingCustomer) {
          console.warn('Customer not found.');

          // デバッグ用：該当クライアントの全顧客を表示
          try {
            const allCustomers = await getAllCustomerDetails(ddbDocClient, client_id);
            console.log('Found customers for this client:', allCustomers.customers?.length || 0);

            if (allCustomers.customers && allCustomers.customers.length > 0) {
              console.log('Existing customers:');
              allCustomers.customers.forEach((customer, index) => {
                const displayName = customer.individual_customer_details
                  ? `${customer.individual_customer_details.first_name} ${customer.individual_customer_details.last_name}`
                  : customer.corporate_customer_details
                    ? customer.corporate_customer_details.corporate_name
                    : 'Unknown';

                console.log(`  ${index + 1}. id: "${customer.id}", created_at: "${customer.created_at}", name: "${displayName}"`);
              });
            } else {
              console.log('No customers found for this client_id.');
            }
          } catch (scanError) {
            console.error('Error during customer debug scan:', scanError);
          }

          return reply.status(404).send(errorResponse(404, ERROR_MESSAGES.CUSTOMER_NOT_FOUND_ERROR));
        }

        // 更新データの分離
        const { customerUpdate, inquiryUpdate } = splitPayload(formData);
        console.log('customerUpdate:', customerUpdate);
        console.log('inquiryUpdate:', inquiryUpdate);

        // キーフィールドを削除
        delete customerUpdate.client_id;
        delete customerUpdate.customer_id;
        delete customerUpdate.customer_created_at;

        // 顧客詳細の更新準備
        const customerUpdates = prepareCustomerDetailUpdates(
          customerUpdate,
          idCardFrontUrls || [],
          idCardBackUrls || [],
          representativeIdCardFrontUrls || [],
          representativeIdCardBackUrls || [],
          managerIdCardFrontUrls || [],
          managerIdCardBackUrls || [],
        );

        console.log('Prepared customer updates:', customerUpdates);

        // 顧客更新の実行
        let customerResult = null;
        if (Object.keys(customerUpdates).length > 0) {
          customerResult = await executeCustomerDetailUpdate(
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

        // 問い合わせ更新の処理
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

        // レスポンスの構築
        const response: Record<string, any> = {};
        if (customerResult) {
          response.customerResult = formatCustomerResponse(customerResult.Attributes || {});
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

          const result = await deleteMultipleCustomerDetailsAndInquiries({
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
    console.error('Error during customer operation:', err);
    const message = err instanceof Error ? err.message : 'Unexpected error';
    const status = message === 'Property name not found.' ? 400 : 500;
    return reply.status(status).send(errorResponse(status, message));
  }
};
