export function squadLockMessage(reason: 'status' | 'match' | null | undefined, status?: string | null) {
  if (reason === 'match')
    return 'You cannot edit this squad because a match has already started. Only the organizer can change it.';
  if (status === 'ongoing')
    return 'You cannot edit this squad because the tournament is ongoing. Only the organizer can change it.';
  if (status === 'completed')
    return 'You cannot edit this squad because the tournament is completed. Only the organizer can change it.';
  if (status === 'cancelled')
    return 'You cannot edit this squad because the tournament is cancelled. Only the organizer can change it.';
  return 'You cannot edit this squad because the tournament is not open for changes. Only the organizer can change it.';
}
