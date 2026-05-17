/**
 * Plugin host test utilities. NOT part of the public `@/plugin-host`
 * surface — these helpers are only meant for tests that need to reset
 * registry state between cases. A consumer importing from this file
 * is using a private API and may break without notice.
 *
 * @internal
 */
export { __resetPluginHostForTests } from './registry';
