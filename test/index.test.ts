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
});
