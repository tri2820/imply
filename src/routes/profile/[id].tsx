import { useParams } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";
import ProfileImage from "~/components/ProfileImage";
import { db } from "~/client/database";
import { dateF, ProfileResponse } from "~/utils";

export default function ProfilePage() {
  const [profileResponse, setProfileResponse] = createSignal<ProfileResponse>();
  const profile = () => profileResponse()?.data.profiles.at(0);
  const params = useParams();

  onMount(async () => {
    const resp = await db.queryOnce({
      profiles: {
        $: {
          where: {
            id: params.id,
          },
        },
        holdings: {
          share: {
            option: {
              market: {},
            },
          },
        },
      },
    });
    // TODO: For some reason share can be undefined, fix
    setProfileResponse(resp as any);
  });
  return (
    <Show when={profile()}>
      {(p) => (
        <div class="mx-auto w-full max-w-4xl px-4 py-8 space-y-12">
          <div class="space-y-3">
            <h1 class="text-3xl font-bold">Profile</h1>
            <div class="flex items-start space-x-4">
              <ProfileImage size="xl" />
              <div>
                <div class="text-lg font-bold">{p().name}</div>
                <div class="text-neutral-500">${p().usd.toFixed(2)}</div>
              </div>
            </div>
          </div>
          <div class="space-y-3 ">
            <h1 class="text-3xl font-bold">Holdings</h1>

            <div class="table-container">
              <table class="w-full">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Yes/No</th>
                    <th>Option</th>
                    <th>Market</th>
                    <th>Updated At</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={p().holdings}>
                    {(h) => (
                      <tr>
                        <td>{h.amount.toFixed(2)}</td>
                        <td>{h.share.type == "no" ? "No" : "Yes"}</td>
                        <td>{h.share.option.name}</td>
                        <td>
                          <a
                            class="hover:underline line-clamp-1"
                            href={`/market/${h.share.option.market.id}`}
                          >
                            {h.share.option.market.name}
                          </a>
                        </td>
                        <td class="whitespace-nowrap">{dateF(h.updated_at)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Show>
  );
}
