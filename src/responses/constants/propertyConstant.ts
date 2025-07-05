export const SUCCESS_MESSAGES = {
  PROPERTY_REGISTERED: 'Property registered successfully!',
  PROPERTY_UPDATED: 'Property updated successfully!',
  PROPERTY_SEARCH: 'Search Property results',
  PROPERTY_RETRIEVED: 'Property details retrieved successfully',
  PROPERTY_DELETE: 'Records deleted successfully',
} as const;

export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Validation error.',
  PROPERTY_REGISTER_ERROR: 'Error registering property.',
  PROPERTY_UPDATE_ERROR: 'Error updating property.',
  PROPERTY_RETRIEVE_ERROR: 'Error retrieving property details',
  PROPERTY_ID_REQUIRED_ERROR: 'Property ID is required',
  CLIENDTT_ID_REQUIRED_ERROR: 'Client ID is required',
  SERVER_ERROR: 'Server error occurred.',
  PROPERTY_NOT_FOUND_ERROR: 'Property not found',
  REQUIRED_ID_ERROR: 'Property ID and Client ID is required to show detail',
  REQUIRED_ID_DELETE_ERROR: 'Property ID and Client ID are required for deletion',
  NO_VALID_RECORD_ERROR: 'No valid records to delete',
  PROPERTY_SEARCH_ERROR: 'Error searching properties:',
  REQUEST_ERROR: 'An error occurred with the request.',
  METHOD_NOT_ALLOWED_ERROR: 'Method not allowed.',
} as const;
