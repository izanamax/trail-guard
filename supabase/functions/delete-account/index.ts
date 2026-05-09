import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function createJsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const value = error as { code?: string; message?: string };
  const message = value.message?.toLowerCase() ?? '';

  return value.code === 'PGRST205' || (message.includes('relation') && message.includes('does not exist'));
}

function isMissingColumnError(error: unknown, columnName: string): boolean {
  if (!error || typeof error !== 'object') return false;

  const value = error as { message?: string };
  const message = value.message?.toLowerCase() ?? '';

  return message.includes('column') && message.includes(columnName.toLowerCase()) && message.includes('does not exist');
}

async function deleteRowsByUserId(
  adminClient: ReturnType<typeof createClient>,
  tableName: string,
  userId: string
) {
  const { error } = await adminClient.from(tableName).delete().eq('user_id', userId);

  if (!error || isMissingTableError(error)) return;
  if (isMissingColumnError(error, 'user_id')) {
    const { error: fallbackError } = await adminClient.from(tableName).delete().eq('userId', userId);
    if (!fallbackError || isMissingTableError(fallbackError)) return;
    throw new Error(`Failed to delete data from "${tableName}": ${fallbackError.message}`);
  }

  throw new Error(`Failed to delete data from "${tableName}": ${error.message}`);
}

function toPath(basePath: string, childName: string): string {
  if (!basePath) return childName;
  return `${basePath}/${childName}`;
}

function isFolderEntry(entry: { id?: string | null; metadata?: Record<string, unknown> | null }) {
  return !entry.id;
}

async function listStoragePathsRecursively(
  adminClient: ReturnType<typeof createClient>,
  bucket: string,
  path: string
): Promise<string[]> {
  const collected: string[] = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const { data, error } = await adminClient.storage.from(bucket).list(path, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes('bucket') && message.includes('not found')) {
        return collected;
      }
      throw new Error(`Failed to list storage objects: ${error.message}`);
    }

    const entries = data ?? [];
    for (const entry of entries) {
      if (!entry.name) continue;

      const entryPath = toPath(path, entry.name);
      if (isFolderEntry(entry)) {
        const nestedPaths = await listStoragePathsRecursively(adminClient, bucket, entryPath);
        collected.push(...nestedPaths);
      } else {
        collected.push(entryPath);
      }
    }

    if (entries.length < pageSize) break;
    offset += pageSize;
  }

  return collected;
}

async function deleteUserStorageObjects(
  adminClient: ReturnType<typeof createClient>,
  bucket: string,
  userId: string
) {
  const allPaths = await listStoragePathsRecursively(adminClient, bucket, userId);
  if (allPaths.length === 0) return;

  const batchSize = 100;
  for (let index = 0; index < allPaths.length; index += batchSize) {
    const chunk = allPaths.slice(index, index + batchSize);
    const { error } = await adminClient.storage.from(bucket).remove(chunk);
    if (error) {
      throw new Error(`Failed to remove storage objects: ${error.message}`);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return createJsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return createJsonResponse(500, { error: 'Supabase function secrets are missing.' });
    }

    if (!authHeader) {
      return createJsonResponse(401, { error: 'Missing Authorization header.' });
    }

    const userScopedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userScopedClient.auth.getUser();
    if (userError || !userData.user) {
      return createJsonResponse(401, { error: 'Invalid or expired user token.' });
    }

    const userId = userData.user.id;
    const storageBucket = Deno.env.get('GEAR_PHOTO_BUCKET') ?? 'gear-photos';

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // If data is primarily local, we focus on the most important step: Deleting the Auth Account
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      console.error('Auth deletion failed:', deleteAuthError.message);
      return createJsonResponse(500, { error: `Failed to delete user account: ${deleteAuthError.message}` });
    }

    // Optional: Attempt cleanup of any cloud data that might exist
    const tables = ['sync_queue', 'gear_items', 'routes', 'profiles'];
    for (const table of tables) {
      try {
        await adminClient.from(table).delete().eq('user_id', userId);
      } catch (e) {
        // Ignore errors for missing tables or columns
      }
    }

    return createJsonResponse(200, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during account deletion.';
    console.error('Edge Function Error:', message);
    // Return 200 with success: false so we can see the error body in the client
    return createJsonResponse(200, { 
      success: false, 
      error: message 
    });
  }
});
