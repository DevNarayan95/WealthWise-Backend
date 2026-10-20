export interface CreateIncomeCategoryInput {
  userId: string;
  name: string;
}

export interface UpdateIncomeCategoryInput {
  categoryId: string;
  userId: string;
  name: string;
}
