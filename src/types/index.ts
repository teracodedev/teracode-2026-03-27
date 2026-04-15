export interface HouseholderWithMembers {
  id: string;
  householderCode: string;
  familyName: string;
  givenName: string;
  familyNameKana: string | null;
  givenNameKana: string | null;
  postalCode: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  phone1: string | null;
  phone2: string | null;
  email: string | null;
  domicile: string | null;
  note: string | null;
  joinedAt: Date | null;
  leftAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  members: {
    id: string;
    householderId: string;
    familyName: string;
    givenName: string | null;
    familyNameKana: string | null;
    givenNameKana: string | null;
    relation: string | null;
    birthDate: Date | null;
    deathDate: Date | null;
    dharmaName: string | null;
    dharmaNameKana: string | null;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

