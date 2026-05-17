import { Suspense, lazy, useMemo, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { getRoutes } from './registry';
import { evaluateRouteAccess } from './guards';
import { PluginErrorBoundary } from './PluginErrorBoundary';
import { usePluginRuntimeContext } from './runtimeContext';
import type { PluginRoute, RouteNamespace } from './types';

function GuardedRouteElement({ route }: { route: PluginRoute }) {
  const runtimeContext = usePluginRuntimeContext();
  const allowed = evaluateRouteAccess({
    requiredCapability: route.requiredCapability,
    requiredRole: route.requiredRole,
    runtimeContext,
  });
  const LazyComponent = useMemo<ComponentType>(() => lazy(route.element), [route.element]);

  if (!allowed) return <>{route.fallback ?? null}</>;

  return (
    <PluginErrorBoundary pluginId={route.id} fallback={route.fallback}>
      <Suspense fallback={route.fallback ?? null}>
        <LazyComponent />
      </Suspense>
    </PluginErrorBoundary>
  );
}

function buildRouteElement(
  route: PluginRoute,
  wrap?: (element: ReactNode, route: PluginRoute) => ReactNode,
): ReactElement {
  const element = <GuardedRouteElement route={route} />;
  const finalElement = wrap ? wrap(element, route) : element;
  return <Route key={route.id} path={route.path} element={finalElement} />;
}

interface PluginRoutesProps {
  namespace?: RouteNamespace;
  wrap?: (element: ReactNode, route: PluginRoute) => ReactNode;
}

/**
 * Returns an array of <Route> elements that can be splatted directly inside
 * a parent <Routes> from react-router. Must NOT be wrapped in another
 * component — react-router walks `<Routes>` children via React.Children and
 * only accepts <Route> or <Fragment> nodes.
 *
 * Usage: <Routes>{PluginRoutes({ namespace: 'admin' })}</Routes>
 *        — invoked as a plain function, not via JSX.
 *
 * MVP timing constraint: routes returned reflect the registry at call
 * time. Because this function cannot subscribe to registry updates
 * (react-router rejects non-<Route> children of <Routes>), plugins MUST
 * register before `<AppRouter />` mounts. Hot-registering routes after
 * the router has mounted is not supported in the MVP — the new routes
 * become visible only when the surrounding tree re-renders for some
 * other reason. In-tree plugins registered at module-init time are
 * unaffected.
 */
export function PluginRoutes({ namespace, wrap }: PluginRoutesProps): ReactElement[] {
  const routes = getRoutes(namespace);
  return routes.map(route => buildRouteElement(route, wrap));
}
