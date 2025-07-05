import * as yup from 'yup';

// Define a Yup schema for update validation
export const updateInquirySchema = yup.object().shape({
  client_id: yup.string().optional(),
  updates: yup.object().required().shape({
    // Add other updatable fields
  }),
});

// Define a Yup schema for update validation
export const inquirySchema = yup.object().shape({
  client_id: yup.string().optional(),
});
