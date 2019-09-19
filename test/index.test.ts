import ExhaustAsync from '../src';

describe('exhaust-async', () => {
  test('it works', async () => {
    const steps: string[] = [];

    const result = await ExhaustAsync.run(() => {
      steps.push('start');
      setTimeout(() => {
        steps.push('timeout 1');

        setTimeout(() => {
          steps.push('timeout 2');
        }, 0);
      }, 0);

      return 'returned';
    }, 100);

    steps.push('resolved');

    expect(result).toEqual('returned');
    expect(steps).toEqual(['start', 'timeout 1', 'timeout 2', 'resolved']);
  });

  test('timeout', async () => {
    const steps: string[] = [];

    await expect(
      ExhaustAsync.run(() => {
        steps.push('start');
        setTimeout(() => {
          steps.push('timeout 1');
        }, 100);

        return 'returned';
      }, 10),
    ).rejects.toMatchObject({
      message: 'ExhaustHook.run timed out after 10ms',
    });
  });

  test('with held promises', async () => {
    let promise!: Promise<void>;
    const result = await ExhaustAsync.run(async () => {
      promise = Promise.resolve();

      await promise;

      return 1;
    }, 100);

    await promise;

    expect(result).toEqual(1);
  });

  test('promises and timers', async () => {
    const steps: string[] = [];

    const result = await ExhaustAsync.run(async () => {
      steps.push('start');

      await new Promise(resolve => {
        setTimeout(() => {
          steps.push('timeout');
          resolve();
        }, 5);
      });

      steps.push('resolved');

      return 1;
    }, 100);

    steps.push('done');

    expect(result).toEqual(1);
    expect(steps).toEqual(['start', 'timeout', 'resolved', 'done']);
  });

  test('promises and more timers', async () => {
    const steps: string[] = [];

    const result = await ExhaustAsync.run(async () => {
      steps.push('start');

      await new Promise(resolve => {
        setTimeout(() => {
          steps.push('timeout');
          resolve();
        }, 5);
      });

      steps.push('resolved');

      setTimeout(() => {
        steps.push('timeout 2');

        setTimeout(() => {
          steps.push('timeout 3');
        });
      });

      return 1;
    }, 100);

    steps.push('done');

    expect(result).toEqual(1);
    expect(steps).toEqual(['start', 'timeout', 'resolved', 'timeout 2', 'timeout 3', 'done']);
  });

  test('runAsync from rut', async () => {
    function runAsyncCall(done: () => void) {
      return new Promise(resolve => {
        setTimeout(() => {
          done();
          resolve();
        }, 50);
      });
    }

    const steps: string[] = [];

    const result = await ExhaustAsync.run(async () => {
      steps.push('start');

      runAsyncCall(() => {
        steps.push('callback');
      }).then(() => {
        steps.push('resolve');
      });

      return 1;
    }, 100);

    steps.push('done');

    expect(result).toEqual(1);
    expect(steps).toEqual(['start', 'callback', 'resolve', 'done']);
  });
});
