
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    super(`Missing or insufficient permissions at ${context.path} for ${context.operation}`);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}
