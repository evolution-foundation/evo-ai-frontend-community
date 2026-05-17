import { getGuards } from './registry';
import type { PluginGuardArgs } from './types';

export function evaluateRouteAccess(args: PluginGuardArgs): boolean {
  const guards = getGuards();
  if (guards.length === 0) {
    return !args.requiredCapability && !args.requiredRole;
  }
  return guards.every(guard => {
    try {
      return guard(args);
    } catch (err) {
      console.error('[plugin-host] guard threw, denying access', err);
      return false;
    }
  });
}
