import { clearUserLocalData } from '@/storage/gear-storage';

import { supabase } from './supabase';

export async function deleteAccountAndAllData(): Promise<void> {
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error('No active user session.');
  }

  // 1. Clear local data first so the device is clean immediately
  await clearUserLocalData(userId);

  // 2. Attempt cloud cleanup via Edge Function
  const { data: invokeData, error: invokeError } = await supabase.functions.invoke('delete-account', {
    body: {},
  });
  
  if (invokeError) {
    throw new Error(`Connection failed: ${invokeError.message}`);
  }

  if (invokeData && invokeData.success === false) {
    throw new Error(`Cloud error: ${invokeData.error}`);
  }

  // 3. Always sign out to end the session
  await supabase.auth.signOut();
}
