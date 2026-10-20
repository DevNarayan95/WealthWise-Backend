export interface CreateExpenseCategoryInput {
  userId: string;
  name: string;
}

export interface UpdateExpenseCategoryInput {
  categoryId: string;
  userId: string;
  name: string;
}
