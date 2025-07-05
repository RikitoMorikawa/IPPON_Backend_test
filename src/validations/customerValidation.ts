import { EmployeeUpdateRequest } from '@src/interfaces/customerInterfaces';

export const isDeleteRecordsRequestBody = (
  body: any,
): body is {
  individual?: string;
  corporate?: string;
  individual_client_id?: string;
  corporate_client_id?: string;
} => {
  return (
    typeof body === 'object' &&
    (typeof body.individual === 'undefined' || typeof body.individual === 'string') &&
    (typeof body.corporate === 'undefined' || typeof body.corporate === 'string') &&
    (typeof body.individual_client_id === 'undefined' ||
      typeof body.individual_client_id === 'string') &&
    (typeof body.corporate_client_id === 'undefined' ||
      typeof body.corporate_client_id === 'string')
  );
};
