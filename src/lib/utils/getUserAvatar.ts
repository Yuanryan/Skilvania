/**
 * Get user avatar URL with priority:
 * 1. Custom uploaded avatar (from USER.AvatarURL)
 * 2. Google OAuth image (from session.user.image)
 * 3. null (fallback to default initial)
 */
export function getUserAvatar(
  customAvatarUrl: string | null | undefined,
  oauthImage: string | null | undefined
): string | null {
  if (customAvatarUrl) {
    return customAvatarUrl;
  }
  if (oauthImage) {
    return oauthImage;
  }
  return null;
}

