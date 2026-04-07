const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supa = function(path, options) {
  return fetch(SUPABASE_URL + "/rest/v1/" + path, {
    method: options?.method || "GET",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
};

export async function POST(request) {
  try {
    const { userId } = await request.json();
    if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });
    if (!SERVICE_KEY) return Response.json({ error: "Not configured" }, { status: 500 });

    // 1. Get Stripe subscription to cancel
    const profileRes = await supa("user_profiles?id=eq." + userId + "&select=stripe_subscription_id,stripe_customer_id");
    const profiles = await profileRes.json();
    const profile = profiles?.[0];

    // 2. Cancel Stripe subscription if active
    if (profile?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
      try {
        await fetch("https://api.stripe.com/v1/subscriptions/" + profile.stripe_subscription_id, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + process.env.STRIPE_SECRET_KEY },
        });
        console.log("Stripe subscription cancelled:", profile.stripe_subscription_id);
      } catch(e) {
        console.error("Stripe cancel error (continuing):", e.message);
      }
    }

    // 3. Get all vessel IDs for this user
    const membersRes = await supa("vessel_members?user_id=eq." + userId + "&select=vessel_id");
    const members = await membersRes.json();
    const vesselIds = (members || []).map(function(m){ return m.vessel_id; });

    // 4. Delete all vessel data if user has vessels
    if (vesselIds.length > 0) {
      const vesselFilter = "vessel_id=in.(" + vesselIds.join(",") + ")";

      // Delete in dependency order
      await supa("service_logs?" + vesselFilter, { method: "DELETE" });
      await supa("maintenance_tasks?" + vesselFilter, { method: "DELETE" });
      await supa("repairs?" + vesselFilter, { method: "DELETE" });
      await supa("logbook?" + vesselFilter, { method: "DELETE" });
      await supa("equipment?" + vesselFilter, { method: "DELETE" });
      await supa("vessel_members?user_id=eq." + userId, { method: "DELETE" });

      // Delete vessels owned by this user
      await supa("vessels?user_id=eq." + userId, { method: "DELETE" });
    }

    // 5. Delete user profile
    await supa("user_profiles?id=eq." + userId, { method: "DELETE" });

    // 6. Delete auth user (requires service role)
    const deleteAuthRes = await fetch(
      SUPABASE_URL + "/auth/v1/admin/users/" + userId,
      {
        method: "DELETE",
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": "Bearer " + SERVICE_KEY,
        },
      }
    );

    if (!deleteAuthRes.ok) {
      const err = await deleteAuthRes.text();
      console.error("Auth user delete failed:", err);
      return Response.json({ error: "Account data deleted but auth user removal failed. Please contact support." }, { status: 500 });
    }

    console.log("Account deleted for user:", userId);
    return Response.json({ success: true });

  } catch(e) {
    console.error("Delete account error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
