export type AuthRole = 'client' | 'backend';

export type AuthContext = {
  role: AuthRole;
  keyId: string;
};

export type RequestWithAuth = {
  authContext?: AuthContext;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};
