export class AccountAlreadyArchivedException extends Error {
  constructor() {
    super('Account is already archived');
    this.name = 'AccountAlreadyArchivedException';
  }
}
