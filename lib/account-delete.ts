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

  const { error: invokeError } = await supabase.functions.invoke('delete-account', {
    body: {},
  });

  if (invokeError) {
    const lowerMessage = invokeError.message?.toLowerCase() ?? '';
    if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized')) {
      throw new Error('Session expired. Please log in again and retry account deletion.');
    }
    throw new Error(invokeError.message || 'Failed to delete account data.');
  }

  await clearUserLocalData(userId);
  await supabase.auth.signOut();
}
