export default class StackTrace {
  public getStack() {
    // Save original Error.prepareStackTrace
    var origPrepareStackTrace = Error.prepareStackTrace;

    // Override with function that just returns `stack`
    Error.prepareStackTrace = function (_, stack) {
      return stack;
    };

    // Create a new `Error`, which automatically gets `stack`
    const err = new Error();

    // Evaluate `err.stack`, which calls our new `Error.prepareStackTrace`
    const stack = err.stack;

    // Restore original `Error.prepareStackTrace`
    Error.prepareStackTrace = origPrepareStackTrace;

    return stack;
  }

  public getCaller(levels: number): string {
    const stack = this.getStack();

    // @ts-ignore
    return stack[levels + 2].getFileName();
  }

  public getCallerDebug(levels: number): string {
    const stack = this.getStack();

    console.log(
        // @ts-ignore
      stack.map(i => i.getFileName()),
      // @ts-ignore
      stack[levels + 2].getFileName()
    );

    // @ts-ignore
    return stack[levels + 2].getFileName();
  }
}
