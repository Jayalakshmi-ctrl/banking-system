export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly problemType: string,
    public readonly problemTitle: string,
    public readonly clientDetail: string,
    public readonly logDetail: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
