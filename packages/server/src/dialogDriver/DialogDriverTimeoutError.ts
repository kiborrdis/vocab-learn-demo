export class DialogDriverWaitTimeoutError extends Error {
  constructor(timeout: number) {
    super(`Dialog wait timeout: ${timeout} seconds`);
  }
}
