# ExhaustHook

This module uses async_hooks to allow wrapping a function so that it will resolve a promise once all
async activity kicked off by that function has completed.

## Install

`yarn add exhaust-hook` or `npm install --save exhaust-hook`

## Example

```ts
import ExhaustAsync from 'exhaust-hook';

async function example() {
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

    console.log(steps); // ['start', 'timeout 1', 'timeout 2', 'resolved']
}

example();
```

## Api

### `ExhaustHook.run<T>(fn: () => Promise<T> | T, timeout?: number): Promise<T>`

-   `fn`: A function which will be executed asynchronously. run will return a promise with the
    resolved return value of `fn` after all async activity started by `fn` has completed.
-   `timeout:` An optional timeout. If async activity for started by `fn` has not completed before
    the timeout the returned promise will be rejected with a timeout error.

### `ExhaustHook.runSync<T>(fn: () => T, timeout?: number): Promise<T>`

-   `fn`: A function which will be executed synchronous. runSync returns a promise with the return
    value of `fn` after all async activity started by `fn` has completed.
-   `timeout:` An optional timeout. If async activity for started by `fn` has not completed before
    the timeout the returned promise will be rejected with a timeout error.
