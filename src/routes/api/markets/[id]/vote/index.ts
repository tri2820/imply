import { id } from "@instantdb/admin";
import type { APIEvent } from "@solidjs/start/server";
import { createAdminDb, getCookie, verifyJWT } from "~/server/utils";

export async function POST(event: APIEvent) {
    const marketId = event.params.id;
    const body = await event.request.json();
    console.log("API: /api/markets/[id]/vote", marketId, body);
    const action = body as UpvoteDownvote;
    const profile_jwt = getCookie("profile_jwt");
    if (!profile_jwt)
        return new Response(null, { status: 401 /* Unauthorized */ });
    const payload = await verifyJWT(profile_jwt);
    if (!payload || !payload.profile_id || typeof payload.profile_id !== "string")
        return new Response(null, { status: 401 /* Unauthorized */ });

    if (!action || !action.type || !['upvote', 'downvote', 'remove'].includes(action.type))
        return new Response(null, { status: 400 /* BadRequest */ });

    const db = createAdminDb();

    const resp = await db.query({
        markets: {
            $: {
                where: {
                    id: marketId,
                },
            },
            votes: {
                $: {
                    where: {
                        "profile.id": payload.profile_id,
                    },
                },
            }
        },
    });

    const market = resp.markets?.at(0);
    if (!market)
        return new Response(null, {
            status: 404,
        });
    const vote = market.votes.at(0);
    if (action.type === 'remove') {
        // Already removed
        if (!vote)
            return new Response(null, { status: 200 });

        // Remove the vote
        await db.transact([
            db.tx.votes[vote.id].delete(),
            db.tx.markets[market.id].update({
                num_votes: market.num_votes + (vote.isUpvote ? -1 : 1),
            })
        ]);
        return new Response(null, { status: 200 });
    }

    const new_vote: Omit<Vote, 'id'> = {
        isUpvote: action.type === 'upvote',
    }

    // Already voted
    if (vote) {
        await db.transact([
            db.tx.votes[vote.id].update(new_vote),
            db.tx.markets[market.id].update({
                // Remove then add
                num_votes: market.num_votes + (vote.isUpvote ? -1 : 1) + (action.type === 'upvote' ? 1 : -1),
            })
        ]);
        return new Response(null, { status: 200 });
    }


    const vote_id = id()
    await db.transact([
        db.tx.votes[vote_id].update(new_vote).link({
            market: market.id,
            profile: payload.profile_id,
        }),
        db.tx.markets[market.id].update({
            // Just add
            num_votes: market.num_votes + (action.type === 'upvote' ? 1 : -1),
        })])


    return new Response(null, { status: 200 });
}