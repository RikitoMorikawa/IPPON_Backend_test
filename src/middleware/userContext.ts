import { FastifyRequest } from 'fastify';

interface UserContext {
  clientId: string;
  type: string;
  employeeId: string;
  role: string;
  email: string;
}

export const getUserContext = (req: FastifyRequest): UserContext => {
  const clientId = (req as any).user['custom:clientId'];
  const type = (req as any).user['custom:type'];
  const employeeId = (req as any).user['sub'];
  const role = (req as any).user['custom:role'];
  const email = (req as any).user.email;

  if (!clientId) {
    throw new Error('Client ID not found in request');
  }

  if (!type) {
    throw new Error('Type not found in request');
  }

  if (!employeeId) {
    throw new Error('Employee ID not found in request');
  }

  const context: UserContext = {
    clientId,
    type,
    employeeId,
    role,
    email,
  };

  if (role) {
    context.role = role;
  }

  if (email) {
    context.email = email;
  }

  return context;
};

export const getClientId = (req: FastifyRequest): string => {
  const { clientId } = getUserContext(req);
  return clientId;
};

export const getType = (req: FastifyRequest): string => {
  const { type } = getUserContext(req);
  return type;
};
export const getEmployeeId = (req: FastifyRequest): string => {
  const { employeeId } = getUserContext(req);
  return employeeId;
};

export const getRole = (req: FastifyRequest): string | undefined => {
  const context = getUserContext(req);
  return context.role;
};

export const getEmail = (req: FastifyRequest): string | undefined => {
  const context = getUserContext(req);
  return context.email;
};
