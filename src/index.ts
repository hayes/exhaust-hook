import asyncHooks from 'async_hooks';

const counters = new Map<number, { counter: Counter; type: string; parentId: number }>();
const activeCounters = new Set<Counter>();
let enabled = false;

const hook = asyncHooks.createHook({
  init: (id, type, parentId) => {
    const counter = counters.get(parentId);

    if (counter !== undefined) {
      counters.set(id, { counter: counter.counter, type, parentId });
      counter.counter.add(id);
    }
  },
  destroy: id => {
    const counter = counters.get(id);

    if (counter !== undefined) {
      counters.delete(id);
      counter.counter.delete(id);
    }
  },
});

class Counter extends Set<number> {
  private resolve: () => void;

  constructor(resolve: () => void) {
    super();
    this.resolve = resolve;

    activeCounters.add(this);

    if (!enabled) {
      hook.enable();
      enabled = true;
    }
  }

  delete(id: number) {
    const result = super.delete(id);

    if (this.size === 0) {
      this.resolve();
      activeCounters.delete(this);

      if (activeCounters.size === 0) {
        hook.disable();
      }
    }

    return result;
  }

  start<T>(fn: () => T) {
    const id = asyncHooks.executionAsyncId();
    counters.set(id, {
      counter: this,
      type: 'root',
      parentId: asyncHooks.triggerAsyncId(),
    });

    const result = fn();

    counters.delete(id);

    return result;
  }

  static create(resolve: () => void) {
    return new this(resolve);
  }
}

const ExhaustHook = {
  run<T>(fn: () => Promise<T> | T, timeout?: number): Promise<T> {
    let counter!: Counter;
    return Promise.resolve().then(async () => {
      let result: T;
      const promise = new Promise<T>((resolve, reject) => {
        let timer: NodeJS.Timeout;

        if (timeout) {
          timer = setTimeout(
            () => reject(new Error(`ExhaustHook.run timed out after ${timeout}ms`)),
            timeout,
          );
          timer.unref();
        }

        counter = new Counter(() => {
          if (timer) {
            clearTimeout(timer);
          }
          resolve(result);
        });
      });

      result = await counter.start(fn);

      return promise;
    });
  },
};

export default ExhaustHook;
