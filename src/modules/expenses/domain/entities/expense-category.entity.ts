export interface ExpenseCategoryProps {
  id: string;
  userId: string | null;
  name: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ExpenseCategory {
  private constructor(private readonly props: ExpenseCategoryProps) {}

  static create(props: ExpenseCategoryProps): ExpenseCategory {
    return new ExpenseCategory(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string | null {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get isSystem(): boolean {
    return this.props.userId === null;
  }

  get isArchived(): boolean {
    return this.props.isArchived;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
