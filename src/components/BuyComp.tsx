import { BsCheckCircleFill, BsXCircleFill } from "solid-icons/bs";
import { createEffect, createSignal, Show } from "solid-js";
import { optionId, setType, type } from "~/client/utils";
import { buyShare, MIN_USD_AMOUNT, noProb } from "~/shared/utils";
import CheckBoxItem from "./CheckboxItem";
import Spinner from "./Spinner";
import Header from "./buysell/Header";

export default function BuyComp(props: BuySellProps) {
  const option = () => props.market.options.find((o) => o.id == optionId());
  const [amount, setAmount] = createSignal<number>();
  const [numShareBuy, setNumShareBuy] = createSignal<number>();
  const [avgPrice, setAvgPrice] = createSignal<number>();
  const [status, setstatus] = createSignal<
    Status<ShareActionResult_Buy & { type: YesOrNo }>
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

  function doPurchase(type: YesOrNo, usdAmount?: number) {
    const o = option();
    if (!o) return undefined;
    const shareId = o.shares.find((s) => s.type == type)?.id;
    if (!shareId) return undefined;
    const result = buyShare(o.shares, shareId, usdAmount);
    return result;
  }

  createEffect(() => {
    const a = amount() ?? 0;
    const m = type();
    const ac = Math.max(a, MIN_USD_AMOUNT);
    const purchase = doPurchase(m, ac);
    setAvgPrice(purchase?.avgPrice);
    const nsb = a < MIN_USD_AMOUNT ? 0 : purchase?.shareOut;
    setNumShareBuy(nsb);
    setPayout(
      nsb
        ? {
            total: nsb * 1,
            earn: nsb * 1 - ac,
          }
        : undefined
    );

    setError();
    // The AMM cannot handle
    if (!purchase) {
      setError({
        message:
          "The market cannot handle this much, try buying a smaller amount",
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
    if (!a || a < MIN_USD_AMOUNT) {
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
        type: "buy",
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
        (await response.json()) as NonNullable<ShareActionResult_Buy>;
      setstatus({
        done_succ: {
          ...data,
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
              You have bought {succ().shareOut}{" "}
              {succ().type == "yes" ? "Yes" : "No"} shares at an average price
              of ${succ().avgPrice.toFixed(2)}
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
              <Header o={o} {...props} />

              <div class="space-y-2 mt-4">
                <CheckBoxItem
                  label="Yes"
                  price={doPurchase("yes")?.avgPrice}
                  id="yes"
                  prob={o().yesProb}
                  value={type()}
                  onChange={setType}
                />
                <CheckBoxItem
                  label="No"
                  price={doPurchase("no")?.avgPrice}
                  prob={noProb(o().yesProb)}
                  id="no"
                  value={type()}
                  onChange={setType}
                />
              </div>

              <div class="mt-4">
                <div
                  data-highlight={highlightAmountError()}
                  class="text-neutral-500 data-[highlight=true]:text-red-500 text-xs mb-1"
                >
                  Amount must be more than ${MIN_USD_AMOUNT}
                </div>
                <div class="flex items-center  border rounded border-neutral-800 focus-within:border-neutral-500">
                  <div class="font-bold flex-none py-4 pl-4">Amount $</div>
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
                    class="bg-transparent outline-none text-right max-w-none flex-1 p-4  placeholder:text-neutral-500 min-w-0"
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
                        <div class="flex-1 line-clamp-1">
                          Number of Shares to Acquire
                        </div>
                        <div>{numShareBuy()?.toFixed(0) ?? "N/A"}</div>
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
                  Buy {type() === "yes" ? "Yes" : "No"}
                </button>
              </div>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}
