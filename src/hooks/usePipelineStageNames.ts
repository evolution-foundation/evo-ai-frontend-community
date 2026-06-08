import { useEffect, useState } from 'react';
import { pipelinesService } from '@/services/pipelines/pipelinesService';

type StageNameMap = Map<string, string>;

// Module-level cache shared across every Conditional node on the canvas, so the
// pipeline/stage lookup runs once instead of per node instance.
let cache: StageNameMap | null = null;
let inFlight: Promise<StageNameMap> | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadStageNames(): Promise<StageNameMap> {
  const map: StageNameMap = new Map();
  const pipelinesResponse = await pipelinesService.getPipelines();
  const pipelines = pipelinesResponse?.data ?? [];

  const stagesByPipeline = await Promise.all(
    pipelines.map(async pipeline => {
      const stagesResponse = await pipelinesService.getPipelineStages(pipeline.id);
      return { pipeline, stages: stagesResponse?.data ?? [] };
    }),
  );

  for (const { pipeline, stages } of stagesByPipeline) {
    for (const stage of stages) {
      map.set(stage.id, `[${pipeline.name}] ${stage.name}`);
    }
  }

  return map;
}

/**
 * Returns a `stageId -> "[Pipeline] Stage"` map for display purposes (resolving
 * opaque stage ids stored in conditions). Fetches lazily and only when enabled,
 * sharing a single request across all consumers.
 */
export function usePipelineStageNames(enabled: boolean): StageNameMap {
  const [map, setMap] = useState<StageNameMap>(() =>
    cache && Date.now() - cachedAt < CACHE_TTL ? cache : new Map(),
  );

  useEffect(() => {
    if (!enabled) return;

    if (cache && Date.now() - cachedAt < CACHE_TTL) {
      setMap(cache);
      return;
    }

    let cancelled = false;

    if (!inFlight) {
      inFlight = loadStageNames()
        .then(result => {
          cache = result;
          cachedAt = Date.now();
          return result;
        })
        .catch(() => new Map<string, string>());
    }

    const pending = inFlight;
    pending.then(result => {
      if (!cancelled) setMap(result);
    });
    // Allow a failed fetch to be retried by the next consumer.
    pending.finally(() => {
      if (inFlight === pending && !cache) inFlight = null;
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return map;
}
