export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (m: string) => new HttpError(400, m);
export const notFound  = (m: string) => new HttpError(404, m);
export const conflict  = (m: string) => new HttpError(409, m);