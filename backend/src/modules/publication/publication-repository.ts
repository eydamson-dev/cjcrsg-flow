// Publication persistence contracts.
//
// This module intentionally has no Prisma import so the domain/service layer
// and its tests stay independent of the generated database client.

export type PublicationStatus = "PUBLISHING" | "PUBLISHED" | "FAILED";

export interface PublicationRecord {
  id: string;
  contentId: string;
  status: PublicationStatus;
  facebookPageId: string;
  facebookPageName: string;
  caption: string | null;
  designId: string | null;
  mediaKey: string | null;
  mediaContentType: string | null;
  facebookPostId: string | null;
  facebookPhotoId: string | null;
  publishedAt: Date | null;
  errorCode: number | null;
  errorSubcode: number | null;
  errorMessage: string | null;
  fbtraceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicationCreate {
  contentId: string;
  facebookPageRecordId: string | null;
  facebookPageId: string;
  facebookPageName: string;
  caption: string | null;
  designId: string | null;
  mediaKey: string;
  mediaContentType: string;
}

export type PublicationOutcome =
  | {
      status: "PUBLISHED";
      facebookPostId: string;
      facebookPhotoId: string;
      publishedAt: Date;
    }
  | {
      status: "FAILED";
      errorCode: number | null;
      errorSubcode: number | null;
      errorMessage: string;
      fbtraceId: string | null;
    };

export interface PublicationRepository {
  create(data: PublicationCreate): Promise<PublicationRecord>;
  finalize(id: string, outcome: PublicationOutcome): Promise<PublicationRecord | null>;
  findById(id: string): Promise<PublicationRecord | null>;
  listByContent(contentId: string): Promise<PublicationRecord[]>;
  findPublishing(contentId: string): Promise<PublicationRecord | null>;
}
