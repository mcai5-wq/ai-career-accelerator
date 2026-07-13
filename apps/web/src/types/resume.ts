// Frontend-facing subset of the NestJS `Resume` model (see
// apps/api/prisma/schema.prisma). Once the API contracts stabilize, this
// should move to packages/shared-types and be imported from both apps.
export interface Resume {
  id: string;
  title: string;
  createdAt: string;
  analyses: { id: string; status: string; atsScore: number | null }[];
}
