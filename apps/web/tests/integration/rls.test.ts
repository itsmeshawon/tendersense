/**
 * RLS integration test — proves workspace isolation between two users
 * against a real local Supabase stack (Phase 0 step 8).
 *
 * Prereq: `supabase start` at repo root. Uses the shifted local ports
 * (54331/54332) and the well-known local demo JWT keys.
 *
 * Run: `npm run test:integration` from apps/web.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const LOCAL_URL = "http://127.0.0.1:54331";
// Standard Supabase local-dev demo keys (JWT with iss=supabase-demo).
// Safe to check in — these only work against a local stack.
const LOCAL_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_SERVICE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const admin = createClient(LOCAL_URL, LOCAL_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type User = { client: SupabaseClient; userId: string; email: string };

async function createSignedInUser(prefix: string): Promise<User> {
  const email = `${prefix}+${Date.now()}${Math.floor(
    Math.random() * 1e6,
  )}@rls.test`;
  const password = "rls-test-password-1234!";

  const allowlistInsert = await admin
    .from("allowed_signup_emails")
    .insert({ email, note: "rls integration test" });
  if (allowlistInsert.error) throw new Error(allowlistInsert.error.message);

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (createErr) throw createErr;
  const userId = created.user?.id;
  if (!userId) throw new Error("createUser returned no id");

  const client = createClient(LOCAL_URL, LOCAL_ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr) throw signErr;

  return { client, userId, email };
}

async function cleanupUser(user: User | undefined) {
  if (!user) return;
  await admin.auth.admin.deleteUser(user.userId).catch(() => {});
  await admin
    .from("allowed_signup_emails")
    .delete()
    .eq("email", user.email)
    .then(() => {});
}

describe("RLS: workspace isolation", () => {
  let alice: User;
  let bob: User;
  let aliceWorkspaceId: string;

  beforeAll(async () => {
    alice = await createSignedInUser("alice");
    bob = await createSignedInUser("bob");
  });

  afterAll(async () => {
    await cleanupUser(alice);
    await cleanupUser(bob);
  });

  it("Alice can create a workspace via the RPC", async () => {
    const { data, error } = await alice.client.rpc("create_workspace", {
      p_name: "Alice Corp",
      p_workspace_type: "organization",
    });
    expect(error).toBeNull();
    expect(typeof data).toBe("string");
    aliceWorkspaceId = data as string;
  });

  it("Alice sees her own workspace in the list", async () => {
    const { data, error } = await alice.client
      .from("workspaces")
      .select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].name).toBe("Alice Corp");
    expect(data?.[0].id).toBe(aliceWorkspaceId);
  });

  it("Bob cannot see Alice's workspace", async () => {
    const { data, error } = await bob.client.from("workspaces").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("Bob cannot see Alice's membership row", async () => {
    const { data, error } = await bob.client
      .from("workspace_members")
      .select("*");
    expect(error).toBeNull();
    // Bob has no memberships of his own yet either
    expect(data).toEqual([]);
  });

  it("Bob cannot fetch Alice's workspace by id", async () => {
    const { data, error } = await bob.client
      .from("workspaces")
      .select("*")
      .eq("id", aliceWorkspaceId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("Bob creates his own workspace; only his shows up", async () => {
    const { error: rpcErr } = await bob.client.rpc("create_workspace", {
      p_name: "Bob Ltd",
      p_workspace_type: "individual",
    });
    expect(rpcErr).toBeNull();

    const { data, error } = await bob.client.from("workspaces").select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].name).toBe("Bob Ltd");
  });

  it("Alice still sees exactly her workspace (Bob's is invisible)", async () => {
    const { data, error } = await alice.client
      .from("workspaces")
      .select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].name).toBe("Alice Corp");
  });

  it("Neither user can read from allowed_signup_emails", async () => {
    // Desired behavior: authenticated has no SELECT grant, so the API
    // rejects with "permission denied" (code 42501) before RLS even runs.
    const aliceRead = await alice.client
      .from("allowed_signup_emails")
      .select("*");
    expect(aliceRead.error).not.toBeNull();
    expect(aliceRead.error?.code).toBe("42501");

    const bobRead = await bob.client
      .from("allowed_signup_emails")
      .select("*");
    expect(bobRead.error).not.toBeNull();
    expect(bobRead.error?.code).toBe("42501");
  });

  it("A direct INSERT into workspaces is rejected (must use RPC)", async () => {
    const { error } = await alice.client.from("workspaces").insert({
      name: "Sneaky",
      slug: "sneaky-" + Date.now(),
      workspace_type: "individual",
      owner_user_id: alice.userId,
    });
    // No INSERT policy exists → RLS blocks the write
    expect(error).not.toBeNull();
  });

  it("Signup allowlist trigger blocks unknown emails", async () => {
    // GoTrue wraps the trigger's RAISE as a generic
    // "database error creating new user" — we can't assert on the
    // specific message. What matters is that user creation FAILS and
    // no auth.users row persists (the trigger's RAISE rolls back the
    // transaction).
    const random = `random+${Date.now()}@nope.test`;
    const { error } = await admin.auth.admin.createUser({
      email: random,
      password: "does-not-matter",
      email_confirm: true,
    });
    expect(error).not.toBeNull();

    // Confirm no auth.users row was written for that email.
    const { data: users } = await admin.auth.admin.listUsers();
    const found = users.users.find((u) => u.email === random);
    expect(found).toBeUndefined();
  });
});
