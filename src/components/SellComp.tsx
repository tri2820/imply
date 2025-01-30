import { BsCheckCircleFill, BsXCircleFill } from "solid-icons/bs";
import { createEffect, createSignal, Show } from "solid-js";
import { optionId, setType, type } from "~/client/utils";
import { MIN_SHARE_AMOUNT, sellShare } from "~/shared/utils";
import CheckBox from "./CheckBox";
import OptionImage from "./OptionImage";
import Spinner from "./Spinner";

export default function SellComp(props: BuySellProps) {
  const option = () => props.market.options.find((o) => o.id == optionId());

  const [amount, setAmount] = createSignal<number>();
  const [numDollarTotal, setNumDollarTotal] = createSignal<number>();
  const [avgPrice, setAvgPrice] = createSignal<number>();
  const [status, setstatus] = createSignal<
    Status<ShareActionResult_Sell & { type: YesOrNo; numShareSold: number }>
  >({
    idle: {},
  });
  const [payout, setPayout] = createSignal<{
    total: number;
    earn: number;
  }>();
  const [error, setError] = createSignal<{
    message: string;
  }>();
  const [highlightAmountError, setHighlightAmountError] = createSignal(false);

  function doSale(type: YesOrNo, usdAmount?: number) {
    const o = option();
    if (!o) return undefined;
    const shareId = o.shares.find((s) => s.type == type)?.id;
    if (!shareId) return undefined;
    return sellShare(o.shares, shareId, usdAmount);
  }

  createEffect(() => {
    const a = amount() ?? 0;
    const m = type();
    const ac = Math.max(a, MIN_SHARE_AMOUNT);
    const sale = doSale(m, ac);
    setAvgPrice(sale?.avgPrice);
    const nusd = a < MIN_SHARE_AMOUNT ? 0 : sale?.usdOut;
    setNumDollarTotal(nusd);
    // setPayout(
    //   nsb
    //     ? {
    //         total: nsb * 1,
    //         earn: nsb * 1 - ac,
    //       }
    //     : undefined
    // );

    setError();
    // The AMM cannot handle
    if (!sale) {
      setError({
        message:
          "The market cannot handle this much, try selling a smaller amount",
      });
    }
  });

  const buy = async () => {
    const a = amount();
    const o = option();
    const m = type();

    if (!o) {
      console.warn("no option");
      return;
    }

    console.log("purchase...", a);
    if (!a || a < MIN_SHARE_AMOUNT) {
      setHighlightAmountError(true);
      return;
    }
    setHighlightAmountError(false);

    const share = o.shares.find((s) => s.type == m);
    if (!share) {
      console.error("no such share");
      return;
    }
    const shareId = share.id;

    console.log("shareId", shareId, o.shares, m);

    try {
      const action: BuySellAction = {
        type: "sell",
        amount: a,
        shareId,
      };

      setstatus({
        doing: {},
      });
      console.log("send", action, o.id);
      const response = await fetch(`/api/options/${o.id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(action),
      });
      if (!response.ok) {
        const msg = await response.text();
        throw new Error(`Error: ${msg}`);
      }

      const data =
        (await response.json()) as NonNullable<ShareActionResult_Sell>;
      setstatus({
        done_succ: {
          ...data,
          numShareSold: a,
          type: m,
        },
      });

      // clear input
      setAmount();
    } catch (e) {
      console.error("fetch error", e);
      setstatus({
        done_err: {},
      });
      return;
    }
  };

  return (
    <div>
      <Show when={status().done_succ}>
        {(succ) => (
          <div class="bg-green-500/5 px-4 py-2">
            <BsCheckCircleFill class="w-6 h-6 text-green-500 my-2" />
            <div class="font-bold">Transaction success! </div>
            <div class="text-sm">
              You have sold {succ().numShareSold}{" "}
              {succ().type == "yes" ? "Yes" : "No"} shares for a total of of $
              {succ().usdOut.toFixed(2)}
            </div>
          </div>
        )}
      </Show>

      <Show when={status().done_err}>
        {(err) => (
          <div class="bg-red-500/5 px-4 py-2">
            <BsXCircleFill class="w-6 h-6 text-red-500 my-2" />
            <div class="font-bold">Transaction failed! </div>
            <div class="text-sm">
              Your transaction could not be processed. Please try again later or
              contact support for assistance.
            </div>
          </div>
        )}
      </Show>

      <div class=" border border-neutral-800 p-4 bg-neutral-900 relative">
        <Show when={status().doing}>
          <div class="absolute z-20 top-0 left-0 w-full h-full bg-white/20">
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Spinner size="lg" />
            </div>
          </div>
        </Show>

        <Show
          fallback={
            <div class="text-center text-neutral-500 h-80">
              Select an option to buy
            </div>
          }
          when={option()}
        >
          {(o) => (
            <div>
              <div class="flex items-start space-x-4">
                <OptionImage />
                <div>
                  <div>{props.market.name}</div>
                  <div class="flex items-center space-x-2">
                    <div
                      class="w-2 h-2 rounded-full flex-none"
                      style={{ background: o().color }}
                    />
                    <div class="font-bold">{o().name}</div>
                  </div>
                </div>
              </div>

              <div class="space-y-2 mt-4">
                <div class="font-bold">I want to sell </div>
                <div class="flex items-center space-x-3">
                  <CheckBox onChange={setType} signal={type()} value="yes" />
                  <div>Yes shares</div>
                </div>

                <div class="flex items-center space-x-3">
                  <CheckBox onChange={setType} signal={type()} value="no" />
                  <div>No shares</div>
                </div>
              </div>

              <div class="mt-4">
                <div
                  data-highlight={highlightAmountError()}
                  class="text-neutral-500 data-[highlight=true]:text-red-500 text-xs mb-1"
                >
                  Amount must be more than {MIN_SHARE_AMOUNT} shares
                </div>
                <div class="flex items-center  border rounded border-neutral-800 focus-within:border-neutral-500">
                  <div class="font-bold flex-none py-4 pl-4 ">
                    Amount (shares)
                  </div>
                  <input
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={amount()}
                    onInput={(e) => {
                      setAmount(
                        Number.isNaN(e.currentTarget.valueAsNumber)
                          ? undefined
                          : e.currentTarget.valueAsNumber
                      );
                    }}
                    type="number"
                    class="bg-transparent outline-none text-right max-w-none flex-1 p-4  placeholder:text-neutral-500  min-w-0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div class="mt-4 text-sm space-y-1">
                <Show
                  when={error()}
                  fallback={
                    <>
                      <div class="flex items-center space-x-2">
                        <div class="flex-1 line-clamp-1">Sell for Total</div>
                        <div>${numDollarTotal()?.toFixed(0) ?? "N/A"}</div>
                      </div>
                      <div class="flex items-center space-x-2">
                        <div class="flex-1 line-clamp-1">Average Price</div>
                        <div>${avgPrice()?.toFixed(2) ?? "N/A"}</div>
                      </div>
                      <Show when={payout()}>
                        {(p) => (
                          <div class="flex items-center space-x-2">
                            <div class="flex-1 line-clamp-1">
                              Payout if{" "}
                              <span class="text-green-500">{o().name}</span>{" "}
                              wins
                            </div>

                            <div>
                              ${p().total.toFixed(2)}{" "}
                              <span class="text-green-500">
                                (+${p().earn.toFixed(2)})
                              </span>
                            </div>
                          </div>
                        )}
                      </Show>
                    </>
                  }
                >
                  {(e) => <div class="text-red-500">{e().message}</div>}
                </Show>
              </div>

              <div class="mt-4">
                <button
                  onClick={() => {
                    buy();
                  }}
                  data-type={type()}
                  class="w-full 
          data-[type=yes]:bg-blue-500
          data-[type=yes]:hover:bg-blue-700
           data-[type=no]:bg-red-500
           data-[type=no]:hover:bg-red-700
           transition-all
            text-white p-4 rounded font-bold"
                >
                  Sell {type() === "yes" ? "Yes" : "No"}
                </button>
              </div>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}
