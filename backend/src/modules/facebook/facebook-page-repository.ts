// Facebook Page persistence contracts.
//
// This module intentionally has no Prisma import so the domain/service layer
// and its tests stay independent of the generated database client.

export interface FacebookPageRecord {
  id: string;
  pageId: string;
  name: string;
  accessToken: string;
  category: string | null;
  tasks: string[] | null;
  connectedAt: Date;
  updatedAt: Date;
}

export interface FacebookPageUpsert {
  pageId: string;
  name: string;
  accessToken: string;
  category: string | null;
  tasks: string[] | null;
}

export interface FacebookPageRepository {
  upsert(data: FacebookPageUpsert): Promise<void>;
  list(): Promise<FacebookPageRecord[]>;
  findByPageId(pageId: string): Promise<FacebookPageRecord | null>;
  deleteByPageId(pageId: string): Promise<boolean>;
}
