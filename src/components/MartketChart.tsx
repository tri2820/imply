import { createChart, CrosshairMode, IChartApi } from "lightweight-charts";
import { BsChevronBarRight } from "solid-icons/bs";
import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  untrack,
} from "solid-js";
import { chartSeries } from "~/client/utils";
import { DataPoint, lastItemToUSD } from "~/utils";

export default function MarketChart() {
  const [chart, setChart] = createSignal<IChartApi>();
  const [lineSeries, setLineSeries] = createSignal<{
    [id: string]: ReturnType<IChartApi["addLineSeries"]> | undefined;
  }>({});
  let container!: HTMLDivElement;
  onMount(() => {
    // Create the Lightweight Chart within the container element
    const chart = createChart(container, {
      localization: {
        timeFormatter: (timestamp: number) => {
          return new Date(timestamp * 1000).toLocaleString();
        },
      },
      layout: {
        background: { color: "transparent" },
        textColor: "#737373",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "transparent" },
        horzLines: { color: "transparent" },
      },
      rightPriceScale: {
        borderVisible: false,
        textColor: "#737373",
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          labelBackgroundColor: "black",
        },
        horzLine: {
          labelBackgroundColor: "black",
        },
      },
    });
    setChart(chart);

    // Resize the chart when the window is resized
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      chart.resize(width, height);
    };
    window.addEventListener("resize", resize);
    onCleanup(() => {
      window.removeEventListener("resize", resize);
    });

    const canvas = container.querySelector("canvas");
    if (canvas) {
      const parent = canvas.parentElement;
      if (parent) {
        parent.style.position = "relative";
        const dotsBg = document.createElement("div");
        dotsBg.className = "dots-bg";
        parent.appendChild(dotsBg);
      }
    }
  });

  const [tick, setTick] = createSignal<boolean>(false);
  createEffect(() => {
    const t = setInterval(() => {
      setTick((prev) => !prev);
    }, 1000);
    onCleanup(() => {
      clearInterval(t);
    });
  });

  const chartSeriesRT = () => {
    const _ = tick();
    return chartSeries().map((s) => {
      const last_item = s.data.at(-1);
      if (!last_item) return s;
      const now = Math.floor(new Date().getTime() / 1000);
      const time = Math.max(now, last_item.time + 1);
      return {
        ...s,
        data: [
          ...s.data,
          {
            time,
            value: last_item.value,
          } as DataPoint,
        ],
      };
    });
  };

  createEffect(() => {
    const c = chart();
    if (!c) return;
    const _lineSeries = untrack(lineSeries);
    const cSeries = chartSeriesRT();

    let update = {};
    const _ = cSeries.forEach((cs) => {
      let s = _lineSeries[cs.id];
      if (!s) {
        s = c.addLineSeries(cs.options);
        update = {
          ...update,
          [cs.id]: s,
        };
      }

      s.setData(cs.data);
    });

    setLineSeries({
      ..._lineSeries,
      ...update,
    });
  });

  const onlyOneSeries = () => chartSeries().length == 1;

  return (
    <div class="py-4">
      <div class="mx-4 flex items-center overflow-auto space-x-4 no-scrollbar max-w-[calc(100vw)]">
        <For each={chartSeries()}>
          {(series) => (
            <div class="flex-none flex items-center space-x-2 ">
              <div
                class="w-2 h-2 rounded-full"
                style={{ background: series.options.color }}
              />

              <div style={{ color: series.options.color }}>
                {onlyOneSeries() ? "Yes" : series.title} {lastItemToUSD(series)}
              </div>
            </div>
          )}
        </For>

        <div class="flex-1" />

        <div class="flex-none flex items-center sticky right-0 gradient-to-l bg-[#191919]  px-2">
          <button
            class="p-2 rounded-lg  hover:bg-white/5 transition-all"
            onClick={() => {
              chart()?.timeScale().scrollToRealTime();
            }}
          >
            <BsChevronBarRight />
          </button>
        </div>
      </div>

      <div class="mx-4">
        <div ref={container} class="h-80 w-full"></div>
      </div>
    </div>
  );
}
