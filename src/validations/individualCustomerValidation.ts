import * as yup from 'yup';
// Define a Yup schema for validation
export const customerSchema = yup.object().shape({
  client_id: yup.string().optional(),
  employee_id: yup.string().optional(),
});

// Define a Yup schema for update validation
export const updateCustomerSchema = yup.object().shape({
  client_id: yup.string().optional(),
  customer_created_at: yup.string().required(),
  updates: yup.object().required().shape({
    last_name: yup.string(),
    first_name: yup.string(),
    phone_number: yup.string(),
    mail_address: yup.string().email(),
    gender: yup.string(),
    birthday: yup.string(),
    postcode: yup.string(),
    prefecture: yup.string(),
    city: yup.string(),
    street_address: yup.string(),
    building: yup.string(),
    // Add other updatable fields
  }),
});
