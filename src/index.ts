import asyncHooks from 'async_hooks';

const counters = new Map<number, Counter>();
const activeCounters = new Set<Counter>();
let hookEnabled = false;

const hook = asyncHooks.createHook({
  init: (id, type, parentId) => {
    const counter = counters.get(parentId);

    if (counter && counter.active) {
      counter.init(id, type, parentId);
    }
  },
  destroy: id => {
    const counter = counters.get(id);

    if (counter && counter.active) {
      counter.destroy(id);
    }
  },
});

class Counter extends Set<number> {
  active = true;

  private resolve: () => void;

  constructor(resolve: () => void) {
    super();
    this.resolve = resolve;

    activeCounters.add(this);

    if (!hookEnabled) {
      hookEnabled = true;
      hook.enable();
    }
  }

  init(id: number, type: string, parentId: number) {
    counters.set(id, this);
    this.add(id);

    if (type === 'PROMISE') {
      setTimeout(() => {
        this.delete(id);
      });
    }
  }

  destroy(id: number) {
    counters.delete(id);
    this.delete(id);

    this.checkFinished();
  }

  checkFinished() {
    if (this.active && this.size === 0) {
      this.active = false;
      activeCounters.delete(this);

      if (activeCounters.size === 0) {
        hookEnabled = false;
        hook.disable();
      }
      this.resolve();
    }
  }

  start<T>(fn: () => T) {
    const id = asyncHooks.executionAsyncId();
    counters.set(id, this);

    const result = fn();

    counters.delete(id);

    setTimeout(() => {
      this.checkFinished();
    });

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
          timer = setTimeout(() => {
            reject(new Error(`ExhaustHook.run timed out after ${timeout}ms`));
          }, timeout);
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
